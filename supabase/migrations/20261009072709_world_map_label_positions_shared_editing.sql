-- Allow signed-in users to persist shared world-map label geometry.
-- This migration was applied directly to production and is recorded remotely as 20261009072709.
drop policy if exists "admins can write world map labels" on public.world_map_label_positions;
create policy "authenticated users can write world map labels" on public.world_map_label_positions
    for all to authenticated
    using (true)
    with check (true);
