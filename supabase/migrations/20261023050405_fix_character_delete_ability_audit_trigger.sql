-- Preserve the ability audit trail on grants/revokes without blocking character deletion.
CREATE OR REPLACE FUNCTION public.lorgus_character_ability_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.character_ability_history(character_id, ability_id, admin_id, action, source_note)
        VALUES (NEW.character_id, NEW.ability_id, NEW.granted_by, 'granted', COALESCE(NEW.source_note, ''));
        RETURN NEW;
    END IF;

    -- Cascading character deletion removes the history in the same transaction.
    -- Do not insert a new history row while the parent character is disappearing.
    IF EXISTS (SELECT 1 FROM public.characters WHERE id = OLD.character_id) THEN
        INSERT INTO public.character_ability_history(character_id, ability_id, admin_id, action, source_note)
        VALUES (OLD.character_id, OLD.ability_id, COALESCE(auth.uid(), OLD.granted_by), 'revoked', COALESCE(OLD.source_note, ''));
    END IF;

    RETURN OLD;
END;
$function$;
