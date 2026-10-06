-- LORGUS RP first-post locking.
-- Before the first RP post, a player may read/open any RP location chat.
-- The first location post atomically creates the character's physical presence
-- at that location. After that, normal presence/road transition rules apply.

drop policy if exists "rp_messages_select_current_presence" on public.rp_messages;
create policy "rp_messages_select_current_presence"
on public.rp_messages
for select
to authenticated
using (
    not exists (
        select 1 from public.rp_presence p0
        where p0.player_id = auth.uid()
    )
    or exists (
        select 1
        from public.rp_presence p
        where p.player_id = auth.uid()
          and p.presence_type = rp_messages.presence_type
          and (
              (
                  p.presence_type = 'location'
                  and p.region = rp_messages.region
                  and p.location = rp_messages.location
              )
              or
              (
                  p.presence_type = 'road'
                  and p.from_region = rp_messages.from_region
                  and p.from_location = rp_messages.from_location
                  and p.to_region = rp_messages.to_region
                  and p.to_location = rp_messages.to_location
              )
          )
    )
);

create or replace function public.send_lorgus_rp_message(
    p_character_id uuid,
    p_presence_type text,
    p_region text default null,
    p_location text default null,
    p_from_region text default null,
    p_from_location text default null,
    p_to_region text default null,
    p_to_location text default null,
    p_body text default null,
    p_visibility text default 'public'
)
returns public.rp_messages
language plpgsql
security definer
set search_path = public
as $$
declare
    current_player uuid := auth.uid();
    current_presence public.rp_presence;
    result_row public.rp_messages;
    route_ok boolean := false;
begin
    if current_player is null then raise exception 'AUTH_REQUIRED'; end if;
    if p_body is null or char_length(trim(p_body)) < 1 or char_length(trim(p_body)) > 10000 then
        raise exception 'INVALID_MESSAGE_BODY';
    end if;
    if p_presence_type not in ('location', 'road') then raise exception 'INVALID_PRESENCE_TYPE'; end if;
    if p_visibility not in ('public', 'hidden') then raise exception 'INVALID_VISIBILITY'; end if;

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

        if current_presence.character_id is null then
            insert into public.rp_presence (
                character_id, player_id, presence_type,
                region, location, visibility, entered_at, updated_at
            ) values (
                p_character_id, current_player, 'location',
                p_region, p_location, p_visibility, now(), now()
            )
            returning * into current_presence;
        else
            if current_presence.player_id <> current_player then
                raise exception 'CHARACTER_PRESENCE_NOT_OWNED';
            end if;
            if current_presence.presence_type is distinct from 'location'
               or current_presence.region is distinct from p_region
               or current_presence.location is distinct from p_location then
                raise exception 'RP_CHAT_DOES_NOT_MATCH_CURRENT_PRESENCE';
            end if;
        end if;

    else
        if p_from_region is null or p_from_location is null
           or p_to_region is null or p_to_location is null then
            raise exception 'ROAD_PRESENCE_REQUIRES_BOTH_ENDPOINTS';
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

        if current_presence.character_id is null then
            raise exception 'CHARACTER_MUST_BE_FIXED_IN_LOCATION_BEFORE_ROAD_POST';
        end if;

        if current_presence.player_id <> current_player then
            raise exception 'CHARACTER_PRESENCE_NOT_OWNED';
        end if;

        if current_presence.presence_type is distinct from 'road'
           or current_presence.from_region is distinct from p_from_region
           or current_presence.from_location is distinct from p_from_location
           or current_presence.to_region is distinct from p_to_region
           or current_presence.to_location is distinct from p_to_location then
            raise exception 'RP_CHAT_DOES_NOT_MATCH_CURRENT_PRESENCE';
        end if;
    end if;

    insert into public.rp_messages (
        character_id, player_id, presence_type,
        region, location, from_region, from_location, to_region, to_location,
        body, created_at
    ) values (
        p_character_id, current_player, p_presence_type,
        p_region, p_location, p_from_region, p_from_location, p_to_region, p_to_location,
        trim(p_body), now()
    )
    returning * into result_row;

    return result_row;
end;
$$;

revoke all on function public.send_lorgus_rp_message(uuid, text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.send_lorgus_rp_message(uuid, text, text, text, text, text, text, text, text, text) to authenticated;
