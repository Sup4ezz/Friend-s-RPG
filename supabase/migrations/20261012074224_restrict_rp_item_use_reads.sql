-- Restrict RP item-use records to administrators.
-- Players obtain item-use details through get_lorgus_rp_message_item_uses(),
-- which validates character ownership and the requested RP chat.
drop policy if exists "Players can read visible item uses"
    on public.rp_message_item_uses;
