-- =====================================================================
-- PokeAlt · Avisos de pedidos nuevos (correo con Resend y WhatsApp con CallMeBot)
-- Ejecutar después de schema.sql. Solo funciona en Supabase (usa pg_net y Vault).
-- Las claves se guardan cifradas en Vault desde Admin → Configuración → Avisos.
-- =====================================================================

create extension if not exists pg_net with schema extensions;

-- Configuración de avisos (solo la ve y la cambia el admin)
create table if not exists public.notify_settings (
  id                integer primary key default 1 check (id = 1),
  admin_email       text not null default '',
  admin_whatsapp    text not null default '',          -- con código de país, ej. 51958961176
  email_enabled     boolean not null default true,
  whatsapp_enabled  boolean not null default true,
  customer_emails   boolean not null default false,    -- requiere dominio verificado en Resend
  email_from        text not null default 'PokeAlt <onboarding@resend.dev>',
  updated_at        timestamptz not null default now()
);
insert into public.notify_settings (id) values (1) on conflict (id) do nothing;

drop trigger if exists notify_settings_touch on public.notify_settings;
create trigger notify_settings_touch before update on public.notify_settings
  for each row execute function public.touch_updated_at();

-- Registro de envíos (para ver en Admin si llegaron)
create table if not exists public.notify_log (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  channel     text not null,
  order_id    text,
  request_id  bigint,
  note        text
);
create index if not exists notify_log_created_idx on public.notify_log (created_at desc);

alter table public.notify_settings enable row level security;
alter table public.notify_log      enable row level security;

drop policy if exists "admin ve avisos" on public.notify_settings;
create policy "admin ve avisos" on public.notify_settings
  for select to authenticated using (public.is_admin());
drop policy if exists "admin edita avisos" on public.notify_settings;
create policy "admin edita avisos" on public.notify_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin ve registro de avisos" on public.notify_log;
create policy "admin ve registro de avisos" on public.notify_log
  for select to authenticated using (public.is_admin());

