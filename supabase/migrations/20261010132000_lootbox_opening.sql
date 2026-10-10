-- LORGUS lootbox: atomic consume + random reward grant.
-- Apply this migration in the Supabase SQL editor before using lootboxes.
create or replace function public.open_character_lootbox(p_inventory_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    inventory_row public.character_inventory;
    box_item public.items;
    reward_item public.items;
    owner_ok boolean;
    reward_inventory_id uuid;
begin
    if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;

    select ci.* into inventory_row
    from public.character_inventory ci
    where ci.id = p_inventory_id
    for update;

    if not found then raise exception 'INVENTORY_ITEM_NOT_FOUND'; end if;
    if inventory_row.quantity < 1 then raise exception 'ITEM_EMPTY'; end if;
    if inventory_row.equipped_slot is not null then raise exception 'ITEM_EQUIPPED'; end if;

    select * into box_item from public.items where id = inventory_row.item_id;
    if not found or box_item.item_subtype is distinct from 'lootbox' then
        raise exception 'ITEM_IS_NOT_LOOTBOX';
    end if;

    select exists (
        select 1 from public.character_applications ca
        where ca.character_id = inventory_row.character_id
          and ca.player_id = auth.uid()
          and ca.status = 'approved'
    ) into owner_ok;
    if not owner_ok then raise exception 'CHARACTER_ACCESS_DENIED'; end if;

    -- One weighted roll across the existing item catalogue. Rare tiers have
    -- progressively smaller weights; lootboxes never appear inside lootboxes.
    select i.* into reward_item
    from public.items i
    where i.item_subtype is distinct from 'lootbox'
      and i.id <> box_item.id
    order by random() / (
        case i.rarity
            when 'common' then 1.00
            when 'uncommon' then 0.48
            when 'rare' then 0.24
            when 'epic' then 0.11
            when 'legendary' then 0.045
            when 'mythic' then 0.015
            when 'unique' then 0.004
            else 0.5
        end
    )
    limit 1;

    if not found then raise exception 'LOOTBOX_POOL_EMPTY'; end if;

    -- Grant exactly one item. The whole function is a single transaction, so
    -- a failed grant also rolls back the box consumption.
    insert into public.character_inventory(character_id, item_id, quantity, acquired_by, source_note)
    values (
        inventory_row.character_id,
        reward_item.id,
        1,
        auth.uid(),
        'Награда из лутбокса: ' || coalesce(box_item.name, 'Лутбокс')
    )
    returning id into reward_inventory_id;

    if inventory_row.quantity = 1 then
        delete from public.character_inventory where id = inventory_row.id;
    else
        update public.character_inventory
        set quantity = quantity - 1
        where id = inventory_row.id;
    end if;

    return jsonb_build_object(
        'reward', jsonb_build_object(
            'inventory_id', reward_inventory_id,
            'id', reward_item.id,
            'name', reward_item.name,
            'item_type', reward_item.item_type,
            'item_subtype', reward_item.item_subtype,
            'rarity', reward_item.rarity,
            'icon', reward_item.icon,
            'color', reward_item.color,
            'description', reward_item.description
        )
    );
end;
$$;

revoke all on function public.open_character_lootbox(uuid) from public, anon;
grant execute on function public.open_character_lootbox(uuid) to authenticated;
