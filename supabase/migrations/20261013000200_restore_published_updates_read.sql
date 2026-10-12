-- Restore the table-level SELECT grant required by the published update log.
-- RLS still limits non-admins to published entries and admins to all entries.
grant select on table public.lorgus_updates to authenticated;
