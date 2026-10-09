-- LORGUS inventory, equipment and authoritative item usage.
create table if not exists public.items (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    item_type text not null check (item_type in ('equipment','consumable','quest','material','misc')),
    equipment_slot text check (equipment_slot in ('head','chest','hands','legs','feet','main_hand','off_hand','accessory') or equipment_slot is null),
    rarity text not null check (rarity in ('common','uncommon','rare','epic','legendary','mythic','unique')),
    icon text not null default '◆',
    color text not null default '#b8a27a',
    description text not null default '',
    stats jsonb not null default '{}'::jsonb,
    stackable boolean not null default false,
    max_stack integer not null default 1 check (max_stack between 1 and 999),
    consumes_on_use boolean not null default false,
    created_at timestamptz not null default now()
);

create table if not exists public.character_inventory (
    id uuid primary key default gen_random_uuid(),
    character_id uuid not null references public.characters(id) on delete cascade,
    item_id uuid not null references public.items(id) on delete cascade,
    quantity integer not null default 1 check (quantity >= 0),
    equipped_slot text check (equipped_slot in ('head','chest','hands','legs','feet','main_hand','off_hand','accessory') or equipped_slot is null),
    acquired_at timestamptz not null default now(),
    acquired_by uuid references auth.users(id) on delete set null,
    source_note text not null default ''
);

create index if not exists character_inventory_character_idx on public.character_inventory(character_id);
create index if not exists character_inventory_item_idx on public.character_inventory(item_id);
create index if not exists character_inventory_equipped_idx on public.character_inventory(character_id, equipped_slot);

create table if not exists public.rp_message_item_uses (
    id uuid primary key default gen_random_uuid(),
    message_id bigint not null references public.rp_messages(id) on delete cascade,
    character_id uuid not null references public.characters(id) on delete cascade,
    inventory_id uuid not null references public.character_inventory(id) on delete restrict,
    item_id uuid not null references public.items(id) on delete restrict,
    quantity integer not null default 1 check (quantity > 0),
    consumed boolean not null default false,
    status text not null default 'active' check (status in ('active','reverted')),
    used_at timestamptz not null default now(),
    reverted_at timestamptz,
    reverted_by uuid references auth.users(id) on delete set null,
    revert_reason text
);

create index if not exists rp_message_item_uses_message_idx on public.rp_message_item_uses(message_id);
create index if not exists rp_message_item_uses_character_idx on public.rp_message_item_uses(character_id, used_at desc);
create index if not exists rp_message_item_uses_status_idx on public.rp_message_item_uses(status, used_at desc);

alter table public.rp_messages
    add column if not exists status text not null default 'active' check (status in ('active','reverted')),
    add column if not exists reverted_at timestamptz,
    add column if not exists reverted_by uuid references auth.users(id) on delete set null,
    add column if not exists revert_reason text;

alter table public.items enable row level security;
alter table public.character_inventory enable row level security;
alter table public.rp_message_item_uses enable row level security;

drop policy if exists "Authenticated users can read items" on public.items;
create policy "Authenticated users can read items"
on public.items for select to authenticated using (true);

drop policy if exists "Players can read own inventory" on public.character_inventory;
create policy "Players can read own inventory"
on public.character_inventory for select to authenticated
using (
    exists (
        select 1 from public.character_applications ca
        where ca.character_id = character_inventory.character_id
          and ca.player_id = auth.uid()
          and ca.status = 'approved'
    )
);

drop policy if exists "Admins can read item uses" on public.rp_message_item_uses;
create policy "Admins can read item uses"
on public.rp_message_item_uses for select to authenticated
using (coalesce(public.is_admin(), false));

revoke all on table public.items, public.character_inventory, public.rp_message_item_uses from anon, authenticated;
grant select on public.items to authenticated;
grant select on public.character_inventory to authenticated;
grant select on public.rp_message_item_uses to authenticated;

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
declare result_row public.items;
begin
    if not coalesce(public.is_admin(), false) then raise exception 'ADMIN_REQUIRED'; end if;
    insert into public.items(name,item_type,equipment_slot,rarity,icon,color,description,stats,stackable,max_stack,consumes_on_use)
    values (nullif(trim(p_name),''),p_item_type,p_equipment_slot,p_rarity,coalesce(nullif(trim(p_icon),''),'◆'),
            coalesce(nullif(trim(p_color),''),'#b8a27a'),coalesce(trim(p_description),''),coalesce(p_stats,'{}'::jsonb),
            coalesce(p_stackable,false),greatest(1,coalesce(p_max_stack,1)),coalesce(p_consumes_on_use,false))
    returning * into result_row;
    return result_row;
end;
$$;

