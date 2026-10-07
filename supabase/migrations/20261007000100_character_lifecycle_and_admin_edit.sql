-- LORGUS: character lifecycle, audit history and controlled admin edits

alter table public.character_applications
    add column if not exists created_at timestamptz not null default now(),
    add column if not exists updated_at timestamptz not null default now(),
    add column if not exists approved_at timestamptz,
    add column if not exists rejected_at timestamptz,
    add column if not exists last_reviewed_at timestamptz;

create table if not exists public.character_application_history (
    id uuid primary key default gen_random_uuid(),
    application_id uuid not null references public.character_applications(id) on delete cascade,
    admin_id uuid references auth.users(id) on delete set null,
    action text not null check (action in ('created','updated','approved','rejected','revision_requested')),
    before_data jsonb,
    after_data jsonb,
    created_at timestamptz not null default now()
);

create index if not exists character_application_history_application_idx
    on public.character_application_history(application_id, created_at desc);

alter table public.character_application_history enable row level security;

drop policy if exists "Admins can read character application history" on public.character_application_history;
create policy "Admins can read character application history"
on public.character_application_history for select to authenticated
using (coalesce(public.is_admin(), false));

create or replace function public.lorgus_character_application_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    action_name text;
begin
    if TG_OP = 'INSERT' then
        action_name := 'created';
    elsif NEW.status is distinct from OLD.status then
        if NEW.status = 'approved' then
            action_name := 'approved';
        elsif NEW.status = 'rejected' then
            action_name := 'rejected';
        else
            action_name := 'revision_requested';
        end if;
    else
        action_name := 'updated';
    end if;

    if TG_OP = 'INSERT' then
        insert into public.character_application_history(application_id, admin_id, action, after_data)
        values (NEW.id, auth.uid(), action_name, to_jsonb(NEW));
        return NEW;
    end if;

    insert into public.character_application_history(application_id, admin_id, action, before_data, after_data)
    values (NEW.id, auth.uid(), action_name, to_jsonb(OLD), to_jsonb(NEW));

    return NEW;
end;
$$;

drop trigger if exists trg_character_application_audit on public.character_applications;
create trigger trg_character_application_audit
after insert or update on public.character_applications
for each row execute function public.lorgus_character_application_audit();

create or replace function public.lorgus_character_application_timestamps()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    NEW.updated_at := now();

    if NEW.status is distinct from OLD.status then
        NEW.last_reviewed_at := now();
        if NEW.status = 'approved' and OLD.status is distinct from 'approved' then
            NEW.approved_at := now();
        elsif NEW.status = 'rejected' and OLD.status is distinct from 'rejected' then
            NEW.rejected_at := now();
        end if;
    end if;

    return NEW;
end;
$$;

drop trigger if exists trg_character_application_timestamps on public.character_applications;
create trigger trg_character_application_timestamps
before update on public.character_applications
for each row execute function public.lorgus_character_application_timestamps();

create or replace function public.admin_update_character_application(
    p_application_id uuid,
    p_patch jsonb
)
returns public.character_applications
language plpgsql
security definer
set search_path = public
as $$
declare
    current_row public.character_applications;
    updated_row public.character_applications;
begin
    if not coalesce(public.is_admin(), false) then
        raise exception 'ADMIN_REQUIRED';
    end if;

    select * into current_row
    from public.character_applications
    where id = p_application_id
    for update;

    if not found then
        raise exception 'APPLICATION_NOT_FOUND';
    end if;

    update public.character_applications
    set
        name = case when p_patch ? 'name' then nullif(trim(p_patch->>'name'), '') else name end,
        race = case when p_patch ? 'race' then nullif(trim(p_patch->>'race'), '') else race end,
        age = case when p_patch ? 'age' then (p_patch->>'age')::integer else age end,
        homeland = case when p_patch ? 'homeland' then nullif(trim(p_patch->>'homeland'), '') else homeland end,
        occupation = case when p_patch ? 'occupation' then nullif(trim(p_patch->>'occupation'), '') else occupation end,
        preferred_weapon = case when p_patch ? 'preferred_weapon' then nullif(trim(p_patch->>'preferred_weapon'), '') else preferred_weapon end,
        personality = case when p_patch ? 'personality' then nullif(trim(p_patch->>'personality'), '') else personality end,
        backstory = case when p_patch ? 'backstory' then nullif(trim(p_patch->>'backstory'), '') else backstory end,
        special_skills = case when p_patch ? 'special_skills' then nullif(trim(p_patch->>'special_skills'), '') else special_skills end,
        review_notes = case when p_patch ? 'review_notes' then nullif(trim(p_patch->>'review_notes'), '') else review_notes end
    where id = p_application_id
    returning * into updated_row;

    return updated_row;
end;
$$;

revoke all on function public.admin_update_character_application(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.admin_update_character_application(uuid, jsonb) to authenticated;
