-- Correct the admin character deletion function definition.
-- Migration 010 only introduced the function; this migration ensures the
-- deployed definition deletes exactly the selected character/application.

create or replace function public.admin_delete_character(p_character_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    application_ids uuid[];
begin
    if not coalesce(public.is_admin(), false) then
        raise exception 'ADMIN_REQUIRED';
    end if;

    if not exists (
        select 1 from public.characters where id = p_character_id
    ) then
        raise exception 'CHARACTER_NOT_FOUND';
    end if;

    select coalesce(array_agg(ca.id), '{}'::uuid[])
    into application_ids
    from public.character_applications ca
    where ca.character_id = p_character_id;

    update public.character_applications
    set character_id = null
    where id = any(application_ids);

    delete from public.characters
    where id = p_character_id;

    delete from public.character_applications
    where id = any(application_ids);
end;
$$;

revoke all on function public.admin_delete_character(uuid) from public;
grant execute on function public.admin_delete_character(uuid) to authenticated;
