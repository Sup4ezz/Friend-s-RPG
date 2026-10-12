-- Remove non-application table privileges from API roles.
-- RLS does not protect TRUNCATE. Keep normal CRUD grants unchanged.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public
FROM anon, authenticated;

-- Note: changing default ACLs owned by postgres/supabase_admin is not permitted
-- through the connected production migration role. Existing grants are revoked;
-- future-table default ACL hardening remains a separate operational task.
