-- Securely list mail recipients without exposing all application records to players.
-- Only minimal fields for approved characters are returned, excluding the caller's own characters.
create or replace function public.get_lorgus_mail_recipients()
returns table (
    id uuid,
    name text,
    race text
)
language plpgsql
security definer
set search_path = public
as $function$
begin
    if auth.uid() is null then
        raise exception 'AUTH_REQUIRED' using errcode = '42501';
    end if;

    return query
    select distinct c.id, c.name, c.race
    from public.character_applications ca
    join public.characters c on c.id = ca.character_id
    where ca.status = 'approved'
      and ca.character_id is not null
      and ca.player_id <> auth.uid()
    order by c.name asc;
end;
$function$;

revoke all on function public.get_lorgus_mail_recipients() from public, anon;
grant execute on function public.get_lorgus_mail_recipients() to authenticated;
