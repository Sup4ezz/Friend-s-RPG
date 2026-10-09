-- Fix lore actor registration for the actual characters schema and allow
-- multiple lore notes to refer to the same existing character.
alter table public.lorgus_lore_actor_links
  drop constraint if exists lorgus_lore_actor_links_character_id_key;

create or replace function public.admin_register_lore_actor(
  p_note_path text,
  p_name text
)
returns table(character_id uuid, is_active boolean, photo_path text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  actor_id uuid;
begin
  if caller is null or not coalesce(public.is_admin(), false) then
    raise exception 'ADMIN_REQUIRED';
  end if;
  if p_note_path is null or p_note_path !~ '^НПС/Королевские семьи/[^/]+/[^/]+[.]md$' then
    raise exception 'INVALID_LORE_NOTE_PATH';
  end if;
  if nullif(trim(coalesce(p_name, '')), '') is null then
    raise exception 'NAME_REQUIRED';
  end if;

  select l.character_id into actor_id
  from public.lorgus_lore_actor_links l
  where l.note_path = p_note_path;

  if actor_id is null then
    -- The characters table has no created_at column; use the UUID as a
    -- deterministic tie-breaker when names are duplicated.
    select c.id into actor_id
    from public.characters c
    where lower(trim(c.name)) = lower(trim(p_name))
    order by c.id
    limit 1;

    if actor_id is null then
      insert into public.characters(name) values (trim(p_name))
      returning id into actor_id;
    end if;

    insert into public.lorgus_lore_actor_links(note_path, character_id, created_by)
    values (p_note_path, actor_id, caller)
    on conflict (note_path) do update set character_id = excluded.character_id
    returning lorgus_lore_actor_links.character_id into actor_id;
  end if;

  insert into public.lorgus_nrp_characters(character_id, created_by, is_active)
  values (actor_id, caller, true)
  on conflict (character_id) do update set is_active = true;

  return query
    select c.id, n.is_active, c.photo_path
    from public.characters c
    join public.lorgus_nrp_characters n on n.character_id = c.id
    where c.id = actor_id;
end;
$$;

revoke all on function public.admin_register_lore_actor(text, text) from public, anon, authenticated;
grant execute on function public.admin_register_lore_actor(text, text) to authenticated;
