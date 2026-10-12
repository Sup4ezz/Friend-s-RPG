-- Prevent players from claiming arbitrary character records by inserting ownership links.
-- A player may link only a character attached to their own approved application.
drop policy if exists "Players can create own character links" on public.player_characters;

create policy "Players can link only own approved characters"
on public.player_characters
for insert
to authenticated
with check (
    player_id = auth.uid()
    and exists (
        select 1
        from public.character_applications ca
        where ca.player_id = auth.uid()
          and ca.character_id = player_characters.character_id
          and ca.status = 'approved'
    )
);
