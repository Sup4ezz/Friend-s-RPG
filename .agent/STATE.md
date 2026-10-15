# LORGUS — состояние проекта

## Главный источник памяти
`LORGUS_CHECKLIST.md` — основной мастер-файл проекта. Он должен быть полностью обновлён после каждой работы.

## Техническая память
- `.agent/STATE.md` — общие правила состояния.
- `.agent/TASKS.md` — очередь задач.
- `.agent/DECISIONS.md` — архитектурные решения.
- `.agent/CURRENT.md` — текущая точка остановки.
- `AGENTS.md` — обязательный контракт работы с репозиторием.

## Правила
1. Новый чат должен начинать с `LORGUS_CHECKLIST.md`.
2. Перед кодированием изучать актуальную реализацию.
3. Не ломать канон.
4. После каждой работы обновлять мастер-чеклист.
5. Фиксировать сделанное, проверки, найденные проблемы и следующую задачу.
6. Не коммитить секреты.
7. Не удалять production-данные и не ослаблять RLS без необходимости и проверки.

## Текущий фокус
P0-аудит серверной целостности RP presence и всех путей доступа к RP.

## Последняя итерация пантеона — 2026-10-09
- В production замаскированы семь RP-карточек пантеона: публичные имена и профили заменены на мирские.
- photo_path, ID персонажей и сообщения сохранены; активные титулы очищены.
- Миграция: supabase/migrations/20261009160000_mask_god_nrp_character_cards.sql.
- Требуется браузерная проверка карточек под обычным игроком; детали в LORGUS_CHECKLIST.md и .agent/CURRENT.md.


## Публичный справочник мира — 2026-10-09
- Добавлен каталог Obsidian Vault/Obsidian Vault/Публичный Лор/ с семью тематическими разделами.
- Игрокам доступен маршрут /codex; ссылки добавлены в обзор и карту мира.
- Страница загружает публичные Markdown-файлы с GitHub и рендерит их через DOM-узлы.
- В справочнике описаны боевой RP, школы меча, магия, церкви, армии, графства и известные NPC.
- Следующий шаг — браузерная проверка всех разделов и затем возвращение к P0-аудиту rp_presence.


## Навигация Лорбука — 2026-10-09
- Главный пункт меню карты «Инвентарь» заменён на «ЛОРБУК» и открывает публичный справочник.
- Пункт общей навигации приложения также ведёт на `/codex`; инвентарь остаётся доступен через «Персонаж» → «Снаряжение».
- Добавлен fallback-маршрут `/codex`; дубликат маршрута в реестре удалён.
- Браузерная проверка навигации ещё не выполнена.


## Оптимизация и мобильная версия — 2026-10-09
- Выполнен первый безопасный проход: Three.js загружается динамически только при создании WebGL-сцены; WebGL снижает нагрузку на малом/слабом устройстве и останавливает цикл в скрытой вкладке.
- Список выбора персонажа запрашивает записи и подписанные URL портретов параллельно.
- Добавлен src/core/mobile-performance.css для упрощённых мобильных раскладок и уменьшения дорогих визуальных эффектов.
- Браузерная проверка не выполнялась. Не считать всю оптимизацию завершённой: далее нужны регрессия экранов, разделение глобальных ресурсов и оптимизация тяжёлых изображений.


## UI iteration — mail and character dossier (2026-10-14)
- Mail UI exposes the two server-supported methods: pigeon = 5 minutes, courier = 20 minutes. The client no longer submits `sent_at` / `deliver_at`; the existing database trigger remains authoritative. Sent folder opens after a successful send. Countdown and route progress are presentation-only and derived from server timestamps.
- Character dossier now uses an editorial dark-fantasy hierarchy and existing profile fields. New CSS files are loaded by `index.html`.
- JavaScript syntax validation passed for `src/pages/mail-page.js` and `src/pages/character-hub.js`. No browser or production smoke test yet.
- Missing data model discovered: no `familiars` / `slaves` columns or corresponding relation table in current Supabase schema. Keep this as an explicit blocker; do not show fabricated data.


## Оптимизация SPA-навигации — 2026-10-14
- В `src/core/global-utility.js` MutationObserver теперь объединяет повторные проверки в один кадр и игнорирует изменения внутри служебных элементов.
- Commit `5cd666722a31bf08c4b32c900f8c67ab534ba7f8`; GitHub Actions deploy завершился успешно.
- Browser QA переходов ещё не выполнен; не считать устранение зависаний подтверждённым до проверки карты, персонажа, писем, RP и Лорбука.

## Предпусковой аудит — 2026-10-15
- Исправлена нормализация имён в Лорбуке; обновлён cache-bust codex-constellation.js?v=11.
- Добавлена инструкция docs/LAUNCH_SMOKE_TEST.md с ожидаемыми результатами и пошаговыми сценариями.
- Последний подтверждённый deployment до этих изменений — commit f482b41; после 251a9d9/b6a559e необходимо проверить новые Actions.
- Ручная браузерная проверка остаётся обязательной: интерактивного browser tool здесь нет. Не утверждать, что launch QA завершён.
- Следующий шаг: проверить свежие workflow runs, затем провести production smoke-test с обычным тестовым аккаунтом и отдельно админом.
