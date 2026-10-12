-- A player must not be able to delete their character's RP presence.
-- Presence locks the character to the location/road after the first RP post.
-- Keep the RPC available to administrators for moderation/maintenance only.

create or replace function public.clear_lorgus_rp_presence(p_character_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
    if auth.uid() is null then
        raise exception 'AUTH_REQUIRED';
    end if;

    if not coalesce(public.is_admin(), false) then
        raise exception 'ONLY_ADMIN_CAN_CLEAR_RP_PRESENCE';
    end if;

    delete from public.rp_presence
    where character_id = p_character_id;
end;
$function$;

revoke execute on function public.clear_lorgus_rp_presence(uuid) from public, anon;
grant execute on function public.clear_lorgus_rp_presence(uuid) to authenticated;
