-- Replace item drops with meaningful, visible lootbox rewards.
alter table public.lootbox_rewards alter column reward_item_id drop not null;
alter table public.lootbox_rewards add column if not exists reward_type text;
alter table public.lootbox_rewards add column if not exists title_id uuid references public.titles(id) on delete set null;
alter table public.lootbox_rewards add column if not exists reward_name text;
alter table public.lootbox_rewards add column if not exists description text not null default '';
alter table public.lootbox_rewards add column if not exists rarity text;
alter table public.lootbox_rewards add column if not exists currency_code text;
alter table public.lootbox_rewards add column if not exists amount integer;

-- Old item-based pool entries are intentionally removed: lootboxes now award titles,
-- currencies, privileges, and custom special rewards rather than inventory items.
delete from public.lootbox_rewards;

alter table public.lootbox_rewards drop constraint if exists lootbox_rewards_not_self;
alter table public.lootbox_rewards drop constraint if exists lootbox_rewards_unique_pair;
alter table public.lootbox_rewards
    add constraint lootbox_rewards_reward_type_check
    check (reward_type in ('title','currency','privilege','special'));
alter table public.lootbox_rewards
    add constraint lootbox_rewards_rarity_check
    check (rarity in ('common','uncommon','rare','epic','legendary','mythic','unique'));
alter table public.lootbox_rewards
    add constraint lootbox_rewards_currency_check
    check (currency_code is null or currency_code in ('aur','lira','kald','dorn','fin'));
alter table public.lootbox_rewards
    add constraint lootbox_rewards_amount_check
    check (amount is null or amount > 0);

create unique index if not exists lootbox_rewards_title_unique
    on public.lootbox_rewards(lootbox_item_id, title_id)
    where reward_type = 'title' and title_id is not null;

create table if not exists public.character_special_rewards (
    id uuid primary key default gen_random_uuid(),
    character_id uuid not null references public.characters(id) on delete cascade,
    reward_type text not null check (reward_type in ('privilege','special')),
    name text not null,
    description text not null default '',
    rarity text not null check (rarity in ('common','uncommon','rare','epic','legendary','mythic','unique')),
    source_lootbox_id uuid references public.items(id) on delete set null,
    awarded_at timestamptz not null default now()
);
create index if not exists character_special_rewards_character_idx
    on public.character_special_rewards(character_id, awarded_at desc);
alter table public.character_special_rewards enable row level security;
drop policy if exists "Players can read own special rewards" on public.character_special_rewards;
create policy "Players can read own special rewards" on public.character_special_rewards
for select to authenticated using (
    exists (select 1 from public.character_applications ca
        where ca.character_id = character_special_rewards.character_id
          and ca.player_id = auth.uid() and ca.status = 'approved')
    or coalesce(public.is_admin(), false)
);
grant select on public.character_special_rewards to authenticated;

