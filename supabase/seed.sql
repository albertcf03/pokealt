-- =====================================================================
-- PokeAlt · Datos iniciales (ejecutar después de schema.sql)
-- Es seguro ejecutarlo más de una vez: no duplica productos.
-- =====================================================================

insert into public.settings (id, yape_number, plin_number, wallet_holder, low_stock_threshold, free_shipping_from)
values (1, '987 654 321', '987 654 321', 'PokeAlt', 3, 500)
on conflict (id) do nothing;

insert into public.products (id, name, set_name, condition, price, stock, category, image, is_featured, rarity, active, description) values
  ('p1', 'Elite Trainer Box Evoluciones Prismáticas', 'SV8.5 · Evoluciones Prismáticas', 'Sellado de fábrica', 459, 3, 'Sellado', 'psychic', true, 'Producto sellado', true, 'Incluye 9 sobres, carta promo de Eevee, 65 fundas, dados y guía del set. Importación oficial en inglés.'),
  ('p2', 'Booster Box Chispas Fulgurantes (36 sobres)', 'SV08 · Surging Sparks', 'Sellado de fábrica', 689, 5, 'Sellado', 'electric', false, 'Producto sellado', true, 'Caja display de 36 sobres con film original. Ideal para abrir en stream o guardar como inversión.'),
  ('p3', 'Sobre suelto Rivales Predestinados', 'SV10 · Destined Rivals', 'Sellado de fábrica', 22, 120, 'Sellado', 'dark', false, 'Producto sellado', true, 'Sobre de 10 cartas. Límite de 20 unidades por pedido para cuidar el stock de la comunidad.'),
  ('p4', 'Charizard ex 199/165', 'SV 151', 'Near Mint (NM)', 1450, 1, 'Singles', 'fire', true, 'Special Illustration Rare', true, 'Carta revisada con lupa: centrado 55/45, sin marcas en bordes. Se envía en top loader y bolsa sellada.'),
  ('p5', 'Pikachu ex 238/191', 'SV08 · Surging Sparks', 'Near Mint (NM)', 1290, 2, 'Singles', 'electric', true, 'Special Illustration Rare', true, 'Una de las cartas más buscadas de la era Escarlata y Púrpura. Fotos reales disponibles por WhatsApp.'),
  ('p6', 'Umbreon ex 161/131', 'SV8.5 · Evoluciones Prismáticas', 'Near Mint (NM)', 3890, 1, 'Singles', 'dark', true, 'Special Illustration Rare', true, 'Pieza de colección. Incluye verificación en video antes del envío y seguro de transporte.'),
  ('p7', 'Mew ex 232/091 (Gold)', 'SV4.5 · Paldean Fates', 'Lightly Played (LP)', 145, 3, 'Singles', 'psychic', false, 'Hyper Rare', true, 'Leve desgaste en una esquina posterior (ver fotos). Frente en excelente estado.'),
  ('p8', 'Gardevoir ex 245/198', 'SV01 · Scarlet & Violet', 'Near Mint (NM)', 210, 0, 'Singles', 'fairy', false, 'Special Illustration Rare', true, 'Activa la alerta de stock en nuestro canal de WhatsApp para enterarte de la reposición.'),
  ('p9', 'Greninja ex 214/167', 'SV06 · Twilight Masquerade', 'Near Mint (NM)', 780, 2, 'Singles', 'water', false, 'Special Illustration Rare', true, 'Carta recién abierta, directo a funda. Sin whitening visible.'),
  ('p10', 'Protectores Dragon Shield Matte (100 u.)', 'Accesorio · Standard size', 'Nuevo', 55, 40, 'Accesorios', 'colorless', false, 'Accesorio', true, 'Fundas mate de alta resistencia para cartas tamaño estándar (63 × 88 mm).'),
  ('p11', 'Binder Vault X 9 bolsillos · 360 cartas', 'Accesorio · Carpeta', 'Nuevo', 149, 6, 'Accesorios', 'metal', false, 'Accesorio', true, 'Carpeta con cierre, bolsillos de carga lateral y páginas libres de ácido.'),
  ('p12', 'Top Loaders 35pt (25 u.)', 'Accesorio · Protección rígida', 'Nuevo', 18, 3, 'Accesorios', 'colorless', false, 'Accesorio', true, 'Protección rígida para singles de valor. Compatible con fundas perfect fit.'),
  ('p13', 'Preventa · Booster Box próxima expansión', 'Por confirmar · Nov 2026', 'Sellado de fábrica', 720, 10, 'Preventas', 'dragon', true, 'Producto sellado', true, 'Reserva con el 100% del pago. Precio congelado; se entrega la semana del lanzamiento oficial.'),
  ('p14', 'Preventa · Elite Trainer Box próxima expansión', 'Por confirmar · Nov 2026', 'Sellado de fábrica', 399, 8, 'Preventas', 'grass', false, 'Producto sellado', true, 'Cupos limitados por DNI. Si la distribución oficial se retrasa, puedes pedir reembolso total.')
on conflict (id) do nothing;

-- Subasta inicial: cierra el domingo a las 20:00 (hora de Lima).
-- Si se carga de jueves en la noche en adelante, pasa al domingo siguiente para que dure al menos 3 días.
insert into public.auctions (title, grade, image, start_price, increment, ends_at)
select 'Charizard 4/102 Holo · Base Set', 'PSA 8 · Unlimited', 'fire', 1800, 50,
       ((date_trunc('week', now() at time zone 'America/Lima') + interval '6 days 20 hours')
         + case when now() at time zone 'America/Lima' >= date_trunc('week', now() at time zone 'America/Lima') + interval '3 days 20 hours'
                then interval '7 days' else interval '0' end) at time zone 'America/Lima'
where not exists (select 1 from public.auctions);
