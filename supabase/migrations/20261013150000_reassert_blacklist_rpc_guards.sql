-- Reassert the blacklist gate after feature migrations that replace SECURITY DEFINER RPCs.
-- This also makes a fresh replay of the migration history safe: feature migrations may
-- define a function after the original blacklist migration, so guards must be re-applied last.
-- Idempotent: already guarded functions are left unchanged.

do $lorgus_blacklist_rpc_reassert$
declare
    f record;
    definition text;
    match_parts text[];
    match_position integer;
    patched integer := 0;
    total integer := 0;
    unguarded integer := 0;
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
        total := total + 1;
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

    select count(*) into unguarded
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join pg_language l on l.oid = p.prolang
    where n.nspname = 'public'
      and l.lanname = 'plpgsql'
      and p.prosecdef
      and has_function_privilege('authenticated', p.oid, 'EXECUTE')
      and p.proname <> 'lorgus_is_access_blocked'
      and position('RAISE EXCEPTION ''ACCESS_BLOCKED''' in pg_get_functiondef(p.oid)) = 0;

    if unguarded > 0 then
        raise exception 'BLACKLIST_RPC_GUARD_VERIFICATION_FAILED: % unguarded SECURITY DEFINER functions', unguarded;
    end if;

    raise notice 'Blacklist gate verified for % SECURITY DEFINER functions; patched % missing guards.', total, patched;
end
$lorgus_blacklist_rpc_reassert$;
