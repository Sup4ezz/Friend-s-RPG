-- Recovered production RPC for an admin reply to an existing RP message.
create or replace function public.admin_send_lorgus_rp_reply(p_character_id uuid, p_reply_to_id bigint, p_body text)
returns public.rp_messages
language plpgsql security definer set search_path=public
as $function$
declare
  parent public.rp_messages;
  result_row public.rp_messages;
begin
  if coalesce(public.lorgus_is_access_blocked(), false) then raise exception 'ACCESS_BLOCKED'; end if;
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not coalesce(public.is_admin(), false) then raise exception 'ADMIN_REQUIRED'; end if;
  if p_body is null or char_length(trim(p_body)) < 1 or char_length(trim(p_body)) > 10000 then raise exception 'INVALID_MESSAGE_BODY'; end if;
  select * into parent from public.rp_messages where id = p_reply_to_id and status = 'active';
  if not found then raise exception 'MESSAGE_NOT_ACTIVE'; end if;
  if not exists (select 1 from public.characters where id = p_character_id) then raise exception 'CHARACTER_NOT_FOUND'; end if;
  insert into public.rp_messages (
    character_id, player_id, presence_type, region, location,
    from_region, from_location, to_region, to_location,
    body, status, is_admin_post, reply_to_id
  ) values (
    p_character_id, auth.uid(), parent.presence_type, parent.region, parent.location,
    parent.from_region, parent.from_location, parent.to_region, parent.to_location,
    trim(p_body), 'active', true, parent.id
  ) returning * into result_row;
  return result_row;
end;
$function$;
revoke all on function public.admin_send_lorgus_rp_reply(uuid,bigint,text) from public, anon;
grant execute on function public.admin_send_lorgus_rp_reply(uuid,bigint,text) to authenticated;
