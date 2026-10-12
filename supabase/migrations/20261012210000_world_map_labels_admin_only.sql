-- Restrict shared world map label changes to administrators.
-- Keep the existing SELECT policy so the map remains readable to everyone.

drop policy if exists "authenticated users can write world map labels"
    on public.world_map_label_positions;

create policy "admins can write world map labels"
    on public.world_map_label_positions
    for all
    to authenticated
    using (coalesce(public.is_admin(), false))
    with check (coalesce(public.is_admin(), false));
