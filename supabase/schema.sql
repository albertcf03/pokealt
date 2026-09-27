-- =====================================================================
-- PokeAlt · Esquema de base de datos para Supabase (Postgres)
-- Ejecuta este archivo completo en Supabase > SQL Editor > New query.
-- Luego ejecuta seed.sql para cargar los productos y la subasta inicial.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PERFILES DE USUARIO (se crean solos al registrarse)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  alias       text unique check (alias is null or char_length(alias) between 3 and 20),
  doc_type    text check (doc_type in ('DNI', 'CE')),
  doc_number  text,
  phone       text,
  role        text not null default 'customer' check (role in ('customer', 'admin')),
  created_at  timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Nadie puede darse a sí mismo el rol de admin desde la web.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'No puedes cambiar tu rol.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- ---------------------------------------------------------------------
-- 2. CATÁLOGO Y CONFIGURACIÓN
-- ---------------------------------------------------------------------
create table if not exists public.products (
  id           text primary key default ('p' || replace(gen_random_uuid()::text, '-', '')),
  name         text not null,
  set_name     text not null default '',
  condition    text not null default 'Near Mint (NM)',
  price        numeric(10, 2) not null check (price > 0),
  stock        integer not null default 0 check (stock >= 0),
  category     text not null check (category in ('Sellado', 'Singles', 'Accesorios', 'Preventas')),
  image        text not null default 'colorless',
  is_featured  boolean not null default false,
  rarity       text not null default 'Producto sellado',
  active       boolean not null default true,
  description  text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.settings (
  id                   integer primary key default 1 check (id = 1),
  yape_number          text not null default '',
  plin_number          text not null default '',
  wallet_holder        text not null default 'PokeAlt',
  low_stock_threshold  integer not null default 3 check (low_stock_threshold >= 1),
  free_shipping_from   numeric(10, 2) not null default 500 check (free_shipping_from >= 0),
  updated_at           timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();
drop trigger if exists settings_touch on public.settings;
create trigger settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 3. PEDIDOS
-- ---------------------------------------------------------------------
create sequence if not exists public.order_seq;

create table if not exists public.orders (
  id          text primary key default ('PKA-' || lpad(nextval('public.order_seq')::text, 6, '0')),
  user_id     uuid references auth.users (id) on delete set null,
  customer    jsonb not null,
  delivery    jsonb not null,
  subtotal    numeric(10, 2) not null,
  shipping    numeric(10, 2) not null default 0,
  total       numeric(10, 2) not null,
  method      text not null,
  status      text not null default 'Pendiente de verificación'
              check (status in ('Pendiente de verificación', 'Pendiente de pago', 'Pagado', 'Enviado', 'Entregado', 'Cancelado')),
  marketing   boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.order_items (
  id          bigint generated always as identity primary key,
  order_id    text not null references public.orders (id) on delete cascade,
  product_id  text references public.products (id) on delete set null,
  name        text not null,
  unit_price  numeric(10, 2) not null,
  qty         integer not null check (qty > 0)
);

create index if not exists order_items_order_idx on public.order_items (order_id);

-- Registra el pedido y descuenta stock en una sola operación.
-- Los precios se toman de la base de datos, nunca del navegador.
create or replace function public.place_order(
  p_customer jsonb,
  p_delivery jsonb,
  p_items    jsonb,      -- [{ "id": "p1", "qty": 2 }, ...]
  p_shipping numeric,
  p_method   text,       -- 'yape' | 'plin' | 'card'
  p_method_label text,
  p_marketing boolean default false
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item     jsonb;
  v_product  public.products;
  v_qty      integer;
  v_subtotal numeric(10, 2) := 0;
  v_order    public.orders;
  v_lines    jsonb := '[]'::jsonb;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'El carrito está vacío.';
  end if;
  if p_method not in ('yape', 'plin', 'card') then
    raise exception 'Método de pago no válido.';
  end if;
  if p_shipping is null or p_shipping < 0 or p_shipping > 100 then
    raise exception 'Costo de envío no válido.';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'qty')::integer;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Cantidad no válida.';
    end if;

    update public.products
       set stock = stock - v_qty
     where id = v_item ->> 'id' and active and stock >= v_qty
    returning * into v_product;

    if not found then
      select * into v_product from public.products where id = v_item ->> 'id';
      raise exception 'Stock insuficiente para %', coalesce(v_product.name, v_item ->> 'id');
    end if;

    v_subtotal := v_subtotal + v_product.price * v_qty;
    v_lines := v_lines || jsonb_build_object('id', v_product.id, 'name', v_product.name, 'price', v_product.price, 'qty', v_qty);
  end loop;

  insert into public.orders (user_id, customer, delivery, subtotal, shipping, total, method, status, marketing)
  values (
    auth.uid(), p_customer, p_delivery, v_subtotal, p_shipping, v_subtotal + p_shipping, p_method_label,
    -- La tarjeta queda pendiente hasta integrar la pasarela; Yape/Plin se verifican a mano.
    case when p_method = 'card' then 'Pendiente de pago' else 'Pendiente de verificación' end,
    coalesce(p_marketing, false)
  )
  returning * into v_order;

  insert into public.order_items (order_id, product_id, name, unit_price, qty)
  select v_order.id, l ->> 'id', l ->> 'name', (l ->> 'price')::numeric, (l ->> 'qty')::integer
    from jsonb_array_elements(v_lines) l;

  return v_order;
end;
$$;

-- Cambia el estado de un pedido (solo admin). Cancelar devuelve el stock una sola vez.
create or replace function public.set_order_status(p_order_id text, p_status text)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede cambiar pedidos.';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido no encontrado.';
  end if;
  if v_order.status = 'Cancelado' and p_status <> 'Cancelado' then
    raise exception 'Un pedido cancelado no se puede reactivar.';
  end if;

  if p_status = 'Cancelado' and v_order.status <> 'Cancelado' then
    update public.products p
       set stock = p.stock + oi.qty
      from public.order_items oi
     where oi.order_id = p_order_id and oi.product_id = p.id;
  end if;

  update public.orders set status = p_status where id = p_order_id returning * into v_order;
  return v_order;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. SUBASTAS Y PUJAS
-- ---------------------------------------------------------------------
create table if not exists public.auctions (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  grade               text not null default '',
  image               text not null default 'fire',
  start_price         numeric(10, 2) not null check (start_price > 0),
  increment           numeric(10, 2) not null default 50 check (increment > 0),
  current_price       numeric(10, 2),            -- null hasta la primera puja
  bid_count           integer not null default 0,
  leader_alias        text,
  starts_at           timestamptz not null default now(),
  ends_at             timestamptz not null,
  anti_snipe_seconds  integer not null default 120 check (anti_snipe_seconds >= 0),
  is_featured         boolean not null default true,
  created_at          timestamptz not null default now()
);

create table if not exists public.bids (
  id          bigint generated always as identity primary key,
  auction_id  uuid not null references public.auctions (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  alias       text not null,
  amount      numeric(10, 2) not null,
  created_at  timestamptz not null default now()
);

create index if not exists bids_auction_idx on public.bids (auction_id, amount desc);

-- Registra una puja validando monto mínimo y cierre, de forma atómica.
-- Si alguien puja en los últimos segundos, la subasta se extiende (anti-francotirador).
create or replace function public.place_bid(p_auction_id uuid, p_amount numeric)
returns public.auctions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auction public.auctions;
  v_profile public.profiles;
  v_min     numeric(10, 2);
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión para pujar.';
  end if;

  select * into v_profile from public.profiles where id = auth.uid();
  if v_profile.alias is null or v_profile.doc_number is null or v_profile.full_name is null then
    raise exception 'Completa tu perfil (nombre, alias y documento) para pujar.';
  end if;

  select * into v_auction from public.auctions where id = p_auction_id for update;
  if not found then
    raise exception 'Subasta no encontrada.';
  end if;
  if now() < v_auction.starts_at then
    raise exception 'La subasta aún no empieza.';
  end if;
  if now() >= v_auction.ends_at then
    raise exception 'La subasta ya terminó.';
  end if;

  v_min := coalesce(v_auction.current_price, v_auction.start_price) + v_auction.increment;
  if p_amount is null or p_amount < v_min then
    raise exception 'La puja mínima es S/ %', v_min;
  end if;

  insert into public.bids (auction_id, user_id, alias, amount)
  values (p_auction_id, auth.uid(), v_profile.alias, p_amount);

  update public.auctions
     set current_price = p_amount,
         bid_count     = bid_count + 1,
         leader_alias  = v_profile.alias,
         ends_at       = case
                           when ends_at - now() < make_interval(secs => anti_snipe_seconds)
                             then now() + make_interval(secs => anti_snipe_seconds)
                           else ends_at
                         end
   where id = p_auction_id
  returning * into v_auction;

  return v_auction;
end;
$$;

-- Historial público de pujas: solo alias, monto y hora (sin datos personales).
create or replace function public.get_auction_bids(p_auction_id uuid, p_limit integer default 20)
returns table (alias text, amount numeric, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select b.alias, b.amount, b.created_at
    from public.bids b
   where b.auction_id = p_auction_id
   order by b.amount desc, b.created_at asc
   limit least(coalesce(p_limit, 20), 100);
$$;

-- ---------------------------------------------------------------------
-- 5. LIBRO DE RECLAMACIONES
-- ---------------------------------------------------------------------
create table if not exists public.claim_counters (
  year      integer primary key,
  last_num  integer not null default 0
);

create table if not exists public.claims (
  number      text primary key,               -- 000001-2026
  user_id     uuid references auth.users (id) on delete set null,
  kind        text not null check (kind in ('reclamo', 'queja')),
  email       text not null,
  payload     jsonb not null,                 -- datos completos de la hoja
  status      text not null default 'Pendiente' check (status in ('Pendiente', 'En evaluación', 'Respondido')),
  response    text,
  created_at  timestamptz not null default now(),
  due_at      timestamptz not null
);

create or replace function public.add_business_days(p_from timestamptz, p_days integer)
returns timestamptz
language plpgsql
immutable
set search_path = ''
as $$
declare
  d timestamptz := p_from;
  n integer := 0;
begin
  while n < p_days loop
    d := d + interval '1 day';
    if extract(isodow from d at time zone 'America/Lima') < 6 then
      n := n + 1;
    end if;
  end loop;
  return d;
end;
$$;

-- Registra una hoja de reclamación con número correlativo por año.
create or replace function public.submit_claim(p_kind text, p_email text, p_payload jsonb)
returns public.claims
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year  integer := extract(year from now() at time zone 'America/Lima');
  v_num   integer;
  v_claim public.claims;
begin
  if p_kind not in ('reclamo', 'queja') then
    raise exception 'Tipo de hoja no válido.';
  end if;
  if p_email is null or position('@' in p_email) = 0 then
    raise exception 'Correo no válido.';
  end if;

  insert into public.claim_counters (year, last_num) values (v_year, 1)
  on conflict (year) do update set last_num = public.claim_counters.last_num + 1
  returning last_num into v_num;

  insert into public.claims (number, user_id, kind, email, payload, due_at)
  values (lpad(v_num::text, 6, '0') || '-' || v_year, auth.uid(), p_kind, p_email, p_payload, public.add_business_days(now(), 15))
  returning * into v_claim;

  return v_claim;
end;
$$;

-- ---------------------------------------------------------------------
-- 6. ALERTAS DE STOCK (WhatsApp)
-- ---------------------------------------------------------------------
create table if not exists public.stock_alerts (
  id          bigint generated always as identity primary key,
  phone       text not null check (phone ~ '^9[0-9]{8}$'),
  created_at  timestamptz not null default now(),
  unique (phone)
);

-- ---------------------------------------------------------------------
-- 7. SEGURIDAD (Row Level Security)
-- ---------------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.products       enable row level security;
alter table public.settings       enable row level security;
alter table public.orders         enable row level security;
alter table public.order_items    enable row level security;
alter table public.auctions       enable row level security;
alter table public.bids           enable row level security;
alter table public.claims         enable row level security;
alter table public.claim_counters enable row level security;
alter table public.stock_alerts   enable row level security;

-- Perfiles: cada quien ve y edita el suyo; el admin ve todos.
drop policy if exists "perfil propio o admin" on public.profiles;
create policy "perfil propio o admin" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
drop policy if exists "editar perfil propio" on public.profiles;
create policy "editar perfil propio" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Catálogo: lectura pública; escritura solo admin.
drop policy if exists "catalogo publico" on public.products;
create policy "catalogo publico" on public.products for select to anon, authenticated using (true);
drop policy if exists "admin gestiona productos" on public.products;
create policy "admin gestiona productos" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Configuración: lectura pública; escritura solo admin.
drop policy if exists "config publica" on public.settings;
create policy "config publica" on public.settings for select to anon, authenticated using (true);
drop policy if exists "admin edita config" on public.settings;
create policy "admin edita config" on public.settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Pedidos: el cliente ve los suyos; el admin ve todos. Se crean solo con place_order().
drop policy if exists "ver pedidos" on public.orders;
create policy "ver pedidos" on public.orders
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "ver items" on public.order_items;
create policy "ver items" on public.order_items
  for select to authenticated using (
    exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin()))
  );

-- Subastas: lectura pública; gestión solo admin. Las pujas se crean solo con place_bid().
drop policy if exists "subastas publicas" on public.auctions;
create policy "subastas publicas" on public.auctions for select to anon, authenticated using (true);
drop policy if exists "admin gestiona subastas" on public.auctions;
create policy "admin gestiona subastas" on public.auctions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "ver pujas propias o admin" on public.bids;
create policy "ver pujas propias o admin" on public.bids
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- Reclamos: se crean con submit_claim(); los ve su autor y el admin, que además los responde.
drop policy if exists "ver reclamos" on public.claims;
create policy "ver reclamos" on public.claims
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "admin responde reclamos" on public.claims;
create policy "admin responde reclamos" on public.claims
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Alertas: cualquiera se suscribe; solo el admin ve la lista.
drop policy if exists "suscribirse a alertas" on public.stock_alerts;
create policy "suscribirse a alertas" on public.stock_alerts
  for insert to anon, authenticated with check (true);
drop policy if exists "admin ve alertas" on public.stock_alerts;
create policy "admin ve alertas" on public.stock_alerts
  for select to authenticated using (public.is_admin());

-- Funciones que puede llamar la web
revoke execute on function public.place_order(jsonb, jsonb, jsonb, numeric, text, text, boolean) from public;
revoke execute on function public.set_order_status(text, text) from public;
revoke execute on function public.place_bid(uuid, numeric) from public;
revoke execute on function public.get_auction_bids(uuid, integer) from public;
revoke execute on function public.submit_claim(text, text, jsonb) from public;
-- Supabase además da permiso directo a anon: los visitantes sin cuenta no pujan ni cambian pedidos.
revoke execute on function public.set_order_status(text, text) from anon;
revoke execute on function public.place_bid(uuid, numeric) from anon;
-- Funciones internas: no se exponen como API (los triggers y las políticas las siguen usando).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protect_profile_role() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.place_order(jsonb, jsonb, jsonb, numeric, text, text, boolean) to anon, authenticated;
grant execute on function public.set_order_status(text, text) to authenticated;
grant execute on function public.place_bid(uuid, numeric) to authenticated;
grant execute on function public.get_auction_bids(uuid, integer) to anon, authenticated;
grant execute on function public.submit_claim(text, text, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 8. TIEMPO REAL (stock, precios, subastas y configuración se actualizan solos)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['products', 'auctions', 'settings'] loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
