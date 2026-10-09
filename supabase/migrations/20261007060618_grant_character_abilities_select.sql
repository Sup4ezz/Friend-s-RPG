-- Restore production migration for ability read access.
grant select on table public.abilities to authenticated;
