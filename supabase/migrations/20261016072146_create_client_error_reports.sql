-- Recovered schema for the production client-side error report queue.
create table if not exists public.client_error_reports (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  username text,
  character_id uuid,
  character_name text,
  route text not null,
  message text not null default '',
  stack text not null default '',
  diagnostics jsonb not null default '{}'::jsonb,
  user_agent text not null default '',
  viewport text not null default '',
  status text not null default 'new' check (status in ('new','reviewed','resolved'))
);
alter table public.client_error_reports enable row level security;
revoke all on table public.client_error_reports from anon, authenticated;
grant select, insert, update on table public.client_error_reports to authenticated;
drop policy if exists "Admins can read error reports" on public.client_error_reports;
create policy "Admins can read error reports" on public.client_error_reports
for select to authenticated using (exists (select 1 from public.admins a where a.user_id = auth.uid()));
drop policy if exists "Admins can update error reports" on public.client_error_reports;
create policy "Admins can update error reports" on public.client_error_reports
for update to authenticated using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));
drop policy if exists "Authenticated players can submit error reports" on public.client_error_reports;
create policy "Authenticated players can submit error reports" on public.client_error_reports
for insert to authenticated with check (auth.uid() = user_id);
