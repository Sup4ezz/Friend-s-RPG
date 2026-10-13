-- Allow administrators to reverse one RP item-use record without cancelling the entire post.
create or replace function public.admin_revert_rp_item_use(
    p_use_id uuid,
    p_reason text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    usage_row public.rp_message_item_uses;
    message_status text;
begin
    if coalesce(public.lorgus_is_access_blocked(), false) then
        raise exception 'ACCESS_BLOCKED';
    end if;
    if not coalesce(public.is_admin(), false) then
        raise exception 'ADMIN_REQUIRED';
    end if;

    select *
    into usage_row
    from public.rp_message_item_uses
    where id = p_use_id
    for update;

    if not found then
        raise exception 'ITEM_USE_NOT_FOUND';
    end if;
    if usage_row.status <> 'active' then
        raise exception 'ITEM_USE_NOT_ACTIVE';
    end if;

    select status
    into message_status
    from public.rp_messages
    where id = usage_row.message_id
    for update;

    if not found or coalesce(message_status, 'active') <> 'active' then
        raise exception 'MESSAGE_NOT_ACTIVE';
    end if;

    if usage_row.consumed then
        update public.character_inventory
        set quantity = quantity + usage_row.quantity
        where id = usage_row.inventory_id;

        if not found then
            raise exception 'INVENTORY_ITEM_NOT_FOUND';
        end if;
    end if;

    update public.rp_message_item_uses
    set status = 'reverted',
        reverted_at = now(),
        reverted_by = auth.uid(),
        revert_reason = coalesce(trim(p_reason), '')
    where id = usage_row.id;
end;
$$;

revoke all on function public.admin_revert_rp_item_use(uuid, text) from public, anon;
grant execute on function public.admin_revert_rp_item_use(uuid, text) to authenticated;
