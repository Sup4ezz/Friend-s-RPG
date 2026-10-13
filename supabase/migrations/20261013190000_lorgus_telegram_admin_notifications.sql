-- LORGUS Telegram admin event feed.
-- Events are queued even before Telegram credentials are configured; the game must never fail because notifications are unavailable.
create extension if not exists pg_net;

create table if not exists public.lorgus_telegram_outbox (
    id bigint generated always as identity primary key,
    event_type text not null,
    payload jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    sent_at timestamptz,
    attempts integer not null default 0,
    last_error text
);

create index if not exists lorgus_telegram_outbox_pending_idx
    on public.lorgus_telegram_outbox (created_at)
    where sent_at is null;

alter table public.lorgus_telegram_outbox enable row level security;
revoke all on table public.lorgus_telegram_outbox from public, anon, authenticated;
grant select, update on table public.lorgus_telegram_outbox to service_role;
grant usage, select on sequence public.lorgus_telegram_outbox_id_seq to service_role;

create or replace function public.lorgus_dispatch_telegram_event(p_event_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_secret text;
    v_event record;
begin
    select decrypted_secret into v_secret
    from vault.decrypted_secrets
    where name = 'lorgus_telegram_webhook_secret'
    limit 1;

    -- Not configured yet: leave the event in the outbox for later delivery.
    if coalesce(v_secret, '') = '' then
        return;
    end if;

    select id, event_type, payload
      into v_event
    from public.lorgus_telegram_outbox
    where id = p_event_id and sent_at is null;

    if not found then return; end if;

    update public.lorgus_telegram_outbox
       set attempts = attempts + 1, last_error = null
     where id = p_event_id and sent_at is null;

    perform net.http_post(
        url := 'https://dxdxnttpznoekaiecrlv.supabase.co/functions/v1/lorgus-telegram-notify',
        body := jsonb_build_object(
            'id', v_event.id,
            'event_type', v_event.event_type,
            'payload', v_event.payload
        ),
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-lorgus-webhook-secret', v_secret
        ),
        timeout_milliseconds := 2000
    );
exception when others then
    -- Never make player actions depend on Telegram availability.
    update public.lorgus_telegram_outbox
       set last_error = left(SQLERRM, 500)
     where id = p_event_id and sent_at is null;
    return;
end;
$function$;

revoke all on function public.lorgus_dispatch_telegram_event(bigint) from public, anon, authenticated;

