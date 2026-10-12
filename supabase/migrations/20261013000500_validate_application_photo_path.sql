-- A player may attach only a photo uploaded under their own user/application path.
-- Without this check, a forged INSERT could point an approved application at another
-- applicant's private photo and make it readable through can_view_lorgus_character_photo().
drop policy if exists "Players can create pending application" on public.character_applications;

create policy "Players can create pending application"
on public.character_applications
for insert
to authenticated
with check (
    player_id = auth.uid()
    and status = 'pending'
    and character_id is null
    and (
        photo_path is null
        or photo_path like (auth.uid()::text || '/' || id::text || '/%')
    )
);
