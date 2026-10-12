-- Harden pigeon mail: server-owned timestamps, approved recipients and read-only receipts.
-- The client may choose the recipient/body/method, but cannot forge delivery timing
-- or modify the contents/identity of a message after it has been sent.

create or replace function public.lorgus_mail_enforce_server_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
    caller_id uuid := auth.uid();
begin
    if caller_id is null then
        raise exception 'AUTH_REQUIRED';
    end if;

    if new.sender_character_id = new.recipient_character_id then
        raise exception 'MAIL_SELF_SEND_FORBIDDEN';
    end if;

    if new.method not in ('pigeon', 'courier') then
        raise exception 'INVALID_MAIL_METHOD';
    end if;

    if not exists (
        select 1
        from public.character_applications ca
        where ca.character_id = new.sender_character_id
          and ca.player_id = caller_id
          and ca.status = 'approved'
    ) then
        raise exception 'MAIL_SENDER_NOT_APPROVED_FOR_PLAYER';
    end if;

    if not exists (
        select 1
        from public.character_applications ca
        where ca.character_id = new.recipient_character_id
          and ca.status = 'approved'
    ) then
        raise exception 'MAIL_RECIPIENT_NOT_APPROVED';
    end if;

    new.sender_player_id := caller_id;
    new.sent_at := now();
    new.deliver_at := now() + case new.method
        when 'courier' then interval '20 minutes'
        else interval '5 minutes'
    end;
    new.delivered_at := null;
    new.read_at := null;
    return new;
end;
$function$;

revoke all on function public.lorgus_mail_enforce_server_fields() from public, anon, authenticated;

drop trigger if exists trg_lorgus_mail_server_fields on public.lorgus_mail;
create trigger trg_lorgus_mail_server_fields
before insert on public.lorgus_mail
for each row execute function public.lorgus_mail_enforce_server_fields();

-- Received mail may only be marked as read; players must not rewrite mail content,
-- sender, recipient, method or delivery timestamps through PostgREST.
revoke update on table public.lorgus_mail from authenticated;
grant update (read_at) on table public.lorgus_mail to authenticated;

create or replace function public.lorgus_mail_lock_update_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
    if new.id is distinct from old.id
       or new.sender_character_id is distinct from old.sender_character_id
       or new.sender_player_id is distinct from old.sender_player_id
       or new.recipient_character_id is distinct from old.recipient_character_id
       or new.body is distinct from old.body
       or new.method is distinct from old.method
       or new.sent_at is distinct from old.sent_at
       or new.deliver_at is distinct from old.deliver_at
       or new.delivered_at is distinct from old.delivered_at then
        raise exception 'MAIL_CONTENT_IMMUTABLE';
    end if;

    if new.read_at is not null and old.read_at is null then
        new.read_at := now();
    elsif old.read_at is not null then
        new.read_at := old.read_at;
    end if;
    return new;
end;
$function$;

revoke all on function public.lorgus_mail_lock_update_fields() from public, anon, authenticated;

drop trigger if exists trg_lorgus_mail_lock_update_fields on public.lorgus_mail;
create trigger trg_lorgus_mail_lock_update_fields
before update on public.lorgus_mail
for each row execute function public.lorgus_mail_lock_update_fields();
