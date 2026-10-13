-- Trigger functions are internal only. Their SECURITY DEFINER privileges must not be exposed as REST RPC endpoints.
revoke all on function public.lorgus_telegram_application_event() from public, anon, authenticated;
revoke all on function public.lorgus_telegram_rp_message_event() from public, anon, authenticated;
revoke all on function public.lorgus_telegram_item_use_event() from public, anon, authenticated;
revoke all on function public.lorgus_telegram_item_transfer_event() from public, anon, authenticated;
revoke all on function public.lorgus_telegram_currency_transfer_event() from public, anon, authenticated;
revoke all on function public.lorgus_telegram_lootbox_reward_event() from public, anon, authenticated;
revoke all on function public.lorgus_telegram_rp_reverted_event() from public, anon, authenticated;

revoke all on function public.lorgus_enqueue_telegram_event(text, jsonb) from public, anon, authenticated;
revoke all on function public.lorgus_dispatch_telegram_event(bigint) from public, anon, authenticated;
revoke all on function public.lorgus_dispatch_pending_telegram_events(integer) from public, anon, authenticated;