create or replace function public.admin_list_lootbox_rewards(p_lootbox_item_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare result jsonb;
begin
    if not coalesce(public.is_admin(), false) then raise exception 'ADMIN_REQUIRED'; end if;
    if not exists (select 1 from public.items where id = p_lootbox_item_id and item_subtype = 'lootbox') then
        raise exception 'ITEM_IS_NOT_LOOTBOX';
    end if;
    select coalesce(jsonb_agg(jsonb_build_object(
        'id', lr.id, 'reward_type', lr.reward_type, 'title_id', lr.title_id,
        'name', coalesce(t.name, lr.reward_name), 'description', coalesce(t.description, lr.description),
        'rarity', coalesce(t.rarity, lr.rarity), 'icon', t.icon, 'color', t.color,
        'currency_code', lr.currency_code, 'amount', lr.amount
    ) order by
        case coalesce(t.rarity, lr.rarity)
            when 'unique' then 7 when 'mythic' then 6 when 'legendary' then 5
            when 'epic' then 4 when 'rare' then 3 when 'uncommon' then 2 else 1 end,
        coalesce(t.name, lr.reward_name)), '[]'::jsonb)
    into result
    from public.lootbox_rewards lr left join public.titles t on t.id = lr.title_id
    where lr.lootbox_item_id = p_lootbox_item_id;
    return result;
end;
$$;

create or replace function public.admin_set_lootbox_reward(
    p_lootbox_item_id uuid,
    p_reward_type text,
    p_title_id uuid default null,
    p_name text default null,
    p_description text default '',
    p_rarity text default 'common',
    p_currency_code text default null,
    p_amount integer default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid; effective_rarity text;
begin
    if not coalesce(public.is_admin(), false) then raise exception 'ADMIN_REQUIRED'; end if;
    if not exists (select 1 from public.items where id = p_lootbox_item_id and item_subtype = 'lootbox') then
        raise exception 'ITEM_IS_NOT_LOOTBOX';
    end if;
    if p_reward_type not in ('title','currency','privilege','special') then raise exception 'INVALID_REWARD_TYPE'; end if;
    if p_rarity not in ('common','uncommon','rare','epic','legendary','mythic','unique') then raise exception 'INVALID_REWARD_RARITY'; end if;
    if p_reward_type = 'title' then
        if p_title_id is null or not exists (select 1 from public.titles where id = p_title_id) then raise exception 'TITLE_REQUIRED'; end if;
        select rarity into effective_rarity from public.titles where id = p_title_id;
        if exists (select 1 from public.lootbox_rewards where lootbox_item_id=p_lootbox_item_id and title_id=p_title_id and reward_type='title') then
            raise exception 'REWARD_ALREADY_IN_POOL';
        end if;
    else
        if nullif(trim(p_name), '') is null then raise exception 'REWARD_NAME_REQUIRED'; end if;
        effective_rarity := p_rarity;
        if p_reward_type = 'currency' then
            if p_currency_code not in ('aur','lira','kald','dorn','fin') then raise exception 'INVALID_CURRENCY'; end if;
            if p_amount is null or p_amount < 1 then raise exception 'INVALID_AMOUNT'; end if;
        end if;
    end if;
    insert into public.lootbox_rewards(
        lootbox_item_id,reward_item_id,reward_type,title_id,reward_name,description,rarity,currency_code,amount,weight
    ) values (
        p_lootbox_item_id,null,p_reward_type,p_title_id,nullif(trim(p_name),''),coalesce(p_description,''),
        effective_rarity,p_currency_code,p_amount,
        case effective_rarity when 'common' then 100 when 'uncommon' then 40 when 'rare' then 15
            when 'epic' then 5 when 'legendary' then 1.5 when 'mythic' then 0.4 when 'unique' then 0.1 end
    ) returning id into new_id;
    return new_id;
end;
$$;

create or replace function public.admin_remove_lootbox_reward(p_reward_row_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
    if not coalesce(public.is_admin(), false) then raise exception 'ADMIN_REQUIRED'; end if;
    delete from public.lootbox_rewards where id = p_reward_row_id;
    if not found then raise exception 'LOOTBOX_REWARD_NOT_FOUND'; end if;
end;
$$;

create or replace function public.get_lootbox_contents(p_inventory_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare inv public.character_inventory; box public.items; result jsonb;
begin
    if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
    select ci.* into inv from public.character_inventory ci where ci.id=p_inventory_id;
    if not found then raise exception 'INVENTORY_ITEM_NOT_FOUND'; end if;
    if not exists(select 1 from public.character_applications ca where ca.character_id=inv.character_id and ca.player_id=auth.uid() and ca.status='approved')
       and not coalesce(public.is_admin(),false) then raise exception 'CHARACTER_ACCESS_DENIED'; end if;
    select * into box from public.items where id=inv.item_id and item_subtype='lootbox';
    if not found then raise exception 'ITEM_IS_NOT_LOOTBOX'; end if;
    select coalesce(jsonb_agg(jsonb_build_object(
        'id',lr.id,'reward_type',lr.reward_type,'title_id',lr.title_id,
        'name',coalesce(t.name,lr.reward_name),'description',coalesce(t.description,lr.description),
        'rarity',coalesce(t.rarity,lr.rarity),'icon',coalesce(t.icon,case lr.reward_type when 'currency' then '◈' when 'privilege' then '♛' else '✦' end),
        'color',coalesce(t.color,case coalesce(t.rarity,lr.rarity)
            when 'common' then '#b8a27a' when 'uncommon' then '#76b85f' when 'rare' then '#5f9fe8'
            when 'epic' then '#a875e8' when 'legendary' then '#e0a14a' when 'mythic' then '#e45bc7' else '#f3e7b0' end),
        'currency_code',lr.currency_code,'amount',lr.amount,
        'chance',round((lr.weight / nullif((select sum(lr2.weight) from public.lootbox_rewards lr2 where lr2.lootbox_item_id=box.id),0) * 100)::numeric,4)
    ) order by lr.weight desc, coalesce(t.name,lr.reward_name)), '[]'::jsonb)
    into result
    from public.lootbox_rewards lr left join public.titles t on t.id=lr.title_id
    where lr.lootbox_item_id=box.id;
    return result;
end;
$$;

create or replace function public.open_character_lootbox(p_inventory_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
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
    if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
    select ci.* into inv from public.character_inventory ci where ci.id=p_inventory_id for update;
    if not found then raise exception 'INVENTORY_ITEM_NOT_FOUND'; end if;
    if inv.quantity < 1 then raise exception 'ITEM_EMPTY'; end if;
    if inv.equipped_slot is not null then raise exception 'ITEM_EQUIPPED'; end if;
    select * into box from public.items where id=inv.item_id and item_subtype='lootbox';
    if not found then raise exception 'ITEM_IS_NOT_LOOTBOX'; end if;
    select exists(select 1 from public.character_applications ca where ca.character_id=inv.character_id and ca.player_id=auth.uid() and ca.status='approved') into owner_ok;
    if not owner_ok then raise exception 'CHARACTER_ACCESS_DENIED'; end if;

    select lr.* into reward from public.lootbox_rewards lr
    where lr.lootbox_item_id=box.id
    order by -ln(greatest(random(),0.0000000001)) / lr.weight
    limit 1;
    if not found then raise exception 'LOOTBOX_POOL_EMPTY'; end if;

    if reward.reward_type='title' then
        insert into public.character_titles(character_id,title_id,awarded_by)
        values(inv.character_id,reward.title_id,auth.uid()) on conflict(character_id,title_id) do nothing;
        select * into title_row from public.titles where id=reward.title_id;
        awarded_name:=title_row.name; awarded_description:=title_row.description;
        awarded_rarity:=title_row.rarity; awarded_icon:=title_row.icon; awarded_color:=title_row.color;
    elsif reward.reward_type='currency' then
        insert into public.character_currency(character_id,currency_code,amount)
        values(inv.character_id,reward.currency_code,reward.amount)
        on conflict(character_id,currency_code) do update set amount=public.character_currency.amount+excluded.amount,updated_at=now();
        awarded_name:=reward.reward_name; awarded_description:=reward.description;
        awarded_rarity:=reward.rarity; awarded_icon:='◈';
        awarded_color:=case reward.rarity when 'common' then '#b8a27a' when 'uncommon' then '#76b85f' when 'rare' then '#5f9fe8' when 'epic' then '#a875e8' when 'legendary' then '#e0a14a' when 'mythic' then '#e45bc7' else '#f3e7b0' end;
        awarded_description:=concat_ws(' ',awarded_description,'Получено: '||reward.amount||' '||reward.currency_code||'.');
    else
        insert into public.character_special_rewards(character_id,reward_type,name,description,rarity,source_lootbox_id)
        values(inv.character_id,reward.reward_type,reward.reward_name,reward.description,reward.rarity,box.id);
        awarded_name:=reward.reward_name; awarded_description:=reward.description;
        awarded_rarity:=reward.rarity; awarded_icon:=case reward.reward_type when 'privilege' then '♛' else '✦' end;
        awarded_color:=case reward.rarity when 'common' then '#b8a27a' when 'uncommon' then '#76b85f' when 'rare' then '#5f9fe8' when 'epic' then '#a875e8' when 'legendary' then '#e0a14a' when 'mythic' then '#e45bc7' else '#f3e7b0' end;
    end if;

    if inv.quantity=1 then delete from public.character_inventory where id=inv.id;
    else update public.character_inventory set quantity=quantity-1 where id=inv.id; end if;

    return jsonb_build_object('reward',jsonb_build_object(
        'id',reward.id,'reward_type',reward.reward_type,'name',awarded_name,'description',awarded_description,
        'rarity',awarded_rarity,'icon',awarded_icon,'color',awarded_color,
        'currency_code',reward.currency_code,'amount',reward.amount
    ));
end;
$$;

revoke all on function public.admin_list_lootbox_rewards(uuid) from public,anon,authenticated;
revoke all on function public.admin_set_lootbox_reward(uuid,text,uuid,text,text,text,text,integer) from public,anon,authenticated;
revoke all on function public.admin_remove_lootbox_reward(uuid) from public,anon,authenticated;
revoke all on function public.get_lootbox_contents(uuid) from public,anon,authenticated;
revoke all on function public.open_character_lootbox(uuid) from public,anon;
grant execute on function public.admin_list_lootbox_rewards(uuid) to authenticated;
grant execute on function public.admin_set_lootbox_reward(uuid,text,uuid,text,text,text,text,integer) to authenticated;
grant execute on function public.admin_remove_lootbox_reward(uuid) to authenticated;
grant execute on function public.get_lootbox_contents(uuid) to authenticated;
grant execute on function public.open_character_lootbox(uuid) to authenticated;
