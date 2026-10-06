# LORGUS — MASTER CHECKLIST / ПАМЯТЬ ПРОЕКТА

> **Главный файл передачи контекста между чатами.**
> Если предыдущий чат закончился, новый чат должен сначала прочитать этот файл.
> После **каждой завершённой работы** по LORGUS этот файл обязан быть обновлён: что сделано, что изменилось, что осталось, где остановились и что делать следующим.
>
> Репозиторий: https://github.com/Sup4ezz/Friend-s-RPG
> Продакшен: https://friend-s-rpg.staskarr23.workers.dev/

---

## 0. ЧТО ТАКОЕ LORGUS

**LORGUS** — браузерная литературная dark-fantasy RPG/RP-платформа.

Главная идея: игрок выбирает персонажа и существует в общем мире через физически правдоподобное RP-пространство. Это не Discord-клон и не стандартный RPG-HUD.

Основной пользовательский путь:

**Выбор персонажа → Мир → Королевство → Локация → RP**

Проект состоит из:
- фронтенда на обычном JavaScript/CSS/HTML;
- Cloudflare Worker для выдачи приложения и публичной конфигурации;
- Supabase для auth и игровых данных;
- SQL/RLS для серверных правил;
- Obsidian Vault как отдельного хранилища лора/материалов;
- GitHub как истории кода и главного долговременного источника технического состояния.

---

## 1. ГЛАВНЫЕ ПРАВИЛА РАБОТЫ С ПРОЕКТОМ

- [x] GitHub используется как долговременная память проекта.
- [x] Канон LORGUS нельзя менять ради удобства реализации.
- [x] Перед изменением существующего кода сначала изучать текущую реализацию.
- [x] После работы проверять затронутую область.
- [x] После **каждой** работы обновлять этот MASTER CHECKLIST.
- [x] В чеклисте всегда указывать последнюю завершённую работу.
- [x] В чеклисте всегда указывать текущую следующую задачу.
- [x] В чеклисте фиксировать новые архитектурные решения и важные найденные ограничения.
- [x] Новый чат должен быть способен продолжить проект, прочитав этот файл, без восстановления контекста у пользователя.
- [x] Не хранить секреты, токены и пароли в git.
- [x] Не удалять production-данные и не ослаблять RLS без отдельной необходимости и проверки.

---

## 2. ТЕКУЩЕЕ СОСТОЯНИЕ ПРОЕКТА

**Статус:** активно разрабатывается.

**Фронтенд:** работает как SPA через Cloudflare Worker.

**Backend:** Supabase.

**Production:** Cloudflare Workers.

**Основной код:** `app.js`, `style.css`, `index.html`, `worker.js`.

**Техническая цель ближайшего этапа:** сделать RP не только визуально работающим, но и серверно защищённым от клиентских обходов.

**Текущий блок:** P0-аудит RP. Клиентская карта маршрутов исправлена; серверная авторизация presence добавлена в repo, но migration ещё нужно применить в Supabase production.

**CI/CD состояние:** очередь GitHub Actions очищена вручную 2026-10-05. Сейчас queued-запусков нет. Workflow проверен: документационные файлы исключены из автоматического deploy; изменение самого workflow-файла закономерно создало отдельный запуск.

**Текущая главная задача:**
- [ ] провести полный аудит RP на обход физического `rp_presence`;
- [ ] перенести критические проверки на сервер;
- [ ] затем довести путешествия, письма и стабильность.

---

# 3. ЧТО УЖЕ СДЕЛАНО

## 3.1 Базовое приложение

- [x] Авторизация через Supabase.
- [x] Регистрация пользователя.
- [x] Технический email для Supabase auth генерируется из логина.
- [x] Восстановление активного персонажа реализовано через состояние приложения.
- [x] Основной маршрут пользователя: персонаж → мир → королевство → локация → RP.
- [x] Cloudflare Worker выдаёт конфигурацию Supabase.
- [x] Статические JS/CSS/HTML отдаются без агрессивного кеширования.
- [x] Добавлены базовые security headers.
- [x] Production deployment через GitHub Actions → Cloudflare Wrangler.

## 3.2 Визуальный стиль

