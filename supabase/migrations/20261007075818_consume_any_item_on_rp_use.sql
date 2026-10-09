-- Selected inventory items are consumed atomically with the RP post.
create or replace function public.send_lorgus_rp_message_with_items(
    p_character_id uuid, p_presence_type text, p_region text default null,
    p_location text default null, p_from_region text default null,
    p_from_location text default null, p_to_region text default null,
    p_to_location text default null, p_body text default null,
    p_visibility text default 'public', p_inventory_ids uuid[] default '{}'::uuid[]
)
returns public.rp_messages language plpgsql security definer set search_path to 'public'
as $function$
declare
    result_row public.rp_messages; inventory_row public.character_inventory;
    item_row public.items; inv_id uuid; is_owner boolean;
begin
    if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
    if coalesce(array_length(p_inventory_ids,1),0) > 10 then raise exception 'TOO_MANY_ITEMS'; end if;
    if coalesce(array_length(p_inventory_ids,1),0) <> (
        select count(distinct value) from unnest(coalesce(p_inventory_ids,'{}'::uuid[])) as value
    ) then raise exception 'DUPLICATE_ITEM_SELECTION'; end if;
    foreach inv_id in array coalesce(p_inventory_ids,'{}'::uuid[]) loop
        select exists(select 1 from public.character_inventory ci
            join public.character_applications ca on ca.character_id=ci.character_id
            where ci.id=inv_id and ci.character_id=p_character_id
              and ca.player_id=auth.uid() and ca.status='approved') into is_owner;
        if not is_owner then raise exception 'INVENTORY_ITEM_NOT_OWNED'; end if;
        select ci.* into inventory_row from public.character_inventory ci where ci.id=inv_id for update;
        if inventory_row.quantity < 1 then raise exception 'ITEM_EMPTY'; end if;
        if inventory_row.equipped_slot is not null then raise exception 'ITEM_EQUIPPED'; end if;
    end loop;
    result_row := public.send_lorgus_rp_message(p_character_id,p_presence_type,p_region,p_location,
        p_from_region,p_from_location,p_to_region,p_to_location,p_body,p_visibility);
    foreach inv_id in array coalesce(p_inventory_ids,'{}'::uuid[]) loop
        select ci.* into inventory_row from public.character_inventory ci where ci.id=inv_id for update;
        select * into item_row from public.items where id=inventory_row.item_id;
        insert into public.rp_message_item_uses(message_id,character_id,inventory_id,item_id,quantity,consumed)
        values(result_row.id,p_character_id,inv_id,item_row.id,1,true);
        update public.character_inventory set quantity=quantity-1 where id=inv_id;
    end loop;
    return result_row;
end;
$function$;
grant execute on function public.send_lorgus_rp_message_with_items(uuid,text,text,text,text,text,text,text,text,text,uuid[]) to authenticated;
