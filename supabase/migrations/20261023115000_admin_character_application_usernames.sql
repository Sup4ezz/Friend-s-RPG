-- Admin-only lookup of the login associated with each character application.
-- Uses public.players.username; never expose auth.users directly to the browser.
create or replace function public.admin_list_character_application_usernames()
returns table (
    application_id text,
    player_id uuid,
    username text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
    if auth.uid() is null or not coalesce(public.is_admin(), false) then
        raise exception 'ADMIN_REQUIRED';
    end if;

    return query
    select
        ca.id::text,
        ca.player_id,
        coalesce(nullif(trim(pl.username), ''), 'Логин не указан')
    from public.character_applications as ca
    left join public.players as pl on pl.id = ca.player_id
    order by ca.id desc;
end;
$$;

revoke all on function public.admin_list_character_application_usernames() from public, anon;
grant execute on function public.admin_list_character_application_usernames() to authenticated;
