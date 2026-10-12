-- Reconcile migration history with the production operation previously applied directly.
-- Idempotent: safe even if MAINTAIN was already revoked.
REVOKE MAINTAIN ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
