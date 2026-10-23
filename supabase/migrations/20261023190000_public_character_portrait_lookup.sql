-- Allow authenticated players to resolve portraits for approved characters without
-- granting broad SELECT access to the private characters / applications tables.
create or replace function public.get_lorgus_character_portrait(p_character_id uuid)
returns table (
    photo_path text,
    name text,
    race text,
    occupation text,
    kingdom text
)
language sql
stable
security definer
set search_path = ''
as $function$
    select
        coalesce(
            c.photo_path,
            (
                select a.photo_path
                from public.character_applications a
                where a.character_id = c.id
                  and a.status = 'approved'
                  and a.photo_path is not null
                limit 1
            )
        ) as photo_path,
        c.name,
        c.race,
        c.occupation,
        c.kingdom
    from public.characters c
    where c.id = p_character_id
      and (
          exists (
              select 1
              from public.character_applications a
              where a.character_id = c.id
                and a.status = 'approved'
          )
          or exists (
              select 1
              from public.lorgus_nrp_characters n
              where n.character_id = c.id
                and n.is_active = true
          )
          or exists (
              select 1
              from public.rp_presence p
              where p.character_id = c.id
                and p.visibility = 'public'
          )
          or exists (
              select 1
              from public.rp_messages m
              where m.character_id = c.id
                and m.status = 'active'
          )
      )
    limit 1;
$function$;

revoke all on function public.get_lorgus_character_portrait(uuid) from public, anon;
grant execute on function public.get_lorgus_character_portrait(uuid) to authenticated;