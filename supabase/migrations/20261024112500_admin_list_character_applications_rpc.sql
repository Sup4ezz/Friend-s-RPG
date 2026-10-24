-- Load the admin application queue through a server-checked RPC rather than a broad table GET.
CREATE OR REPLACE FUNCTION public.admin_list_character_applications()
RETURNS SETOF public.character_applications
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
    IF auth.uid() IS NULL OR NOT COALESCE(public.is_admin(), false) THEN
        RAISE EXCEPTION 'ADMIN_REQUIRED';
    END IF;

    RETURN QUERY
    SELECT ca.*
    FROM public.character_applications AS ca
    ORDER BY ca.id DESC;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_list_character_applications() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_character_applications() TO authenticated;
