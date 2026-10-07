create table if not exists public.character_ability_history (
    id uuid primary key default gen_random_uuid(),
    character_id uuid not null references public.characters(id) on delete cascade,
    ability_id uuid not null references public.abilities(id) on delete cascade,
    admin_id uuid references auth.users(id) on delete set null,
    action text not null check (action in ('granted','revoked')),
    source_note text not null default '',
    created_at timestamptz not null default now()
);

create index if not exists character_ability_history_character_idx
    on public.character_ability_history(character_id, created_at desc);

alter table public.character_ability_history enable row level security;

drop policy if exists "Admins can read character ability history" on public.character_ability_history;
create policy "Admins can read character ability history"
on public.character_ability_history
for select to authenticated
using (coalesce(public.is_admin(), false));

create or replace function public.lorgus_character_ability_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if TG_OP = 'INSERT' then
        insert into public.character_ability_history(
            character_id, ability_id, admin_id, action, source_note
        )
        values (
            NEW.character_id, NEW.ability_id, NEW.granted_by, 'granted', coalesce(NEW.source_note, '')
        );
        return NEW;
    end if;

    insert into public.character_ability_history(
        character_id, ability_id, admin_id, action, source_note
    )
    values (
        OLD.character_id, OLD.ability_id, coalesce(auth.uid(), OLD.granted_by), 'revoked', coalesce(OLD.source_note, '')
    );

    return OLD;
end;
$$;

drop trigger if exists trg_character_ability_audit on public.character_abilities;
create trigger trg_character_ability_audit
after insert or delete on public.character_abilities
for each row execute function public.lorgus_character_ability_audit();

revoke all on table public.character_ability_history from anon, authenticated;
grant select on table public.character_ability_history to authenticated;

grant select on table public.abilities, public.character_abilities to authenticated;
