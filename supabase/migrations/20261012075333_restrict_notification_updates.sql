-- Restrict notification updates to read receipts only.
revoke update on table public.notifications from authenticated;
grant update (read_at) on table public.notifications to authenticated;
