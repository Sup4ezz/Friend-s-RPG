-- LORGUS RP: remove legacy automatic initial placement.
-- Physical location is created ONLY by the first RP location post.
-- The legacy initializer could place a character by homeland and therefore
-- contradict the first-post rule. No application code should call it anymore.

drop function if exists public.initialize_lorgus_rp_presence(uuid, text, text, text);
