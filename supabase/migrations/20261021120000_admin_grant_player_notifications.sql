-- Notify the owning player after an administrator grants currency or an item.
-- The frontend calls this only after the grant RPC succeeds; this RPC remains admin-only.
create or replace function public.admin_notify_character_grant(
    p_character_id uuid,
    p_reward_kind text,
    p_reward_name text,
    p_quantity integer default 1,
    p_currency_code text default null,
    p_amount integer default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_user_id uuid;
    v_character_name text;
    v_title text;
    v_body text;
    v_amount_text text;
    v_currency_label text;
begin
    if auth.uid() is null or not coalesce(public.is_admin(), false) then
        raise exception 'ADMIN_REQUIRED';
    end if;

    if p_character_id is null then raise exception 'CHARACTER_REQUIRED'; end if;
    if p_reward_kind not in ('currency', 'item') then raise exception 'INVALID_REWARD_KIND'; end if;
    if coalesce(trim(p_reward_name), '') = '' then raise exception 'REWARD_NAME_REQUIRED'; end if;
    if coalesce(p_quantity, 0) < 1 then raise exception 'INVALID_QUANTITY'; end if;

    select ca.player_id, c.name
      into v_user_id, v_character_name
    from public.character_applications ca
    join public.characters c on c.id = ca.character_id
    where ca.character_id = p_character_id
      and ca.status = 'approved'
    order by ca.id desc
    limit 1;

    if v_user_id is null then raise exception 'RECIPIENT_ACCOUNT_NOT_FOUND'; end if;

    if p_reward_kind = 'currency' then
        if p_currency_code not in ('aur','lira','kald','dorn','fin')
           or coalesce(p_amount, 0) < 1 then
            raise exception 'INVALID_CURRENCY_GRANT';
        end if;

        v_currency_label := case p_currency_code
            when 'aur' then 'Аур'
            when 'lira' then 'Лира'
            when 'kald' then 'Кальд'
            when 'dorn' then 'Дорн'
            when 'fin' then 'Фин'
        end;
        v_amount_text := p_amount::text;
        v_title := 'Получена валюта';
        v_body := 'Администрация выдала персонажу «' || coalesce(v_character_name, 'Персонаж') ||
            '» ' || v_amount_text || ' (' || v_currency_label || ').';
    else
        v_title := 'Получен предмет';
        v_body := 'Администрация выдала персонажу «' || coalesce(v_character_name, 'Персонаж') ||
            '» предмет «' || trim(p_reward_name) || '»' ||
            case when p_quantity > 1 then ' ×' || p_quantity else '' end || '.';
    end if;

    insert into public.notifications(user_id, character_id, type, title, body, data)
    values (
        v_user_id,
        p_character_id,
        'admin_reward_received',
        v_title,
        v_body,
        jsonb_build_object(
            'reward_kind', p_reward_kind,
            'reward_name', trim(p_reward_name),
            'quantity', p_quantity,
            'currency_code', p_currency_code,
            'amount', p_amount,
            'character_name', v_character_name
        )
    );
end;
$function$;

revoke all on function public.admin_notify_character_grant(uuid,text,text,integer,text,integer) from public, anon;
grant execute on function public.admin_notify_character_grant(uuid,text,text,integer,text,integer) to authenticated;
