create or replace function public.can_view_lorgus_character_photo(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1 from public.character_applications a
      where a.photo_path = object_name and a.status = 'approved'
    )
    or exists (
      select 1 from public.characters c
      where c.photo_path = object_name
    );
$$;

revoke all on function public.can_view_lorgus_character_photo(text) from public;
grant execute on function public.can_view_lorgus_character_photo(text) to authenticated;

drop policy if exists "Authenticated users can view assigned character portraits" on storage.objects;
create policy "Authenticated users can view assigned character portraits"
on storage.objects for select to authenticated
using (
  bucket_id = 'character-applications'
  and public.can_view_lorgus_character_photo(name)
);

drop policy if exists "Admins can upload RP character portraits" on storage.objects;
create policy "Admins can upload RP character portraits"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'character-applications'
  and (storage.foldername(name))[1] = 'rp-characters'
  and coalesce(public.is_admin(), false)
);

drop policy if exists "Admins can update RP character portraits" on storage.objects;
create policy "Admins can update RP character portraits"
on storage.objects for update to authenticated
using (
  bucket_id = 'character-applications'
  and (storage.foldername(name))[1] = 'rp-characters'
  and coalesce(public.is_admin(), false)
)
with check (
  bucket_id = 'character-applications'
  and (storage.foldername(name))[1] = 'rp-characters'
  and coalesce(public.is_admin(), false)
);