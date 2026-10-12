-- LORGUS security: avoid leaking whether an RP message ID exists.
-- Validate character ownership before looking up the reply target, then use
-- one error for a missing target and a target belonging to another chat.
create or replace function public.send_lorgus_rp_reply_with_items(
    p_character_id uuid,
    p_presence_type text,
    p_region text default null,
    p_location text default null,
    p_from_region text default null,
    p_from_location text default null,
    p_to_region text default null,
    p_to_location text default null,
    p_body text default null,
    p_visibility text default 'public',
    p_inventory_ids uuid[] default '{}'::uuid[],
    p_reply_to_id bigint default null
)
returns public.rp_messages
language plpgsql
security definer
set search_path = public
as $function$
declare
    parent_row public.rp_messages;
    result_row public.rp_messages;
begin
    if auth.uid() is null then
        raise exception 'AUTH_REQUIRED';
    end if;

    -- Do not let callers probe message IDs before proving character ownership.
    if not exists (
        select 1
        from public.character_applications ca
        where ca.character_id = p_character_id
          and ca.player_id = auth.uid()
          and ca.status = 'approved'
    ) then
        raise exception 'CHARACTER_ACCESS_DENIED';
    end if;

    if p_reply_to_id is null then
        raise exception 'REPLY_TARGET_UNAVAILABLE';
    end if;

    select * into parent_row
    from public.rp_messages
    where id = p_reply_to_id;

    if parent_row.id is null
       or parent_row.presence_type is distinct from p_presence_type
       or parent_row.region is distinct from p_region
       or parent_row.location is distinct from p_location
       or parent_row.from_region is distinct from p_from_region
       or parent_row.from_location is distinct from p_from_location
       or parent_row.to_region is distinct from p_to_region
       or parent_row.to_location is distinct from p_to_location then
        raise exception 'REPLY_TARGET_UNAVAILABLE';
    end if;

    result_row := public.send_lorgus_rp_message_with_items(
        p_character_id,
        p_presence_type,
        p_region,
        p_location,
        p_from_region,
        p_from_location,
        p_to_region,
        p_to_location,
        p_body,
        p_visibility,
        p_inventory_ids
    );

    update public.rp_messages
    set reply_to_id = p_reply_to_id
    where id = result_row.id
    returning * into result_row;

    return result_row;
end;
$function$;
