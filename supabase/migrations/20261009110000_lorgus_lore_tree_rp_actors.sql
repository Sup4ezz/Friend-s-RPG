-- Link lore-tree Markdown NPCs to RP actors and their circular chat portraits.
create table if not exists public.lorgus_lore_actor_links (
    note_path text primary key,
    character_id uuid not null unique references public.characters(id) on delete cascade,
    created_at timestamptz not null default now(),
    created_by uuid not null references auth.users(id) on delete restrict,
    constraint lorgus_lore_actor_note_path_check
      check (note_path ~ '^НПС/Королевские семьи/[^/]+/[^/]+[.]md$')
);

alter table public.lorgus_lore_actor_links enable row level security;
revoke all on table public.lorgus_lore_actor_links from anon, authenticated;
grant select on table public.lorgus_lore_actor_links to authenticated;

drop policy if exists "Admins can read lore actor links" on public.lorgus_lore_actor_links;
create policy "Admins can read lore actor links"
on public.lorgus_lore_actor_links for select to authenticated
using (coalesce(public.is_admin(), false));

create or replace function public.admin_get_lore_actor(p_note_path text)
returns table(character_id uuid, is_active boolean, photo_path text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not coalesce(public.is_admin(), false) then
    raise exception 'ADMIN_REQUIRED';
  end if;
  if p_note_path is null or p_note_path !~ '^НПС/Королевские семьи/[^/]+/[^/]+[.]md$' then
    raise exception 'INVALID_LORE_NOTE_PATH';
  end if;
  return query
    select c.id, coalesce(n.is_active, false), c.photo_path
    from public.lorgus_lore_actor_links l
    join public.characters c on c.id = l.character_id
    left join public.lorgus_nrp_characters n on n.character_id = c.id
    where l.note_path = p_note_path;
end;
$$;

revoke all on function public.admin_get_lore_actor(text) from public, anon, authenticated;
grant execute on function public.admin_get_lore_actor(text) to authenticated;

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
    select c.id into actor_id
    from public.characters c
    where lower(trim(c.name)) = lower(trim(p_name))
    order by c.created_at nulls last, c.id
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