-- Guarda (o borra, si viene vacía) una clave en Vault. La web nunca la vuelve a leer.
create or replace function public.set_notify_secret(p_kind text, p_value text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_id   uuid;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede configurar los avisos.';
  end if;
  if p_kind not in ('resend', 'callmebot') then
    raise exception 'Tipo de clave no válido.';
  end if;
  v_name := 'pokealt_' || p_kind;
  select id into v_id from vault.secrets where name = v_name;
  if p_value is null or btrim(p_value) = '' then
    delete from vault.secrets where id = v_id;
  elsif v_id is null then
    perform vault.create_secret(btrim(p_value), v_name, 'PokeAlt: avisos de pedidos');
  else
    perform vault.update_secret(v_id, btrim(p_value));
  end if;
end;
$$;

create or replace function public.notify_secret(p_kind text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'pokealt_' || p_kind limit 1;
$$;

-- Envía un aviso por cada canal configurado. Devuelve cuántos se pusieron en cola.
create or replace function public.notify_send(p_order_id text, p_subject text, p_admin_text text, p_customer_email text, p_customer_subject text, p_customer_text text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  s        public.notify_settings;
  v_resend text := public.notify_secret('resend');
  v_cmb    text := public.notify_secret('callmebot');
  v_req    bigint;
  v_count  integer := 0;
begin
  select * into s from public.notify_settings where id = 1;
  if not found then
    return 0;
  end if;

  if s.email_enabled and v_resend is not null and s.admin_email like '%@%' then
    select net.http_post(
      url     := 'https://api.resend.com/emails',
      headers := jsonb_build_object('Authorization', 'Bearer ' || v_resend, 'Content-Type', 'application/json'),
      body    := jsonb_build_object('from', s.email_from, 'to', jsonb_build_array(s.admin_email), 'subject', p_subject, 'text', p_admin_text)
    ) into v_req;
    insert into public.notify_log (channel, order_id, request_id) values ('Correo a ti', p_order_id, v_req);
    v_count := v_count + 1;
  end if;

  if s.whatsapp_enabled and v_cmb is not null and s.admin_whatsapp ~ '^[0-9]{9,15}$' then
    select net.http_get(
      url    := 'https://api.callmebot.com/whatsapp.php',
      params := jsonb_build_object('phone', '+' || s.admin_whatsapp, 'text', p_subject || E'\n\n' || p_admin_text, 'apikey', v_cmb)
    ) into v_req;
    insert into public.notify_log (channel, order_id, request_id) values ('WhatsApp a ti', p_order_id, v_req);
    v_count := v_count + 1;
  end if;

  if s.customer_emails and v_resend is not null and coalesce(p_customer_email, '') like '%@%' and p_customer_text is not null then
    select net.http_post(
      url     := 'https://api.resend.com/emails',
      headers := jsonb_build_object('Authorization', 'Bearer ' || v_resend, 'Content-Type', 'application/json'),
      body    := jsonb_build_object('from', s.email_from, 'to', jsonb_build_array(p_customer_email), 'subject', p_customer_subject, 'text', p_customer_text)
    ) into v_req;
    insert into public.notify_log (channel, order_id, request_id) values ('Correo al cliente', p_order_id, v_req);
    v_count := v_count + 1;
  end if;

  return v_count;
end;
$$;

-- Arma el mensaje del pedido. place_order() lo llama al final; si algo falla, el pedido igual se guarda.
create or replace function public.notify_new_order(p_order_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o          public.orders;
  v_money    text;
  v_items    text;
  v_delivery text;
  v_cust     text;
  v_admin    text;
  v_client   text;
begin
  select * into o from public.orders where id = p_order_id;
  if not found then
    return;
  end if;

  select string_agg(format('• %s × %s — S/ %s', i.qty, i.name, to_char(i.unit_price * i.qty, 'FM999,990.00')), E'\n' order by i.id)
    into v_items
    from public.order_items i
   where i.order_id = p_order_id;

  v_money := to_char(o.total, 'FM999,990.00');
  v_delivery := case o.delivery ->> 'mode'
    when 'pickup'   then 'Recojo en ' || coalesce(o.delivery ->> 'point', '')
    when 'province' then 'Provincia: ' || concat_ws(', ', nullif(o.delivery ->> 'city', ''), o.delivery ->> 'department')
                         || ' · ' || case o.delivery ->> 'courier' when 'shalom' then 'Shalom' else 'Olva Courier' end
    else 'Delivery Lima: ' || concat_ws(', ', nullif(o.delivery ->> 'address', ''), o.delivery ->> 'district')
         || coalesce(' (Ref: ' || nullif(o.delivery ->> 'reference', '') || ')', '')
  end;
  v_cust := coalesce(nullif(o.customer ->> 'name', ''), 'Sin nombre');

  v_admin := format(
    E'Pedido %s · Total S/ %s\nPago: %s\nEstado: %s\n\nCliente: %s\nCelular: %s\nCorreo: %s\n%s: %s\n\nEntrega: %s\n\nProductos:\n%s\n\nSubtotal S/ %s · Envío S/ %s',
    o.id, v_money, o.method, o.status,
    v_cust, coalesce(o.customer ->> 'phone', '-'), coalesce(o.customer ->> 'email', '-'),
    coalesce(o.customer ->> 'docType', 'Doc.'), coalesce(o.customer ->> 'doc', '-'),
    v_delivery, coalesce(v_items, '-'),
    to_char(o.subtotal, 'FM999,990.00'), to_char(o.shipping, 'FM999,990.00')
  );

  v_client := format(
    E'Hola %s,\n\nRecibimos tu pedido %s por S/ %s.\n\n%s\n\nEntrega: %s\nPago: %s\n\nSi pagaste con Yape o Plin, verificamos tu pago y te escribimos por WhatsApp. Entregamos en un plazo de 2 días.\n\nGracias por comprar en PokeAlt.',
    split_part(v_cust, ' ', 1), o.id, v_money, coalesce(v_items, ''), v_delivery, o.method
  );

  perform public.notify_send(
    o.id,
    format('Nuevo pedido %s · S/ %s', o.id, v_money),
    v_admin,
    o.customer ->> 'email',
    format('Recibimos tu pedido %s · PokeAlt', o.id),
    v_client
  );
exception when others then
  insert into public.notify_log (channel, order_id, note) values ('Error', p_order_id, sqlerrm);
end;
$$;

-- Aviso de prueba desde Admin
create or replace function public.send_test_notification()
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede enviar pruebas.';
  end if;
  return public.notify_send(
    null,
    'Prueba de avisos de PokeAlt',
    E'Si ves este mensaje, los avisos de pedidos nuevos están funcionando.',
    null, null, null
  );
end;
$$;

-- Estado para la pantalla de Admin: qué claves hay y cómo salieron los últimos envíos.
create or replace function public.notify_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_log jsonb;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede ver los avisos.';
  end if;
  select coalesce(jsonb_agg(x order by x.id desc), '[]'::jsonb) into v_log
    from (
      select l.id, l.created_at, l.channel, l.order_id, l.note,
             r.status_code,
             -- Resend responde 4xx con JSON; CallMeBot puede responder 200 con el error en texto.
             left(btrim(regexp_replace(coalesce(
               r.error_msg,
               case when r.status_code >= 300 or r.content ~* '(invalid|error|not allowed|not activated|blocked)' then r.content end
             ), '<[^>]*>|\s+', ' ', 'g')), 300) as error,
             (l.request_id is not null and r.id is null and l.created_at > now() - interval '15 minutes') as pending
        from public.notify_log l
        left join net._http_response r on r.id = l.request_id
       order by l.id desc
       limit 8
    ) x;
  return jsonb_build_object(
    'resend', exists (select 1 from vault.secrets where name = 'pokealt_resend'),
    'callmebot', exists (select 1 from vault.secrets where name = 'pokealt_callmebot'),
    'log', v_log
  );
end;
$$;

-- Solo el admin puede llamar estas funciones desde la web; las internas no se exponen.
revoke execute on function public.set_notify_secret(text, text) from public, anon;
revoke execute on function public.send_test_notification() from public, anon;
revoke execute on function public.notify_status() from public, anon;
revoke execute on function public.notify_secret(text) from public, anon, authenticated;
revoke execute on function public.notify_send(text, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.notify_new_order(text) from public, anon, authenticated;
grant execute on function public.set_notify_secret(text, text) to authenticated;
grant execute on function public.send_test_notification() to authenticated;
grant execute on function public.notify_status() to authenticated;

-- Pedidos en tiempo real para el panel admin (RLS: cada quien solo recibe los pedidos que puede ver).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;
