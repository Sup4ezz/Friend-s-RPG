-- Tables in public are owned by postgres in production.
-- Prevent future tables created by postgres from inheriting API-role privileges.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
REVOKE ALL ON TABLES FROM anon, authenticated;
