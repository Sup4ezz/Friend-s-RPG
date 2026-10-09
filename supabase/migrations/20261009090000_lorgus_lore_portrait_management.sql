create table if not exists public.lorgus_lore_portraits (
  note_path text primary key,
  photo_path text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.lorgus_lore_portraits enable row level security;
revoke all on public.lorgus_lore_portraits from public, anon, authenticated;

create or replace function public.admin_get_lore_portrait(p_note_path text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v_path text;
begin
  if auth.uid() is null or not coalesce(public.is_admin(), false) then
    raise exception 'ADMIN_REQUIRED';
  end if;
  select photo_path into v_path
  from public.lorgus_lore_portraits
  where note_path = p_note_path;
  return v_path;
end;
$$;

create or replace function public.admin_set_lore_portrait(
  p_note_path text,
  p_photo_path text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not coalesce(public.is_admin(), false) then
    raise exception 'ADMIN_REQUIRED';
  end if;
  if p_note_path is null
     or p_note_path !~ '^НПС/Королевские семьи/[^/]+/[^/]+[.]md$'
     or p_photo_path is null
     or p_photo_path !~ '^lore-portraits/[A-Za-z0-9._/-]+$'
     or p_photo_path ~ '(^|/)\.\.(/|$)' then
    raise exception 'INVALID_LORE_PORTRAIT';
  end if;
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'character-applications'
      and name = p_photo_path
  ) then
    raise exception 'PHOTO_FILE_NOT_FOUND';
  end if;
  insert into public.lorgus_lore_portraits(note_path, photo_path, updated_at, updated_by)
  values (p_note_path, p_photo_path, now(), auth.uid())
  on conflict (note_path) do update
    set photo_path = excluded.photo_path,
        updated_at = now(),
        updated_by = auth.uid();
end;
$$;

revoke all on function public.admin_get_lore_portrait(text) from public;
revoke all on function public.admin_set_lore_portrait(text, text) from public;
grant execute on function public.admin_get_lore_portrait(text) to authenticated;
grant execute on function public.admin_set_lore_portrait(text, text) to authenticated;

drop policy if exists "Admins can upload lore portraits" on storage.objects;
create policy "Admins can upload lore portraits"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'character-applications'
  and (storage.foldername(name))[1] = 'lore-portraits'
  and coalesce(public.is_admin(), false)
);

drop policy if exists "Admins can read lore portraits" on storage.objects;
create policy "Admins can read lore portraits"
on storage.objects for select to authenticated
using (
  bucket_id = 'character-applications'
  and (storage.foldername(name))[1] = 'lore-portraits'
  and coalesce(public.is_admin(), false)
);
