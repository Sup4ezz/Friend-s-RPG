-- Restore the production fix for maintenance-mode administrator authorization.
drop policy if exists "Only administrators can update LORGUS maintenance" on public.lorgus_site_settings;
create policy "Only administrators can update LORGUS maintenance"
  on public.lorgus_site_settings for update to authenticated
  using (coalesce(public.is_admin(), false))
  with check (coalesce(public.is_admin(), false));
