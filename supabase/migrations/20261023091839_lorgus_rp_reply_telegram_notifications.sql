-- Notify Telegram about RP replies as well as ordinary player posts.
CREATE OR REPLACE FUNCTION public.lorgus_telegram_rp_message_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    v_name text;
    v_target_name text;
    v_target_character_id uuid;
    v_parent_region text;
    v_parent_location text;
BEGIN
    IF COALESCE(NEW.is_admin_post, false) THEN RETURN NEW; END IF;
    IF COALESCE(NEW.status, 'active') = 'reverted' THEN RETURN NEW; END IF;

    SELECT c.name INTO v_name
    FROM public.characters c
    WHERE c.id = NEW.character_id;

    PERFORM public.lorgus_enqueue_telegram_event(
      'rp_message',
      jsonb_build_object(
        'message_id', NEW.id,
        'character_id', NEW.character_id,
        'character_name', COALESCE(v_name, 'Неизвестный персонаж'),
        'region', NEW.region,
        'location', NEW.location,
        'presence_type', NEW.presence_type,
        'body', NEW.body,
        'created_at', NEW.created_at
      )
    );

    IF NEW.reply_to_id IS NOT NULL THEN
        SELECT c.name, parent.character_id, parent.region, parent.location
          INTO v_target_name, v_target_character_id, v_parent_region, v_parent_location
        FROM public.rp_messages parent
        LEFT JOIN public.characters c ON c.id = parent.character_id
        WHERE parent.id = NEW.reply_to_id;

        PERFORM public.lorgus_enqueue_telegram_event(
          'rp_reply_notification',
          jsonb_build_object(
            'message_id', NEW.id,
            'reply_to_id', NEW.reply_to_id,
            'character_id', NEW.character_id,
            'character_name', COALESCE(v_name, 'Неизвестный персонаж'),
            'target_character_id', v_target_character_id,
            'target_character_name', COALESCE(v_target_name, 'автор исходного поста'),
            'region', COALESCE(NEW.region, v_parent_region),
            'location', COALESCE(NEW.location, v_parent_location),
            'body', NEW.body,
            'created_at', NEW.created_at
          )
        );
    END IF;

    RETURN NEW;
END;
$function$;
