-- Allow authenticated administrators to approve/reject AI-generated chronicle drafts.
grant update on public.lorgus_chronicle_entries to authenticated;
drop policy if exists "Admins can review chronicle entries" on public.lorgus_chronicle_entries;
create policy "Admins can review chronicle entries"
  on public.lorgus_chronicle_entries for update to authenticated
  using (coalesce(public.is_admin(), false))
  with check (coalesce(public.is_admin(), false));
