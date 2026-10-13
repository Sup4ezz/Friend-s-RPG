-- Use admin-only SECURITY DEFINER RPCs for blacklist management.
-- The frontend cannot select from public.players directly under the current RLS grants.

create or replace function public.admin_list_lorgus_blacklist()
returns table (
    user_id uuid,
    username text,
    reason text,
    created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
    if coalesce(public.lorgus_is_access_blocked(), false) then
        raise exception 'ACCESS_BLOCKED';
    end if;
    if auth.uid() is null or not coalesce(public.is_admin(), false) then
        raise exception 'ADMIN_REQUIRED';
    end if;

    return query
    select b.user_id, p.username, b.reason, b.created_at
    from public.lorgus_blacklist b
    left join public.players p on p.id = b.user_id
    order by b.created_at desc;
end;
$function$;

create or replace function public.admin_block_lorgus_player(
    p_username text,
    p_reason text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
    target_user_id uuid;
    clean_username text := nullif(trim(coalesce(p_username, '')), '');
begin
    if coalesce(public.lorgus_is_access_blocked(), false) then
        raise exception 'ACCESS_BLOCKED';
    end if;
    if auth.uid() is null or not coalesce(public.is_admin(), false) then
        raise exception 'ADMIN_REQUIRED';
    end if;
    if clean_username is null then
        raise exception 'USERNAME_REQUIRED';
    end if;

    select p.id into target_user_id
    from public.players p
    where lower(p.username) = lower(clean_username)
    limit 1;

    if target_user_id is null then
        raise exception 'PLAYER_NOT_FOUND';
    end if;
    if target_user_id = auth.uid() then
        raise exception 'CANNOT_BLOCK_SELF';
    end if;

    insert into public.lorgus_blacklist(user_id, reason, created_by)
    values (target_user_id, coalesce(trim(p_reason), ''), auth.uid())
    on conflict (user_id) do update
      set reason = excluded.reason,
          created_by = excluded.created_by,
          created_at = now();

    return target_user_id;
end;
$function$;

create or replace function public.admin_unblock_lorgus_player(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
    if coalesce(public.lorgus_is_access_blocked(), false) then
        raise exception 'ACCESS_BLOCKED';
    end if;
    if auth.uid() is null or not coalesce(public.is_admin(), false) then
        raise exception 'ADMIN_REQUIRED';
    end if;
    if p_user_id is null then
        raise exception 'USER_ID_REQUIRED';
    end if;

    delete from public.lorgus_blacklist where user_id = p_user_id;
end;
$function$;

revoke all on function public.admin_list_lorgus_blacklist() from public, anon;
revoke all on function public.admin_block_lorgus_player(text, text) from public, anon;
revoke all on function public.admin_unblock_lorgus_player(uuid) from public, anon;
grant execute on function public.admin_list_lorgus_blacklist() to authenticated;
grant execute on function public.admin_block_lorgus_player(text, text) to authenticated;
grant execute on function public.admin_unblock_lorgus_player(uuid) to authenticated;
