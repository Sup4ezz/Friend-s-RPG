-- LORGUS initial RP placement.
-- A newly approved character must enter the world once before normal
-- location -> road -> destination transition rules apply.

create or replace function public.initialize_lorgus_rp_presence(
    p_character_id uuid,
    p_region text,
    p_location text,
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

    if p_visibility not in ('public', 'hidden') then
        raise exception 'INVALID_VISIBILITY';
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

    if exists (
        select 1
        from public.rp_presence
        where character_id = p_character_id
    ) then
        select * into result_row
        from public.rp_presence
        where character_id = p_character_id;
        return result_row;
    end if;

    insert into public.rp_presence (
        character_id, player_id, presence_type,
        region, location, visibility, entered_at, updated_at
    ) values (
        p_character_id, current_player, 'location',
        p_region, p_location, p_visibility, now(), now()
    )
    returning * into result_row;

    return result_row;
end;
$$;

revoke all on function public.initialize_lorgus_rp_presence(uuid, text, text, text) from public;
grant execute on function public.initialize_lorgus_rp_presence(uuid, text, text, text) to authenticated;