- [x] Литературный dark-fantasy интерфейс.
- [x] Тёмная коричнево-чёрная основа.
- [x] Приглушённое золото для текста/границ.
- [x] Cormorant Garamond + Lora.
- [x] Сдержанные анимации.
- [x] Интерфейс не должен превращаться в стандартный RPG HUD.
- [x] Унификация heraldic/CSS glyph-иконок.
- [x] Иконки королевств переведены на единый CSS-подход.
- [ ] Найти и заменить оставшиеся emoji/text-symbol UI там, где они ещё используются.

## 3.3 RP presence

Создана таблица `public.rp_presence`.

Она хранит физическое состояние персонажа:
- `character_id`
- `player_id`
- `presence_type`: location / road
- регион/локацию
- from/to для дороги
- visibility
- entered_at / started_at / updated_at

- [x] Получение RP presence из Supabase.
- [x] `window.activeRpPresence`.
- [x] Проверка присутствия перед отображением location chat.
- [x] Введено понятие входа в локацию.
- [x] Открытие карточки локации само по себе не считается физическим входом.
- [x] Есть экран/логика road chat.
- [x] Есть travel screen.
- [x] Исправлена синтаксическая ошибка `async async function`.
- [x] Убрана клиентская запись rp_presence напрямую: приложение теперь вызывает серверную set_lorgus_rp_presence().
- [x] Введена серверная валидация принадлежности персонажа одобренной заявке.
- [x] Введена серверная валидация канонических локаций и прямых маршрутов.
- [x] entered_at и started_at теперь выставляются серверной функцией.
- [x] Подтверждено пользователем: migrations 20261006000100_rp_schema.sql, 20261006000200_rp_presence_security.sql и 20261006000300_rp_presence_cleanup.sql прошли в production Supabase.
- [x] rp_messages переведён на серверную RLS-проверку текущего физического RP-пространства.
- [x] INSERT rp_messages теперь проверяет auth user, approved character application и точное совпадение с текущим rp_presence.
- [ ] Полностью проверить production-применение migration 20261006000400_rp_messages_security.sql.
- [ ] Проверить realtime/RLS после применения.
- [ ] Проверить все связанные RP SQL policies.

## 3.4 Путешествия

Канонический граф маршрутов:

### Суша
- Каэлор ↔ Атэрон
- Атэрон ↔ Морвейн
- Атэрон ↔ Ксандр
- Ксандр ↔ Святые Земли
- Ксандр ↔ Морвейн
- Святые Земли ↔ Спорные Земли
- Святые Земли ↔ Лирэн

### Море
- Лирэн ↔ Ксандр
- Ксандр ↔ Каэлор
- Морвейн ↔ Спорные Земли

Правило: **если соединение не указано выше — прямого маршрута нет.**

- [x] Добавлен RP travel flow.
- [x] Land/sea различаются концептуально.
- [x] Дороги представлены как явный граф.
- [x] В клиенте появился единый LORGUS_ROUTES с land/sea.
- [x] UI больше не предлагает все локации подряд: доступны только регионы с канонической прямой связью.
- [x] startTravel() проверяет прямой маршрут и существование целевой локации.
- [ ] Перенести route graph в серверный источник истины.
- [ ] Исключить расхождения между UI и данными.
- [ ] Сохранить travel state после reload.
- [ ] Добавить длительность путешествия.
- [ ] Добавить события/состояния на дороге.

## 3.5 Flood

- [x] Flood отделён от RP.
- [x] Flood не изменяет физическое RP presence.
- [ ] Проверить все async/await вызовы flood.
- [ ] Проверить, что flood нигде не даёт доступ к RP-пространству.

## 3.6 Письма

Игровые письма — это голубиная/курьерская почта, а не мгновенный чат.

Таблица: `public.lorgus_mail`.

Поля включают:
- sender_character_id
- sender_player_id
- recipient_character_id
- body
- method
- sent_at
- deliver_at
- delivered_at
- read_at

- [x] UI писем.
- [x] Получатель выбирается из доступных персонажей.
- [x] Отправка голубя.
- [x] Inbox.
- [x] Read state.
- [x] `deliver_at` предусмотрен в модели.
- [x] Запрещена отправка самому себе на уровне SQL check.
- [x] Логика получателей была исправлена с учётом `character_applications.status='approved'`.
- [ ] Перенести фактическую доставку `deliver_at → delivered_at` на сервер.
- [ ] Проверить RLS в production.
- [ ] Убрать клиентскую иллюзию мгновенной доставки.
- [ ] Проверить send/read permissions.
- [ ] Синхронизировать repo SQL с фактической production-схемой.

