drop policy if exists "Admins can read all RP messages" on public.rp_messages;
create policy "Admins can read all RP messages"
on public.rp_messages
for select to authenticated
using (coalesce(public.is_admin(), false));