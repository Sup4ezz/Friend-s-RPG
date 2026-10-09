-- LORGUS player-to-player transfers and canonical currency balances.
create table if not exists public.character_currency (
    character_id uuid not null references public.characters(id) on delete cascade,
    currency_code text not null check (currency_code in ('aur','lira','kald','dorn','fin')),
    amount integer not null default 0 check (amount >= 0),
    updated_at timestamptz not null default now(),
    primary key (character_id, currency_code)
);

create index if not exists character_currency_character_idx on public.character_currency(character_id);
alter table public.character_currency enable row level security;

drop policy if exists "Players can read own currency" on public.character_currency;
create policy "Players can read own currency" on public.character_currency for select to authenticated using (exists (select 1 from public.character_applications ca where ca.character_id=character_currency.character_id and ca.player_id=auth.uid() and ca.status='approved'));

drop policy if exists "Admins can read all currency" on public.character_currency;
create policy "Admins can read all currency" on public.character_currency for select to authenticated using (coalesce(public.is_admin(), false));
grant select on public.character_currency to authenticated;

create or replace function public.lorgus_transfer_character_item(p_sender_character_id uuid,p_recipient_character_id uuid,p_inventory_id uuid,p_quantity integer default 1)
returns void language plpgsql security definer set search_path=public as $$
declare sender_presence public.rp_presence; recipient_presence public.rp_presence; inventory_row public.character_inventory; item_row public.items; recipient_inventory_id uuid; recipient_quantity integer;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_sender_character_id=p_recipient_character_id then raise exception 'TRANSFER_SELF'; end if;
 if p_quantity<1 then raise exception 'INVALID_QUANTITY'; end if;
 select * into sender_presence from public.rp_presence where character_id=p_sender_character_id and visibility='public' limit 1;
 select * into recipient_presence from public.rp_presence where character_id=p_recipient_character_id and visibility='public' limit 1;
 if sender_presence.presence_type is distinct from 'location' or recipient_presence.presence_type is distinct from 'location' or sender_presence.region is distinct from recipient_presence.region or sender_presence.location is distinct from recipient_presence.location then raise exception 'PLAYERS_NOT_IN_SAME_LOCATION'; end if;
 if not exists(select 1 from public.character_applications ca where ca.character_id=p_sender_character_id and ca.player_id=auth.uid() and ca.status='approved') then raise exception 'CHARACTER_ACCESS_DENIED'; end if;
 select ci.* into inventory_row from public.character_inventory ci where ci.id=p_inventory_id and ci.character_id=p_sender_character_id and ci.quantity>0 for update;
 if not found then raise exception 'INVENTORY_ITEM_NOT_FOUND'; end if;
 if inventory_row.equipped_slot is not null then raise exception 'ITEM_MUST_BE_UNEQUIPPED'; end if;
 if p_quantity>inventory_row.quantity then raise exception 'INSUFFICIENT_ITEM_QUANTITY'; end if;
 select * into item_row from public.items where id=inventory_row.item_id;
 if not found then raise exception 'ITEM_NOT_FOUND'; end if;
 if item_row.stackable then
   select id,quantity into recipient_inventory_id,recipient_quantity from public.character_inventory where character_id=p_recipient_character_id and item_id=inventory_row.item_id and equipped_slot is null order by acquired_at asc limit 1 for update;
   if recipient_inventory_id is not null then
     if recipient_quantity+p_quantity>item_row.max_stack then raise exception 'RECIPIENT_STACK_FULL'; end if;
     update public.character_inventory set quantity=quantity+p_quantity,source_note='Передано игроком' where id=recipient_inventory_id;
   else
     insert into public.character_inventory(character_id,item_id,quantity,acquired_by,source_note) values(p_recipient_character_id,inventory_row.item_id,p_quantity,auth.uid(),'Передано игроком') returning id into recipient_inventory_id;
   end if;
 else
   if p_quantity<>1 then raise exception 'NON_STACKABLE_ITEM'; end if;
   insert into public.character_inventory(character_id,item_id,quantity,acquired_by,source_note) values(p_recipient_character_id,inventory_row.item_id,1,auth.uid(),'Передано игроком') returning id into recipient_inventory_id;
 end if;
 if inventory_row.quantity=p_quantity then delete from public.character_inventory where id=inventory_row.id; else update public.character_inventory set quantity=quantity-p_quantity where id=inventory_row.id; end if;
