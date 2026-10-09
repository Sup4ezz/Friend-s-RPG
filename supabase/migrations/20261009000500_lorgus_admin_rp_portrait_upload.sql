create or replace function public.admin_set_rp_character_photo(
  p_character_id uuid,
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

  if p_photo_path is null
     or p_photo_path !~ ('^rp-characters/' || p_character_id::text || '/[^/]+$') then
    raise exception 'INVALID_PHOTO_PATH';
  end if;

  if not exists (
    select 1 from storage.objects
    where bucket_id = 'character-applications'
      and name = p_photo_path
  ) then
    raise exception 'PHOTO_FILE_NOT_FOUND';
  end if;

  update public.characters
  set photo_path = p_photo_path
  where id = p_character_id;

  if not found then
    raise exception 'CHARACTER_NOT_FOUND';
  end if;
end;
$$;

revoke all on function public.admin_set_rp_character_photo(uuid, text) from public;
grant execute on function public.admin_set_rp_character_photo(uuid, text) to authenticated;