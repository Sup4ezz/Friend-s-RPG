-- LORGUS AI chronicle: safe draft pipeline, with every generated entry requiring review.
create table if not exists public.lorgus_chronicle_state (
  singleton boolean primary key default true check (singleton),
  last_message_id bigint not null default 0,
  updated_at timestamptz not null default now()
);
insert into public.lorgus_chronicle_state (singleton, last_message_id)
select true, coalesce(max(id), 0) from public.rp_messages
on conflict (singleton) do nothing;

create table if not exists public.lorgus_chronicle_entries (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 3 and 160),
  subtitle text not null default '',
  body text not null check (length(trim(body)) between 20 and 5000),
  event_date timestamptz not null,
  source_message_ids bigint[] not null default '{}',
  event_fingerprint text not null unique,
  importance smallint not null default 1 check (importance between 1 and 5),
  status text not null default 'pending_review' check (status in ('pending_review', 'approved', 'rejected')),
  model text not null default 'gpt-4o-mini',
  review_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lorgus_chronicle_entries_public_idx on public.lorgus_chronicle_entries (event_date desc) where status = 'approved';
create index if not exists lorgus_chronicle_entries_review_idx on public.lorgus_chronicle_entries (created_at desc) where status = 'pending_review';

alter table public.lorgus_chronicle_state enable row level security;
alter table public.lorgus_chronicle_entries enable row level security;
revoke all on public.lorgus_chronicle_state from anon, authenticated;
revoke all on public.lorgus_chronicle_entries from anon, authenticated;
grant select on public.lorgus_chronicle_entries to anon, authenticated;
drop policy if exists "Public can read approved chronicle entries" on public.lorgus_chronicle_entries;
create policy "Public can read approved chronicle entries"
  on public.lorgus_chronicle_entries for select to anon, authenticated
  using (status = 'approved' or coalesce(public.is_admin(), false));
