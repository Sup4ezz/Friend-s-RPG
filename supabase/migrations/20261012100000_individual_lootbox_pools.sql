-- Individual lootbox reward pools managed by administrators.
create table if not exists public.lootbox_rewards (
    id uuid primary key default gen_random_uuid(),
    lootbox_item_id uuid not null references public.items(id) on delete cascade,
    reward_item_id uuid not null references public.items(id) on delete cascade,
    weight integer not null default 1 check (weight > 0 and weight <= 100000),
    created_at timestamptz not null default now(),
    constraint lootbox_rewards_unique_pair unique (lootbox_item_id, reward_item_id),
    constraint lootbox_rewards_not_self check (lootbox_item_id <> reward_item_id)
);

create index if not exists lootbox_rewards_box_idx on public.lootbox_rewards(lootbox_item_id);

alter table public.lootbox_rewards enable row level security;
revoke all on public.lootbox_rewards from anon, authenticated;

create or replace function public.admin_list_lootbox_rewards(p_lootbox_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    result jsonb;
begin
    if not coalesce(public.is_admin(), false) then
        raise exception 'ADMIN_REQUIRED';
    end if;

    if not exists (
        select 1 from public.items
        where id = p_lootbox_item_id and item_subtype = 'lootbox'
    ) then
        raise exception 'ITEM_IS_NOT_LOOTBOX';
    end if;

    select coalesce(jsonb_agg(jsonb_build_object(
        'id', lr.id,
        'reward_item_id', i.id,
        'name', i.name,
        'item_type', i.item_type,
        'item_subtype', i.item_subtype,
        'rarity', i.rarity,
        'icon', i.icon,
        'color', i.color,
        'weight', lr.weight
    ) order by i.name), '[]'::jsonb)
    into result
    from public.lootbox_rewards lr
    join public.items i on i.id = lr.reward_item_id
    where lr.lootbox_item_id = p_lootbox_item_id;

    return result;
end;
$$;

create or replace function public.admin_set_lootbox_reward(
    p_lootbox_item_id uuid,
    p_reward_item_id uuid,
    p_weight integer default 1
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if not coalesce(public.is_admin(), false) then
        raise exception 'ADMIN_REQUIRED';
    end if;
    if p_weight is null or p_weight < 1 or p_weight > 100000 then
        raise exception 'INVALID_REWARD_WEIGHT';
    end if;
    if p_lootbox_item_id = p_reward_item_id then
        raise exception 'LOOTBOX_CANNOT_REWARD_ITSELF';
    end if;
    if not exists (select 1 from public.items where id = p_lootbox_item_id and item_subtype = 'lootbox') then
        raise exception 'ITEM_IS_NOT_LOOTBOX';
    end if;
    if not exists (select 1 from public.items where id = p_reward_item_id and item_subtype is distinct from 'lootbox') then
        raise exception 'INVALID_REWARD_ITEM';
    end if;

    insert into public.lootbox_rewards(lootbox_item_id, reward_item_id, weight)
    values (p_lootbox_item_id, p_reward_item_id, p_weight)
    on conflict (lootbox_item_id, reward_item_id)
    do update set weight = excluded.weight;
end;
$$;

create or replace function public.admin_remove_lootbox_reward(p_reward_row_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if not coalesce(public.is_admin(), false) then
        raise exception 'ADMIN_REQUIRED';
    end if;
    delete from public.lootbox_rewards where id = p_reward_row_id;
    if not found then raise exception 'LOOTBOX_REWARD_NOT_FOUND'; end if;
end;
$$;

revoke all on function public.admin_list_lootbox_rewards(uuid) from public, anon, authenticated;
revoke all on function public.admin_set_lootbox_reward(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.admin_remove_lootbox_reward(uuid) from public, anon, authenticated;
grant execute on function public.admin_list_lootbox_rewards(uuid) to authenticated;
grant execute on function public.admin_set_lootbox_reward(uuid, uuid, integer) to authenticated;
grant execute on function public.admin_remove_lootbox_reward(uuid) to authenticated;

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

    -- Only the explicitly configured pool for this exact lootbox item is eligible.
    -- Weight controls relative odds: weight 10 is ten times weight 1.
    select i.* into reward_item
    from public.lootbox_rewards lr
    join public.items i on i.id = lr.reward_item_id
    where lr.lootbox_item_id = box_item.id
      and i.item_subtype is distinct from 'lootbox'
    order by -ln(greatest(random(), 0.0000000001)) / lr.weight
    limit 1;

    if not found then raise exception 'LOOTBOX_POOL_EMPTY'; end if;

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
