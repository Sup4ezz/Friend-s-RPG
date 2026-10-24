-- Return application/player login data through an admin-only SECURITY DEFINER RPC.
CREATE OR REPLACE FUNCTION public.admin_list_character_application_usernames()
RETURNS TABLE(application_id text, player_id uuid, username text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
    IF auth.uid() IS NULL OR NOT COALESCE(public.is_admin(), false) THEN
        RAISE EXCEPTION 'ADMIN_REQUIRED';
    END IF;

    RETURN QUERY
    SELECT ca.id::text, ca.player_id,
           COALESCE(NULLIF(TRIM(pl.username), ''), 'Логин не указан')
    FROM public.character_applications ca
    LEFT JOIN public.players pl ON pl.id = ca.player_id
    ORDER BY ca.id DESC;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_list_character_application_usernames() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_character_application_usernames() TO authenticated;