**Важно:** в текущем репозитории `sql/lorgus_mail.sql` ещё содержит старые ссылки на `characters.player_id`. Фактическая схема, которую пользователь применил вручную, использует approved character applications. Перед следующим применением SQL-файла его необходимо исправить.

## 3.7 UI

- [x] Выбор персонажа отполирован.
- [x] Мир/королевства/локации имеют единый визуальный язык.
- [x] CSS glyph-подход для значков.
- [x] RP presence / road / flood получили стилизацию.
- [ ] Полный UI-аудит после завершения backend/RP работ.
- [ ] Убрать оставшиеся несистемные emoji/text symbols.
- [ ] Проверить locked location screen.
- [ ] Не добавлять бессмысленные игровые статы ради вида.

---

# 4. КАНОН МИРА LORGUS

## 4.1 Королевства

### Атэрон
- Дом Аркейн.
- Королевство Нечто.
- Знания, образование, исследования, древние руины и реликвии.
- Столица: Примум.

### Каэлор
- Дом Фалькрейн.
- Королевство Вечного Пламени.
- Горы, дварфы, кузницы, шахты, торговые пути.
- Столица: Хелион.
- Святое место: Древнее Пламя.

### Ксандр
- Дом Гринвельд.
- Королевство Воздаяния.
- Торговля, банки, долги, финансовые дома.
- Столица: Арджент.
- Города: Меридиан, Валькрофт, Солмир.

### Лирэн
- Дом Кальери.
- Королевство Плодородия.
- Леса, плодородные земли, лесные эльфы.
- Столица: Аврора.
- Города: Элвэйн, Таллирион, Эстерваль.

### Морвейн
- Королевство Последнего Пути.
- Холодная земля паломничества, памяти и Последнего Пути.
- Столица: Фин.

### Святые Земли
- Нейтральная территория.
- Место переговоров представителей королевств и церквей.

### Спорные Земли
- Независимые территории вне власти пяти королевств.

### Геенна
- **Закрыта для игроков.**
- Нельзя родиться в Геенне.
- Нельзя делать её обычной доступной игровой локацией.
- Геенна не поклоняется Ничто.
- Не добавлять Геенну в доступные стартовые локации без отдельного изменения канона.

---

# 5. БОГИ И РЕЛИГИЯ — НЕ ЛОМАТЬ КАНОН

- В мире шесть богов, потому что Нечто + Ничто являются одним существом с двумя волями/сознаниями.
- Смертные считают, что именно их бог создал мир.
- Все эти утверждения ошибочны.
- Все боги родились внутри уже существующего мира.
- Истинный создатель — Аэрарис.
- Аэрарис неизвестен смертным и никому не поклоняются как Аэрарису.
- Ни одна церковь не знает полной космологии.
- Смертные никогда непосредственно не видели богов.
- Каждая религия считает, что существует только её бог.

### Нечто / Ничто

- Истинно одно божество с двумя волями.
- Ничто — полноценное тело.
- Нечто возникает из спины/позвоночника Ничто и является второй верхней половиной.
- Нечто не имеет нижней части тела.
- Внешность должна быть явно божественной/нечеловеческой.
- Визуальная концепция: светлые широкие штаны, открытая верхняя часть тела, не generic humanoid.
- Миф: «В начале было Ничто».
- Нечто родилось в Ничто и обрело волю к существованию/бегству.
- Вера Нечто тайно усиливает Ничто, но последователи этого не знают.

### Церкви

- Церковь Нечто / Учение Нечто / Нечтисты.
- Папа Аурелий I «Беглец».
- Титул: Первый глас Нечто.
- Писание: *В начале было ничто*.
- Вечное Пламя / Солар.
- Плодородие / Лилит — фанатичная/странная церковь.
- Последний Путь / Вехаиэль.
- Воздаяние / Малкхор.

---

# 6. ВАЖНЫЕ ПЕРСОНАЖИ / ПОЛИТИКА

## Атэрон — Дом Аркейн

- Эдмунд Аркейн IV — 52, король, «учёный на троне».
- Лиандра — 48, королева, практичная/строгая/фактическая.
- Кассиан Аркейн — 27, наследник, амбициозный/воинственный.
- Адриан.
- Селена — 22, тихая, талантливый учёный, исследует руины.

