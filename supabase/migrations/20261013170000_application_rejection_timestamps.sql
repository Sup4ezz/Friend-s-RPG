-- Persist rejection timestamps and expose the reason in the player's character-selection flow.
alter table public.character_applications
    add column if not exists rejected_at timestamptz;

create or replace function public.reject_character_application(application_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
    clean_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
    if coalesce(public.lorgus_is_access_blocked(), false) then
        raise exception 'ACCESS_BLOCKED';
    end if;

    if not coalesce(public.is_admin(), false) then
        raise exception 'ADMIN_REQUIRED';
    end if;

    if clean_reason is null then
        raise exception 'REJECTION_REASON_REQUIRED';
    end if;

    update public.character_applications
       set status = 'rejected',
           review_notes = clean_reason,
           rejected_at = now()
     where id = application_id
       and status = 'pending';

    if not found then
        raise exception 'APPLICATION_NOT_FOUND_OR_NOT_PENDING';
    end if;
end;
$function$;

revoke all on function public.reject_character_application(uuid, text) from public, anon, authenticated;
grant execute on function public.reject_character_application(uuid, text) to authenticated;
