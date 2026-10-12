-- Require a non-empty reason for rejecting an application and persist it.
DROP FUNCTION IF EXISTS public.reject_character_application(uuid);

CREATE FUNCTION public.reject_character_application(application_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    clean_reason text := nullif(trim(coalesce(p_reason, '')), '');
BEGIN
    IF NOT coalesce(public.is_admin(), false) THEN
        RAISE EXCEPTION 'ADMIN_REQUIRED';
    END IF;

    IF clean_reason IS NULL THEN
        RAISE EXCEPTION 'REJECTION_REASON_REQUIRED';
    END IF;

    UPDATE public.character_applications
    SET status = 'rejected',
        review_notes = clean_reason
    WHERE id = application_id
      AND status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'APPLICATION_NOT_FOUND_OR_NOT_PENDING';
    END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.reject_character_application(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reject_character_application(uuid, text) TO authenticated;
