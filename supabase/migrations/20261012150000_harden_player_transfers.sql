-- Harden player-to-player transfers against stale presence and unapproved recipients.
-- The UI uses the in-chat currency RPC. Retire the legacy generic currency RPC.
revoke all on function public.lorgus_transfer_character_currency(uuid,uuid,text,integer) from public, anon, authenticated;

create or replace function public.lorgus_transfer_character_item(
    p_sender_character_id uuid,
    p_recipient_character_id uuid,
    p_inventory_id uuid,
    p_quantity integer default 1
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    sender_presence public.rp_presence;
    recipient_presence public.rp_presence;
    inventory_row public.character_inventory;
    item_row public.items;
    recipient_inventory_id uuid;
    recipient_quantity integer;
begin
    if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
    if p_sender_character_id = p_recipient_character_id then raise exception 'TRANSFER_SELF'; end if;
    if p_quantity < 1 then raise exception 'INVALID_QUANTITY'; end if;

    if not exists (
        select 1 from public.character_applications ca
        where ca.character_id = p_sender_character_id
          and ca.player_id = auth.uid()
          and ca.status = 'approved'
    ) then
        raise exception 'CHARACTER_ACCESS_DENIED';
    end if;

    if not exists (
        select 1 from public.character_applications ca
        where ca.character_id = p_recipient_character_id
          and ca.status = 'approved'
    ) then
        raise exception 'RECIPIENT_CHARACTER_NOT_APPROVED';
    end if;

    select * into sender_presence
    from public.rp_presence
    where character_id = p_sender_character_id
      and visibility = 'public'
      and updated_at >= now() - interval '90 seconds'
    limit 1;

    select * into recipient_presence
    from public.rp_presence
    where character_id = p_recipient_character_id
      and visibility = 'public'
      and updated_at >= now() - interval '90 seconds'
    limit 1;

    if sender_presence.presence_type is distinct from 'location'
       or recipient_presence.presence_type is distinct from 'location'
       or sender_presence.region is distinct from recipient_presence.region
       or sender_presence.location is distinct from recipient_presence.location then
        raise exception 'PLAYERS_NOT_IN_SAME_LOCATION';
    end if;

    select ci.* into inventory_row
    from public.character_inventory ci
    where ci.id = p_inventory_id
      and ci.character_id = p_sender_character_id
      and ci.quantity > 0
    for update;
    if not found then raise exception 'INVENTORY_ITEM_NOT_FOUND'; end if;
    if inventory_row.equipped_slot is not null then raise exception 'ITEM_MUST_BE_UNEQUIPPED'; end if;
    if p_quantity > inventory_row.quantity then raise exception 'INSUFFICIENT_ITEM_QUANTITY'; end if;

    select * into item_row from public.items where id = inventory_row.item_id;
    if not found then raise exception 'ITEM_NOT_FOUND'; end if;

    if item_row.stackable then
        select id, quantity into recipient_inventory_id, recipient_quantity
        from public.character_inventory
        where character_id = p_recipient_character_id
          and item_id = inventory_row.item_id
          and equipped_slot is null
        order by acquired_at asc
        limit 1
        for update;

        if recipient_inventory_id is not null then
            if recipient_quantity + p_quantity > item_row.max_stack then
                raise exception 'RECIPIENT_STACK_FULL';
            end if;
            update public.character_inventory
            set quantity = quantity + p_quantity, source_note = 'Передано игроком'
            where id = recipient_inventory_id;
        else
            insert into public.character_inventory(character_id,item_id,quantity,acquired_by,source_note)
            values(p_recipient_character_id,inventory_row.item_id,p_quantity,auth.uid(),'Передано игроком');
        end if;
    else
        if p_quantity <> 1 then raise exception 'NON_STACKABLE_ITEM'; end if;
        insert into public.character_inventory(character_id,item_id,quantity,acquired_by,source_note)
        values(p_recipient_character_id,inventory_row.item_id,1,auth.uid(),'Передано игроком');
    end if;

    if inventory_row.quantity = p_quantity then
        delete from public.character_inventory where id = inventory_row.id;
    else
        update public.character_inventory set quantity = quantity - p_quantity where id = inventory_row.id;
    end if;
end;
$$;

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

revoke all on function public.lorgus_transfer_character_item(uuid,uuid,uuid,integer) from public, anon, authenticated;
grant execute on function public.lorgus_transfer_character_item(uuid,uuid,uuid,integer) to authenticated;
revoke all on function public.lorgus_transfer_character_currency_in_chat(uuid,uuid,text,integer,text,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.lorgus_transfer_character_currency_in_chat(uuid,uuid,text,integer,text,text,text,text,text,text,text) to authenticated;
