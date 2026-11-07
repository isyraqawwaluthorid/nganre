-- Jalankan di Supabase: Dashboard → SQL Editor → New query → tempel → Run.
-- Setelah itu jalankan supabase/seed.sql untuk mengisi datanya.

create extension if not exists postgis with schema extensions;

create table if not exists public.places (
  id text primary key,
  name text not null,
  category text not null check (
    category in ('coto', 'konro', 'pallubasa', 'sop-saudara', 'mie', 'seafood', 'jajanan', 'khas-daerah', 'warkop')
  ),
  lat double precision not null,
  lng double precision not null,
  -- Kolom geografi yang otomatis dihitung dari lat/lng, dipakai untuk query jarak.
  location extensions.geography(point, 4326) generated always as (
    extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography
  ) stored,
  address text,
  district text,
  opening_hours text,
  opening_hours_source text,
  opening_hours_url text,
  osm_url text,
  created_at timestamptz not null default now()
);

create index if not exists places_location_idx on public.places using gist (location);
create index if not exists places_category_idx on public.places (category);

-- Semua orang boleh membaca, tapi belum ada yang boleh menulis lewat API.
-- Policy untuk menambah tempat dibuat nanti bersama fitur login.
alter table public.places enable row level security;

drop policy if exists "Semua orang bisa melihat tempat" on public.places;
create policy "Semua orang bisa melihat tempat" on public.places for select using (true);

grant select on public.places to anon, authenticated;

-- ---------- Favorit (butuh login) ----------

create table if not exists public.favorites (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  place_id text not null references public.places (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, place_id)
);

-- Setiap user hanya bisa melihat, menambah, dan menghapus favoritnya sendiri.
alter table public.favorites enable row level security;

drop policy if exists "Lihat favorit sendiri" on public.favorites;
create policy "Lihat favorit sendiri" on public.favorites
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Tambah favorit sendiri" on public.favorites;
create policy "Tambah favorit sendiri" on public.favorites
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Hapus favorit sendiri" on public.favorites;
create policy "Hapus favorit sendiri" on public.favorites
  for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, delete on public.favorites to authenticated;
