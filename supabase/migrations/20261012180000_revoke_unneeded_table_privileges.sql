-- Remove non-application table privileges from API roles.
-- RLS does not protect TRUNCATE, and API clients have no reason to create triggers
-- or add foreign keys. Keep normal SELECT/INSERT/UPDATE/DELETE grants unchanged.

revoke truncate, references, trigger on all tables in schema public
    from anon, authenticated;

-- Prevent the same excessive privileges from being granted to future tables.
alter default privileges for role postgres in schema public
    revoke truncate, references, trigger on tables from anon, authenticated;

alter default privileges for role supabase_admin in schema public
    revoke truncate, references, trigger on tables from anon, authenticated;
