-- Notify Telegram about lootbox title and currency rewards as well as special rewards.
-- The existing character_special_rewards trigger already reports privilege/special rewards;
-- only title/currency outcomes are emitted here to avoid duplicate messages.
create or replace function public.open_character_lootbox(p_inventory_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
    inv public.character_inventory;
    box public.items;
    reward public.lootbox_rewards;
    title_row public.titles;
    owner_ok boolean;
    awarded_name text;
    awarded_description text;
    awarded_rarity text;
    awarded_icon text;
    awarded_color text;
begin
    if coalesce(public.lorgus_is_access_blocked(), false) then
        raise exception 'ACCESS_BLOCKED';
    end if;
    if auth.uid() is null then
        raise exception 'AUTHENTICATION_REQUIRED';
    end if;

    select ci.* into inv
    from public.character_inventory ci
    where ci.id = p_inventory_id
    for update;

    if not found then raise exception 'INVENTORY_ITEM_NOT_FOUND'; end if;
    if inv.quantity < 1 then raise exception 'ITEM_EMPTY'; end if;
    if inv.equipped_slot is not null then raise exception 'ITEM_EQUIPPED'; end if;

    select i.* into box
    from public.items i
    where i.id = inv.item_id and i.item_subtype = 'lootbox';
    if not found then raise exception 'ITEM_IS_NOT_LOOTBOX'; end if;

    select exists (
        select 1 from public.character_applications ca
        where ca.character_id = inv.character_id
          and ca.player_id = auth.uid()
          and ca.status = 'approved'
    ) into owner_ok;
    if not owner_ok then raise exception 'CHARACTER_ACCESS_DENIED'; end if;

    select lr.* into reward
    from public.lootbox_rewards lr
    where lr.lootbox_item_id = box.id
      and (
          lr.reward_type <> 'title'
          or not exists (
              select 1 from public.character_titles ct
              where ct.character_id = inv.character_id and ct.title_id = lr.title_id
          )
      )
    order by -ln(greatest(random(), 0.0000000001)) / lr.weight
    limit 1;
    if not found then raise exception 'LOOTBOX_POOL_EMPTY'; end if;

    if reward.reward_type = 'title' then
        insert into public.character_titles(character_id, title_id, awarded_by)
        values (inv.character_id, reward.title_id, auth.uid())
        on conflict (character_id, title_id) do nothing;

        select * into title_row from public.titles where id = reward.title_id;
        awarded_name := title_row.name;
        awarded_description := title_row.description;
        awarded_rarity := title_row.rarity;
        awarded_icon := title_row.icon;
        awarded_color := title_row.color;

    elsif reward.reward_type = 'currency' then
        insert into public.character_currency(character_id, currency_code, amount)
        values (inv.character_id, reward.currency_code, reward.amount)
        on conflict (character_id, currency_code)
        do update set
            amount = public.character_currency.amount + excluded.amount,
            updated_at = now();

        awarded_name := reward.reward_name;
        awarded_description := reward.description;
        awarded_rarity := reward.rarity;
        awarded_icon := '◈';
        awarded_color := case reward.rarity
            when 'common' then '#b8a27a'
            when 'uncommon' then '#76b85f'
            when 'rare' then '#5f9fe8'
            when 'epic' then '#a875e8'
            when 'legendary' then '#e0a14a'
            when 'mythic' then '#e45bc7'
            else '#f3e7b0'
        end;
        awarded_description := concat_ws(' ', awarded_description,
            'Получено: ' || reward.amount || ' ' || reward.currency_code || '.');

    else
        insert into public.character_special_rewards(
            character_id, reward_type, name, description, rarity, source_lootbox_id
        )
        values (
            inv.character_id, reward.reward_type, reward.reward_name,
            reward.description, reward.rarity, box.id
        );

        awarded_name := reward.reward_name;
        awarded_description := reward.description;
        awarded_rarity := reward.rarity;
        awarded_icon := case reward.reward_type when 'privilege' then '♛' else '✦' end;
        awarded_color := case reward.rarity
            when 'common' then '#b8a27a'
            when 'uncommon' then '#76b85f'
            when 'rare' then '#5f9fe8'
            when 'epic' then '#a875e8'
            when 'legendary' then '#e0a14a'
            when 'mythic' then '#e45bc7'
            else '#f3e7b0'
        end;
    end if;

    if inv.quantity = 1 then
        delete from public.character_inventory where id = inv.id;
    else
        update public.character_inventory set quantity = quantity - 1 where id = inv.id;
    end if;

    if reward.reward_type in ('title', 'currency') then
        perform public.lorgus_enqueue_telegram_event('lootbox_reward', jsonb_build_object(
            'character_id', inv.character_id,
            'character_name', (select c.name from public.characters c where c.id = inv.character_id),
            'reward_type', reward.reward_type,
            'reward_name', awarded_name,
            'description', awarded_description,
            'rarity', awarded_rarity,
            'currency_code', reward.currency_code,
            'amount', reward.amount,
            'title_id', reward.title_id,
            'source_lootbox_id', box.id,
            'source_lootbox_name', box.name
        ));
    end if;

    return jsonb_build_object('reward', jsonb_build_object(
        'id', reward.id,
        'reward_type', reward.reward_type,
        'name', awarded_name,
        'description', awarded_description,
        'rarity', awarded_rarity,
        'icon', awarded_icon,
        'color', awarded_color,
        'currency_code', reward.currency_code,
        'amount', reward.amount
    ));
end;
$function$;
