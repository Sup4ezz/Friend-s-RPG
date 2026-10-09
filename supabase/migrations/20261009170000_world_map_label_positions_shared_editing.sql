-- Allow signed-in users to persist shared world-map label geometry.
-- Everyone reads the same positions; edits are written to Supabase, not only localStorage.
drop policy if exists "admins can write world map labels" on public.world_map_label_positions;
create policy "authenticated users can write world map labels" on public.world_map_label_positions
    for all to authenticated
    using (true)
    with check (true);
