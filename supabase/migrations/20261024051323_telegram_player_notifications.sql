create table if not exists public.lorgus_telegram_player_links (
    user_id uuid primary key references auth.users(id) on delete cascade,
    telegram_user_id bigint not null unique,
    telegram_username text,
    preferences jsonb not null default '{
      "application_status": true,
      "items": true,
      "currency": true,
      "rp_replies": true,
      "mentions": true,
      "updates": true,
      "system": true,
      "rp_posts": false
    }'::jsonb,
    linked_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index if not exists lorgus_telegram_player_links_telegram_idx on public.lorgus_telegram_player_links(telegram_user_id);
alter table public.lorgus_telegram_player_links enable row level security;
revoke all on table public.lorgus_telegram_player_links from public, anon, authenticated;
grant all on table public.lorgus_telegram_player_links to service_role;

create or replace function public.lorgus_telegram_player_notification_event()
returns trigger language plpgsql security definer set search_path = '' as $function$
begin
  if new.type not in ('admin_reward_received', 'system') then return new; end if;
  perform public.lorgus_enqueue_telegram_event('player_notification', jsonb_build_object(
    'user_id', new.user_id, 'character_id', new.character_id, 'notification_type', new.type,
    'title', new.title, 'body', new.body, 'data', coalesce(new.data, '{}'::jsonb), 'created_at', new.created_at
  ));
  return new;
end;
$function$;
revoke all on function public.lorgus_telegram_player_notification_event() from public, anon, authenticated;
drop trigger if exists lorgus_telegram_player_notification_event on public.notifications;
create trigger lorgus_telegram_player_notification_event after insert on public.notifications
for each row execute function public.lorgus_telegram_player_notification_event();

create or replace function public.lorgus_telegram_updates_event()
returns trigger language plpgsql security definer set search_path = '' as $function$
begin
  if new.is_published is distinct from true then return new; end if;
  if tg_op = 'INSERT' then
    perform public.lorgus_enqueue_telegram_event('lorgus_update', jsonb_build_object(
      'update_id', new.id, 'version', new.version, 'title', new.title, 'body', new.body, 'published_at', new.published_at
    ));
  elsif (old.is_published is distinct from true and new.is_published is true)
     or old.title is distinct from new.title
     or old.body is distinct from new.body
     or old.version is distinct from new.version then
    perform public.lorgus_enqueue_telegram_event('lorgus_update', jsonb_build_object(
      'update_id', new.id, 'version', new.version, 'title', new.title, 'body', new.body, 'published_at', new.published_at
    ));
  end if;
  return new;
end;
$function$;
revoke all on function public.lorgus_telegram_updates_event() from public, anon, authenticated;
drop trigger if exists lorgus_telegram_updates_event on public.lorgus_updates;
create trigger lorgus_telegram_updates_event after insert or update of is_published, title, body, version on public.lorgus_updates
for each row execute function public.lorgus_telegram_updates_event();

create or replace function public.lorgus_telegram_rp_message_event()
returns trigger language plpgsql security definer set search_path = '' as $function$
declare v_name text; v_target_name text; v_target_character_id uuid; v_parent_region text; v_parent_location text;
begin
  if coalesce(new.is_admin_post, false) or coalesce(new.status, 'active') = 'reverted' then return new; end if;
  select c.name into v_name from public.characters c where c.id = new.character_id;
  perform public.lorgus_enqueue_telegram_event('rp_message', jsonb_build_object(
    'message_id', new.id, 'character_id', new.character_id, 'character_name', coalesce(v_name, 'Неизвестный персонаж'),
    'region', new.region, 'location', new.location, 'presence_type', new.presence_type, 'body', new.body, 'created_at', new.created_at
  ));
  if new.reply_to_id is not null then
    select c.name, parent.character_id, parent.region, parent.location
      into v_target_name, v_target_character_id, v_parent_region, v_parent_location
    from public.rp_messages parent left join public.characters c on c.id = parent.character_id
    where parent.id = new.reply_to_id;
    perform public.lorgus_enqueue_telegram_event('rp_reply_notification', jsonb_build_object(
      'message_id', new.id, 'reply_to_id', new.reply_to_id, 'character_id', new.character_id,
      'character_name', coalesce(v_name, 'Неизвестный персонаж'), 'target_character_id', v_target_character_id,
      'target_character_name', coalesce(v_target_name, 'автор исходного поста'),
      'region', coalesce(new.region, v_parent_region), 'location', coalesce(new.location, v_parent_location),
      'body', new.body, 'created_at', new.created_at
    ));
  end if;
  return new;
end;
$function$;
revoke all on function public.lorgus_telegram_rp_message_event() from public, anon, authenticated;