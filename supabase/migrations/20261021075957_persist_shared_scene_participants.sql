-- Reassert the shared-scene RPC that persists all selected participants.
-- Publish one shared RP scene associated with multiple approved/active characters.
create or replace function public.admin_send_multi_character_rp_message(
    p_character_id uuid,
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
set search_path = public
as $lorgus$
declare
    caller uuid := auth.uid();
    payload jsonb;
    actor jsonb;
    actor_count integer;
    result_row public.rp_messages;
begin
    if caller is null or not coalesce(public.is_admin(), false) then
        raise exception 'ADMIN_REQUIRED';
    end if;
    if char_length(trim(coalesce(p_body, ''))) < 1 or char_length(trim(p_body)) > 10000
       or left(p_body, length('[[LORGUS_MULTI_ACTOR_V1]]')) <> '[[LORGUS_MULTI_ACTOR_V1]]' then
        raise exception 'INVALID_MULTI_ACTOR_BODY';
    end if;

    begin
        payload := substring(p_body from length('[[LORGUS_MULTI_ACTOR_V1]]') + 1)::jsonb;
    exception when others then
        raise exception 'INVALID_MULTI_ACTOR_PAYLOAD';
    end;

    if coalesce(payload->>'mode','') <> 'shared_scene'
       or nullif(trim(coalesce(payload->>'body','')), '') is null
       or jsonb_typeof(payload->'actors') <> 'array' then
        raise exception 'INVALID_SHARED_SCENE';
    end if;

    select count(*) into actor_count from jsonb_array_elements(payload->'actors');
    if actor_count < 2 then raise exception 'SHARED_SCENE_REQUIRES_TWO_CHARACTERS'; end if;

    if (payload->'actors'->0->>'id') is null
       or (payload->'actors'->0->>'id')::uuid <> p_character_id then
        raise exception 'PRIMARY_CHARACTER_MISMATCH';
    end if;

    for actor in select value from jsonb_array_elements(payload->'actors')
    loop
        if nullif(actor->>'id','') is null then raise exception 'INVALID_ACTOR_ID'; end if;
        if not (
            exists (
                select 1 from public.character_applications ca
                where ca.character_id = (actor->>'id')::uuid and ca.status = 'approved'
            )
            or exists (
                select 1 from public.lorgus_nrp_characters n
                where n.character_id = (actor->>'id')::uuid and n.is_active = true
            )
        ) then
            raise exception 'ACTOR_NOT_APPROVED_OR_ACTIVE';
        end if;
    end loop;

    if p_presence_type = 'location' then
        if nullif(trim(coalesce(p_region,'')),'') is null or nullif(trim(coalesce(p_location,'')),'') is null
           or p_from_region is not null or p_from_location is not null or p_to_region is not null or p_to_location is not null then
            raise exception 'INVALID_LOCATION_SPACE';
        end if;
    elsif p_presence_type = 'road' then
        if nullif(trim(coalesce(p_from_region,'')),'') is null or nullif(trim(coalesce(p_from_location,'')),'') is null
           or nullif(trim(coalesce(p_to_region,'')),'') is null or nullif(trim(coalesce(p_to_location,'')),'') is null
           or p_region is not null or p_location is not null then
            raise exception 'INVALID_ROAD_SPACE';
        end if;
    else
        raise exception 'INVALID_PRESENCE_TYPE';
    end if;

    insert into public.rp_messages (
        character_id, player_id, presence_type, region, location,
        from_region, from_location, to_region, to_location, body, status, is_admin_post
    ) values (
        p_character_id, caller, p_presence_type, nullif(trim(p_region),''),
        nullif(trim(p_location),''), nullif(trim(p_from_region),''), nullif(trim(p_from_location),''),
        nullif(trim(p_to_region),''), nullif(trim(p_to_location),''), trim(p_body), 'active', true
    ) returning * into result_row;

    insert into public.rp_message_participants(message_id, character_id)
    select result_row.id, (actor->>'id')::uuid
    from jsonb_array_elements(payload->'actors') actor
    on conflict (message_id, character_id) do nothing;

    return result_row;
end;
$lorgus$;

revoke all on function public.admin_send_multi_character_rp_message(uuid,text,text,text,text,text,text,text,text) from public, anon;
grant execute on function public.admin_send_multi_character_rp_message(uuid,text,text,text,text,text,text,text,text) to authenticated;
