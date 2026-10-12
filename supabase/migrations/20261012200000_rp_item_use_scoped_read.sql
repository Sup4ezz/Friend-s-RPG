-- Keep RP item-use metadata behind the same active-character room authorization.
create or replace function public.get_lorgus_rp_message_item_uses(
    p_character_id uuid,
    p_presence_type text,
    p_region text default null,
    p_location text default null,
    p_from_region text default null,
    p_from_location text default null,
    p_to_region text default null,
    p_to_location text default null,
    p_since timestamptz default null,
    p_message_ids bigint[] default null
)
returns table (
    message_id bigint,
    item_id uuid,
    quantity integer,
    status text,
    items jsonb
)
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $function$
declare
    v_admin boolean := coalesce(public.is_admin(), false);
    v_has_presence boolean;
    v_allowed boolean;
begin
    if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
    if p_character_id is null then raise exception 'CHARACTER_REQUIRED'; end if;
    if p_presence_type is null or p_presence_type not in ('location', 'road') then
        raise exception 'INVALID_RP_SPACE';
    end if;

    if not v_admin and not exists (
        select 1 from public.character_applications ca
        where ca.character_id = p_character_id
          and ca.player_id = auth.uid()
          and ca.status = 'approved'
    ) then
        raise exception 'CHARACTER_NOT_OWNED_OR_APPROVED';
    end if;

    select exists (
        select 1 from public.rp_presence p
        where p.character_id = p_character_id and p.player_id = auth.uid()
    ) into v_has_presence;

    if not v_admin and v_has_presence then
        select exists (
            select 1 from public.rp_presence p
            where p.character_id = p_character_id
              and p.player_id = auth.uid()
              and p.presence_type = p_presence_type
              and (
                  (p.presence_type = 'location'
                   and p.region = p_region and p.location = p_location
                   and p_from_region is null and p_from_location is null
                   and p_to_region is null and p_to_location is null)
                  or
                  (p.presence_type = 'road'
                   and p.from_region = p_from_region and p.from_location = p_from_location
                   and p.to_region = p_to_region and p.to_location = p_to_location
                   and p_region is null and p_location is null)
              )
        ) into v_allowed;
        if not coalesce(v_allowed, false) then
            raise exception 'RP_SPACE_LOCKED_FOR_CHARACTER';
        end if;
    end if;

    return query
    select u.message_id, u.item_id, u.quantity, u.status,
           jsonb_build_object('name', i.name, 'icon', i.icon, 'color', i.color, 'rarity', i.rarity)
    from public.rp_message_item_uses u
    join public.rp_messages m on m.id = u.message_id
    join public.items i on i.id = u.item_id
    where u.status = 'active'
      and (p_message_ids is null or u.message_id = any(p_message_ids))
      and (p_since is null or m.created_at >= p_since)
      and m.presence_type = p_presence_type
      and (
          (p_presence_type = 'location'
           and m.region = p_region and m.location = p_location
           and m.from_region is null and m.from_location is null
           and m.to_region is null and m.to_location is null)
          or
          (p_presence_type = 'road'
           and m.from_region = p_from_region and m.from_location = p_from_location
           and m.to_region = p_to_region and m.to_location = p_to_location
           and m.region is null and m.location is null)
      );
end;
$function$;

revoke all on function public.get_lorgus_rp_message_item_uses(uuid,text,text,text,text,text,text,text,timestamptz,bigint[]) from public, anon;
grant execute on function public.get_lorgus_rp_message_item_uses(uuid,text,text,text,text,text,text,text,timestamptz,bigint[]) to authenticated;
