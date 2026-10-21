alter table public.characters
    add column if not exists status text not null default 'ACTIVE';
alter table public.characters drop constraint if exists characters_status_check;
alter table public.characters add constraint characters_status_check check (status in ('ACTIVE','ARCHIVED'));

create or replace function public.admin_review_character_deletion(
    p_request_id uuid,
    p_approve boolean,
    p_admin_note text default ''
) returns void
language plpgsql security definer set search_path=public as $$
declare request_row public.character_deletion_requests;
begin
    if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
    if not coalesce(public.is_admin(), false) then raise exception 'ADMIN_REQUIRED'; end if;
    select * into request_row from public.character_deletion_requests where id=p_request_id for update;
    if not found then raise exception 'REQUEST_NOT_FOUND'; end if;
    if request_row.status <> 'pending' then raise exception 'REQUEST_ALREADY_REVIEWED'; end if;
    if p_approve then
        if request_row.character_id is null then raise exception 'CHARACTER_NOT_FOUND'; end if;
        update public.characters set status='ARCHIVED' where id=request_row.character_id;
        if not found then raise exception 'CHARACTER_NOT_FOUND'; end if;
        update public.rp_presence set visibility='hidden' where character_id=request_row.character_id;
        update public.character_deletion_requests
        set status='approved', reviewed_at=now(), reviewed_by=auth.uid(), admin_note=coalesce(trim(p_admin_note),'')
        where id=p_request_id;
    else
        update public.character_deletion_requests
        set status='rejected', reviewed_at=now(), reviewed_by=auth.uid(), admin_note=coalesce(trim(p_admin_note),'')
        where id=p_request_id;
    end if;
end;
$$;
revoke all on function public.admin_review_character_deletion(uuid,boolean,text) from public, anon;
grant execute on function public.admin_review_character_deletion(uuid,boolean,text) to authenticated;
