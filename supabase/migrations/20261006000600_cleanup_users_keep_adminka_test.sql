-- One-time production user cleanup for LORGUS.
-- Keep only the two bootstrap accounts used by the project.
-- Auth identities are derived from usernames in app.js:
-- adminka -> u_YWRtaW5rYQ@auth.lorgus.local
-- test    -> u_dGVzdA@auth.lorgus.local

do $$
declare
    adminka_count integer;
    test_count integer;
begin
    select count(*) into adminka_count
    from auth.users
    where lower(email) = lower('u_YWRtaW5rYQ@auth.lorgus.local');

    select count(*) into test_count
    from auth.users
    where lower(email) = lower('u_dGVzdA@auth.lorgus.local');

    if adminka_count <> 1 or test_count <> 1 then
        raise exception
            'ABORT_USER_CLEANUP: expected exactly one adminka and one test account, found adminka=%, test=%',
            adminka_count, test_count;
    end if;
end
$$;

delete from auth.users
where lower(email) not in (
    lower('u_YWRtaW5rYQ@auth.lorgus.local'),
    lower('u_dGVzdA@auth.lorgus.local')
);