## Каэлор — Дом Фалькрейн

- Церковь Вечного Пламени возглавляет Севериан I «Несущий Свет».
- Кассиан Аркейн не является главой церкви Каэлора; он наследник Атэрона.
- Молодой принц Каэлора мечтает о далёких/высоких целях, любит книги о рыцарях и хочет стать авантюристом.

---

# 7. ТЕХНИЧЕСКАЯ АРХИТЕКТУРА

## Frontend
Основные файлы:
- `index.html`
- `app.js`
- `style.css`

Основной стиль: vanilla JS без обязательного тяжёлого framework.

## Cloudflare
- Worker: `worker.js`
- Config: `wrangler.toml`
- Assets directory: корень проекта.
- SPA fallback.
- `/api/config` отдаёт публичный Supabase URL/key.
- Supabase publishable key не является secret и не должен заменяться service-role key.

## Supabase
Используется для:
- auth;
- characters;
- character applications;
- RP presence;
- mail;
- RLS.

## CI/CD
Основной production workflow:
`.github/workflows/deploy-lorgus.yml`

Он:
- запускается на push в main;
- игнорирует изменения Obsidian Vault для deploy;
- может запускаться вручную;
- деплоит через Cloudflare Wrangler.

---

# 8. ЧТО НАХОДИТСЯ В РЕПОЗИТОРИИ

## Основной проект
- `app.js`
- `style.css`
- `index.html`
- `worker.js`
- `wrangler.toml`
- SQL-файлы

## Техническая память
- `LORGUS_CHECKLIST.md` — **главный мастер-файл**
- `.agent/STATE.md`
- `.agent/TASKS.md`
- `.agent/DECISIONS.md`
- `.agent/CURRENT.md`
- `AGENTS.md`

Эти файлы не являются отдельными проектами. Они описывают состояние разработки.

## Obsidian
В репозитории присутствует Obsidian Vault с материалами лора.

Не считать содержимое Obsidian автоматически частью runtime-кода.

---

# 9. ЧТО НУЖНО СДЕЛАТЬ

## P0 — КРИТИЧНО: RP-безопасность

- [ ] Полный поиск всех функций открытия/чтения/записи RP.
- [ ] Найти обходы `rp_presence`.
- [ ] Серверная проверка location chat.
- [ ] Серверная проверка road chat.
- [ ] Серверная проверка write permissions.
- [ ] Проверить RLS.
- [ ] Проверить race conditions при смене presence.
- [ ] Проверить stale presence.
- [ ] Проверить восстановление после reload.

## P1 — Путешествия

- [ ] Один источник истины для route graph.
- [ ] Land/sea в данных.
- [ ] Никаких неканонических прямых маршрутов.
- [ ] Persistent travel state.
- [ ] Travel duration.
- [ ] Road events.

## P1 — Письма

- [ ] Исправить repo SQL под реальную character/application модель.
- [ ] Server-side delivery.
- [ ] `deliver_at` → `delivered_at`.
- [ ] RLS audit.
- [ ] Read/send permissions.
- [ ] Проверка доставки после reload.

## P1 — Стабильность

- [ ] Async/await audit.
- [ ] RP reload audit.
- [ ] Active character reload audit.
- [ ] Missing/stale presence handling.
- [ ] Минимальные автоматические проверки JS.

## P2 — UI

- [ ] Убрать остаточные emoji/text-symbol icons.
- [ ] Полный UI audit.
- [ ] Проверить location lock screen.
- [ ] Проверить mail.
- [ ] Проверить RP.
- [ ] Сохранить literary dark-fantasy стиль.

## P2 — Код

- [ ] Убрать дублирование RP logic.
- [ ] Централизовать presence checks.
- [ ] Централизовать route checks.
- [ ] Уменьшить прямые Supabase calls из UI.
- [ ] Комментарии только для неочевидной логики.

## P3 — Позже

- [ ] Расширение мира.
- [ ] Более глубокая система путешествий.
- [ ] События мира.
- [ ] Более глубокая игровая экономика.
- [ ] Дополнительные RP-механики.
- [ ] Полировка производительности.

---

# 10. ИЗВЕСТНЫЕ ПРОБЛЕМЫ / ТЕХНИЧЕСКИЙ ДОЛГ

