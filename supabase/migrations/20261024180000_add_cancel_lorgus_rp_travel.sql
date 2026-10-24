-- Allow a player to cancel only their own active road trip and return to its origin.
create or replace function public.cancel_lorgus_rp_travel(p_character_id uuid)
returns public.rp_presence
language plpgsql
security definer
set search_path = public
as $$
declare
    current_player uuid := auth.uid();
    current_presence public.rp_presence;
    result_row public.rp_presence;
begin
    if coalesce(public.lorgus_is_access_blocked(), false) then
        raise exception 'ACCESS_BLOCKED';
    end if;
    if current_player is null then
        raise exception 'AUTH_REQUIRED';
    end if;
    if not exists (
        select 1
        from public.character_applications ca
        where ca.character_id = p_character_id
          and ca.player_id = current_player
          and ca.status = 'approved'
    ) then
        raise exception 'CHARACTER_NOT_APPROVED_FOR_PLAYER';
    end if;

    select *
      into current_presence
      from public.rp_presence
     where character_id = p_character_id
     for update;

    if current_presence.presence_type is distinct from 'road' then
        raise exception 'TRAVEL_NOT_ACTIVE';
    end if;
    if current_presence.from_region is null or current_presence.from_location is null then
        raise exception 'TRAVEL_ORIGIN_MISSING';
    end if;

    update public.rp_presence
       set player_id = current_player,
           presence_type = 'location',
           region = current_presence.from_region,
           location = current_presence.from_location,
           from_region = null,
           from_location = null,
           to_region = null,
           to_location = null,
           entered_at = now(),
           started_at = null,
           updated_at = now()
     where character_id = p_character_id
     returning * into result_row;

    return result_row;
end;
$$;

revoke all on function public.cancel_lorgus_rp_travel(uuid) from public;
grant execute on function public.cancel_lorgus_rp_travel(uuid) to authenticated;
