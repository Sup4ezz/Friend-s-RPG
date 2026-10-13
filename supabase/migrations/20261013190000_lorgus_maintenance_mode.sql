-- Administrator-controlled maintenance-mode placeholder for LORGUS.
create table if not exists public.lorgus_site_settings (
    id boolean primary key default true check (id = true),
    maintenance_enabled boolean not null default false,
    maintenance_message text not null default 'В мире проводятся технические работы. Попробуй заглянуть немного позже.',
    updated_at timestamptz not null default now(),
    updated_by uuid null references auth.users(id) on delete set null
);

insert into public.lorgus_site_settings (id, maintenance_enabled, maintenance_message)
values (true, false, 'В мире проводятся технические работы. Попробуй заглянуть немного позже.')
on conflict (id) do nothing;

alter table public.lorgus_site_settings enable row level security;

drop policy if exists "LORGUS maintenance status is readable" on public.lorgus_site_settings;
create policy "LORGUS maintenance status is readable"
on public.lorgus_site_settings for select
to anon, authenticated
using (true);

drop policy if exists "Only administrators can update LORGUS maintenance" on public.lorgus_site_settings;
create policy "Only administrators can update LORGUS maintenance"
on public.lorgus_site_settings for update
to authenticated
using (exists (select 1 from public.admins a where a.user_id = (select auth.uid())))
with check (exists (select 1 from public.admins a where a.user_id = (select auth.uid())));

revoke all on public.lorgus_site_settings from public;
grant select on public.lorgus_site_settings to anon, authenticated;
grant update (maintenance_enabled, maintenance_message, updated_at, updated_by) on public.lorgus_site_settings to authenticated;
