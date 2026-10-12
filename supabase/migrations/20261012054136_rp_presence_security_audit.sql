-- LORGUS RP access audit: remove stale broad-read policy and harden RPC grants.
-- The first-post lock must be enforced by the current-presence policy, not bypassed
-- by a legacy policy that lets every approved player read every RP message.

drop policy if exists "rp_messages_select_approved_history" on public.rp_messages;

-- These legacy policies must not remain as alternate write paths if table grants
-- are ever changed in the future. Presence writes go through validated RPCs only.
drop policy if exists "rp_presence_insert_own" on public.rp_presence;
drop policy if exists "rp_presence_update_own" on public.rp_presence;
drop policy if exists "rp_presence_delete_own" on public.rp_presence;

-- Privileged user-facing RPCs are available to signed-in users only.
-- Each function still performs its own ownership/admin/presence validation.
revoke execute on function public.approve_character_application(uuid) from public, anon;
grant execute on function public.approve_character_application(uuid) to authenticated;

revoke execute on function public.reject_character_application(uuid) from public, anon;
grant execute on function public.reject_character_application(uuid) to authenticated;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

revoke execute on function public.send_lorgus_rp_reply_with_items(
    uuid, text, text, text, text, text, text, text, text, text, uuid[], bigint
) from public, anon;
grant execute on function public.send_lorgus_rp_reply_with_items(
    uuid, text, text, text, text, text, text, text, text, text, uuid[], bigint
) to authenticated;

revoke execute on function public.touch_lorgus_rp_presence(uuid) from public, anon;
grant execute on function public.touch_lorgus_rp_presence(uuid) to authenticated;

-- Trigger/event-trigger entry points are not RPC endpoints.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.lorgus_character_ability_audit() from public, anon, authenticated;
revoke execute on function public.lorgus_character_application_audit() from public, anon, authenticated;
revoke execute on function public.lorgus_character_application_timestamps() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
