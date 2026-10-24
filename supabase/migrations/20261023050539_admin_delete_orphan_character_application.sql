-- Allow administrators to remove approved applications left without a character.
CREATE OR REPLACE FUNCTION public.admin_delete_orphan_character_application(p_application_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    IF COALESCE(public.lorgus_is_access_blocked(), false) THEN
        RAISE EXCEPTION 'ACCESS_BLOCKED';
    END IF;

    IF NOT COALESCE(public.is_admin(), false) THEN
        RAISE EXCEPTION 'ADMIN_REQUIRED';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.character_applications
        WHERE id = p_application_id
          AND status = 'approved'
          AND character_id IS NULL
    ) THEN
        RAISE EXCEPTION 'ORPHAN_APPLICATION_NOT_FOUND';
    END IF;

    DELETE FROM public.character_applications
    WHERE id = p_application_id
      AND status = 'approved'
      AND character_id IS NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_delete_orphan_character_application(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_orphan_character_application(uuid) TO authenticated;
