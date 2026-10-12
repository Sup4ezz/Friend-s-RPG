-- Restore player read access while preserving the first-post location lock.
-- A player with no physical presence may read any RP chat; after the first post,
-- reads are limited to the character's current location or exact road.
-- Admins retain their separate policy for moderation and item-use rollback.

drop policy if exists "rp_messages_select_current_presence" on public.rp_messages;

create policy "rp_messages_select_current_presence"
on public.rp_messages
for select
to authenticated
using (
    coalesce(public.is_admin(), false)
    or not exists (
        select 1
        from public.rp_presence p0
        where p0.player_id = auth.uid()
    )
    or exists (
        select 1
        from public.rp_presence p
        where p.player_id = auth.uid()
          and p.presence_type = rp_messages.presence_type
          and (
              (
                  p.presence_type = 'location'
                  and p.region = rp_messages.region
                  and p.location = rp_messages.location
                  and rp_messages.from_region is null
                  and rp_messages.from_location is null
                  and rp_messages.to_region is null
                  and rp_messages.to_location is null
              )
              or
              (
                  p.presence_type = 'road'
                  and p.from_region = rp_messages.from_region
                  and p.from_location = rp_messages.from_location
                  and p.to_region = rp_messages.to_region
                  and p.to_location = rp_messages.to_location
                  and rp_messages.region is null
                  and rp_messages.location is null
              )
          )
    )
);
