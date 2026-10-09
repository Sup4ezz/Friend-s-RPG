-- Ensure signed-in users can persist shared world-map label positions.
grant select on table public.world_map_label_positions to anon, authenticated;
grant insert, update, delete on table public.world_map_label_positions to authenticated;
alter table public.world_map_label_positions enable row level security;
drop policy if exists "admins can write world map labels" on public.world_map_label_positions;
drop policy if exists "authenticated users can write world map labels" on public.world_map_label_positions;
create policy "authenticated users can write world map labels" on public.world_map_label_positions
    for all to authenticated
    using (true)
    with check (true);
