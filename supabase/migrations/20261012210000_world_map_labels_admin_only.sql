-- Restrict shared world map label changes to administrators.
-- Keep the existing SELECT policy so the map remains readable to everyone.
-- Drop both policy names because the production policy was secured directly
-- before this migration was added to version control.

drop policy if exists "authenticated users can write world map labels"
    on public.world_map_label_positions;
drop policy if exists "admins can write world map labels"
    on public.world_map_label_positions;

create policy "admins can write world map labels"
    on public.world_map_label_positions
    for all
    to authenticated
    using (coalesce(public.is_admin(), false))
    with check (coalesce(public.is_admin(), false));
