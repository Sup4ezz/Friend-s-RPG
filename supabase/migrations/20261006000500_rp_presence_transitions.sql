-- LORGUS RP presence transition hardening.
-- Prevent arbitrary teleports and require road transitions to start/end from current state.

create or replace function public.set_lorgus_rp_presence(
    p_character_id uuid, p_presence_type text, p_region text default null,
    p_location text default null, p_from_region text default null,
    p_from_location text default null, p_to_region text default null,
    p_to_location text default null, p_visibility text default 'public'
)
returns public.rp_presence
language plpgsql
security definer
set search_path = public
as $$
declare
    result_row public.rp_presence;
    current_player uuid := auth.uid();
    current_presence public.rp_presence;
    route_ok boolean := false;
begin
    if current_player is null then raise exception 'AUTH_REQUIRED'; end if;

    if not exists (
        select 1 from public.character_applications ca
        where ca.character_id = p_character_id
          and ca.player_id = current_player
          and ca.status = 'approved'
    ) then raise exception 'CHARACTER_NOT_APPROVED_FOR_PLAYER'; end if;

    select * into current_presence
    from public.rp_presence
    where character_id = p_character_id
    for update;

    if p_presence_type not in ('location', 'road') then raise exception 'INVALID_PRESENCE_TYPE'; end if;
    if p_visibility not in ('public', 'hidden') then raise exception 'INVALID_VISIBILITY'; end if;

    if p_presence_type = 'location' then
        if p_region is null or p_location is null then
            raise exception 'LOCATION_PRESENCE_REQUIRES_REGION_AND_LOCATION';
        end if;

        if not (
            (p_region = 'Атэрон' and p_location in ('Примум')) or
            (p_region = 'Каэлор' and p_location in ('Хелион', 'Древнее Пламя')) or
            (p_region = 'Ксандр' and p_location in ('Арджент', 'Меридиан', 'Валькрофт', 'Солмир')) or
            (p_region = 'Лирэн' and p_location in ('Аврора', 'Элвэйн', 'Таллирион', 'Эстерваль')) or
            (p_region = 'Морвейн' and p_location in ('Фин'))
        ) then raise exception 'INVALID_CANONICAL_LOCATION'; end if;

        if current_presence.presence_type is distinct from 'road' then
            raise exception 'LOCATION_ENTRY_REQUIRES_CURRENT_ROAD';
        end if;

        if current_presence.to_region is distinct from p_region
           or current_presence.to_location is distinct from p_location then
            raise exception 'DESTINATION_DOES_NOT_MATCH_CURRENT_ROAD';
        end if;

        insert into public.rp_presence (
            character_id, player_id, presence_type, region, location,
            visibility, entered_at, updated_at
        ) values (
            p_character_id, current_player, 'location', p_region, p_location,
            p_visibility, now(), now()
        )
        on conflict (character_id) do update set
            player_id = excluded.player_id, presence_type = excluded.presence_type,
            region = excluded.region, location = excluded.location,
            from_region = null, from_location = null, to_region = null, to_location = null,
            visibility = excluded.visibility, entered_at = excluded.entered_at,
            started_at = null, updated_at = now()
        returning * into result_row;
        return result_row;
    end if;

    if p_from_region is null or p_from_location is null
       or p_to_region is null or p_to_location is null then
        raise exception 'ROAD_PRESENCE_REQUIRES_BOTH_ENDPOINTS';
    end if;

    if current_presence.presence_type is distinct from 'location'
       or current_presence.region is distinct from p_from_region
       or current_presence.location is distinct from p_from_location then
        raise exception 'ROAD_MUST_START_AT_CURRENT_LOCATION';
    end if;

    if not (
        (p_from_region = 'Атэрон' and p_from_location in ('Примум')) or
        (p_from_region = 'Каэлор' and p_from_location in ('Хелион', 'Древнее Пламя')) or
        (p_from_region = 'Ксандр' and p_from_location in ('Арджент', 'Меридиан', 'Валькрофт', 'Солмир')) or
        (p_from_region = 'Лирэн' and p_from_location in ('Аврора', 'Элвэйн', 'Таллирион', 'Эстерваль')) or
        (p_from_region = 'Морвейн' and p_from_location in ('Фин'))
    ) then raise exception 'INVALID_CANONICAL_ROUTE_ENDPOINT'; end if;

    if not (
        (p_to_region = 'Атэрон' and p_to_location in ('Примум')) or
        (p_to_region = 'Каэлор' and p_to_location in ('Хелион', 'Древнее Пламя')) or
        (p_to_region = 'Ксандр' and p_to_location in ('Арджент', 'Меридиан', 'Валькрофт', 'Солмир')) or
        (p_to_region = 'Лирэн' and p_to_location in ('Аврора', 'Элвэйн', 'Таллирион', 'Эстерваль')) or
        (p_to_region = 'Морвейн' and p_to_location in ('Фин'))
    ) then raise exception 'INVALID_CANONICAL_ROUTE_ENDPOINT'; end if;

    route_ok :=
        (p_from_region = 'Каэлор' and p_to_region = 'Атэрон') or (p_from_region = 'Атэрон' and p_to_region = 'Каэлор') or
        (p_from_region = 'Атэрон' and p_to_region = 'Морвейн') or (p_from_region = 'Морвейн' and p_to_region = 'Атэрон') or
        (p_from_region = 'Атэрон' and p_to_region = 'Ксандр') or (p_from_region = 'Ксандр' and p_to_region = 'Атэрон') or
        (p_from_region = 'Ксандр' and p_to_region = 'Морвейн') or (p_from_region = 'Морвейн' and p_to_region = 'Ксандр') or
        (p_from_region = 'Ксандр' and p_to_region = 'Святые Земли') or (p_from_region = 'Святые Земли' and p_to_region = 'Ксандр') or
        (p_from_region = 'Святые Земли' and p_to_region = 'Спорные Земли') or (p_from_region = 'Спорные Земли' and p_to_region = 'Святые Земли') or
        (p_from_region = 'Святые Земли' and p_to_region = 'Лирэн') or (p_from_region = 'Лирэн' and p_to_region = 'Святые Земли') or
        (p_from_region = 'Лирэн' and p_to_region = 'Ксандр') or (p_from_region = 'Ксандр' and p_to_region = 'Лирэн') or
        (p_from_region = 'Ксандр' and p_to_region = 'Каэлор') or (p_from_region = 'Каэлор' and p_to_region = 'Ксандр') or
        (p_from_region = 'Морвейн' and p_to_region = 'Спорные Земли') or (p_from_region = 'Спорные Земли' and p_to_region = 'Морвейн');

    if not route_ok then raise exception 'NO_CANONICAL_DIRECT_ROUTE'; end if;

    insert into public.rp_presence (
        character_id, player_id, presence_type,
        from_region, from_location, to_region, to_location,
        visibility, started_at, updated_at
    ) values (
        p_character_id, current_player, 'road',
        p_from_region, p_from_location, p_to_region, p_to_location,
        p_visibility, now(), now()
    )
    on conflict (character_id) do update set
        player_id = excluded.player_id, presence_type = excluded.presence_type,
        region = null, location = null,
        from_region = excluded.from_region, from_location = excluded.from_location,
        to_region = excluded.to_region, to_location = excluded.to_location,
        visibility = excluded.visibility, entered_at = null,
        started_at = excluded.started_at, updated_at = now()
    returning * into result_row;
    return result_row;
end;
$$;

create or replace function public.clear_lorgus_rp_presence(p_character_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

    if not exists (
        select 1 from public.character_applications ca
        where ca.character_id = p_character_id
          and ca.player_id = auth.uid()
          and ca.status = 'approved'
    ) then raise exception 'CHARACTER_NOT_APPROVED_FOR_PLAYER'; end if;

    delete from public.rp_presence
    where character_id = p_character_id;
end;
$$;

revoke all on function public.clear_lorgus_rp_presence(uuid) from public;
grant execute on function public.clear_lorgus_rp_presence(uuid) to authenticated;
