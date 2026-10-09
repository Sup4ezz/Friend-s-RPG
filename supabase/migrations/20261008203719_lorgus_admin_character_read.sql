-- Allow the administration to read author records for historical RP chats.

drop policy if exists "Admins can read all characters" on public.characters;
create policy "Admins can read all characters"
on public.characters
for select to authenticated
using (coalesce(public.is_admin(), false));
