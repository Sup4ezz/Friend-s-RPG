-- LORGUS item subtype and richer admin item creation.
alter table public.items
    add column if not exists item_subtype text not null default 'misc';

create index if not exists items_item_subtype_idx
    on public.items(item_subtype);

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
    p_consumes_on_use boolean default false,
    p_item_subtype text default 'misc'
)
returns public.items
language plpgsql security definer set search_path = public
as $$
declare result_row public.items;
begin
    if not coalesce(public.is_admin(), false) then
        raise exception 'ADMIN_REQUIRED';
    end if;

    if p_item_type not in ('equipment','consumable','quest','material','misc') then
        raise exception 'INVALID_ITEM_TYPE';
    end if;

    if p_rarity not in ('common','uncommon','rare','epic','legendary','mythic','unique') then
        raise exception 'INVALID_ITEM_RARITY';
    end if;

    insert into public.items(
        name,item_type,item_subtype,equipment_slot,rarity,icon,color,description,
        stats,stackable,max_stack,consumes_on_use
    )
    values(
        nullif(trim(p_name),''),
        p_item_type,
        coalesce(nullif(trim(p_item_subtype),''),'misc'),
        p_equipment_slot,
        p_rarity,
        coalesce(nullif(trim(p_icon),''),'◆'),
        coalesce(nullif(trim(p_color),''),'#b8a27a'),
        coalesce(trim(p_description),''),
        coalesce(p_stats,'{}'::jsonb),
        coalesce(p_stackable,false),
        greatest(1,coalesce(p_max_stack,1)),
        coalesce(p_consumes_on_use,false)
    )
    returning * into result_row;

    return result_row;
end;
$$;

revoke all on function public.admin_create_item(text,text,text,text,text,text,text,jsonb,boolean,integer,boolean) from public,anon,authenticated;
revoke all on function public.admin_create_item(text,text,text,text,text,text,text,jsonb,boolean,integer,boolean,text) from public,anon,authenticated;
grant execute on function public.admin_create_item(text,text,text,text,text,text,text,jsonb,boolean,integer,boolean,text) to authenticated;

update public.items
set item_subtype = case
    when item_type = 'equipment' and equipment_slot = 'head' then 'helmet'
    when item_type = 'equipment' and equipment_slot = 'chest' then 'armor'
    when item_type = 'equipment' and equipment_slot = 'hands' then 'gloves'
    when item_type = 'equipment' and equipment_slot = 'legs' then 'pants'
    when item_type = 'equipment' and equipment_slot = 'feet' then 'boots'
    when item_type = 'equipment' and equipment_slot = 'main_hand' then 'sword'
    when item_type = 'equipment' and equipment_slot = 'off_hand' then 'shield'
    when item_type = 'equipment' and equipment_slot = 'accessory_chain' then 'chain'
    when item_type = 'equipment' and equipment_slot = 'accessory_ring' then 'ring'
    when item_type = 'equipment' and equipment_slot = 'accessory_bracelet' then 'bracelet'
    when item_type = 'consumable' then 'potion'
    when item_type = 'quest' then 'quest_item'
    when item_type = 'material' then 'material'
    else 'misc'
end
where item_subtype = 'misc' or item_subtype is null;