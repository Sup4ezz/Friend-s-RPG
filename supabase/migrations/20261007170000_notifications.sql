-- Persistent notifications for player-to-player transfers.

create table if not exists public.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    character_id uuid references public.characters(id) on delete set null,
    type text not null default 'system',
    title text not null,
    body text not null,
    data jsonb not null default '{}'::jsonb,
    read_at timestamptz null,
    created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
    on public.notifications(user_id, created_at desc);

create index if not exists notifications_user_unread_idx
    on public.notifications(user_id, read_at)
    where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
    on public.notifications for select to authenticated
    using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
    on public.notifications for update to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

create or replace function public.lorgus_transfer_character_currency_in_chat(
    p_sender_character_id uuid,
    p_recipient_character_id uuid,
    p_currency_code text,
    p_amount integer,
    p_presence_type text,
    p_region text default null,
    p_location text default null,
    p_from_region text default null,
    p_from_location text default null,
    p_to_region text default null,
    p_to_location text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
    sender_presence public.rp_presence;
    recipient_presence public.rp_presence;
    sender_amount integer;
    recipient_user_id uuid;
    sender_name text;
    currency_label text;
    amount_text text;
    gold integer;
    silver integer;
    copper integer;
begin
    if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
    if p_sender_character_id = p_recipient_character_id then raise exception 'TRANSFER_SELF'; end if;
    if p_currency_code not in ('aur','lira','kald','dorn','fin') then raise exception 'INVALID_CURRENCY'; end if;
    if p_amount < 1 then raise exception 'INVALID_AMOUNT'; end if;
    if p_presence_type not in ('location','road') then raise exception 'INVALID_CHAT'; end if;

    if not exists (
        select 1 from public.character_applications ca
        where ca.character_id = p_sender_character_id
          and ca.player_id = auth.uid()
          and ca.status = 'approved'
    ) then
        raise exception 'CHARACTER_ACCESS_DENIED';
    end if;

    if p_presence_type = 'location' then
        select * into sender_presence
        from public.rp_presence
        where character_id = p_sender_character_id and visibility = 'public'
          and presence_type = 'location' and region = p_region and location = p_location
        limit 1;

        select * into recipient_presence
        from public.rp_presence
        where character_id = p_recipient_character_id and visibility = 'public'
          and presence_type = 'location' and region = p_region and location = p_location
        limit 1;
    else
        select * into sender_presence
        from public.rp_presence
        where character_id = p_sender_character_id and visibility = 'public'
          and presence_type = 'road' and from_region = p_from_region
          and from_location = p_from_location and to_region = p_to_region
          and to_location = p_to_location
        limit 1;

        select * into recipient_presence
        from public.rp_presence
        where character_id = p_recipient_character_id and visibility = 'public'
          and presence_type = 'road' and from_region = p_from_region
          and from_location = p_from_location and to_region = p_to_region
          and to_location = p_to_location
        limit 1;
    end if;

    if sender_presence.character_id is null or recipient_presence.character_id is null then
        raise exception 'PLAYERS_NOT_IN_SAME_CHAT';
    end if;

    select amount into sender_amount
    from public.character_currency
    where character_id = p_sender_character_id and currency_code = p_currency_code
    for update;

    if coalesce(sender_amount, 0) < p_amount then
        raise exception 'INSUFFICIENT_CURRENCY';
    end if;

    select ca.player_id into recipient_user_id
    from public.character_applications ca
    where ca.character_id = p_recipient_character_id and ca.status = 'approved'
    order by ca.id desc limit 1;

    if recipient_user_id is null then raise exception 'RECIPIENT_ACCOUNT_NOT_FOUND'; end if;

    select c.name into sender_name
    from public.characters c
    where c.id = p_sender_character_id;

    currency_label := case p_currency_code
        when 'aur' then 'Аур'
        when 'lira' then 'Лира'
        when 'kald' then 'Кальд'
        when 'dorn' then 'Дорн'
        when 'fin' then 'Фин'
    end;

    gold := p_amount / 10000;
    silver := (p_amount % 10000) / 100;
    copper := p_amount % 100;

    amount_text := trim(both ' ' from
        case when gold > 0 then gold || ' золот. ' else '' end ||
        case when silver > 0 then silver || ' серебр. ' else '' end ||
        case when copper > 0 then copper || ' мед.' else '' end
    );

    insert into public.character_currency(character_id, currency_code, amount)
    values (p_recipient_character_id, p_currency_code, p_amount)
    on conflict (character_id, currency_code)
    do update set amount = public.character_currency.amount + excluded.amount,
                  updated_at = now();

    update public.character_currency
    set amount = amount - p_amount, updated_at = now()
    where character_id = p_sender_character_id and currency_code = p_currency_code;

    insert into public.notifications(user_id, character_id, type, title, body, data)
    values (
        recipient_user_id,
        p_recipient_character_id,
        'currency_received',
        'Передача валюты',
        coalesce(sender_name, 'Персонаж') || ' передал тебе ' || amount_text || ' (' || currency_label || ').',
        jsonb_build_object(
            'sender_character_id', p_sender_character_id,
            'sender_name', coalesce(sender_name, 'Персонаж'),
            'recipient_character_id', p_recipient_character_id,
            'currency_code', p_currency_code,
            'amount', p_amount
        )
    );
end;
$function$;

revoke all on function public.lorgus_transfer_character_currency_in_chat(
    uuid,uuid,text,integer,text,text,text,text,text,text,text
) from public, anon, authenticated;

grant execute on function public.lorgus_transfer_character_currency_in_chat(
    uuid,uuid,text,integer,text,text,text,text,text,text,text
) to authenticated;
