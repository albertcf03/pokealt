-- =====================================================================
-- PokeAlt · Fotos de productos (Supabase Storage)
-- Ejecutar después de schema.sql. Solo funciona en Supabase.
-- Cualquiera puede ver las fotos (la tienda es pública); solo el admin sube, cambia o borra.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admin ve fotos de productos" on storage.objects;
create policy "admin ve fotos de productos" on storage.objects
  for select to authenticated using (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "admin sube fotos de productos" on storage.objects;
create policy "admin sube fotos de productos" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "admin cambia fotos de productos" on storage.objects;
create policy "admin cambia fotos de productos" on storage.objects
  for update to authenticated using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "admin borra fotos de productos" on storage.objects;
create policy "admin borra fotos de productos" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images' and public.is_admin());
