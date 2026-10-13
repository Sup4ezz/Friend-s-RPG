-- Make the LORGUS blacklist authoritative for both direct table access and SECURITY DEFINER RPCs.
-- This migration is safe to re-run: policies are recreated and RPC guards are injected only once.

create table if not exists public.lorgus_blacklist (
    user_id uuid primary key references auth.users(id) on delete cascade,
    reason text not null default '',
    created_at timestamptz not null default now(),
    created_by uuid references auth.users(id) on delete set null
);

alter table public.lorgus_blacklist enable row level security;
revoke all on public.lorgus_blacklist from anon;
grant select, insert, update, delete on public.lorgus_blacklist to authenticated;

drop policy if exists lorgus_blacklist_self_select on public.lorgus_blacklist;
create policy lorgus_blacklist_self_select
    on public.lorgus_blacklist for select to authenticated
    using (user_id = (select auth.uid()));

drop policy if exists lorgus_blacklist_admin_all on public.lorgus_blacklist;
create policy lorgus_blacklist_admin_all
    on public.lorgus_blacklist for all to authenticated
    using ((select public.is_admin()))
    with check ((select public.is_admin()));

create or replace function public.lorgus_is_access_blocked()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
    select auth.uid() is not null
       and not coalesce(public.is_admin(), false)
       and exists (
           select 1 from public.lorgus_blacklist b
           where b.user_id = auth.uid()
       );
$function$;

revoke all on function public.lorgus_is_access_blocked() from public, anon;
grant execute on function public.lorgus_is_access_blocked() to authenticated;

-- Add a restrictive policy to every public table exposed to authenticated users.
-- Restrictive policies combine with existing permission policies; they do not widen access.
do $blacklist_table_policies$
declare
    t record;
    policy_name constant text := 'lorgus_blacklist_access_gate';
begin
    for t in
        select c.relname
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relkind = 'r'
          and c.relrowsecurity
          and c.relname <> 'lorgus_blacklist'
          and (
              has_table_privilege('authenticated', c.oid, 'SELECT')
              or has_table_privilege('authenticated', c.oid, 'INSERT')
              or has_table_privilege('authenticated', c.oid, 'UPDATE')
              or has_table_privilege('authenticated', c.oid, 'DELETE')
          )
    loop
        execute format('drop policy if exists %I on public.%I', policy_name, t.relname);
        execute format(
            'create policy %I on public.%I as restrictive for all to authenticated using (not (select public.lorgus_is_access_blocked())) with check (not (select public.lorgus_is_access_blocked()))',
            policy_name, t.relname
        );
    end loop;
end
$blacklist_table_policies$;

-- SECURITY DEFINER functions execute with the owner's privileges and bypass table RLS.
-- Add an explicit access check to all authenticated-callable PL/pgSQL definer functions.
-- Administrators remain exempt through lorgus_is_access_blocked(); direct RPC calls do not.
do $blacklist_rpc_guards$
declare
    f record;
    definition text;
    match_parts text[];
    match_position integer;
    patched integer := 0;
begin
    for f in
        select p.oid, p.proname
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        join pg_language l on l.oid = p.prolang
        where n.nspname = 'public'
          and l.lanname = 'plpgsql'
          and p.prosecdef
          and has_function_privilege('authenticated', p.oid, 'EXECUTE')
          and p.proname <> 'lorgus_is_access_blocked'
    loop
        definition := pg_get_functiondef(f.oid);
        if position('RAISE EXCEPTION ''ACCESS_BLOCKED''' in definition) > 0 then
            continue;
        end if;

        match_parts := regexp_match(definition, E'\\n[[:space:]]*BEGIN[[:space:]]*\\n', 'i');
        if match_parts is null then
            raise exception 'BLACKLIST_RPC_GUARD_INJECTION_FAILED: %', f.proname;
        end if;

        match_position := strpos(definition, match_parts[1]);
        definition := overlay(
            definition placing
                match_parts[1] ||
                E'    IF coalesce(public.lorgus_is_access_blocked(), false) THEN\n' ||
                E'        RAISE EXCEPTION ''ACCESS_BLOCKED'';\n' ||
                E'    END IF;\n'
            from match_position for length(match_parts[1])
        );

        execute definition;
        patched := patched + 1;
    end loop;

    if patched < 40 then
        raise exception 'BLACKLIST_RPC_GUARD_COUNT_TOO_LOW: %', patched;
    end if;
end
$blacklist_rpc_guards$;
