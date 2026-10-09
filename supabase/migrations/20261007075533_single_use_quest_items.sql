-- Quest and consumable items are single-use when referenced in an RP post.
-- Keep the rule authoritative in the database so the client cannot reuse them.

update public.items
set consumes_on_use = true
where item_type in ('consumable', 'quest')
  and consumes_on_use = false;

create or replace function public.admin_create_item(
    p_name text,
    p_item_type text,
    p_equipment_slot text default null,
    p_rarity text default 'common',
    p_icon text default '◆',
    p_color text default '#b8a27a',
    p_description text default '',
    p_stats jsonb default '{}'::jsonb,
    p_stackable boolean default false,
    p_max_stack integer default 1,
    p_consumes_on_use boolean default false
)
returns public.items
language plpgsql security definer set search_path = public
as $$
declare
    result_row public.items;
    effective_consumes boolean;
begin
    if not coalesce(public.is_admin(), false) then
        raise exception 'ADMIN_REQUIRED';
    end if;

    effective_consumes := case
        when p_item_type in ('consumable', 'quest') then true
        else coalesce(p_consumes_on_use, false)
    end;

    insert into public.items(
        name,item_type,equipment_slot,rarity,icon,color,description,stats,
        stackable,max_stack,consumes_on_use
    )
    values (
        nullif(trim(p_name),''),
        p_item_type,
        p_equipment_slot,
        p_rarity,
        coalesce(nullif(trim(p_icon),''),'◆'),
        coalesce(nullif(trim(p_color),''),'#b8a27a'),
        coalesce(trim(p_description),''),
        coalesce(p_stats,'{}'::jsonb),
        coalesce(p_stackable,false),
        greatest(1,coalesce(p_max_stack,1)),
        effective_consumes
    )
    returning * into result_row;

    return result_row;
end;
$$;

create or replace function public.send_lorgus_rp_message_with_items(
    p_character_id uuid,
    p_presence_type text,
    p_region text default null,
    p_location text default null,
    p_from_region text default null,
    p_from_location text default null,
    p_to_region text default null,
    p_to_location text default null,
    p_body text default null,
    p_visibility text default 'public',
    p_inventory_ids uuid[] default '{}'::uuid[]
)
returns public.rp_messages
language plpgsql security definer set search_path = public
as $$
declare
    result_row public.rp_messages;
    inventory_row public.character_inventory;
    item_row public.items;
    inv_id uuid;
    item_quantity integer;
    is_owner boolean;
begin
    if auth.uid() is null then
        raise exception 'AUTH_REQUIRED';
    end if;

    if coalesce(array_length(p_inventory_ids,1),0) > 10 then
        raise exception 'TOO_MANY_ITEMS';
    end if;

    if coalesce(array_length(p_inventory_ids,1),0) <> (
        select count(distinct value)
        from unnest(coalesce(p_inventory_ids,'{}'::uuid[])) as value
    ) then
        raise exception 'DUPLICATE_ITEM_SELECTION';
    end if;

    foreach inv_id in array coalesce(p_inventory_ids,'{}'::uuid[]) loop
        select exists(
            select 1
            from public.character_inventory ci
            join public.character_applications ca on ca.character_id=ci.character_id
            where ci.id=inv_id
              and ci.character_id=p_character_id
              and ca.player_id=auth.uid()
              and ca.status='approved'
        ) into is_owner;

        if not is_owner then
            raise exception 'INVENTORY_ITEM_NOT_OWNED';
        end if;

        select ci.*
        into inventory_row
        from public.character_inventory ci
        where ci.id=inv_id
        for update;

        if inventory_row.quantity < 1 then
            raise exception 'ITEM_EMPTY';
        end if;

        select *
        into item_row
        from public.items
        where id=inventory_row.item_id;

        if item_row.item_type in ('consumable','quest') or item_row.consumes_on_use then
            if inventory_row.equipped_slot is not null then
                raise exception 'ITEM_EQUIPPED';
            end if;
        end if;
    end loop;

    result_row := public.send_lorgus_rp_message(
        p_character_id,p_presence_type,p_region,p_location,
        p_from_region,p_from_location,p_to_region,p_to_location,
        p_body,p_visibility
    );

    foreach inv_id in array coalesce(p_inventory_ids,'{}'::uuid[]) loop
        select ci.*
        into inventory_row
        from public.character_inventory ci
        where ci.id=inv_id
        for update;

        select *
        into item_row
        from public.items
        where id=inventory_row.item_id;

        item_quantity := case
            when item_row.item_type in ('consumable','quest') or item_row.consumes_on_use
            then 1
            else 0
        end;

        insert into public.rp_message_item_uses(
            message_id,character_id,inventory_id,item_id,quantity,consumed
        )
        values(
            result_row.id,p_character_id,inv_id,item_row.id,1,item_quantity=1
        );

        if item_quantity=1 then
            update public.character_inventory
            set quantity=quantity-1
            where id=inv_id;
        end if;
    end loop;

    return result_row;
end;
$$;

revoke all on function public.admin_create_item(text,text,text,text,text,text,text,jsonb,boolean,integer,boolean) from public,anon,authenticated;
revoke all on function public.send_lorgus_rp_message_with_items(uuid,text,text,text,text,text,text,text,text,text,uuid[]) from public,anon,authenticated;

grant execute on function public.admin_create_item(text,text,text,text,text,text,text,jsonb,boolean,integer,boolean) to authenticated;
grant execute on function public.send_lorgus_rp_message_with_items(uuid,text,text,text,text,text,text,text,text,text,uuid[]) to authenticated;
