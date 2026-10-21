-- LORGUS: joint admin RP posts and player-requested character deletion.
create table if not exists public.rp_message_participants (
    message_id bigint not null references public.rp_messages(id) on delete cascade,
    character_id uuid not null references public.characters(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (message_id, character_id)
);
alter table public.rp_message_participants enable row level security;
revoke all on table public.rp_message_participants from anon, authenticated;
grant select on table public.rp_message_participants to authenticated;
drop policy if exists "Admins can read RP message participants" on public.rp_message_participants;
create policy "Admins can read RP message participants"
on public.rp_message_participants for select to authenticated
using (coalesce(public.is_admin(), false));

create or replace function public.admin_send_lorgus_joint_rp_post(
    p_character_ids uuid[],
    p_reply_to_id bigint,
    p_body text
) returns public.rp_messages
language plpgsql security definer set search_path=public as $$
declare
    parent_row public.rp_messages;
    result_row public.rp_messages;
    unique_ids uuid[];
begin
    if coalesce(public.lorgus_is_access_blocked(), false) then raise exception 'ACCESS_BLOCKED'; end if;
    if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
    if not coalesce(public.is_admin(), false) then raise exception 'ADMIN_REQUIRED'; end if;
    if p_body is null or char_length(trim(p_body)) < 1 or char_length(trim(p_body)) > 10000 then raise exception 'INVALID_MESSAGE_BODY'; end if;
    select array_agg(distinct x) into unique_ids from unnest(coalesce(p_character_ids, '{}'::uuid[])) x;
    if coalesce(array_length(unique_ids, 1), 0) < 2 then raise exception 'SELECT_AT_LEAST_TWO_CHARACTERS'; end if;
    if exists (select 1 from unnest(unique_ids) x left join public.characters c on c.id=x where c.id is null) then
        raise exception 'CHARACTER_NOT_FOUND';
    end if;
    select * into parent_row from public.rp_messages where id=p_reply_to_id and status='active';
    if not found then raise exception 'MESSAGE_NOT_ACTIVE'; end if;
    insert into public.rp_messages(
        character_id,player_id,presence_type,region,location,from_region,from_location,
        to_region,to_location,body,status,is_admin_post,reply_to_id
    ) values (
        unique_ids[1],auth.uid(),parent_row.presence_type,parent_row.region,parent_row.location,
        parent_row.from_region,parent_row.from_location,parent_row.to_region,parent_row.to_location,
        trim(p_body),'active',true,parent_row.id
    ) returning * into result_row;
    insert into public.rp_message_participants(message_id,character_id)
    select result_row.id,x from unnest(unique_ids) x;
    return result_row;
end;
$$;
revoke all on function public.admin_send_lorgus_joint_rp_post(uuid[],bigint,text) from public, anon;
grant execute on function public.admin_send_lorgus_joint_rp_post(uuid[],bigint,text) to authenticated;

create table if not exists public.character_deletion_requests (
    id uuid primary key default gen_random_uuid(),
    player_id uuid not null references auth.users(id) on delete cascade,
    character_id uuid references public.characters(id) on delete set null,
    character_name text not null,
    confirmation_text text not null,
    status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
    created_at timestamptz not null default now(),
    reviewed_at timestamptz,
    reviewed_by uuid references auth.users(id) on delete set null,
    admin_note text
);
create index if not exists character_deletion_requests_status_created_idx
on public.character_deletion_requests(status, created_at desc);
create index if not exists character_deletion_requests_player_idx
on public.character_deletion_requests(player_id, created_at desc);
alter table public.character_deletion_requests enable row level security;
revoke all on table public.character_deletion_requests from anon, authenticated;
grant select on table public.character_deletion_requests to authenticated;
drop policy if exists "Players and admins can read character deletion requests" on public.character_deletion_requests;
create policy "Players and admins can read character deletion requests"
on public.character_deletion_requests for select to authenticated
using (player_id = auth.uid() or coalesce(public.is_admin(), false));

create or replace function public.request_character_deletion(
    p_character_id uuid,
    p_confirmation_text text
) returns uuid
language plpgsql security definer set search_path=public as $$
declare
    character_row public.characters;
    existing_request uuid;
    request_id uuid;
    expected_text text;
begin
    if coalesce(public.lorgus_is_access_blocked(), false) then raise exception 'ACCESS_BLOCKED'; end if;
    if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
    select c.* into character_row
    from public.characters c
    join public.character_applications ca on ca.character_id=c.id
    where c.id=p_character_id and ca.player_id=auth.uid() and ca.status='approved'
    order by ca.created_at desc limit 1;
    if not found then raise exception 'CHARACTER_NOT_OWNED'; end if;
    expected_text := 'Я согласен и удаляю ' || character_row.name;
    if p_confirmation_text is distinct from expected_text then raise exception 'CONFIRMATION_TEXT_MISMATCH'; end if;
    select id into existing_request from public.character_deletion_requests
    where character_id=p_character_id and player_id=auth.uid() and status='pending'
    order by created_at desc limit 1;
    if existing_request is not null then raise exception 'DELETION_REQUEST_ALREADY_PENDING'; end if;
    insert into public.character_deletion_requests(player_id,character_id,character_name,confirmation_text)
    values(auth.uid(),character_row.id,character_row.name,p_confirmation_text)
    returning id into request_id;
    return request_id;
end;
$$;
revoke all on function public.request_character_deletion(uuid,text) from public, anon;
grant execute on function public.request_character_deletion(uuid,text) to authenticated;
