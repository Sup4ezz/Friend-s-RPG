-- Repair lootboxes created before automatic pool cloning was installed.
-- Every empty lootbox inherits the canonical authored reward pool.
do $$
declare
    template_id uuid;
begin
    select i.id into template_id
    from public.items i
    where upper(trim(i.name)) = upper('ЛУДОЧКА')
      and i.item_subtype = 'lootbox'
      and exists (
          select 1 from public.lootbox_rewards lr
          where lr.lootbox_item_id = i.id
      )
    order by i.name
    limit 1;

    if template_id is null then
        select i.id into template_id
        from public.items i
        where i.item_subtype = 'lootbox'
          and exists (
              select 1 from public.lootbox_rewards lr
              where lr.lootbox_item_id = i.id
          )
        order by i.name
        limit 1;
    end if;

    if template_id is null then
        raise exception 'LOOTBOX_TEMPLATE_WITH_REWARDS_NOT_FOUND';
    end if;

    insert into public.lootbox_rewards(
        lootbox_item_id, reward_item_id, weight, reward_type, title_id,
        reward_name, description, rarity, currency_code, amount
    )
    select
        target.id, source.reward_item_id, source.weight, source.reward_type,
        source.title_id, source.reward_name, source.description, source.rarity,
        source.currency_code, source.amount
    from public.items target
    cross join public.lootbox_rewards source
    where target.item_subtype = 'lootbox'
      and target.id <> template_id
      and target.id not in (
          select distinct lootbox_item_id
          from public.lootbox_rewards
      )
      and source.lootbox_item_id = template_id;
end;
$$;
