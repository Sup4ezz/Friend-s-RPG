-- Remove PostgreSQL 17 MAINTAIN from browser-facing API roles.
-- Idempotent and safe to run after the direct production hardening.
REVOKE MAINTAIN ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
