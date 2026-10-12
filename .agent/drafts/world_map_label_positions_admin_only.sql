-- DRAFT ONLY — do not apply to production without explicit approval.
-- Restore read access for map labels, but restrict all writes to administrators.
-- The existing "world map labels are readable" SELECT policy is intentionally preserved.

drop policy if exists "authenticated users can write world map labels"
    on public.world_map_label_positions;

create policy "admins can write world map labels"
    on public.world_map_label_positions
    for all
    to authenticated
    using (coalesce(public.is_admin(), false))
    with check (coalesce(public.is_admin(), false));

-- Do not revoke SELECT: public map rendering needs to read label positions.
-- Existing table grants and RLS remain otherwise unchanged.
