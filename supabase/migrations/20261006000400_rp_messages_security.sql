-- LORGUS RP message authorization hardening.
-- Messages are readable/writable only from an authenticated player's current RP space.
-- The authoritative physical state is public.rp_presence.

drop policy if exists "rp_messages_select_authenticated" on public.rp_messages;
create policy "rp_messages_select_current_presence"
on public.rp_messages
for select
to authenticated
using (
    exists (
        select 1
        from public.rp_presence p
        where p.player_id = auth.uid()
          and p.presence_type = rp_messages.presence_type
          and (
              (
                  p.presence_type = 'location'
                  and p.region = rp_messages.region
                  and p.location = rp_messages.location
              )
              or
              (
                  p.presence_type = 'road'
                  and p.from_region = rp_messages.from_region
                  and p.from_location = rp_messages.from_location
                  and p.to_region = rp_messages.to_region
                  and p.to_location = rp_messages.to_location
              )
          )
    )
);

drop policy if exists "rp_messages_insert_own" on public.rp_messages;
create policy "rp_messages_insert_current_presence"
on public.rp_messages
for insert
to authenticated
with check (
    player_id = auth.uid()
    and exists (
        select 1
        from public.character_applications ca
        where ca.character_id = rp_messages.character_id
          and ca.player_id = auth.uid()
          and ca.status = 'approved'
    )
    and exists (
        select 1
        from public.rp_presence p
        where p.player_id = auth.uid()
          and p.character_id = rp_messages.character_id
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

revoke insert, update, delete on table public.rp_messages from authenticated;
grant insert on table public.rp_messages to authenticated;

-- Keep message timestamps authoritative.
revoke update(created_at, player_id, character_id) on public.rp_messages from authenticated;

create or replace function public.set_rp_message_server_fields()
returns trigger
language plpgsql
security invoker
set search_path = public
as $
begin
    new.player_id := auth.uid();
    new.created_at := now();
    return new;
end;
$;

drop trigger if exists trg_rp_messages_server_fields on public.rp_messages;
create trigger trg_rp_messages_server_fields
before insert on public.rp_messages
for each row
execute function public.set_rp_message_server_fields();

revoke all on function public.set_rp_message_server_fields() from public;
grant execute on function public.set_rp_message_server_fields() to authenticated;

alter table public.rp_messages replica identity full;
