-- LORGUS admin character deletion.
-- Deletes one approved character and its application from the admin panel.
-- RP presence/messages are removed by their character_id foreign keys.

create or replace function public.admin_delete_character(p_character_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if not coalesce(public.is_admin(), false) then
        raise exception 'ADMIN_REQUIRED';
    end if;

    if not exists (
        select 1
        from public.characters c
        where c.id = p_character_id
    ) then
        raise exception 'CHARACTER_NOT_FOUND';
    end if;

    -- Break the application -> character reference first.
    -- This also lets the character be deleted even if the FK is not cascading.
    update public.character_applications
    set character_id = null
    where character_id = p_character_id;

    delete from public.characters
    where id = p_character_id;

    -- Remove the corresponding application(s), so the test account
    -- can immediately create a fresh character.
    delete from public.character_applications
    where character_id is null
      and status = 'approved'
      and not exists (
          select 1
          from public.characters c
          where c.id = public.character_applications.character_id
      );
end;
$$;

revoke all on function public.admin_delete_character(uuid) from public;
grant execute on function public.admin_delete_character(uuid) to authenticated;