- `sql/lorgus_mail.sql` не полностью синхронизирован с фактической production-моделью characters/applications.
- Критические проверки чтения/отправки rp_messages пока частично живут на клиенте.
- supabase/migrations/20261006000100_rp_schema.sql
- supabase/migrations/20261006000200_rp_presence_security.sql добавлен в repo, но ещё требует применения в production Supabase.
- Realtime/RLS для RP нужно проверить после перевода presence на RPC.
- saveRpPresence() теперь использует серверную функцию; две production migrations отправлены в `main`, применение нужно подтвердить.
- Возможны оставшиеся async/await ошибки в flood/RP.
- Есть остаточные emoji/text-symbol элементы UI.
- Граф маршрутов нужно централизовать.
- Production schema и repo SQL необходимо регулярно сверять.

---

# 11. ПОСЛЕДНЯЯ РАБОТА

**Дата:** 2026-10-06

Сделано:
- [x] Проведён аудит очереди GitHub Actions после накопления queued deploy runs.
- [x] Подтверждено: после ручной отмены старых запусков `queued = 0`.
- [x] Старые запуски не удаляли коммиты или репозиторий; они получили состояние `cancelled`.
- [x] Разобрана причина запусков `#42` и `#43`: `#42` относится к старой версии trigger, а `#43` появился из-за изменения workflow-файла.
- [x] Подтверждено, что текущий `paths-ignore` содержит `.agent/**`, `AGENTS.md`, `LORGUS_CHECKLIST.md`, `README.md` и Obsidian-файлы.
- [x] Для текущего `main` оставлен чистый путь к одному ручному production deploy.
- [x] Введена долговременная техническая память проекта.
- [x] Добавлены `.agent/STATE.md`, `.agent/TASKS.md`, `.agent/DECISIONS.md`, `.agent/CURRENT.md`.
- [x] Добавлен `AGENTS.md`.
- [x] Создан этот MASTER CHECKLIST.
- [x] Убрана неиспользуемая идея автономного Codex workflow, который требовал API key и не соответствует текущему бесплатному сценарию.
- [x] Зафиксировано правило: чат не является единственным источником памяти.
- [x] Run #44 после сбоя GitHub-hosted runner повторно запущен и завершился успешно.
- [x] Production deploy текущего состояния до P0-правок подтверждён через GitHub Actions.
- [x] Найден критичный обход: клиент мог напрямую записывать произвольный rp_presence.
- [x] Добавлен sql/rp_security.sql с серверной set_lorgus_rp_presence().
- [x] app.js переведён с прямого upsert presence на RPC.
- [x] Клиентский route graph централизован в LORGUS_ROUTES.
- [x] Серверная функция проверяет approved character application, допустимую локацию и канонический прямой маршрут.

---

# 12. ТЕКУЩАЯ ТОЧКА ОСТАНОВКИ

**Следующее действие:**

> Первые три RP migrations уже применены. Следующий шаг — применить/проверить 20261006000400_rp_messages_security.sql, затем проверить realtime и попытки чтения/записи из неправильного RP-пространства.

CI/CD проверки выполнены; Run #44 успешно завершён.

Порядок:
1. Проверить автоматическое применение migrations через GitHub → Supabase.
2. Проверить запись presence через `set_lorgus_rp_presence()`.
3. Найти обходы чтения/отправки rp_messages.
4. Перенести критические RP message checks на сервер.
5. Проверить RLS/realtime и race conditions.
6. Проверить reload/stale presence.
7. Обновить этот файл.

---

# 13. ПРОТОКОЛ ДЛЯ НОВОГО ЧАТА

Если чат закончился:

1. Пользователь даёт ссылку на GitHub:
   `https://github.com/Sup4ezz/Friend-s-RPG`
2. Новый помощник открывает `LORGUS_CHECKLIST.md`.
3. Смотрит разделы:
   - Текущее состояние
   - Последняя работа
   - Текущая точка остановки
   - Что нужно сделать
   - Известные проблемы
4. Затем проверяет актуальный код в репозитории.
5. Продолжает с указанной следующей задачи.
6. Пользователь не обязан заново рассказывать историю проекта.

---

## 16. P0 RP HARDENING — 2026-10-06

