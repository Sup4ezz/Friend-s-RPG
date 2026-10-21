-- Reassert the idempotent deployed road-presence function with one-time reward consumption.
-- Keep the deployed road rules reproducible from the repository.
ALTER TABLE public.character_special_rewards ADD COLUMN IF NOT EXISTS used_at timestamptz;

create or replace function public.set_lorgus_rp_presence(p_character_id uuid, p_presence_type text, p_region text DEFAULT NULL::text, p_location text DEFAULT NULL::text, p_from_region text DEFAULT NULL::text, p_from_location text DEFAULT NULL::text, p_to_region text DEFAULT NULL::text, p_to_location text DEFAULT NULL::text, p_visibility text DEFAULT 'public'::text)
 RETURNS rp_presence
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    result_row public.rp_presence;
    current_player uuid := auth.uid();
    current_presence public.rp_presence;
    route_ok boolean := false;
    road_post_count integer := 0;
    required_road_posts integer := 2;
    has_horse boolean := false;
    can_bypass_road boolean := false;
begin
    if coalesce(public.lorgus_is_access_blocked(), false) then raise exception 'ACCESS_BLOCKED'; end if;
    if current_player is null then raise exception 'AUTH_REQUIRED'; end if;
    if not exists (
        select 1 from public.character_applications ca
        where ca.character_id = p_character_id and ca.player_id = current_player and ca.status = 'approved'
    ) then raise exception 'CHARACTER_NOT_APPROVED_FOR_PLAYER'; end if;

    select * into current_presence from public.rp_presence where character_id = p_character_id for update;
    if p_presence_type not in ('location', 'road') then raise exception 'INVALID_PRESENCE_TYPE'; end if;
    if p_visibility not in ('public', 'hidden') then raise exception 'INVALID_VISIBILITY'; end if;

    if p_presence_type = 'location' then
        if p_region is null or p_location is null then raise exception 'LOCATION_PRESENCE_REQUIRES_REGION_AND_LOCATION'; end if;
        if not (
            (p_region = 'Атэрон' and p_location in ('Примум')) or
            (p_region = 'Каэлор' and p_location in ('Хелион', 'Древнее Пламя')) or
            (p_region = 'Ксандр' and p_location in ('Арджент', 'Меридиан', 'Валькрофт', 'Солмир')) or
            (p_region = 'Лирэн' and p_location in ('Аврора', 'Элвэйн', 'Таллирион', 'Эстерваль')) or
            (p_region = 'Морвейн' and p_location in ('Фин')) or
            (p_region = 'Святые Земли' and p_location in ('Здание Совета'))
        ) then raise exception 'INVALID_CANONICAL_LOCATION'; end if;

        select (
            exists (
                select 1 from public.character_abilities ca
                join public.abilities a on a.id = ca.ability_id
                where ca.character_id = p_character_id
                  and (a.name ilike '%перемещение минуя дорогу%' or a.description ilike '%перемещение минуя дорогу%')
            )
            or exists (
                select 1 from public.character_special_rewards r
                where r.character_id = p_character_id
                  and r.used_at is null
                  and (
                    r.name ilike '%перемещение минуя дорогу%'
                    or r.description ilike '%перемещение минуя дорогу%'
                    or r.name ilike '%шаг сквозь карту%'
                    or r.name ilike '%тайный проход%'
                  )
            )
        ) into can_bypass_road;

        if current_presence.presence_type is distinct from 'road' and not can_bypass_road then
            raise exception 'LOCATION_ENTRY_REQUIRES_CURRENT_ROAD';
        end if;
        if current_presence.presence_type = 'road' then
            if current_presence.to_region is distinct from p_region or current_presence.to_location is distinct from p_location then
                raise exception 'DESTINATION_DOES_NOT_MATCH_CURRENT_ROAD';
            end if;
        elsif current_presence.presence_type = 'location' and can_bypass_road then
            null;
        else
            raise exception 'LOCATION_ENTRY_REQUIRES_CURRENT_ROAD';
        end if;

        select exists (
            select 1 from public.character_inventory ci
            join public.items i on i.id = ci.item_id
            where ci.character_id = p_character_id
              and (i.name ilike '%конь%' or i.name ilike '%лошад%' or i.name ilike '%скакун%'
                   or i.item_type ilike '%mount%' or i.item_subtype ilike '%horse%' or i.item_subtype ilike '%mount%')
        ) into has_horse;

        if can_bypass_road then
            required_road_posts := 0;
        elsif has_horse then
            required_road_posts := 1;
        end if;

        select count(*)::integer into road_post_count
        from public.rp_messages m
        where m.character_id = p_character_id
          and m.status = 'active'
          and m.presence_type = 'road'
          and m.from_region = current_presence.from_region
          and m.from_location = current_presence.from_location
          and m.to_region = current_presence.to_region
          and m.to_location = current_presence.to_location
          and m.created_at >= coalesce(current_presence.started_at, current_presence.updated_at);

        if road_post_count < required_road_posts then
            raise exception 'ROAD_POSTS_REQUIRED:%:%', required_road_posts, road_post_count;
        end if;

        insert into public.rp_presence (character_id, player_id, presence_type, region, location, visibility, entered_at, updated_at)
        values (p_character_id, current_player, 'location', p_region, p_location, p_visibility, now(), now())
        on conflict (character_id) do update set
            player_id = excluded.player_id, presence_type = excluded.presence_type,
            region = excluded.region, location = excluded.location,
            from_region = null, from_location = null, to_region = null, to_location = null,
            visibility = excluded.visibility, entered_at = excluded.entered_at,
            started_at = null, updated_at = now()
        returning * into result_row;
        if current_presence.presence_type = 'location' and can_bypass_road
           and not exists (
             select 1 from public.character_abilities ca
             join public.abilities a on a.id = ca.ability_id
             where ca.character_id = p_character_id
               and (a.name ilike '%перемещение минуя дорогу%' or a.description ilike '%перемещение минуя дорогу%')
           ) then
            update public.character_special_rewards r
            set used_at = now()
            where r.id = (
                select r2.id from public.character_special_rewards r2
                where r2.character_id = p_character_id and r2.used_at is null
                  and (r2.name ilike '%перемещение минуя дорогу%' or r2.description ilike '%перемещение минуя дорогу%'
                       or r2.name ilike '%шаг сквозь карту%' or r2.name ilike '%тайный проход%')
                order by case when r2.name ilike '%перемещение минуя дорогу%' then 0
                              when r2.name ilike '%шаг сквозь карту%' then 1 else 2 end, r2.awarded_at
                limit 1
            );
        end if;
        return result_row;
    end if;

    if p_from_region is null or p_from_location is null or p_to_region is null or p_to_location is null then
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
        (p_from_region = 'Морвейн' and p_from_location in ('Фин')) or
        (p_from_region = 'Святые Земли' and p_from_location in ('Здание Совета'))
    ) then raise exception 'INVALID_CANONICAL_ROUTE_ENDPOINT'; end if;
    if not (
        (p_to_region = 'Атэрон' and p_to_location in ('Примум')) or
        (p_to_region = 'Каэлор' and p_to_location in ('Хелион', 'Древнее Пламя')) or
        (p_to_region = 'Ксандр' and p_to_location in ('Арджент', 'Меридиан', 'Валькрофт', 'Солмир')) or
        (p_to_region = 'Лирэн' and p_to_location in ('Аврора', 'Элвэйн', 'Таллирион', 'Эстерваль')) or
        (p_to_region = 'Морвейн' and p_to_location in ('Фин')) or
        (p_to_region = 'Святые Земли' and p_to_location in ('Здание Совета'))
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

    insert into public.rp_presence (character_id, player_id, presence_type, from_region, from_location, to_region, to_location, visibility, started_at, updated_at)
    values (p_character_id, current_player, 'road', p_from_region, p_from_location, p_to_region, p_to_location, p_visibility, now(), now())
    on conflict (character_id) do update set
        player_id = excluded.player_id, presence_type = excluded.presence_type,
        region = null, location = null, from_region = excluded.from_region, from_location = excluded.from_location,
        to_region = excluded.to_region, to_location = excluded.to_location,
        visibility = excluded.visibility, entered_at = null, started_at = excluded.started_at, updated_at = now()
    returning * into result_row;
    return result_row;
end;
$function$
;