create or replace function public.admin_grant_character_item(
    p_character_id uuid,
    p_item_id uuid,
    p_quantity integer default 1,
    p_source_note text default ''
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare item_row public.items; inventory_id uuid;
begin
    if not coalesce(public.is_admin(), false) then raise exception 'ADMIN_REQUIRED'; end if;
    if p_quantity < 1 then raise exception 'INVALID_QUANTITY'; end if;
    select * into item_row from public.items where id=p_item_id;
    if not found then raise exception 'ITEM_NOT_FOUND'; end if;
    if not exists(select 1 from public.characters where id=p_character_id) then raise exception 'CHARACTER_NOT_FOUND'; end if;

    if item_row.stackable then
        select id into inventory_id from public.character_inventory
        where character_id=p_character_id and item_id=p_item_id and equipped_slot is null
        order by acquired_at asc limit 1 for update;
        if inventory_id is not null then
            update public.character_inventory
            set quantity=least(item_row.max_stack, quantity+p_quantity), acquired_by=auth.uid(),
                source_note=coalesce(trim(p_source_note),'')
            where id=inventory_id;
            return inventory_id;
        end if;
    end if;

    insert into public.character_inventory(character_id,item_id,quantity,acquired_by,source_note)
    values(p_character_id,p_item_id,least(item_row.max_stack,p_quantity),auth.uid(),coalesce(trim(p_source_note),''))
    returning id into inventory_id;
    return inventory_id;
end;
$$;

create or replace function public.admin_revoke_character_item(
    p_inventory_id uuid,
    p_quantity integer default null
)
returns void
language plpgsql security definer set search_path = public
as $$
declare current_row public.character_inventory;
begin
    if not coalesce(public.is_admin(), false) then raise exception 'ADMIN_REQUIRED'; end if;
    select * into current_row from public.character_inventory where id=p_inventory_id for update;
    if not found then raise exception 'INVENTORY_ITEM_NOT_FOUND'; end if;
    if p_quantity is null or p_quantity >= current_row.quantity then
        delete from public.character_inventory where id=p_inventory_id;
    else
        update public.character_inventory set quantity=quantity-p_quantity where id=p_inventory_id;
    end if;
end;
$$;

create or replace function public.equip_character_item(
    p_inventory_id uuid,
    p_slot text
)
returns public.character_inventory
language plpgsql security definer set search_path = public
as $$
declare current_row public.character_inventory; item_row public.items; result_row public.character_inventory; owner_ok boolean;
begin
    select exists(
        select 1 from public.character_applications ca
        where ca.character_id=(select character_id from public.character_inventory where id=p_inventory_id)
          and ca.player_id=auth.uid() and ca.status='approved'
    ) into owner_ok;
    if not owner_ok then raise exception 'CHARACTER_ACCESS_DENIED'; end if;

    select ci.* into current_row from public.character_inventory ci where ci.id=p_inventory_id for update;
    if not found then raise exception 'INVENTORY_ITEM_NOT_FOUND'; end if;
    select * into item_row from public.items where id=current_row.item_id;
    if item_row.item_type <> 'equipment' or item_row.equipment_slot is null then raise exception 'ITEM_NOT_EQUIPPABLE'; end if;
    if p_slot is distinct from item_row.equipment_slot then raise exception 'INVALID_EQUIPMENT_SLOT'; end if;
    if current_row.quantity < 1 then raise exception 'ITEM_EMPTY'; end if;

    update public.character_inventory
    set equipped_slot=null
    where character_id=current_row.character_id and equipped_slot=p_slot and id<>current_row.id;

    update public.character_inventory
    set equipped_slot=p_slot
    where id=current_row.id
    returning * into result_row;
    return result_row;
end;
$$;

create or replace function public.unequip_character_item(p_inventory_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare current_row public.character_inventory; owner_ok boolean;
begin
    select exists(
        select 1 from public.character_applications ca
        where ca.character_id=(select character_id from public.character_inventory where id=p_inventory_id)
          and ca.player_id=auth.uid() and ca.status='approved'
    ) into owner_ok;
    if not owner_ok then raise exception 'CHARACTER_ACCESS_DENIED'; end if;
    update public.character_inventory set equipped_slot=null where id=p_inventory_id;
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
    if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
    if coalesce(array_length(p_inventory_ids,1),0) > 10 then raise exception 'TOO_MANY_ITEMS'; end if;

    foreach inv_id in array coalesce(p_inventory_ids,'{}'::uuid[]) loop
        select exists(
            select 1 from public.character_inventory ci
            join public.character_applications ca on ca.character_id=ci.character_id
            where ci.id=inv_id and ci.character_id=p_character_id and ca.player_id=auth.uid() and ca.status='approved'
        ) into is_owner;
        if not is_owner then raise exception 'INVENTORY_ITEM_NOT_OWNED'; end if;

        select ci.* into inventory_row from public.character_inventory ci where ci.id=inv_id for update;
        if inventory_row.quantity < 1 then raise exception 'ITEM_EMPTY'; end if;
    end loop;

    result_row := public.send_lorgus_rp_message(
        p_character_id,p_presence_type,p_region,p_location,p_from_region,p_from_location,
        p_to_region,p_to_location,p_body,p_visibility
    );

    foreach inv_id in array coalesce(p_inventory_ids,'{}'::uuid[]) loop
        select ci.* into inventory_row from public.character_inventory ci where ci.id=inv_id for update;
        select * into item_row from public.items where id=inventory_row.item_id;
        item_quantity := case when item_row.consumes_on_use then 1 else 0 end;

        insert into public.rp_message_item_uses(message_id,character_id,inventory_id,item_id,quantity,consumed)
        values(result_row.id,p_character_id,inv_id,item_row.id,1,item_quantity=1);

        if item_quantity=1 then
            update public.character_inventory set quantity=quantity-1 where id=inv_id;
        end if;
    end loop;

    return result_row;
end;
$$;

create or replace function public.admin_revert_rp_message(
    p_message_id bigint,
    p_reason text default ''
)
returns void
language plpgsql security definer set search_path = public
as $$
declare usage_row public.rp_message_item_uses;
begin
    if not coalesce(public.is_admin(), false) then raise exception 'ADMIN_REQUIRED'; end if;

    update public.rp_messages
    set status='reverted', reverted_at=now(), reverted_by=auth.uid(), revert_reason=coalesce(trim(p_reason),'')
    where id=p_message_id and status='active';

    if not found then raise exception 'MESSAGE_NOT_ACTIVE'; end if;

    for usage_row in
        select * from public.rp_message_item_uses
        where message_id=p_message_id and status='active'
        for update
    loop
        if usage_row.consumed then
            update public.character_inventory set quantity=quantity+usage_row.quantity where id=usage_row.inventory_id;
        end if;
        update public.rp_message_item_uses
        set status='reverted', reverted_at=now(), reverted_by=auth.uid(), revert_reason=coalesce(trim(p_reason),'')
        where id=usage_row.id;
    end loop;
end;
$$;

revoke all on function public.admin_create_item(text,text,text,text,text,text,text,jsonb,boolean,integer,boolean) from public,anon,authenticated;
revoke all on function public.admin_grant_character_item(uuid,uuid,integer,text) from public,anon,authenticated;
revoke all on function public.admin_revoke_character_item(uuid,integer) from public,anon,authenticated;
revoke all on function public.equip_character_item(uuid,text) from public,anon,authenticated;
revoke all on function public.unequip_character_item(uuid) from public,anon,authenticated;
revoke all on function public.send_lorgus_rp_message_with_items(uuid,text,text,text,text,text,text,text,text,text,uuid[]) from public,anon,authenticated;
revoke all on function public.admin_revert_rp_message(bigint,text) from public,anon,authenticated;
grant execute on function public.admin_create_item(text,text,text,text,text,text,text,jsonb,boolean,integer,boolean) to authenticated;
grant execute on function public.admin_grant_character_item(uuid,uuid,integer,text) to authenticated;
grant execute on function public.admin_revoke_character_item(uuid,integer) to authenticated;
grant execute on function public.equip_character_item(uuid,text) to authenticated;
grant execute on function public.unequip_character_item(uuid) to authenticated;
grant execute on function public.send_lorgus_rp_message_with_items(uuid,text,text,text,text,text,text,text,text,text,uuid[]) to authenticated;
grant execute on function public.admin_revert_rp_message(bigint,text) to authenticated;

insert into public.items(name,item_type,equipment_slot,rarity,icon,color,description,stats,stackable,max_stack,consumes_on_use) values
('Стальной меч','equipment','main_hand','common','⚔','#b8a27a','Надёжный меч для повседневной службы.', '{"урон":"+3"}',false,1,false),
('Кольчуга странника','equipment','chest','uncommon','⛨','#9ca9b8','Практичная кольчуга для долгих дорог.', '{"защита":"+2"}',false,1,false),
('Латный нагрудник','equipment','chest','rare','⛨','#6f9ac4','Тяжёлая защита из качественной стали.', '{"защита":"+5"}',false,1,false),
('Мантия ученика','equipment','chest','epic','◇','#b58ee8','Мантия, пропитанная остаточной магией.', '{"магия":"+4"}',false,1,false),
('Зелье здоровья','consumable',null,'common','✚','#c96b6b','Восстанавливает силы персонажа.', '{"лечение":"малое"}',true,20,true),
('Зелье маны','consumable',null,'uncommon','✧','#6e9ee8','Восстанавливает запас магической энергии.', '{"мана":"малая"}',true,20,true),
('Свиток огненного импульса','consumable',null,'rare','🔥','#e8894f','Одноразовый свиток с простым боевым заклинанием.', '{"эффект":"огонь"}',true,10,true),
('Письмо без адресата','quest',null,'unique','✉','#e8d9aa','Странное письмо, происхождение которого неизвестно.', '{}',false,1,false)
on conflict(name) do update set
 item_type=excluded.item_type,equipment_slot=excluded.equipment_slot,rarity=excluded.rarity,icon=excluded.icon,
 color=excluded.color,description=excluded.description,stats=excluded.stats,stackable=excluded.stackable,
 max_stack=excluded.max_stack,consumes_on_use=excluded.consumes_on_use;

grant select on public.items, public.character_inventory to authenticated;
