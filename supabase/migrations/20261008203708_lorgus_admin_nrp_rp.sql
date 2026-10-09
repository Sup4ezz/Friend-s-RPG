-- LORGUS admin NRP actors and admin-authored RP posts

create table if not exists public.lorgus_nrp_characters (
    character_id uuid primary key references public.characters(id) on delete cascade,
    created_by uuid not null references auth.users(id) on delete restrict,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

create index if not exists lorgus_nrp_characters_active_idx
    on public.lorgus_nrp_characters (is_active);

alter table public.lorgus_nrp_characters enable row level security;

revoke all on table public.lorgus_nrp_characters from anon, authenticated;
grant select on table public.lorgus_nrp_characters to authenticated;

drop policy if exists "Players can view active NRP characters" on public.lorgus_nrp_characters;
create policy "Players can view active NRP characters"
on public.lorgus_nrp_characters
for select to authenticated
using (is_active = true);

drop policy if exists "Admins can manage NRP characters" on public.lorgus_nrp_characters;
create policy "Admins can manage NRP characters"
on public.lorgus_nrp_characters
for all to authenticated
using (coalesce(public.is_admin(), false))
with check (coalesce(public.is_admin(), false));

drop policy if exists "Players can view active NRP character records" on public.characters;
create policy "Players can view active NRP character records"
on public.characters
for select to authenticated
using (
    exists (
        select 1
        from public.lorgus_nrp_characters n
        where n.character_id = characters.id
          and n.is_active = true
    )
);

create or replace function public.admin_create_nrp_character(
    p_name text,
    p_race text default null,
    p_age integer default null,
    p_homeland text default null,
    p_occupation text default null,
    p_personality text default null,
    p_backstory text default null,
    p_special_skills text default null,
    p_preferred_weapon text default null,
    p_kingdom text default null,
    p_location text default null
)
returns public.characters
language plpgsql
security definer
set search_path = ''
as $function$
declare
    caller uuid := auth.uid();
    result_row public.characters;
begin
    if caller is null or not coalesce(public.is_admin(), false) then
        raise exception 'ADMIN_REQUIRED';
    end if;

    if nullif(trim(coalesce(p_name, '')), '') is null then
        raise exception 'NAME_REQUIRED';
    end if;

    insert into public.characters (
        name, race, age, homeland, occupation, personality,
        backstory, special_skills, preferred_weapon, kingdom, location
    )
    values (
        trim(p_name), nullif(trim(p_race), ''), p_age, nullif(trim(p_homeland), ''),
        nullif(trim(p_occupation), ''), nullif(trim(p_personality), ''),
        nullif(trim(p_backstory), ''), nullif(trim(p_special_skills), ''),
        nullif(trim(p_preferred_weapon), ''), nullif(trim(p_kingdom), ''),
        nullif(trim(p_location), '')
    )
    returning * into result_row;

    insert into public.lorgus_nrp_characters (character_id, created_by)
    values (result_row.id, caller);

    return result_row;
end;
$function$;

revoke all on function public.admin_create_nrp_character(text,text,integer,text,text,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.admin_create_nrp_character(text,text,integer,text,text,text,text,text,text,text,text) to authenticated;

create or replace function public.admin_set_nrp_character_active(
    p_character_id uuid,
    p_is_active boolean
)
returns public.lorgus_nrp_characters
language plpgsql
security definer
set search_path = ''
as $function$
declare
    result_row public.lorgus_nrp_characters;
begin
    if auth.uid() is null or not coalesce(public.is_admin(), false) then
        raise exception 'ADMIN_REQUIRED';
    end if;

    update public.lorgus_nrp_characters
    set is_active = p_is_active
    where character_id = p_character_id
    returning * into result_row;

    if result_row.character_id is null then
        raise exception 'NRP_CHARACTER_NOT_FOUND';
    end if;

    return result_row;
end;
$function$;

revoke all on function public.admin_set_nrp_character_active(uuid,boolean) from public, anon, authenticated;
grant execute on function public.admin_set_nrp_character_active(uuid,boolean) to authenticated;

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
set search_path = ''
as $function$
declare
    caller uuid := auth.uid();
    result_row public.rp_messages;
begin
    if caller is null or not coalesce(public.is_admin(), false) then
        raise exception 'ADMIN_REQUIRED';
    end if;

    if not exists (
        select 1
        from public.lorgus_nrp_characters n
        where n.character_id = p_nrp_character_id
          and n.is_active = true
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
        region, location, from_region, from_location, to_region, to_location, body
    )
    values (
        p_nrp_character_id, caller, p_presence_type,
        nullif(trim(p_region), ''), nullif(trim(p_location), ''),
        nullif(trim(p_from_region), ''), nullif(trim(p_from_location), ''),
        nullif(trim(p_to_region), ''), nullif(trim(p_to_location), ''),
        trim(p_body)
    )
    returning * into result_row;

    return result_row;
end;
$function$;

revoke all on function public.admin_send_nrp_rp_message(uuid,text,text,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.admin_send_nrp_rp_message(uuid,text,text,text,text,text,text,text,text) to authenticated;
