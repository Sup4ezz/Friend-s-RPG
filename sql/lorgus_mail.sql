-- LORGUS: письма и голубиная почта
-- Выполнить в Supabase SQL Editor.

create table if not exists public.lorgus_mail (
    id uuid primary key default gen_random_uuid(),

    sender_character_id uuid not null
        references public.characters(id) on delete cascade,

    sender_player_id uuid not null
        references auth.users(id) on delete cascade,

    recipient_character_id uuid not null
        references public.characters(id) on delete cascade,

    body text not null
        check (char_length(trim(body)) between 1 and 10000),

    method text not null default 'pigeon'
        check (method in ('pigeon', 'courier')),

    sent_at timestamptz not null default now(),
    deliver_at timestamptz not null,
    delivered_at timestamptz,
    read_at timestamptz,

    check (sender_character_id <> recipient_character_id)
);

create index if not exists lorgus_mail_recipient_idx
    on public.lorgus_mail (recipient_character_id, sent_at desc);

create index if not exists lorgus_mail_sender_idx
    on public.lorgus_mail (sender_character_id, sent_at desc);

alter table public.lorgus_mail enable row level security;

drop policy if exists "lorgus_mail_select_own" on public.lorgus_mail;
create policy "lorgus_mail_select_own"
on public.lorgus_mail
for select
to authenticated
using (
    sender_player_id = auth.uid()
    or exists (
        select 1
        from public.characters c
        where c.id = recipient_character_id
          and c.player_id = auth.uid()
    )
);

drop policy if exists "lorgus_mail_insert_own" on public.lorgus_mail;
create policy "lorgus_mail_insert_own"
on public.lorgus_mail
for insert
to authenticated
with check (
    sender_player_id = auth.uid()
    and exists (
        select 1
        from public.characters c
        where c.id = sender_character_id
          and c.player_id = auth.uid()
    )
    and sender_character_id <> recipient_character_id
);

drop policy if exists "lorgus_mail_read_recipient" on public.lorgus_mail;
create policy "lorgus_mail_read_recipient"
on public.lorgus_mail
for update
to authenticated
using (
    exists (
        select 1
        from public.characters c
        where c.id = recipient_character_id
          and c.player_id = auth.uid()
    )
)
with check (
    exists (
        select 1
        from public.characters c
        where c.id = recipient_character_id
          and c.player_id = auth.uid()
    )
);

alter table public.lorgus_mail replica identity full;

-- Права PostgREST для авторизованных пользователей.
grant select, insert, update
on public.lorgus_mail
to authenticated;
