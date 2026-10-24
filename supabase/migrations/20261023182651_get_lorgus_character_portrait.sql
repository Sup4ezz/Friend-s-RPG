-- Provide the public-facing portrait and basic character details through a controlled RPC.
CREATE OR REPLACE FUNCTION public.get_lorgus_character_portrait(p_character_id uuid)
RETURNS TABLE(photo_path text, name text, race text, occupation text, kingdom text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
    SELECT c.photo_path, c.name, c.race, c.occupation, c.kingdom
    FROM public.characters c
    WHERE c.id = p_character_id
      AND (
          EXISTS (SELECT 1 FROM public.character_applications a
                  WHERE a.character_id = c.id AND a.status = 'approved')
          OR EXISTS (SELECT 1 FROM public.lorgus_nrp_characters n
                     WHERE n.character_id = c.id AND n.is_active = true)
          OR EXISTS (SELECT 1 FROM public.rp_presence p
                     WHERE p.character_id = c.id AND p.visibility = 'public')
          OR EXISTS (SELECT 1 FROM public.rp_messages m
                     WHERE m.character_id = c.id AND m.status = 'active')
      )
    LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.get_lorgus_character_portrait(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_lorgus_character_portrait(uuid) TO authenticated;
