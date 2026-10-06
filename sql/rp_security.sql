-- LORGUS RP server-side presence authority
-- Run this migration in Supabase SQL Editor before using the new client code.
-- It validates character ownership/approval and canonical world locations/routes
-- on the server instead of trusting a client-supplied rp_presence row.

create or replace function public.set_lorgus_rp_presence(
    p_character_id uuid,
    p_presence_type text,
    p_region text default null,
    p_location text default null,
    p_from_region text default null,
    p_from_location text default null,
    p_to_region text default null,
    p_to_location text default null,
    p_visibility text default 'public'
)
returns public.rp_presence
language plpgsql
security definer
set search_path = public
as $$
declare
    result_row public.rp_presence;
    current_player uuid := auth.uid();
    route_ok boolean := false;
    from_location_ok boolean := false;
    to_location_ok boolean := false;
begin
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

    if p_presence_type not in ('location', 'road') then
        raise exception 'INVALID_PRESENCE_TYPE';
    end if;

    if p_visibility not in ('public', 'hidden') then
        raise exception 'INVALID_VISIBILITY';
    end if;

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
        ) then
            raise exception 'INVALID_CANONICAL_LOCATION';
        end if;

        insert into public.rp_presence (
            character_id,
            player_id,
            presence_type,
            region,
            location,
            from_region,
            from_location,
            to_region,
            to_location,
            visibility,
            entered_at,
            started_at,
            updated_at
        )
        values (
            p_character_id,
            current_player,
            'location',
            p_region,
            p_location,
            null,
            null,
            null,
            null,
            p_visibility,
            now(),
            null,
            now()
        )
        on conflict (character_id) do update
        set
            player_id = excluded.player_id,
            presence_type = excluded.presence_type,
            region = excluded.region,
            location = excluded.location,
            from_region = null,
            from_location = null,
            to_region = null,
            to_location = null,
            visibility = excluded.visibility,
            entered_at = excluded.entered_at,
            started_at = null,
            updated_at = now()
        returning * into result_row;

        return result_row;
    end if;

    if p_from_region is null or p_from_location is null
       or p_to_region is null or p_to_location is null then
        raise exception 'ROAD_PRESENCE_REQUIRES_BOTH_ENDPOINTS';
    end if;

    from_location_ok := (
        (p_from_region = 'Атэрон' and p_from_location in ('Примум')) or
        (p_from_region = 'Каэлор' and p_from_location in ('Хелион', 'Древнее Пламя')) or
        (p_from_region = 'Ксандр' and p_from_location in ('Арджент', 'Меридиан', 'Валькрофт', 'Солмир')) or
        (p_from_region = 'Лирэн' and p_from_location in ('Аврора', 'Элвэйн', 'Таллирион', 'Эстерваль')) or
        (p_from_region = 'Морвейн' and p_from_location in ('Фин'))
    );

    to_location_ok := (
        (p_to_region = 'Атэрон' and p_to_location in ('Примум')) or
        (p_to_region = 'Каэлор' and p_to_location in ('Хелион', 'Древнее Пламя')) or
        (p_to_region = 'Ксандр' and p_to_location in ('Арджент', 'Меридиан', 'Валькрофт', 'Солмир')) or
        (p_to_region = 'Лирэн' and p_to_location in ('Аврора', 'Элвэйн', 'Таллирион', 'Эстерваль')) or
        (p_to_region = 'Морвейн' and p_to_location in ('Фин'))
    );

    if not from_location_ok or not to_location_ok then
        raise exception 'INVALID_CANONICAL_ROUTE_ENDPOINT';
    end if;

    route_ok :=
        (p_from_region = 'Каэлор' and p_to_region = 'Атэрон') or
        (p_from_region = 'Атэрон' and p_to_region = 'Каэлор') or
        (p_from_region = 'Атэрон' and p_to_region = 'Морвейн') or
        (p_from_region = 'Морвейн' and p_to_region = 'Атэрон') or
        (p_from_region = 'Атэрон' and p_to_region = 'Ксандр') or
        (p_from_region = 'Ксандр' and p_to_region = 'Атэрон') or
        (p_from_region = 'Ксандр' and p_to_region = 'Морвейн') or
        (p_from_region = 'Морвейн' and p_to_region = 'Ксандр') or
        (p_from_region = 'Ксандр' and p_to_region = 'Святые Земли') or
        (p_from_region = 'Святые Земли' and p_to_region = 'Ксандр') or
        (p_from_region = 'Святые Земли' and p_to_region = 'Спорные Земли') or
        (p_from_region = 'Спорные Земли' and p_to_region = 'Святые Земли') or
        (p_from_region = 'Святые Земли' and p_to_region = 'Лирэн') or
        (p_from_region = 'Лирэн' and p_to_region = 'Святые Земли') or
        (p_from_region = 'Лирэн' and p_to_region = 'Ксандр') or
        (p_from_region = 'Ксандр' and p_to_region = 'Лирэн') or
        (p_from_region = 'Ксандр' and p_to_region = 'Каэлор') or
        (p_from_region = 'Каэлор' and p_to_region = 'Ксандр') or
        (p_from_region = 'Морвейн' and p_to_region = 'Спорные Земли') or
        (p_from_region = 'Спорные Земли' and p_to_region = 'Морвейн');

    if not route_ok then
        raise exception 'NO_CANONICAL_DIRECT_ROUTE';
    end if;

    insert into public.rp_presence (
        character_id,
        player_id,
        presence_type,
        region,
        location,
        from_region,
        from_location,
        to_region,
        to_location,
        visibility,
        entered_at,
        started_at,
        updated_at
    )
    values (
        p_character_id,
        current_player,
        'road',
        null,
        null,
        p_from_region,
        p_from_location,
        p_to_region,
        p_to_location,
        p_visibility,
        null,
        now(),
        now()
    )
    on conflict (character_id) do update
    set
        player_id = excluded.player_id,
        presence_type = excluded.presence_type,
        region = null,
        location = null,
        from_region = excluded.from_region,
        from_location = excluded.from_location,
        to_region = excluded.to_region,
        to_location = excluded.to_location,
        visibility = excluded.visibility,
        entered_at = null,
        started_at = excluded.started_at,
        updated_at = now()
    returning * into result_row;

    return result_row;
end;
$$;

revoke all on function public.set_lorgus_rp_presence(
    uuid, text, text, text, text, text, text, text, text
) from public;

grant execute on function public.set_lorgus_rp_presence(
    uuid, text, text, text, text, text, text, text, text
) to authenticated;

-- The browser must not be able to write arbitrary presence rows directly.
revoke insert, update, delete on public.rp_presence from authenticated;