- [x] Найден обход прямой записи rp_presence.
- [x] Добавлена серверная set_lorgus_rp_presence().
- [x] Клиент переведён на RPC.
- [x] Сервер проверяет approved character application, каноническую локацию и прямой маршрут.
- [x] Route graph централизован в LORGUS_ROUTES.
- [x] Перенесены RP schema/security SQL в `supabase/migrations/` для GitHub → Supabase deployment.
- [x] Подтверждено пользователем: первые три RP migrations применены в production Supabase.
- [x] Закрыт аналогичный клиентский обход записи rp_messages: серверная RLS сверяет сообщение с текущим rp_presence.
- [ ] Применить и проверить новую migration 20261006000400_rp_messages_security.sql в production Supabase.

Изменённые файлы:
- app.js
- sql/rp_security.sql
- LORGUS_CHECKLIST.md

Commits:
- 498218ec0ffcd557e86aa44f2999b549952d458e
- 7c8b0b4f2e7def0081a9dc49c235e2cba4d4c2fa

---
# 15. ИЗМЕНЕНИЕ DEPLOY WORKFLOW — 2026-10-05

- [x] Исключены `.agent/**`, `AGENTS.md`, `LORGUS_CHECKLIST.md` и `README.md` из автоматического Cloudflare deploy.
- [x] Документационные изменения больше не должны создавать production deploy.
- [x] Кодовые изменения по-прежнему запускают deploy.
- [x] Проверена очередь GitHub Actions: после ручной отмены старых запусков `queued = 0`.
- [x] Установлено, почему появились последние два запуска: `#42` был создан предыдущей версией workflow до добавления новых `paths-ignore`; `#43` был создан изменением самого workflow-файла, поэтому он не является доказательством того, что `paths-ignore` не работает.
- [x] Следующий production deploy должен запускаться вручную через `workflow_dispatch` для текущего `main`, либо автоматически при следующем runtime/code изменении.

# 14. ОБЯЗАТЕЛЬНО ПОСЛЕ КАЖДОЙ РАБОТЫ

Перед завершением любого ответа/итерации по LORGUS:

- [ ] Обновить этот файл.
- [ ] Отметить реально завершённые пункты.
- [ ] Добавить новые найденные проблемы.
- [ ] Зафиксировать изменённые архитектурные решения.
- [ ] Записать последнюю работу.
- [ ] Записать точку остановки.
- [ ] Записать следующую задачу.
- [ ] Проверить, что новый чат сможет продолжить работу только по GitHub.

**Если этого не сделано — работа по LORGUS считается не полностью завершённой.**


## 17. GITHUB → SUPABASE MIGRATION SETUP — 2026-10-06

- [x] Проверена структура `supabase/`: ранее SQL лежал напрямую в `supabase/`, а не в `supabase/migrations/`.
- [x] GitHub → Supabase Integration настроена на `Sup4ezz/Friend-s-RPG`, working directory `.` и production branch `main`.
- [x] Создана canonical migration `supabase/migrations/20261006000100_rp_schema.sql` с RP presence/messages schema.
- [x] Создана `supabase/migrations/20261006000200_rp_presence_security.sql` с server-side presence authority.
- [x] Старые `supabase/rp_presence.sql` и `supabase/rp_messages.sql` удалены как отдельные schema-файлы, чтобы не было двух источников истины.
- [x] Старый `sql/rp_security.sql` удалён; security SQL теперь живёт в migration.
- [ ] Проверить результат автоматического применения migrations в Supabase production.

### Последняя работа
Приведён database deployment workflow LORGUS к migration-based структуре. Репозиторий теперь готов отдавать RP SQL через `supabase/migrations/`, а не через произвольные SQL-файлы. Supabase применяет миграции по истории/порядку; прямые изменения remote DB после перехода на migrations следует избегать.

### Точка остановки
Остановились сразу после push migration-файлов в `main`. Следующий шаг — открыть Supabase и проверить, что обе migrations применились без ошибки.

### Следующая задача
1. Проверить migration history в Supabase.
2. Если обе применились — проверить RPC `set_lorgus_rp_presence` и запись presence.
3. Если нет — не делать повторный SQL вслепую; сначала разобраться с migration history.
4. После этого продолжить P0-аудит `rp_messages` RLS.


## 18. RP PRESENCE API CLEANUP — 2026-10-06