create or replace function public.lorgus_enqueue_telegram_event(
    p_event_type text,
    p_payload jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_id bigint;
begin
    insert into public.lorgus_telegram_outbox(event_type, payload)
    values (p_event_type, coalesce(p_payload, '{}'::jsonb))
    returning id into v_id;

    perform public.lorgus_dispatch_telegram_event(v_id);
    return v_id;
end;
$function$;

revoke all on function public.lorgus_enqueue_telegram_event(text, jsonb) from public, anon, authenticated;

create or replace function public.lorgus_telegram_application_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
    if tg_op = 'INSERT' and new.status = 'pending' then
        perform public.lorgus_enqueue_telegram_event('character_application', jsonb_build_object(
            'application_id', new.id,
            'name', new.name,
            'race', new.race,
            'age', new.age,
            'homeland', new.homeland,
            'occupation', new.occupation
        ));
    elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
        perform public.lorgus_enqueue_telegram_event('application_review', jsonb_build_object(
            'application_id', new.id,
            'name', new.name,
            'status', new.status,
            'review_notes', new.review_notes
        ));
    end if;
    return new;
end;
$function$;

drop trigger if exists lorgus_telegram_application_event on public.character_applications;
create trigger lorgus_telegram_application_event
after insert or update of status on public.character_applications
for each row execute function public.lorgus_telegram_application_event();

create or replace function public.lorgus_telegram_rp_message_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_name text;
begin
    if coalesce(new.is_admin_post, false) then return new; end if;
    if coalesce(new.status, 'active') = 'reverted' then return new; end if;

    select c.name into v_name from public.characters c where c.id = new.character_id;

    perform public.lorgus_enqueue_telegram_event('rp_message', jsonb_build_object(
        'message_id', new.id,
        'character_id', new.character_id,
        'character_name', coalesce(v_name, 'Неизвестный персонаж'),
        'region', new.region,
        'location', new.location,
        'presence_type', new.presence_type,
        'body', new.body,
        'created_at', new.created_at
    ));
    return new;
end;
$function$;

drop trigger if exists lorgus_telegram_rp_message_event on public.rp_messages;
create trigger lorgus_telegram_rp_message_event
after insert on public.rp_messages
for each row execute function public.lorgus_telegram_rp_message_event();

create or replace function public.lorgus_telegram_item_use_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_name text;
    v_item text;
    v_body text;
    v_region text;
    v_location text;
begin
    select c.name into v_name from public.characters c where c.id = new.character_id;
    select i.name into v_item from public.items i where i.id = new.item_id;
    select m.body, m.region, m.location
      into v_body, v_region, v_location
    from public.rp_messages m where m.id = new.message_id;

    perform public.lorgus_enqueue_telegram_event('item_used', jsonb_build_object(
        'character_id', new.character_id,
        'character_name', coalesce(v_name, 'Неизвестный персонаж'),
        'item_name', coalesce(v_item, 'Неизвестный предмет'),
        'quantity', new.quantity,
        'message_id', new.message_id,
        'message_excerpt', left(coalesce(v_body, ''), 700),
        'region', v_region,
        'location', v_location,
        'consumed', new.consumed
    ));
    return new;
end;
$function$;

drop trigger if exists lorgus_telegram_item_use_event on public.rp_message_item_uses;
create trigger lorgus_telegram_item_use_event
after insert on public.rp_message_item_uses
for each row execute function public.lorgus_telegram_item_use_event();

create or replace function public.lorgus_telegram_item_transfer_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_name text;
    v_item text;
    v_sender text;
begin
    if new.source_note is distinct from 'Передано игроком' then return new; end if;
    if tg_op = 'UPDATE' and old.source_note is not distinct from new.source_note then return new; end if;

    select c.name into v_name from public.characters c where c.id = new.character_id;
    select i.name into v_item from public.items i where i.id = new.item_id;
    select c.name into v_sender
    from public.character_applications ca
    join public.characters c on c.id = ca.character_id
    where ca.player_id = new.acquired_by and ca.status = 'approved'
    order by ca.id desc limit 1;

    perform public.lorgus_enqueue_telegram_event('item_transfer', jsonb_build_object(
        'character_id', new.character_id,
        'character_name', coalesce(v_name, 'Неизвестный персонаж'),
        'sender_name', v_sender,
        'item_name', coalesce(v_item, 'Неизвестный предмет'),
        'quantity', new.quantity
    ));
    return new;
end;
$function$;

drop trigger if exists lorgus_telegram_item_transfer_event on public.character_inventory;
create trigger lorgus_telegram_item_transfer_event
after insert or update of source_note on public.character_inventory
for each row execute function public.lorgus_telegram_item_transfer_event();

create or replace function public.lorgus_telegram_currency_transfer_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_name text;
begin
    if new.type <> 'currency_received' then return new; end if;
    select c.name into v_name from public.characters c where c.id = new.character_id;

    perform public.lorgus_enqueue_telegram_event('currency_transfer', jsonb_build_object(
        'character_id', new.character_id,
        'character_name', coalesce(v_name, 'Неизвестный персонаж'),
        'title', new.title,
        'body', new.body,
        'data', new.data
    ));
    return new;
end;
$function$;

drop trigger if exists lorgus_telegram_currency_transfer_event on public.notifications;
create trigger lorgus_telegram_currency_transfer_event
after insert on public.notifications
for each row execute function public.lorgus_telegram_currency_transfer_event();

create or replace function public.lorgus_telegram_lootbox_reward_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_name text;
begin
    if new.source_lootbox_id is null then return new; end if;
    select c.name into v_name from public.characters c where c.id = new.character_id;

    perform public.lorgus_enqueue_telegram_event('lootbox_reward', jsonb_build_object(
        'character_id', new.character_id,
        'character_name', coalesce(v_name, 'Неизвестный персонаж'),
        'reward_name', new.name,
        'description', new.description,
        'rarity', new.rarity,
        'source_lootbox_id', new.source_lootbox_id
    ));
    return new;
end;
$function$;

drop trigger if exists lorgus_telegram_lootbox_reward_event on public.character_special_rewards;
create trigger lorgus_telegram_lootbox_reward_event
after insert on public.character_special_rewards
for each row execute function public.lorgus_telegram_lootbox_reward_event();

create or replace function public.lorgus_telegram_rp_reverted_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_name text;
begin
    if new.status is distinct from 'reverted' or old.status is not distinct from 'reverted' then return new; end if;
    select c.name into v_name from public.characters c where c.id = new.character_id;

    perform public.lorgus_enqueue_telegram_event('rp_message_reverted', jsonb_build_object(
        'message_id', new.id,
        'character_name', coalesce(v_name, 'Неизвестный персонаж'),
        'body', new.body,
        'revert_reason', new.revert_reason
    ));
    return new;
end;
$function$;

drop trigger if exists lorgus_telegram_rp_reverted_event on public.rp_messages;
create trigger lorgus_telegram_rp_reverted_event
after update of status on public.rp_messages
for each row execute function public.lorgus_telegram_rp_reverted_event();

-- Backlog dispatcher: call after secrets are configured to deliver events queued before Telegram setup.
create or replace function public.lorgus_dispatch_pending_telegram_events(p_limit integer default 50)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_id bigint;
    v_count integer := 0;
begin
    if p_limit < 1 or p_limit > 500 then raise exception 'INVALID_LIMIT'; end if;
    for v_id in
        select id from public.lorgus_telegram_outbox
        where sent_at is null and attempts < 3
        order by id
        limit p_limit
    loop
        perform public.lorgus_dispatch_telegram_event(v_id);
        v_count := v_count + 1;
    end loop;
    return v_count;
end;
$function$;

revoke all on function public.lorgus_dispatch_pending_telegram_events(integer) from public, anon, authenticated;
