-- Expose the notifications table to signed-in users through the Data API.
-- Row-level security still restricts SELECT/UPDATE to each user's own notifications.
grant select, update on table public.notifications to authenticated;
