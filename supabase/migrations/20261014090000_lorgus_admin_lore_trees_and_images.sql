-- LORGUS admin-editable lore trees, entities and illustrations.
create table if not exists public.lorgus_lore_custom_entries (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.lorgus_lore_custom_entries(id) on delete cascade,
  kind text not null default 'entity' check (kind in ('tree','entity')),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  subtitle text not null default '' check (char_length(subtitle) <= 240),
  body text not null default '' check (char_length(body) <= 30000),
  image_path text,
  is_published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  constraint lorgus_lore_custom_parent_kind check (parent_id is null or kind = 'entity'),
  constraint lorgus_lore_custom_image_path check (image_path is null or (image_path like 'lore-custom/%' and image_path !~ '(^|/)\.\.(/|$)'))
);
create index if not exists lorgus_lore_custom_parent_idx on public.lorgus_lore_custom_entries(parent_id, sort_order, title);
create index if not exists lorgus_lore_custom_published_idx on public.lorgus_lore_custom_entries(is_published, sort_order);
alter table public.lorgus_lore_custom_entries enable row level security;
revoke all on public.lorgus_lore_custom_entries from public, anon, authenticated;
grant select on public.lorgus_lore_custom_entries to anon, authenticated;
grant insert, update, delete on public.lorgus_lore_custom_entries to authenticated;
drop policy if exists "Public can read published lore entries" on public.lorgus_lore_custom_entries;
create policy "Public can read published lore entries" on public.lorgus_lore_custom_entries for select to anon, authenticated using (is_published or coalesce(public.is_admin(), false));
drop policy if exists "Admins can create lore entries" on public.lorgus_lore_custom_entries;
create policy "Admins can create lore entries" on public.lorgus_lore_custom_entries for insert to authenticated with check (coalesce(public.is_admin(), false) and created_by = auth.uid() and updated_by = auth.uid());
drop policy if exists "Admins can update lore entries" on public.lorgus_lore_custom_entries;
create policy "Admins can update lore entries" on public.lorgus_lore_custom_entries for update to authenticated using (coalesce(public.is_admin(), false)) with check (coalesce(public.is_admin(), false) and updated_by = auth.uid());
drop policy if exists "Admins can delete lore entries" on public.lorgus_lore_custom_entries;
create policy "Admins can delete lore entries" on public.lorgus_lore_custom_entries for delete to authenticated using (coalesce(public.is_admin(), false));

create table if not exists public.lorgus_lore_media (
  note_path text primary key check (char_length(note_path) between 1 and 500),
  image_path text not null check (image_path like 'lore-custom/%' and image_path !~ '(^|/)\.\.(/|$)'),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.lorgus_lore_media enable row level security;
revoke all on public.lorgus_lore_media from public, anon, authenticated;
grant select on public.lorgus_lore_media to anon, authenticated;
grant insert, update, delete on public.lorgus_lore_media to authenticated;
drop policy if exists "Public can read lore media" on public.lorgus_lore_media;
create policy "Public can read lore media" on public.lorgus_lore_media for select to anon, authenticated using (true);
drop policy if exists "Admins can create lore media" on public.lorgus_lore_media;
create policy "Admins can create lore media" on public.lorgus_lore_media for insert to authenticated with check (coalesce(public.is_admin(), false) and updated_by = auth.uid());
drop policy if exists "Admins can update lore media" on public.lorgus_lore_media;
create policy "Admins can update lore media" on public.lorgus_lore_media for update to authenticated using (coalesce(public.is_admin(), false)) with check (coalesce(public.is_admin(), false) and updated_by = auth.uid());
drop policy if exists "Admins can delete lore media" on public.lorgus_lore_media;
create policy "Admins can delete lore media" on public.lorgus_lore_media for delete to authenticated using (coalesce(public.is_admin(), false));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lorgus-lore-images', 'lorgus-lore-images', true, 8388608, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public = true, file_size_limit = 8388608, allowed_mime_types = array['image/jpeg','image/png','image/webp','image/avif'];
drop policy if exists "Admins upload lore illustrations" on storage.objects;
create policy "Admins upload lore illustrations" on storage.objects for insert to authenticated with check (bucket_id = 'lorgus-lore-images' and (storage.foldername(name))[1] = 'lore-custom' and coalesce(public.is_admin(), false));
drop policy if exists "Admins replace lore illustrations" on storage.objects;
create policy "Admins replace lore illustrations" on storage.objects for update to authenticated using (bucket_id = 'lorgus-lore-images' and (storage.foldername(name))[1] = 'lore-custom' and coalesce(public.is_admin(), false)) with check (bucket_id = 'lorgus-lore-images' and (storage.foldername(name))[1] = 'lore-custom' and coalesce(public.is_admin(), false));
drop policy if exists "Admins delete lore illustrations" on storage.objects;
create policy "Admins delete lore illustrations" on storage.objects for delete to authenticated using (bucket_id = 'lorgus-lore-images' and (storage.foldername(name))[1] = 'lore-custom' and coalesce(public.is_admin(), false));

create or replace function public.lorgus_lore_touch_updated_at()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at = now(); return new; end; $$;
revoke all on function public.lorgus_lore_touch_updated_at() from public, anon, authenticated;
drop trigger if exists lorgus_lore_custom_touch on public.lorgus_lore_custom_entries;
create trigger lorgus_lore_custom_touch before update on public.lorgus_lore_custom_entries for each row execute function public.lorgus_lore_touch_updated_at();
