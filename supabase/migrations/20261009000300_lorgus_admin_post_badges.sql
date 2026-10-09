alter table public.rp_messages
  add column if not exists is_admin_post boolean not null default false;

update public.rp_messages m
set is_admin_post = true
where exists (
  select 1 from public.lorgus_nrp_characters n
  where n.character_id = m.character_id
);

create or replace function public.admin_send_nrp_rp_message(
    p_nrp_character_id uuid,
    p_presence_type text,
    p_region text default null,
    p_location text default null,
    p_from_region text default null,
    p_from_location text default null,
    p_to_region text default null,
    p_to_location text default null,
    p_body text default ''
)
returns public.rp_messages
language plpgsql
security definer
set search_path to ''
as $function$
declare
    caller uuid := auth.uid();
    result_row public.rp_messages;
begin
    if caller is null or not coalesce(public.is_admin(), false) then
        raise exception 'ADMIN_REQUIRED';
    end if;

    if not exists (
        select 1 from public.lorgus_nrp_characters n
        where n.character_id = p_nrp_character_id and n.is_active = true
    ) then
        raise exception 'NRP_CHARACTER_NOT_FOUND';
    end if;

    if p_presence_type not in ('location', 'road') then
        raise exception 'INVALID_PRESENCE_TYPE';
    end if;

    if char_length(trim(coalesce(p_body, ''))) < 1 or char_length(trim(p_body)) > 10000 then
        raise exception 'INVALID_MESSAGE_BODY';
    end if;

    if p_presence_type = 'location' then
        if nullif(trim(coalesce(p_region, '')), '') is null
           or nullif(trim(coalesce(p_location, '')), '') is null
           or p_from_region is not null or p_from_location is not null
           or p_to_region is not null or p_to_location is not null then
            raise exception 'INVALID_LOCATION_SPACE';
        end if;
    else
        if nullif(trim(coalesce(p_from_region, '')), '') is null
           or nullif(trim(coalesce(p_from_location, '')), '') is null
           or nullif(trim(coalesce(p_to_region, '')), '') is null
           or nullif(trim(coalesce(p_to_location, '')), '') is null
           or p_region is not null or p_location is not null then
            raise exception 'INVALID_ROAD_SPACE';
        end if;
    end if;

    insert into public.rp_messages (
        character_id, player_id, presence_type,
        region, location, from_region, from_location, to_region, to_location, body,
        is_admin_post
    )
    values (
        p_nrp_character_id, caller, p_presence_type,
        nullif(trim(p_region), ''), nullif(trim(p_location), ''),
        nullif(trim(p_from_region), ''), nullif(trim(p_from_location), ''),
        nullif(trim(p_to_region), ''), nullif(trim(p_to_location), ''),
        trim(p_body), true
    )
    returning * into result_row;

    return result_row;
end;
$function$;