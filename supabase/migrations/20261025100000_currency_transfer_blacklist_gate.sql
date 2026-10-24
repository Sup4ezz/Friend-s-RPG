-- Draft security fix: apply the same blacklist/access gate used by other player RPCs
-- before allowing currency transfer. This migration is intentionally kept on a review branch.

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
begin
    if coalesce(public.lorgus_is_access_blocked(), false) then raise exception 'ACCESS_BLOCKED'; end if;
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
    ) then raise exception 'CHARACTER_ACCESS_DENIED'; end if;

    if not exists (
        select 1 from public.character_applications ca
        where ca.character_id = p_recipient_character_id
          and ca.status = 'approved'
    ) then raise exception 'RECIPIENT_CHARACTER_NOT_APPROVED'; end if;

    if p_presence_type = 'location' then
        select * into sender_presence
        from public.rp_presence
        where character_id = p_sender_character_id and visibility = 'public'
          and presence_type = 'location' and region = p_region and location = p_location
          and updated_at >= now() - interval '90 seconds'
        limit 1;
        select * into recipient_presence
        from public.rp_presence
        where character_id = p_recipient_character_id and visibility = 'public'
          and presence_type = 'location' and region = p_region and location = p_location
          and updated_at >= now() - interval '90 seconds'
        limit 1;
    else
        select * into sender_presence
        from public.rp_presence
        where character_id = p_sender_character_id and visibility = 'public'
          and presence_type = 'road' and from_region = p_from_region
          and from_location = p_from_location and to_region = p_to_region
          and to_location = p_to_location
          and updated_at >= now() - interval '90 seconds'
        limit 1;
        select * into recipient_presence
        from public.rp_presence
        where character_id = p_recipient_character_id and visibility = 'public'
          and presence_type = 'road' and from_region = p_from_region
          and from_location = p_from_location and to_region = p_to_region
          and to_location = p_to_location
          and updated_at >= now() - interval '90 seconds'
        limit 1;
    end if;

    if sender_presence.character_id is null or recipient_presence.character_id is null then
        raise exception 'PLAYERS_NOT_IN_SAME_CHAT';
    end if;

    select amount into sender_amount
    from public.character_currency
    where character_id = p_sender_character_id and currency_code = p_currency_code
    for update;
    if coalesce(sender_amount, 0) < p_amount then raise exception 'INSUFFICIENT_CURRENCY'; end if;

    select ca.player_id into recipient_user_id
    from public.character_applications ca
    where ca.character_id = p_recipient_character_id and ca.status = 'approved'
    order by ca.id desc limit 1;
    if recipient_user_id is null then raise exception 'RECIPIENT_ACCOUNT_NOT_FOUND'; end if;

    select c.name into sender_name from public.characters c where c.id = p_sender_character_id;
    currency_label := case p_currency_code
        when 'aur' then 'Аур' when 'lira' then 'Лира' when 'kald' then 'Кальд'
        when 'dorn' then 'Дорн' when 'fin' then 'Фин' end;
    amount_text := p_amount::text;

    insert into public.character_currency(character_id, currency_code, amount)
    values (p_recipient_character_id, p_currency_code, p_amount)
    on conflict (character_id, currency_code)
    do update set amount = public.character_currency.amount + excluded.amount, updated_at = now();

    update public.character_currency
    set amount = amount - p_amount, updated_at = now()
    where character_id = p_sender_character_id and currency_code = p_currency_code;

    insert into public.notifications(user_id, character_id, type, title, body, data)
    values (
        recipient_user_id, p_recipient_character_id, 'currency_received', 'Передача валюты',
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

