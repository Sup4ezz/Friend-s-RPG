-- Admin-only lookup of the login associated with each character application.
-- The browser must not receive direct access to auth.users.
create or replace function public.admin_list_character_application_usernames()
returns table (
    application_id text,
    player_id uuid,
    username text
)
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
begin
    if not coalesce(public.is_admin(), false) then
        raise exception 'Недостаточно прав';
    end if;

    return query
    select
        ca.id::text,
        ca.player_id,
        coalesce(nullif(u.raw_user_meta_data ->> 'username', ''), 'Логин не указан')
    from public.character_applications as ca
    left join auth.users as u on u.id = ca.player_id
    order by ca.id desc;
end;
$$;

revoke all on function public.admin_list_character_application_usernames() from public, anon;
grant execute on function public.admin_list_character_application_usernames() to authenticated;