- [x] Проверен `20261006000200_rp_presence_security.sql`.
- [x] Подтверждено, что клиент использует новый `set_lorgus_rp_presence()`.
- [x] Поиск по репозиторию не обнаружил вызовов старого `clear_rp_presence()`.
- [x] Создана новая migration `supabase/migrations/20261006000300_rp_presence_cleanup.sql`.
- [x] Старый публичный RPC `set_rp_presence()` удаляется через migration.
- [x] Старый `clear_rp_presence()` удаляется через migration.
- [x] Для `authenticated` убраны все прямые права на таблицу `rp_presence`, после чего явно оставлено только `SELECT`.
- [x] Для защищённого `set_lorgus_rp_presence()` оставлен `EXECUTE` только для `authenticated`.
- [x] Production migrations не переписывались задним числом: cleanup оформлен отдельной migration.

Commit:
- 62f9c48bc11eafd044242e26ffd992005adbb273 — Harden RP presence API surface

### Текущая точка
Следом нужно проверить, что все три migration применились автоматически в Supabase production. После этого — вызвать/протестировать `set_lorgus_rp_presence()` и перейти к `rp_messages` RLS.


## 19. RP MESSAGES SECURITY — 2026-10-06

- [x] Подтверждено: первые три RP migrations прошли в production Supabase.
- [x] Найден критичный обход rp_messages: исходная RLS позволяла любому authenticated читать все сообщения через using (true).
- [x] Найден второй обход: INSERT проверял только player_id = auth.uid(), поэтому клиент мог отправить сообщение с чужой/поддельной RP-координатой.
- [x] Добавлена supabase/migrations/20261006000400_rp_messages_security.sql.
- [x] SELECT теперь разрешён только если у текущего пользователя есть физическое rp_presence в том же RP-пространстве.
- [x] INSERT теперь проверяет approved character application и точное соответствие сообщения текущему rp_presence персонажа.
- [x] Server trigger принудительно выставляет player_id = auth.uid() и created_at = now().
- [x] Прямые UPDATE/DELETE для authenticated закрыты.
- [x] renderLocationChats() теперь реально загружает историю rp_messages и подписывается на Realtime; раньше location UI оставался с пустой заглушкой.
- [x] Участники location теперь фильтруются на уровне запроса, а не после загрузки всех public presence.

Новые commits:
- a74d0be33933345a47b39a123cb6a50232189e50 — Add RP message authorization hardening
- 353ec474ae5684081fac6f909a46fc164e9ebb20 — Fix RP message server field hardening
- 72888489b668808b42de540b71813964d6da5378 — Connect location RP chat to protected message stream

### Текущая точка
Migration 20261006000400_rp_messages_security.sql добавлена в main, но её production application ещё не подтверждён.

### Следующая задача
1. Проверить, что 20261006000400 применился в Supabase.
2. Тест: сообщение из текущей локации проходит.
3. Тест: подмена region/location отклоняется RLS.
4. Тест: чтение чужой локации без присутствия отклоняется.
5. Тест: road message принимается только для текущей дороги.
6. Проверить Realtime после RLS.
7. Затем перейти к race/stale presence и reload.


## 20. RP PRESENCE TRANSITIONS — 2026-10-06

- [x] Production confirmed by user: migration 20261006000400_rp_messages_security.sql applied.
- [x] Found next P0 issue: protected presence RPC still allowed an authenticated player to set any canonical location directly, bypassing travel.
- [x] Found second transition issue: road creation did not require the supplied origin to equal the character's current location.
- [x] Added migration 20261006000500_rp_presence_transitions.sql.
- [x] Location entry now requires an existing current road and its exact destination.
- [x] Road creation now requires an existing current location matching the supplied origin.
- [x] Added protected clear_lorgus_rp_presence() RPC.
- [x] Client clearRpPresence() now uses the protected RPC instead of a direct DELETE.

New commits:
- 30366940592e9851b66b845f4fc214a4fbf3bfe5 — Harden RP presence transitions and cleanup
- 8be72d0d2828e6154f6d079f6b86f2e8f1b420f3 — Use protected RP presence cleanup RPC

### Current stopping point
Migration 20261006000500_rp_presence_transitions.sql is in main and must be applied/confirmed in Supabase.

