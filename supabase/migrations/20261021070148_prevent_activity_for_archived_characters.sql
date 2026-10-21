-- Enforce archive status in the database, not only in the UI.
create or replace function public.lorgus_prevent_archived_character_activity()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
    target_character_id uuid;
    target_status text;
begin
    if tg_table_name = 'rp_messages' then
        if coalesce(new.is_admin_post, false) then return new; end if;
        target_character_id := new.character_id;
    elsif tg_table_name = 'rp_presence' then
        target_character_id := new.character_id;
    elsif tg_table_name = 'lorgus_mail' then
        target_character_id := new.sender_character_id;
    else
        return new;
    end if;

    select c.status into target_status
    from public.characters c
    where c.id = target_character_id;

    if upper(coalesce(target_status, 'ACTIVE')) = 'ARCHIVED' then
        raise exception 'CHARACTER_ARCHIVED';
    end if;
    return new;
end;
$$;

drop trigger if exists lorgus_block_archived_rp_messages on public.rp_messages;
create trigger lorgus_block_archived_rp_messages
before insert on public.rp_messages
for each row execute function public.lorgus_prevent_archived_character_activity();

drop trigger if exists lorgus_block_archived_rp_presence on public.rp_presence;
create trigger lorgus_block_archived_rp_presence
before insert or update of character_id, presence_type, region, location, from_region, from_location, to_region, to_location
on public.rp_presence
for each row execute function public.lorgus_prevent_archived_character_activity();

drop trigger if exists lorgus_block_archived_mail on public.lorgus_mail;
create trigger lorgus_block_archived_mail
before insert on public.lorgus_mail
for each row execute function public.lorgus_prevent_archived_character_activity();

revoke all on function public.lorgus_prevent_archived_character_activity() from public, anon, authenticated;
