-- Private player notes, scoped to a character and protected by RLS.
create table if not exists public.character_notes (
    id uuid primary key default gen_random_uuid(),
    player_id uuid not null references auth.users(id) on delete cascade,
    character_id uuid not null references public.characters(id) on delete cascade,
    title text not null default 'Новая заметка' check (char_length(trim(title)) between 1 and 120),
    content text not null default '' check (char_length(content) <= 20000),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists character_notes_owner_idx
on public.character_notes (player_id, character_id, updated_at desc);

alter table public.character_notes enable row level security;

drop policy if exists character_notes_select_own on public.character_notes;
create policy character_notes_select_own on public.character_notes
for select to authenticated
using (
    player_id = (select auth.uid())
    and exists (
        select 1 from public.character_applications ca
        where ca.character_id = character_notes.character_id
          and ca.player_id = (select auth.uid())
          and ca.status = 'approved'
    )
);

drop policy if exists character_notes_insert_own on public.character_notes;
create policy character_notes_insert_own on public.character_notes
for insert to authenticated
with check (
    player_id = (select auth.uid())
    and exists (
        select 1 from public.character_applications ca
        where ca.character_id = character_notes.character_id
          and ca.player_id = (select auth.uid())
          and ca.status = 'approved'
    )
);

drop policy if exists character_notes_update_own on public.character_notes;
create policy character_notes_update_own on public.character_notes
for update to authenticated
using (
    player_id = (select auth.uid())
    and exists (
        select 1 from public.character_applications ca
        where ca.character_id = character_notes.character_id
          and ca.player_id = (select auth.uid())
          and ca.status = 'approved'
    )
)
with check (
    player_id = (select auth.uid())
    and exists (
        select 1 from public.character_applications ca
        where ca.character_id = character_notes.character_id
          and ca.player_id = (select auth.uid())
          and ca.status = 'approved'
    )
);

drop policy if exists character_notes_delete_own on public.character_notes;
create policy character_notes_delete_own on public.character_notes
for delete to authenticated
using (
    player_id = (select auth.uid())
    and exists (
        select 1 from public.character_applications ca
        where ca.character_id = character_notes.character_id
          and ca.player_id = (select auth.uid())
          and ca.status = 'approved'
    )
);

grant select, insert, update, delete on table public.character_notes to authenticated;
