create table if not exists public.abilities (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    category text not null check (category in ('combat','magic','craft','social','survival','special')),
    rarity text not null check (rarity in ('common','uncommon','rare','epic','legendary','mythic','unique')),
    icon text not null default '✦',
    color text not null default '#d6b36a',
    description text not null default '',
    created_at timestamptz not null default now()
);

create table if not exists public.character_abilities (
    character_id uuid not null references public.characters(id) on delete cascade,
    ability_id uuid not null references public.abilities(id) on delete cascade,
    acquired_at timestamptz not null default now(),
    granted_by uuid references auth.users(id) on delete set null,
    source_note text not null default '',
    primary key (character_id, ability_id)
);

create table if not exists public.character_ability_history (
    id uuid primary key default gen_random_uuid(),
    character_id uuid not null references public.characters(id) on delete cascade,
    ability_id uuid references public.abilities(id) on delete set null,
    admin_id uuid references auth.users(id) on delete set null,
    action text not null check (action in ('granted','revoked')),
    source_note text not null default '',
    created_at timestamptz not null default now()
);

create index if not exists character_abilities_character_idx on public.character_abilities(character_id);
create index if not exists character_abilities_ability_idx on public.character_abilities(ability_id);
create index if not exists character_ability_history_character_idx on public.character_ability_history(character_id, created_at desc);

alter table public.abilities enable row level security;
alter table public.character_abilities enable row level security;
alter table public.character_ability_history enable row level security;

drop policy if exists "Anyone can read abilities" on public.abilities;
create policy "Anyone can read abilities" on public.abilities for select to authenticated using (true);

drop policy if exists "Anyone can read character abilities" on public.character_abilities;
create policy "Anyone can read character abilities" on public.character_abilities for select to authenticated using (true);

drop policy if exists "Admins can read ability history" on public.character_ability_history;
create policy "Admins can read ability history" on public.character_ability_history for select to authenticated using (coalesce(public.is_admin(), false));

create or replace function public.admin_create_ability(
    p_name text,
    p_category text,
    p_rarity text,
    p_icon text,
    p_color text,
    p_description text
)
returns public.abilities
language plpgsql
security definer
set search_path = public
as $$
declare
    result_row public.abilities;
begin
    if not coalesce(public.is_admin(), false) then
        raise exception 'ADMIN_REQUIRED';
    end if;

    insert into public.abilities(name, category, rarity, icon, color, description)
    values (
        nullif(trim(p_name), ''),
        p_category,
        p_rarity,
        coalesce(nullif(trim(p_icon), ''), '✦'),
        coalesce(nullif(trim(p_color), ''), '#d6b36a'),
        coalesce(trim(p_description), '')
    )
    returning * into result_row;

    return result_row;
end;
$$;

create or replace function public.admin_award_character_ability(
    p_character_id uuid,
    p_ability_id uuid,
    p_source_note text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if not coalesce(public.is_admin(), false) then
        raise exception 'ADMIN_REQUIRED';
    end if;

    if not exists (select 1 from public.characters where id = p_character_id) then
        raise exception 'CHARACTER_NOT_FOUND';
    end if;

    if not exists (select 1 from public.abilities where id = p_ability_id) then
        raise exception 'ABILITY_NOT_FOUND';
    end if;

    insert into public.character_abilities(character_id, ability_id, granted_by, source_note)
    values (p_character_id, p_ability_id, auth.uid(), coalesce(trim(p_source_note), ''))
    on conflict (character_id, ability_id) do update
        set source_note = excluded.source_note,
            granted_by = excluded.granted_by,
            acquired_at = now();

    insert into public.character_ability_history(character_id, ability_id, admin_id, action, source_note)
    values (p_character_id, p_ability_id, auth.uid(), 'granted', coalesce(trim(p_source_note), ''));
end;
$$;

create or replace function public.admin_revoke_character_ability(
    p_character_id uuid,
    p_ability_id uuid,
    p_source_note text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if not coalesce(public.is_admin(), false) then
        raise exception 'ADMIN_REQUIRED';
    end if;

    delete from public.character_abilities
    where character_id = p_character_id and ability_id = p_ability_id;

    insert into public.character_ability_history(character_id, ability_id, admin_id, action, source_note)
    values (p_character_id, p_ability_id, auth.uid(), 'revoked', coalesce(trim(p_source_note), ''));
end;
$$;

revoke all on function public.admin_create_ability(text,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.admin_award_character_ability(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.admin_revoke_character_ability(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.admin_create_ability(text,text,text,text,text,text) to authenticated;
grant execute on function public.admin_award_character_ability(uuid,uuid,text) to authenticated;
grant execute on function public.admin_revoke_character_ability(uuid,uuid,text) to authenticated;

insert into public.abilities (name, category, rarity, icon, color, description) values
('Базовое владение мечом','combat','common','⚔','#b8a27a','Уверенное владение простыми приёмами мечевого боя.'),
('Удар с разворота','combat','uncommon','⚔','#c9a65a','Сильный круговой удар, требующий пространства для исполнения.'),
('Точный выпад','combat','uncommon','➶','#d1b06b','Быстрый направленный выпад по открывшейся цели.'),
('Парирование','combat','rare','◈','#b9c6d8','Техника отражения удара с точным встречным движением.'),
('Разящий удар','combat','rare','✦','#d88b58','Сосредоточенный удар, рассчитанный на пробитие защиты.'),
('Чтение заклинаний','magic','common','✧','#a9b8d8','Способность распознавать простые магические формулы.'),
('Магический щит','magic','uncommon','◇','#8ebde2','Создание кратковременного защитного барьера.'),
('Огненный импульс','magic','uncommon','🔥','#ff7a45','Небольшой направленный выброс огненной энергии.'),
('Ледяная игла','magic','rare','❄','#9ed8ff','Формирование острого снаряда из магического льда.'),
('Рунная вязь','magic','rare','ᚱ','#d2b26e','Нанесение и чтение рунных последовательностей.'),
('Первая помощь','survival','common','✚','#a7c98b','Остановка кровотечения и базовая полевая помощь.'),
('Следопыт','survival','uncommon','⌖','#9fc58a','Умение находить следы и ориентироваться по местности.'),
('Выживание в дикой природе','survival','uncommon','◇','#9fbf86','Практические навыки добычи воды, пищи и укрытия.'),
('Кузнечное дело','craft','common','⚒','#c89a69','Базовая обработка металла и ремонт простого снаряжения.'),
('Алхимия','craft','uncommon','⚗','#c79bdd','Приготовление простых алхимических составов.'),
('Убеждение','social','common','✦','#c8b37b','Умение склонять собеседника к разумному решению.'),
('Оценка товара','social','uncommon','◇','#d0ad62','Определение примерной ценности предметов и материалов.'),
('Неизвестный приём','special','unique','?','#ffffff','Особая способность, происхождение которой пока не установлено.')
on conflict (name) do update set
    category=excluded.category,
    rarity=excluded.rarity,
    icon=excluded.icon,
    color=excluded.color,
    description=excluded.description;