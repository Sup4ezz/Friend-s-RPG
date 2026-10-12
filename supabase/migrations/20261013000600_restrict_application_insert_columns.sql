-- Do not let clients forge application review notes or lifecycle timestamps on INSERT.
-- The frontend still supplies the fields needed for a pending application; RLS validates
-- player_id, status, character_id, and photo_path.
revoke insert on table public.character_applications from authenticated;

do $$
declare
    col record;
begin
    for col in
        select a.attname
        from pg_attribute a
        where a.attrelid = 'public.character_applications'::regclass
          and a.attnum > 0
          and not a.attisdropped
    loop
        execute format(
            'revoke insert (%I) on table public.character_applications from authenticated',
            col.attname
        );
    end loop;
end;
$$;

grant insert (
    id,
    player_id,
    status,
    name,
    race,
    age,
    homeland,
    personality,
    backstory,
    special_skills,
    preferred_weapon,
    occupation,
    photo_path,
    character_id
) on table public.character_applications to authenticated;
