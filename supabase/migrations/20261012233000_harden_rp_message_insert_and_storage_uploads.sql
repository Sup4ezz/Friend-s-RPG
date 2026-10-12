-- LORGUS hardening: RP messages must be created through validated RPCs.
-- The application uses SECURITY DEFINER RPCs for player posts, replies,
-- admin/NPC posts and reversals; direct client INSERT is not required.
revoke insert on table public.rp_messages from authenticated;

-- Remove any column-level INSERT grants too: PostgreSQL keeps these separate
-- from table-level privileges, so revoking only the table grant is insufficient.
do $$
declare
    col record;
begin
    for col in
        select a.attname
        from pg_attribute a
        where a.attrelid = 'public.rp_messages'::regclass
          and a.attnum > 0
          and not a.attisdropped
    loop
        execute format(
            'revoke insert (%I) on table public.rp_messages from authenticated',
            col.attname
        );
    end loop;
end;
$$;

-- Storage remains private. Enforce upload limits at the bucket level rather
-- than relying only on client-side checks (player forms: 5 MB, admin portrait
-- source images: 8 MB). Admin portrait crops are uploaded as PNG.
update storage.buckets
set file_size_limit = 8388608,
    allowed_mime_types = array[
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/avif'
    ]
where id = 'character-applications';

do $$
begin
    if not exists (
        select 1
        from storage.buckets
        where id = 'character-applications'
          and file_size_limit = 8388608
          and allowed_mime_types = array[
              'image/jpeg',
              'image/png',
              'image/webp',
              'image/avif'
          ]::text[]
    ) then
        raise exception 'CHARACTER_APPLICATIONS_BUCKET_HARDENING_FAILED';
    end if;
end;
$$;
