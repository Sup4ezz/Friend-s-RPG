-- Send client-side emergency reports to the existing LORGUS Telegram admin feed.
create or replace function public.lorgus_telegram_client_error_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
    perform public.lorgus_enqueue_telegram_event('client_error_report', jsonb_build_object(
        'report_id', new.id,
        'created_at', new.created_at,
        'username', coalesce(new.username, 'Неизвестен'),
        'character_name', coalesce(new.character_name, 'не указан'),
        'route', new.route,
        'message', left(coalesce(new.message, ''), 1200),
        'stack', left(coalesce(new.stack, ''), 1100),
        'diagnostics', new.diagnostics,
        'user_agent', left(coalesce(new.user_agent, ''), 180),
        'viewport', left(coalesce(new.viewport, ''), 100)
    ));
    return new;
end;
$function$;

drop trigger if exists lorgus_telegram_client_error_event on public.client_error_reports;
create trigger lorgus_telegram_client_error_event
after insert on public.client_error_reports
for each row execute function public.lorgus_telegram_client_error_event();
