-- Character origin is selected by the player when submitting an application.
-- Existing characters/applications remain ordinary Lorgus-born characters.
alter table public.character_applications
  add column if not exists origin_type text not null default 'born_in_lorgus';
alter table public.characters
  add column if not exists origin_type text not null default 'born_in_lorgus';

alter table public.character_applications
  drop constraint if exists character_applications_origin_type_check;
alter table public.character_applications
  add constraint character_applications_origin_type_check
  check (origin_type in ('reincarnated', 'born_in_lorgus'));

alter table public.characters
  drop constraint if exists characters_origin_type_check;
alter table public.characters
  add constraint characters_origin_type_check
  check (origin_type in ('reincarnated', 'born_in_lorgus'));

grant insert (origin_type) on table public.character_applications to authenticated;

create or replace function public.approve_character_application(application_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
    application_record public.character_applications%rowtype;
    new_character_id uuid;
begin
    if coalesce(public.lorgus_is_access_blocked(), false) then
        raise exception 'ACCESS_BLOCKED';
    end if;
    if not public.is_admin() then
        raise exception 'Only administrators can approve applications';
    end if;

    select *
    into application_record
    from public.character_applications
    where id = application_id
      and status = 'pending'
    for update;

    if not found then
        raise exception 'Application not found or is not pending';
    end if;

    insert into public.characters (
        name, race, age, homeland, personality, backstory, special_skills,
        preferred_weapon, occupation, photo_path, origin_type
    )
    values (
        application_record.name, application_record.race, application_record.age,
        application_record.homeland, application_record.personality, application_record.backstory,
        application_record.special_skills, application_record.preferred_weapon,
        application_record.occupation, application_record.photo_path,
        application_record.origin_type
    )
    returning id into new_character_id;

    insert into public.player_characters (player_id, character_id)
    values (application_record.player_id, new_character_id);

    update public.character_applications
    set status = 'approved', character_id = new_character_id
    where id = application_id;

    return new_character_id;
end;
$function$;
