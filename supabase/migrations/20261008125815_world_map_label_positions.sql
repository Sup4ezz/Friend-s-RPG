-- Persist editable label geometry for the world map.
-- The version matches the already-applied production migration history.
create table if not exists public.world_map_label_positions (
    id text primary key, x double precision not null, y double precision not null,
    w double precision not null, h double precision not null,
    updated_at timestamptz not null default now()
);
alter table public.world_map_label_positions enable row level security;
grant select on table public.world_map_label_positions to anon, authenticated;
grant insert, update, delete on table public.world_map_label_positions to authenticated;
drop policy if exists "world map labels are readable" on public.world_map_label_positions;
create policy "world map labels are readable" on public.world_map_label_positions
    for select to anon, authenticated using (true);
drop policy if exists "admins can write world map labels" on public.world_map_label_positions;
create policy "admins can write world map labels" on public.world_map_label_positions
    for all to authenticated
    using (exists (select 1 from public.admins where admins.user_id=(select auth.uid())))
    with check (exists (select 1 from public.admins where admins.user_id=(select auth.uid())));
