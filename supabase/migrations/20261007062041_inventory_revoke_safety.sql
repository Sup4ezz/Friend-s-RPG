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

    if exists(select 1 from public.rp_message_item_uses where inventory_id=p_inventory_id) then
        if p_quantity is null or p_quantity >= current_row.quantity then
            update public.character_inventory set quantity=0, equipped_slot=null where id=p_inventory_id;
        else
            update public.character_inventory set quantity=quantity-p_quantity where id=p_inventory_id;
        end if;
        return;
    end if;

    if p_quantity is null or p_quantity >= current_row.quantity then
        delete from public.character_inventory where id=p_inventory_id;
    else
        update public.character_inventory set quantity=quantity-p_quantity where id=p_inventory_id;
    end if;
end;
$$;

revoke all on function public.admin_revoke_character_item(uuid,integer) from public,anon,authenticated;
grant execute on function public.admin_revoke_character_item(uuid,integer) to authenticated;