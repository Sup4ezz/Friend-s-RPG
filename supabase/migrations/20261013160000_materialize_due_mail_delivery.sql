-- Materialize due pigeon deliveries on the server when a recipient opens the inbox.
-- The recipient can only advance delivery timestamps for their own approved characters.

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
       or new.deliver_at is distinct from old.deliver_at then
        raise exception 'MAIL_CONTENT_IMMUTABLE';
    end if;

    if new.delivered_at is distinct from old.delivered_at then
        if old.delivered_at is not null
           or new.delivered_at is distinct from old.deliver_at
           or old.deliver_at > now() then
            raise exception 'MAIL_DELIVERY_TIMESTAMP_IMMUTABLE';
        end if;
    end if;

    if new.read_at is not null and old.read_at is null then
        new.read_at := now();
    elsif old.read_at is not null then
        new.read_at := old.read_at;
    end if;
    return new;
end;
$function$;

create or replace function public.lorgus_deliver_due_mail()
returns integer
language plpgsql
security definer
set search_path = public
as $function$
declare
    delivered_count integer := 0;
begin
    if auth.uid() is null then
        raise exception 'AUTH_REQUIRED';
    end if;

    if coalesce(public.lorgus_is_access_blocked(), false) then
        raise exception 'ACCESS_BLOCKED';
    end if;

    update public.lorgus_mail m
       set delivered_at = m.deliver_at
     where m.delivered_at is null
       and m.deliver_at <= now()
       and exists (
           select 1
             from public.character_applications ca
            where ca.character_id = m.recipient_character_id
              and ca.player_id = auth.uid()
              and ca.status = 'approved'
       );

    get diagnostics delivered_count = row_count;
    return delivered_count;
end;
$function$;

revoke all on function public.lorgus_deliver_due_mail() from public, anon;
grant execute on function public.lorgus_deliver_due_mail() to authenticated;
