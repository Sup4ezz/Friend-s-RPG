-- Restrict public character portrait lookup to approved characters and active NPCs.
-- Administrators retain their separate Storage policy for application and lore portraits.

create or replace function public.can_view_lorgus_character_photo(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
    select exists (
        select 1
        from public.character_applications a
        where a.photo_path = object_name
          and a.status = 'approved'
    )
    or exists (
        select 1
        from public.characters c
        join public.lorgus_nrp_characters n
          on n.character_id = c.id
         and n.is_active = true
        where c.photo_path = object_name
    );
$function$;

revoke all on function public.can_view_lorgus_character_photo(text) from public, anon;
grant execute on function public.can_view_lorgus_character_photo(text) to authenticated;