### Next task
1. Apply/confirm 005 in Supabase.
2. Test teleport attempt to arbitrary canonical location — must fail.
3. Test starting road from a fake origin — must fail.
4. Test arrival to a different destination than current road — must fail.
5. Test normal location → road → destination flow — must pass.
6. Test protected presence cleanup — must pass.
7. Then audit stale presence/reload and Realtime edge cases.


## 21. SUPABASE DEPLOYMENT CI — 2026-10-06

- [x] Root cause established: Supabase GitHub Integration deploys production migrations, but its production result is not exposed to us through the repository's GitHub Actions status API in a reliable machine-readable check.
- [x] Added explicit GitHub Actions workflow: .github/workflows/deploy-supabase.yml.
- [x] Workflow triggers only when supabase/migrations/** or supabase/config.toml changes on main.
- [x] Workflow uses the official Supabase CLI setup action.
- [x] Workflow validates SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_ID, and SUPABASE_DB_PASSWORD secrets.
- [x] Workflow links the production project, runs supabase db push --linked, then runs supabase migration list --linked.
- [x] GitHub now has an explicit job named "Supabase Production" whose conclusion is directly machine-readable.

Commit: 55da739247b9f0718a0c10b4071737e9fda25521 — Add explicit Supabase production deployment check

### IMPORTANT MIGRATION OF DEPLOYMENT OWNERSHIP
The repository now contains an explicit Supabase deployment workflow. To avoid two independent deployers racing on the same production database, disable Supabase Dashboard -> GitHub Integration -> Deploy to production after the new workflow is configured and confirmed working. Keep the GitHub repository connection if preview/branch features are desired.

### Required one-time GitHub configuration
Repository Settings -> Secrets and variables -> Actions -> Secrets:
- SUPABASE_ACCESS_TOKEN
- SUPABASE_PROJECT_ID
- SUPABASE_DB_PASSWORD

### Current stopping point
The workflow is committed, but it cannot prove production deployment until the three GitHub Actions secrets exist. The first run will intentionally fail fast and visibly if any secret is missing.

### Next task
1. Add the three GitHub Actions secrets.
2. Run/trigger the Supabase Production workflow.
3. Confirm 001-005 migration state in the workflow output.
4. After successful run, disable Supabase Integration's Deploy to production to leave one authoritative production deployer.
5. Keep this workflow as the authoritative machine-readable production migration status.


### 21.1 FIX — RP messages migration delimiter
- [x] Fixed PostgreSQL dollar-quote delimiter in `20261006000400_rp_messages_security.sql`: `as $` / `$;` → `as $$` / `$$;`.
- [x] Root cause confirmed from GitHub Actions output: PostgreSQL stopped at the single `$` and raised SQLSTATE 42601.
- [ ] Re-run `Deploy Supabase migrations` and confirm migrations 004 and 005 apply successfully.

Commit: 49690069e8a68df14172edc540448d87c6121552 — Fix RP message trigger SQL delimiter


### 21.2 FIX — migration 004 was partially present in production
- [x] GitHub Actions повторный запуск дошёл до `20261006000400_rp_messages_security.sql`, но остановился на `policy "rp_messages_select_current_presence" already exists` (SQLSTATE 42710).
- [x] Установлена причина: схема 004 уже частично/полностью присутствует в production, но её версия отсутствует в remote migration history, поэтому `db push` пытается выполнить файл повторно.
- [x] Migration 004 сделана безопасно повторяемой: перед созданием обеих новых policies теперь выполняется `drop policy if exists`.
- [x] Исправлен фактический PostgreSQL dollar-quote delimiter в репозитории: `as $$ ... $$;`.
- [x] Не выполняем migration repair вслепую: сначала даём самой migration корректно завершиться и записаться в историю.
- [ ] Повторно запустить `Deploy Supabase migrations` вручную.
- [ ] Подтвердить успешное применение 004 и 005.
- [ ] После успешного CI проверить migration list и затем отключить Supabase Integration → Deploy to production, чтобы оставить один production deployer.

Commit:
- e72ff5e40243e0a72676d587f81ed88a9c5eb54c — Make RP messages migration safely rerunnable

### Текущая точка остановки
Workflow снова можно пнуть вручную. Ожидаемый результат: 004 должен пройти даже при уже существующих policies, затем 005 должен примениться; после этого `supabase migration list --linked` должен показать актуальную remote history.
