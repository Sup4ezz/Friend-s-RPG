-- LORGUS: public update log and automatic welcome message for newly approved characters

create table if not exists public.lorgus_updates (
    id uuid primary key default gen_random_uuid(),
    version text not null,
    title text not null,
    body text not null,
    author text not null default 'Young7eat',
    published_at timestamptz not null default now(),
    is_published boolean not null default true,
    created_at timestamptz not null default now()
);

create index if not exists lorgus_updates_published_idx
    on public.lorgus_updates (is_published, published_at desc);

alter table public.lorgus_updates enable row level security;

drop policy if exists "Anyone can read published LORGUS updates" on public.lorgus_updates;
create policy "Anyone can read published LORGUS updates"
on public.lorgus_updates for select to authenticated
using (is_published = true);

drop policy if exists "Admins can manage LORGUS updates" on public.lorgus_updates;
create policy "Admins can manage LORGUS updates"
on public.lorgus_updates for all to authenticated
using (coalesce(public.is_admin(), false))
with check (coalesce(public.is_admin(), false));

insert into public.lorgus_updates (version,title,body,author)
select '1.0.0','ЛОРГУС наконец закончен', $body$ЛОРГУС наконец закончен.

Young7eat

Даров, надеюсь ты прочитаешь это сообщение. Я рад что смог довести этот проект до логичного вида. Весь лор был придуман мной, а ChatGPT занимался кодом в формате FullStack. Это только первый шаг на пути к становлению ЛОРГУСА таким, каким я его задумывал. Продолжайте играть на проекте и следить за обновлениями в моём тг)

ChatGPT

$body$, 'Young7eat'
where not exists (select 1 from public.lorgus_updates where version = '1.0.0');

create or replace function public.lorgus_send_welcome_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
    if NEW.status = 'approved' and OLD.status is distinct from 'approved' and NEW.character_id is not null then
        insert into public.notifications (user_id, character_id, type, title, body, data)
        values (
            NEW.player_id,
            NEW.character_id,
            'system',
            'Добро пожаловать в ЛОРГУС',
            'Даров. Твой персонаж принят в мир ЛОРГУСА. Загляни в обновления, изучи мир и продолжай играть — это только первый шаг.',
            jsonb_build_object('kind','character_welcome','version','1.0.0')
        );
    end if;
    return NEW;
end;
$function$;

drop trigger if exists trg_lorgus_send_welcome_notification on public.character_applications;
create trigger trg_lorgus_send_welcome_notification
after update of status on public.character_applications
for each row execute function public.lorgus_send_welcome_notification();

revoke all on function public.lorgus_send_welcome_notification() from public, anon, authenticated;