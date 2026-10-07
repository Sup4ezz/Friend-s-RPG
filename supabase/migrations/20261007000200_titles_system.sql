create table if not exists public.titles (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    category text not null check (category in ('combat','magic','status','church','organization','special')),
    rarity text not null check (rarity in ('common','uncommon','rare','epic','legendary','mythic','unique')),
    icon text not null,
    color text not null,
    description text not null default '',
    created_at timestamptz not null default now()
);

create table if not exists public.character_titles (
    character_id uuid not null references public.characters(id) on delete cascade,
    title_id uuid not null references public.titles(id) on delete cascade,
    awarded_at timestamptz not null default now(),
    awarded_by uuid references auth.users(id) on delete set null,
    primary key (character_id, title_id)
);

alter table public.characters
    add column if not exists active_title_id uuid references public.titles(id) on delete set null;

create index if not exists character_titles_character_idx on public.character_titles(character_id);
create index if not exists character_titles_title_idx on public.character_titles(title_id);
create index if not exists characters_active_title_idx on public.characters(active_title_id);

alter table public.titles enable row level security;
alter table public.character_titles enable row level security;

drop policy if exists "Anyone can read titles" on public.titles;
create policy "Anyone can read titles" on public.titles for select to authenticated using (true);

drop policy if exists "Anyone can read character titles" on public.character_titles;
create policy "Anyone can read character titles" on public.character_titles for select to authenticated using (true);

create or replace function public.admin_award_character_title(
    p_character_id uuid,
    p_title_id uuid
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

    if not exists (select 1 from public.titles where id = p_title_id) then
        raise exception 'TITLE_NOT_FOUND';
    end if;

    insert into public.character_titles(character_id, title_id, awarded_by)
    values (p_character_id, p_title_id, auth.uid())
    on conflict (character_id, title_id) do nothing;
end;
$$;

create or replace function public.admin_revoke_character_title(
    p_character_id uuid,
    p_title_id uuid
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

    delete from public.character_titles
    where character_id = p_character_id and title_id = p_title_id;

    update public.characters
    set active_title_id = null
    where id = p_character_id and active_title_id = p_title_id;
end;
$$;

create or replace function public.set_active_character_title(
    p_character_id uuid,
    p_title_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    owns_character boolean;
begin
    select exists (
        select 1
        from public.character_applications ca
        where ca.character_id = p_character_id
          and ca.player_id = auth.uid()
          and ca.status = 'approved'
    ) into owns_character;

    if not owns_character then
        raise exception 'CHARACTER_ACCESS_DENIED';
    end if;

    if p_title_id is null then
        update public.characters set active_title_id = null where id = p_character_id;
        return;
    end if;

    if not exists (
        select 1 from public.character_titles
        where character_id = p_character_id and title_id = p_title_id
    ) then
        raise exception 'TITLE_NOT_OWNED';
    end if;

    update public.characters
    set active_title_id = p_title_id
    where id = p_character_id;
end;
$$;

revoke all on function public.admin_award_character_title(uuid, uuid) from public, anon, authenticated;
revoke all on function public.admin_revoke_character_title(uuid, uuid) from public, anon, authenticated;
revoke all on function public.set_active_character_title(uuid, uuid) from public, anon, authenticated;
grant execute on function public.admin_award_character_title(uuid, uuid) to authenticated;
grant execute on function public.admin_revoke_character_title(uuid, uuid) to authenticated;
grant execute on function public.set_active_character_title(uuid, uuid) to authenticated;

insert into public.titles (name, category, rarity, icon, color, description) values
('Подмастерье Меча','combat','common','⚔','#b8a27a','Освоил основы мечевого искусства.'),
('Мастер Меча','combat','rare','⚔','#d8b15a','Признанный мастер мечевого искусства.'),
('Великий Мастер Меча','combat','epic','⚔','#f0a94b','Создатель собственного стиля или школы.'),
('Легендарный Мастер Меча','combat','legendary','✦','#ffcf66','Имя, вошедшее в историю войн.'),
('Бог Меча','combat','mythic','☼','#fff0a6','Имя, которым смертные называют почти недостижимое совершенство меча.'),
('Мастер Копья','combat','rare','⚔','#c69c6d','Глубокое владение копьём.'),
('Мастер Лука','combat','rare','➶','#8fc7d9','Стрельба, доведённая до искусства.'),
('Мастер Топора','combat','rare','✠','#c77b63','Мастерство тяжёлого рубящего оружия.'),
('Мастер Щита','combat','rare','⬟','#9aa7b8','Защита, ставшая боевым искусством.'),
('Великий Воитель','combat','epic','♜','#d88963','Воин, способный переломить ход сражения.'),
('Ученик Магии','magic','common','✧','#a9b8d8','Только вступил на путь магического искусства.'),
('Адепт Магии','magic','uncommon','✦','#9fc8e8','Уверенно владеет основами магии.'),
('Маг','magic','rare','◇','#79b9e8','Полноценный практик магического искусства.'),
('Мастер Магии','magic','epic','✧','#b38cff','Глубокое понимание магических принципов.'),
('Архимаг','magic','legendary','☽','#d8a6ff','Маг, чьё искусство превосходит обычные школы.'),
('Великий Иллюзионист','magic','epic','◌','#c58cff','Мастерство обмана чувств и восприятия.'),
('Повелитель Пламени','magic','legendary','🔥','#ff7a45','Маг, подчинивший себе пламя.'),
('Владыка Молний','magic','legendary','ϟ','#8ed6ff','Маг, чья воля сродни грому.'),
('Мастер Рун','magic','epic','ᚱ','#d2b26e','Знаток древних рун и магических знаков.'),
('Носитель Запретного Искусства','magic','mythic','☠','#d65cff','Тот, кто прикоснулся к запрещённой магии.'),
('Королевская Семья','status','legendary','♛','#e8c76a','Член правящего королевского дома.'),
('Принц','status','epic','♔','#dcb86a','Принц королевского дома.'),
('Принцесса','status','epic','♕','#e4a9d8','Принцесса королевского дома.'),
('Наследник Престола','status','legendary','♜','#f1cf70','Официальный наследник короны.'),
('Рыцарь','status','uncommon','♞','#aab6c7','Посвящённый рыцарь.'),
('Дворянин','status','uncommon','◆','#bda36b','Представитель признанного дворянского рода.'),
('Глава Дома','status','rare','♜','#c7a55c','Глава знатного дома.'),
('Посол','status','rare','⚜','#c7b27a','Официальный представитель державы или дома.'),
('Первый Глас Нечто','church','mythic','☼','#f4e7b0','Высший голос Церкви Нечто.'),
('Несущий Свет','church','legendary','✦','#ffd36a','Высокое церковное звание Вечного Пламени.'),
('Глава Гильдии','organization','epic','⚒','#d49a63','Руководитель признанной гильдии.'),
('Командир Ордена','organization','epic','⚔','#c7a86b','Командир военного или рыцарского ордена.'),
('Герой Лоргуса','special','legendary','★','#f2d17b','Имя, признанное деяниями, изменившими судьбы людей.'),
('Основатель','special','unique','✦','#ffffff','Один из тех, кто стоял у истоков нового дела или эпохи.')
on conflict (name) do update set
    category=excluded.category, rarity=excluded.rarity, icon=excluded.icon,
    color=excluded.color, description=excluded.description;
