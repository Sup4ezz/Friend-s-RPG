-- New lootboxes inherit the authored reward pool instead of being empty shells.
-- Prefer the canonical "ЛУДОЧКА" pool; fall back to another configured lootbox.
create or replace function public.admin_create_and_grant_character_item(
    p_character_id uuid,
    p_name text,
    p_type text,
    p_quantity integer default 1,
    p_rarity text default 'common',
    p_subtype text default 'misc'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    new_item_id uuid;
    equipment_slot_value text;
    item_type_value text;
    icon_value text;
    color_value text;
    lootbox_template_id uuid;
    effective_subtype text;
begin
    if not coalesce(public.is_admin(), false) then raise exception 'ADMIN_REQUIRED'; end if;
    if p_character_id is null or not exists (select 1 from public.characters where id = p_character_id) then raise exception 'CHARACTER_NOT_FOUND'; end if;
    if nullif(trim(p_name), '') is null then raise exception 'ITEM_NAME_REQUIRED'; end if;
    if p_quantity is null or p_quantity < 1 then raise exception 'INVALID_QUANTITY'; end if;
    if p_rarity not in ('common','uncommon','rare','epic','legendary','mythic','unique') then raise exception 'INVALID_ITEM_RARITY'; end if;

    effective_subtype := coalesce(nullif(trim(p_subtype),''),p_type);

    equipment_slot_value := case p_type
        when 'helmet' then 'head'
        when 'armor' then 'chest'
        when 'gloves' then 'hands'
        when 'pants' then 'legs'
        when 'boots' then 'feet'
        when 'sword' then 'main_hand'
        when 'paired_daggers' then 'main_hand'
        when 'spear' then 'main_hand'
        when 'axe' then 'main_hand'
        when 'staff' then 'main_hand'
        when 'bow' then 'main_hand'
        when 'crossbow' then 'main_hand'
        when 'shield' then 'off_hand'
        when 'chain' then 'accessory_chain'
        when 'ring' then 'accessory_ring'
        when 'bracelet' then 'accessory_bracelet'
        else null
    end;

    item_type_value := case
        when equipment_slot_value is not null then 'equipment'
        when p_type in ('potion','scroll','food','consumable') then 'consumable'
        when p_type = 'quest_item' then 'quest'
        when p_type = 'material' then 'material'
        else 'misc'
    end;

    icon_value := case p_type
        when 'helmet' then '⛑'
        when 'armor' then '⛨'
        when 'gloves' then '🧤'
        when 'pants' then '♜'
        when 'boots' then '◈'
        when 'sword' then '⚔'
        when 'paired_daggers' then '🗡'
        when 'spear' then '🔱'
        when 'axe' then '🪓'
        when 'staff' then '⚚'
        when 'bow' then '🏹'
        when 'crossbow' then '⤨'
        when 'shield' then '🛡'
        when 'chain' then '⛓'
        when 'ring' then '◉'
        when 'bracelet' then '◌'
        when 'potion' then '✚'
        when 'scroll' then '▤'
        when 'food' then '✦'
        when 'quest_item' then '✉'
        when 'material' then '◇'
        when 'lootbox' then '▣'
        else '◆'
    end;

    color_value := case p_rarity
        when 'common' then '#b8a27a'
        when 'uncommon' then '#76b85f'
        when 'rare' then '#5f9fe8'
        when 'epic' then '#a875e8'
        when 'legendary' then '#e0a14a'
        when 'mythic' then '#e45bc7'
        when 'unique' then '#f3e7b0'
        else '#b8a27a'
    end;

    insert into public.items(
        name,item_type,item_subtype,equipment_slot,rarity,icon,color,description,
        stats,stackable,max_stack,consumes_on_use
    )
    values(
        trim(p_name),item_type_value,effective_subtype,
        equipment_slot_value,p_rarity,icon_value,color_value,'','{}'::jsonb,
        item_type_value <> 'equipment',case when item_type_value <> 'equipment' then 999 else 1 end,
        p_type in ('potion','scroll','food')
    )
    returning id into new_item_id;

    -- A newly-created lootbox must receive a real reward pool in the same transaction.
    -- The authored canonical pool is preferred; another configured box is a fallback.
    if effective_subtype = 'lootbox' then
        select i.id into lootbox_template_id
        from public.items i
        where i.id <> new_item_id
          and i.item_subtype = 'lootbox'
          and exists (
              select 1 from public.lootbox_rewards lr
              where lr.lootbox_item_id = i.id
          )
        order by
          case when upper(trim(i.name)) = upper('ЛУДОЧКА') then 0 else 1 end,
          i.name asc
        limit 1;

        if lootbox_template_id is null then
            raise exception 'LOOTBOX_TEMPLATE_WITH_REWARDS_NOT_FOUND';
        end if;

        insert into public.lootbox_rewards(
            lootbox_item_id, reward_item_id, weight, reward_type, title_id,
            reward_name, description, rarity, currency_code, amount
        )
        select
            new_item_id, lr.reward_item_id, lr.weight, lr.reward_type, lr.title_id,
            lr.reward_name, lr.description, lr.rarity, lr.currency_code, lr.amount
        from public.lootbox_rewards lr
        where lr.lootbox_item_id = lootbox_template_id;
    end if;

    perform public.admin_grant_character_item(
        p_character_id,new_item_id,p_quantity,'Создано хранителем при выдаче предмета'
    );
    return new_item_id;
exception when unique_violation then
    raise exception 'ITEM_NAME_ALREADY_EXISTS';
end;
$$;

revoke all on function public.admin_create_and_grant_character_item(uuid,text,text,integer,text,text) from public,anon,authenticated;
grant execute on function public.admin_create_and_grant_character_item(uuid,text,text,integer,text,text) to authenticated;
