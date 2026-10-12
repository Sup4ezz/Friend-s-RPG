-- DRAFT ONLY — not applied to production.
-- The admin UI no longer edits player-submitted applications.
-- After verifying there are no other legitimate callers, remove the RPC's execute grant.
revoke all on function public.admin_update_character_application(uuid, jsonb)
    from public, anon, authenticated;
