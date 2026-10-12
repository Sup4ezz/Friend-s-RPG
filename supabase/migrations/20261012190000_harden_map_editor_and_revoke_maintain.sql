-- Prevent API roles from invoking table-maintenance operations.
-- MAINTAIN is not needed by browser clients; this only revokes the privilege.
REVOKE MAINTAIN ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- Shared map-label positions are application-wide state. Only admins may edit them.
-- Reading remains available to anon/authenticated under the existing SELECT policy.
DROP POLICY IF EXISTS "authenticated users can write world map labels"
    ON public.world_map_label_positions;
DROP POLICY IF EXISTS "admins can write world map labels"
    ON public.world_map_label_positions;

CREATE POLICY "admins can write world map labels"
    ON public.world_map_label_positions
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
