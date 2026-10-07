create or replace function public.admin_create_and_grant_character_item(
    p_character_id uuid,
    p_name text,
    p_type text,
    p_quantity integer default 1
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
begin
    if not coalesce(public.is_admin(), false) then
        raise exception 'ADMIN_REQUIRED';
    end if;

    if p_character_id is null then
        raise exception 'CHARACTER_NOT_FOUND';
    end if;

    if not exists (select 1 from public.characters where id = p_character_id) then
        raise exception 'CHARACTER_NOT_FOUND';
    end if;

    if nullif(trim(p_name), '') is null then
        raise exception 'ITEM_NAME_REQUIRED';
    end if;

    if p_quantity < 1 then
        raise exception 'INVALID_QUANTITY';
    end if;

    equipment_slot_value := case p_type
        when 'head' then 'head'
        when 'chest' then 'chest'
        when 'hands' then 'hands'
        when 'legs' then 'legs'
        when 'feet' then 'feet'
        when 'main_hand' then 'main_hand'
        when 'off_hand' then 'off_hand'
        when 'accessory_chain' then 'accessory_chain'
        when 'accessory_ring' then 'accessory_ring'
        when 'accessory_bracelet' then 'accessory_bracelet'
        else null
    end;

    item_type_value := case
        when equipment_slot_value is not null then 'equipment'
        when p_type in ('consumable','quest','material','misc') then p_type
        else null
    end;

    if item_type_value is null then
        raise exception 'INVALID_ITEM_TYPE';
    end if;

    insert into public.items(
        name,
        item_type,
        equipment_slot,
        rarity,
        icon,
        color,
        description,
        stats,
        stackable,
        max_stack,
        consumes_on_use
    )
    values(
        trim(p_name),
        item_type_value,
        equipment_slot_value,
        'common',
        case when equipment_slot_value is not null then '◆' else '◇' end,
        '#b8a27a',
        '',
        '{}'::jsonb,
        item_type_value <> 'equipment',
        case when item_type_value <> 'equipment' then 999 else 1 end,
        item_type_value = 'consumable'
    )
    returning id into new_item_id;

    perform public.admin_grant_character_item(
        p_character_id,
        new_item_id,
        p_quantity,
        'Создано хранителем при выдаче предмета'
    );

    return new_item_id;
exception
    when unique_violation then
        raise exception 'ITEM_NAME_ALREADY_EXISTS';
end;
$$;

revoke all on function public.admin_create_and_grant_character_item(uuid,text,text,integer) from public, anon, authenticated;
grant execute on function public.admin_create_and_grant_character_item(uuid,text,text,integer) to authenticated;
