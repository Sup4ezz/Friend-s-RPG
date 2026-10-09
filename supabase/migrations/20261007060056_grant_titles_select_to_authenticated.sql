-- Restore production migration for title read access.
grant select on table public.titles to authenticated;
