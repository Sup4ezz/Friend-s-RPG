-- Preserve rarity weights as fractional values (e.g. mythic 0.4 and unique 0.1).
alter table public.lootbox_rewards alter column weight type numeric(12,4) using weight::numeric;
alter table public.lootbox_rewards alter column weight set default 1;

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
        'currency_code', lr.currency_code, 'amount', lr.amount, 'weight', lr.weight
    ) order by lr.weight desc, coalesce(t.name, lr.reward_name)), '[]'::jsonb)
    into result
    from public.lootbox_rewards lr left join public.titles t on t.id = lr.title_id
    where lr.lootbox_item_id = p_lootbox_item_id;
    return result;
end;
$$;
