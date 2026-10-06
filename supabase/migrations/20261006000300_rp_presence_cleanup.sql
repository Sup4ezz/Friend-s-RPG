-- LORGUS RP presence API cleanup.
-- The client uses set_lorgus_rp_presence as the only write path.
-- Keep deployed migrations immutable; remove obsolete public RPCs in a new migration.

drop function if exists public.set_rp_presence(uuid, text, text, text, text, text, text, text, text);
drop function if exists public.clear_rp_presence(uuid);

revoke all on table public.rp_presence from authenticated;
grant select on table public.rp_presence to authenticated;

revoke all on function public.set_lorgus_rp_presence(uuid, text, text, text, text, text, text, text, text) from public;
grant execute on function public.set_lorgus_rp_presence(uuid, text, text, text, text, text, text, text, text) to authenticated;
