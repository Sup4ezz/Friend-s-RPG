drop policy if exists "Admins can read all inventory" on public.character_inventory;
create policy "Admins can read all inventory"
on public.character_inventory for select to authenticated
using (coalesce(public.is_admin(), false));

drop policy if exists "Players can read visible item uses" on public.rp_message_item_uses;
create policy "Players can read visible item uses"
on public.rp_message_item_uses for select to authenticated
using (
    exists (
        select 1 from public.rp_messages m
        where m.id = rp_message_item_uses.message_id
    )
);

grant select on public.rp_message_item_uses to authenticated;
grant select on public.character_inventory to authenticated;