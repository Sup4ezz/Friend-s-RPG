-- Public RP participant character visibility.
-- Names/races of characters may be read when the character has public RP presence.

drop policy if exists "Players can view characters with public RP presence" on public.characters;
create policy "Players can view characters with public RP presence"
on public.characters
for select to authenticated
using (
    exists (
        select 1
        from public.rp_presence p
        where p.character_id = characters.id
          and p.visibility = 'public'
    )
);
