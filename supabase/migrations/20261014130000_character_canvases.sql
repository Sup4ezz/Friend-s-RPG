create table if not exists public.character_canvases (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references auth.users(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  board jsonb not null default '{"version":1,"blocks":[],"connections":[]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (player_id, character_id)
);
alter table public.character_canvases enable row level security;
grant select, insert, update, delete on public.character_canvases to authenticated;
drop policy if exists character_canvases_select_own on public.character_canvases;
drop policy if exists character_canvases_insert_own on public.character_canvases;
drop policy if exists character_canvases_update_own on public.character_canvases;
drop policy if exists character_canvases_delete_own on public.character_canvases;
create policy character_canvases_select_own on public.character_canvases for select to authenticated
using (player_id = auth.uid() and exists (select 1 from public.character_applications ca where ca.character_id = character_canvases.character_id and ca.player_id = auth.uid() and ca.status = 'approved'));
create policy character_canvases_insert_own on public.character_canvases for insert to authenticated
with check (player_id = auth.uid() and exists (select 1 from public.character_applications ca where ca.character_id = character_canvases.character_id and ca.player_id = auth.uid() and ca.status = 'approved'));
create policy character_canvases_update_own on public.character_canvases for update to authenticated
using (player_id = auth.uid() and exists (select 1 from public.character_applications ca where ca.character_id = character_canvases.character_id and ca.player_id = auth.uid() and ca.status = 'approved'))
with check (player_id = auth.uid() and exists (select 1 from public.character_applications ca where ca.character_id = character_canvases.character_id and ca.player_id = auth.uid() and ca.status = 'approved'));
create policy character_canvases_delete_own on public.character_canvases for delete to authenticated
using (player_id = auth.uid() and exists (select 1 from public.character_applications ca where ca.character_id = character_canvases.character_id and ca.player_id = auth.uid() and ca.status = 'approved'));