end; $$;

create or replace function public.lorgus_transfer_character_currency(p_sender_character_id uuid,p_recipient_character_id uuid,p_currency_code text,p_amount integer)
returns void language plpgsql security definer set search_path=public as $$
declare sender_presence public.rp_presence; recipient_presence public.rp_presence; sender_amount integer;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_sender_character_id=p_recipient_character_id then raise exception 'TRANSFER_SELF'; end if;
 if p_currency_code not in ('aur','lira','kald','dorn','fin') then raise exception 'INVALID_CURRENCY'; end if;
 if p_amount<1 then raise exception 'INVALID_AMOUNT'; end if;
 if not exists(select 1 from public.character_applications ca where ca.character_id=p_sender_character_id and ca.player_id=auth.uid() and ca.status='approved') then raise exception 'CHARACTER_ACCESS_DENIED'; end if;
 select * into sender_presence from public.rp_presence where character_id=p_sender_character_id and visibility='public' limit 1;
 select * into recipient_presence from public.rp_presence where character_id=p_recipient_character_id and visibility='public' limit 1;
 if sender_presence.presence_type is distinct from 'location' or recipient_presence.presence_type is distinct from 'location' or sender_presence.region is distinct from recipient_presence.region or sender_presence.location is distinct from recipient_presence.location then raise exception 'PLAYERS_NOT_IN_SAME_LOCATION'; end if;
 select amount into sender_amount from public.character_currency where character_id=p_sender_character_id and currency_code=p_currency_code for update;
 if coalesce(sender_amount,0)<p_amount then raise exception 'INSUFFICIENT_CURRENCY'; end if;
 insert into public.character_currency(character_id,currency_code,amount) values(p_recipient_character_id,p_currency_code,p_amount) on conflict(character_id,currency_code) do update set amount=public.character_currency.amount+excluded.amount,updated_at=now();
 insert into public.character_currency(character_id,currency_code,amount) values(p_sender_character_id,p_currency_code,-p_amount) on conflict(character_id,currency_code) do update set amount=public.character_currency.amount+excluded.amount,updated_at=now();
end; $$;

create or replace function public.admin_grant_character_currency(p_character_id uuid,p_currency_code text,p_amount integer)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not coalesce(public.is_admin(),false) then raise exception 'ADMIN_REQUIRED'; end if;
 if p_currency_code not in ('aur','lira','kald','dorn','fin') then raise exception 'INVALID_CURRENCY'; end if;
 if not exists(select 1 from public.characters where id=p_character_id) then raise exception 'CHARACTER_NOT_FOUND'; end if;
 insert into public.character_currency(character_id,currency_code,amount) values(p_character_id,p_currency_code,p_amount) on conflict(character_id,currency_code) do update set amount=public.character_currency.amount+excluded.amount,updated_at=now();
 if exists(select 1 from public.character_currency where character_id=p_character_id and currency_code=p_currency_code and amount<0) then raise exception 'CURRENCY_CANNOT_BE_NEGATIVE'; end if;
end; $$;

revoke all on function public.lorgus_transfer_character_item(uuid,uuid,uuid,integer) from public,anon,authenticated;
revoke all on function public.lorgus_transfer_character_currency(uuid,uuid,text,integer) from public,anon,authenticated;
revoke all on function public.admin_grant_character_currency(uuid,text,integer) from public,anon,authenticated;
grant execute on function public.lorgus_transfer_character_item(uuid,uuid,uuid,integer) to authenticated;
grant execute on function public.lorgus_transfer_character_currency(uuid,uuid,text,integer) to authenticated;
grant execute on function public.admin_grant_character_currency(uuid,text,integer) to authenticated;