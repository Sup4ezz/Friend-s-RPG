/* LORGUS character dossier — redesigned as an illustrated character sheet */
async function renderLorgusCharacterHub() {
    const renderToken = (window.__lorgusCharacterRenderToken || 0) + 1;
    window.__lorgusCharacterRenderToken = renderToken;
    try {
    // При прямом открытии мобильного маршрута кабинет и персонаж восстанавливаются
    // асинхронно. Не завершаем рендер молча, если роутер вызвал страницу раньше.
    let container = document.getElementById("cabinet-content");
    let c = window.activeCharacter;

    // Немедленно создаём распознаваемую оболочку страницы. На мобильном устройстве
    // восстановление персонажа может задержаться; watchdog роутера не должен принять
    // обычное ожидание за отказ рендера и перекрыть страницу аварийным экраном.
    if (container && !container.querySelector(".lorgus-character-page")) {
        container.className = "lorgus-character-page";
        container.innerHTML = '<div class="lorgus-character-shell"><main style="max-width:560px;margin:10vh auto;padding:28px 22px;color:#e9dfca;background:#15110c;border:1px solid rgba(215,182,109,.35);font:16px/1.6 Georgia,serif"><h2 style="margin-top:0;color:#d7b66d">Открываем досье</h2><p>Восстанавливаем сведения о персонаже…</p></main></div>';
    }

    // Мобильный холодный запуск может вызвать обработчик раньше, чем кабинет
    // завершит восстановление сессии. Ждём дольше аварийного таймера роутера,
    // чтобы не завершиться молча без DOM-элемента страницы.
    if (!container || !c) {
        const deadline = Date.now() + 18000;
        while (Date.now() < deadline && (!container || !c)) {
            await new Promise(resolve => window.setTimeout(resolve, 100));
            container = document.getElementById("cabinet-content");
            c = window.activeCharacter;
        }
    }

    // Если оболочка кабинета так и не создалась, создаём безопасный контейнер
    // в существующей игровой оболочке, чтобы ошибка не превращалась в пустой экран.
    if (!container) {
        const parent = document.querySelector("#root .game-page") || document.getElementById("root") || document.body;
        if (parent) {
            container = document.createElement("div");
            container.id = "cabinet-content";
            parent.appendChild(container);
        }
    }
    if (!container) {
        window.__lorgusEmergencyError = "Не удалось создать #cabinet-content: отсутствуют body и корень приложения.";
        console.error("LORGUS character page: невозможно создать контейнер страницы.");
        return;
    }
    if (!c) {
        container.className = "lorgus-character-page";
        container.innerHTML = '<div class="lorgus-character-shell"><main style="max-width:560px;margin:10vh auto;padding:28px 22px;color:#e9dfca;background:#15110c;border:1px solid rgba(215,182,109,.35);font:16px/1.6 Georgia,serif"><h2 style="margin-top:0;color:#d7b66d">Персонаж ещё загружается</h2><p>Не удалось восстановить данные персонажа для этого раздела.</p><button type="button" onclick="location.reload()" style="min-height:46px;padding:10px 18px;background:#d7b66d;color:#17110a;border:0;font-weight:700">Повторить загрузку</button></main></div>';
        window.__lorgusEmergencyError = "Кабинет создан, но window.activeCharacter не восстановлен за 18 секунд.";
        console.error("LORGUS character page: активный персонаж не восстановлен после ожидания.");
        return;
    }

    const esc = value => {
        try {
            return window.escapeHtml ? window.escapeHtml(value ?? "") : String(value ?? "");
        } catch (error) {
            console.error("LORGUS character page: ошибка экранирования текста:", error);
            return String(value ?? "").replace(/[&<>"']/g, char => ({
                "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
            })[char]);
        }
    };
    const name = esc(c.name || "Без имени");
    const race = esc(c.race || "Раса не указана");
    const homeland = esc(c.homeland || "Родина не указана");
    const occupation = esc(c.occupation || "Не указано");
    const status = String(c.status || "ACTIVE").toUpperCase();
    const statusLabel = status === "ACTIVE" ? "АКТИВЕН" : status;
    let titleMarkup = '<strong class="lorgus-character-no-title">Без титула</strong>';
    try {
        titleMarkup = window.renderTitleBadge?.(window.activeTitle, "lorgus-profile-title") || titleMarkup;
    } catch (error) {
        // A broken title badge must never prevent the entire character page from rendering.
        window.__lorgusEmergencyError = "renderTitleBadge: " + String(error?.stack || error?.message || error);
        console.error("LORGUS character page: не удалось отрисовать титул:", error);
    }
    const story = (label, value, empty) => `
        <article class="lorgus-character-story-card">
            <span class="lorgus-character-card-kicker">${label}</span>
            <p>${value ? esc(value) : '<span class="lorgus-character-muted">' + empty + '</span>'}</p>
        </article>`;

    container.className = "lorgus-character-page";
    container.innerHTML = `
        <div class="lorgus-character-shell">
            <aside class="lorgus-character-sidebar">
                <a class="lorgus-character-brand" href="/main-page" aria-label="LORGUS — на карту">
                    <span class="lorgus-character-brand-mark">✦</span>
                    <span><b>LORGUS</b><small>ЛЕТОПИСЬ ЖИВОГО МИРА</small></span>
                </a>
                <div class="lorgus-character-portrait" aria-label="Портрет персонажа">
                    <div class="lorgus-character-portrait-halo"></div>
                    <div class="lorgus-character-portrait-inner"><span>✦</span></div>
                    <div class="lorgus-character-portrait-caption">ЛИЧНОЕ ДОСЬЕ</div>
                </div>
                <div class="lorgus-character-identity">
                    <span>ТВОЙ ПЕРСОНАЖ</span>
                    <strong>${name}</strong>
                    <small>${race}</small>
                </div>
                <div class="lorgus-character-sidebar-rule"><span>✦</span></div>
                <nav class="lorgus-character-nav" aria-label="Разделы персонажа">
                    <button type="button" class="active" aria-current="page" data-character-local-view="dossier"><span>◈</span><b>Досье</b><i>01</i></button>
                    <button type="button" data-character-local-view="inventory"><span>◇</span><b>Снаряжение</b><i>02</i></button>
                </nav>
                <button type="button" class="lorgus-character-map-button" onclick="window.lorgusSubpageTransition ? window.lorgusSubpageTransition('bottom', () => window.lorgusNavigate ? window.lorgusNavigate('/main-page') : window.lorgusNavigate?.('/main-page')) : window.lorgusNavigate?.('/main-page')">Вернуться на главную</button>
                <button type="button" class="lorgus-character-map-button" data-request-character-deletion style="margin-top:8px;border-color:#8b5145;color:#e0a08a">Удалить персонажа</button>
            </aside>

            <main class="lorgus-character-main">
                <header class="lorgus-character-header">
                    <div class="lorgus-character-heading">
                        <div class="lorgus-character-breadcrumb"><span>ЛОРГУС</span><i>／</i><span>ПЕРСОНАЖ</span></div>
                        <h1>${name}</h1>
                        <p>${race}<i>·</i>${homeland}</p>
                    </div>
                    <div class="lorgus-character-header-actions">
                        <span class="lorgus-character-status"><i></i><span>${statusLabel}</span></span>
                        <button type="button" class="lorgus-character-title-button" onclick="window.openTitlePicker()"><span>✦</span> Выбрать титул</button>
                    </div>
                </header>

                <section class="lorgus-character-hero">
                    <div class="lorgus-character-hero-art" aria-hidden="true"><span class="lorgus-character-hero-sigil">✦</span><span class="lorgus-character-hero-orbit"></span></div>
                    <div class="lorgus-character-hero-copy">
                        <span class="lorgus-character-card-kicker">ЗАПИСЬ В ЛЕТОПИСИ</span>
                        <h2>${name}</h2>
                        <p>${occupation}</p>
                        <div class="lorgus-character-hero-tags"><span>${race}</span><i>·</i><span>${homeland}</span></div>
                    </div>
                    <div class="lorgus-character-hero-title"><small>ТИТУЛ</small><div class="lorgus-character-title-value">${titleMarkup}</div></div>
                </section>

                <section class="lorgus-character-overview" aria-label="Краткая сводка">
                    <article class="lorgus-character-card">
                        <span class="lorgus-character-card-index">I</span><span class="lorgus-character-card-kicker">ПРОИСХОЖДЕНИЕ</span>
                        <strong>${homeland}</strong><small>Земля, с которой начинается твоя история</small>
                    </article>
                    <article class="lorgus-character-card">
                        <span class="lorgus-character-card-index">II</span><span class="lorgus-character-card-kicker">СОСТОЯНИЕ</span>
                        <strong>${statusLabel}</strong><small>Текущее положение персонажа</small>
                    </article>
                    <article class="lorgus-character-card">
                        <span class="lorgus-character-card-index">III</span><span class="lorgus-character-card-kicker">РОД ЗАНЯТИЙ</span>
                        <strong>${occupation}</strong><small>То, чем персонаж известен миру</small>
                    </article>
                </section>

                <section class="lorgus-character-content-grid">
                    <article class="lorgus-character-panel lorgus-character-abilities">
                        <div class="lorgus-character-panel-head"><div><span>МАСТЕРСТВО</span><strong>Способности и умения</strong></div><b>✧</b></div>
                        <p class="lorgus-character-panel-intro">Подтверждённые умения, которыми персонаж действительно владеет.</p>
                        <div class="lorgus-ability-list"><div class="lorgus-ability-empty">Загрузка способностей…</div></div>
                    </article>
                    <article class="lorgus-character-panel lorgus-character-status-panel">
                        <div class="lorgus-character-panel-head"><div><span>ПОЛОЖЕНИЕ</span><strong>Сведения о персонаже</strong></div><b>⌖</b></div>
                        <dl class="lorgus-character-fact-list">
                            <div><dt>Имя</dt><dd>${name}</dd></div>
                            <div><dt>Раса</dt><dd>${race}</dd></div>
                            <div><dt>Родина</dt><dd>${homeland}</dd></div>
                            <div><dt>Занятие</dt><dd>${occupation}</dd></div>
                        </dl>
                    </article>
                    <article class="lorgus-character-panel lorgus-character-wide lorgus-character-biography">
                        <div class="lorgus-character-panel-head"><div><span>ЖИЗНЕННЫЙ ПУТЬ</span><strong>История и характер</strong></div><b>⌁</b></div>
                        <div class="lorgus-character-story-grid">
                            ${story("ХАРАКТЕР", c.personality, "Характер пока не описан.")}
                            ${story("ПРЕДЫСТОРИЯ", c.backstory, "Предыстория пока не записана.")}
                            ${story("ОСОБЫЕ НАВЫКИ", c.special_skills, "Особые навыки не указаны.")}
                        </div>
                    </article>
                    <article class="lorgus-character-panel lorgus-character-wide lorgus-notes-panel">
                        <div class="lorgus-character-panel-head">
                            <div><span>ЛИЧНЫЙ АРХИВ</span><strong>Доска персонажа</strong><p>Заметки, связи и нити личной истории.</p></div>
                            <span class="lorgus-canvas-status" role="status" aria-live="polite">Открываем архив…</span>
                        </div>
                        <div class="lorgus-canvas-toolbar" aria-label="Инструменты доски">
                            <button type="button" data-canvas-add="text">＋ Запись</button><button type="button" data-canvas-add="list">＋ Список</button><button type="button" data-canvas-add="card">＋ Карточка</button>
                            <span class="lorgus-canvas-toolbar-separator"></span><button type="button" data-canvas-connect>↗ Связать</button><span class="lorgus-canvas-toolbar-separator"></span>
                            <button type="button" data-canvas-zoom-out aria-label="Уменьшить масштаб">−</button><span class="lorgus-canvas-zoom" data-canvas-zoom>100%</span><button type="button" data-canvas-zoom-in aria-label="Увеличить масштаб">＋</button><button type="button" data-canvas-fit>Вся доска</button><button type="button" data-canvas-save>Сохранить</button>
                        </div>
                        <div class="lorgus-canvas-viewport" aria-label="Свободная доска персонажа"><div class="lorgus-canvas-world"><svg class="lorgus-canvas-links" aria-label="Связи между блоками"></svg><div class="lorgus-canvas-empty-hint">Здесь можно собрать свою историю.<br>Добавляй записи и соединяй важные события.</div></div></div>
                    </article>
                </section>
            </main>
        </div>
`;

    const portrait = container.querySelector(".lorgus-character-portrait-inner");
    try {
        const photoUrl = await window.getRpCharacterPhoto?.(c.id);
        if (renderToken !== window.__lorgusCharacterRenderToken || !container.isConnected) return;
        if (photoUrl && portrait && container.isConnected) {
            const image = document.createElement("img");
            image.alt = "Портрет " + name;
            image.decoding = "async";
            image.loading = "eager";
            image.referrerPolicy = "no-referrer";
            image.src = photoUrl;
            image.addEventListener("error", async () => {
                // Signed Supabase URLs can expire while a mobile browser suspends the tab.
                // Evict the stale URL and request a fresh one exactly once.
                if (image.dataset.refreshAttempted === "1") {
                    image.remove();
                    portrait.classList.remove("has-photo");
                    return;
                }
                image.dataset.refreshAttempted = "1";
                const cache = window.rpCharacterPhotoCache;
                if (cache) delete cache[String(c.id)];
                try {
                    const refreshedUrl = await window.getRpCharacterPhoto?.(c.id);
                    if (refreshedUrl && image.isConnected && refreshedUrl !== image.src) {
                        image.src = refreshedUrl;
                    } else if (image.isConnected) {
                        image.remove();
                        portrait.classList.remove("has-photo");
                    }
                } catch (refreshError) {
                    console.warn("Не удалось обновить ссылку на портрет:", refreshError);
                    image.remove();
                    portrait.classList.remove("has-photo");
                }
            }, { once: true });
            portrait.replaceChildren(image);
            portrait.classList.add("has-photo");
        }
    } catch (error) {
        console.warn("Не удалось загрузить портрет персонажа:", error);
    }

    const abilities = await window.loadCharacterAbilities?.(c.id) || [];
    if (renderToken !== window.__lorgusCharacterRenderToken || !container.isConnected) return;
    const list = container.querySelector(".lorgus-ability-list");
    if (list) list.innerHTML = window.renderAbilityList?.(abilities) || '<div class="lorgus-ability-empty">Подтверждённых способностей пока нет.</div>';
    // The personal canvas is optional; its failure must never blank the whole dossier.
    try {
        await window.renderLorgusCharacterCanvas?.(c.id, container);
    } catch (canvasError) {
        console.error("LORGUS character canvas failed independently:", canvasError);
        const canvasStatus = container.querySelector(".lorgus-canvas-status");
        if (canvasStatus) {
            canvasStatus.textContent = "Доска временно недоступна";
            canvasStatus.dataset.kind = "error";
        }
    }

    } catch (error) {
        console.error("LORGUS character page render failed:", error);
        const host = document.getElementById("cabinet-content");
        if (host) {
            const details = String(error?.stack || error?.message || error || "Неизвестная ошибка");
            host.className = "lorgus-character-page";
            host.innerHTML = '<section style="max-width:700px;margin:5vh auto;padding:24px;color:#eee3ce;background:#15110c;border:1px solid #7b3c32;font:15px/1.6 Georgia,serif;overflow-wrap:anywhere"><h2 style="color:#e0a08a;margin-top:0">Не удалось открыть персонажа</h2><p>Возникла ошибка при создании страницы. Текст ошибки сохранён для диагностики.</p><pre style="white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.5 monospace;color:#d8c7b4">' + String(details).replace(/[&<>]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[ch]) + '</pre><button type="button" onclick="location.reload()" style="min-height:44px;padding:10px 18px;background:#d7b66d;color:#17110a;border:0;font-weight:700">Повторить загрузку</button></section>';
        }
        window.__lorgusEmergencyError = String(error?.stack || error?.message || error);
    }
}


// Внутренние разделы карточки персонажа открываются без смены URL и без редиректа роутера.
if (!window.__lorgusCharacterLocalViewsBound) {
    window.__lorgusCharacterLocalViewsBound = true;
    document.addEventListener("click", event => {
        const button = event.target.closest?.("[data-character-local-view]");
        if (!button) return;
        event.preventDefault();
        event.stopPropagation();
        const view = button.getAttribute("data-character-local-view");
        const root = document.getElementById("cabinet-content");
        const main = root?.querySelector(".lorgus-character-main");
        if (!root || !main) return;
        let dossier = main.querySelector(":scope > .lorgus-character-dossier-view");
        if (!dossier) {
            dossier = document.createElement("div");
            dossier.className = "lorgus-character-dossier-view";
            while (main.firstChild) dossier.appendChild(main.firstChild);
            main.appendChild(dossier);
        }
        root.querySelectorAll("[data-character-local-view]").forEach(item => {
            const active = item.getAttribute("data-character-local-view") === view;
            item.classList.toggle("active", active);
            if (active) item.setAttribute("aria-current", "page");
            else item.removeAttribute("aria-current");
        });
        if (view === "dossier") {
            main.querySelector(".lorgus-inventory-inline-view")?.remove();
            dossier.hidden = false;
        } else if (view === "inventory") {
            dossier.hidden = true;
            window.renderLorgusInventory?.();
        }
    }, true);
}


// Player-facing character deletion is a request, never an immediate delete.
if (!window.__lorgusCharacterDeletionBound) {
    window.__lorgusCharacterDeletionBound = true;
    document.addEventListener("click", async event => {
        const trigger = event.target.closest?.("[data-request-character-deletion]");
        if (!trigger) return;
        event.preventDefault();
        event.stopPropagation();
        const character = window.activeCharacter;
        if (!character?.id || !window.supabaseClient) {
            alert("Не удалось определить активного персонажа. Перезагрузи страницу и попробуй снова.");
            return;
        }
        const expected = "Я согласен и удаляю " + character.name;
        const overlay = document.createElement("div");
        overlay.style.cssText = "position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(5,4,3,.88);backdrop-filter:blur(8px)";
        const panel = document.createElement("section");
        panel.style.cssText = "width:min(560px,100%);max-height:90dvh;overflow:auto;padding:24px;border:1px solid #7d5540;border-radius:14px;background:linear-gradient(145deg,#211911,#100d09);color:#eadfc8;font:16px/1.55 Georgia,serif;box-shadow:0 24px 90px #000";
        panel.innerHTML = '<div style="font-size:11px;letter-spacing:.18em;color:#c7a66a">ЛОРГУС · ЛИЧНОЕ ДОСЬЕ</div><h2 style="margin:8px 0;color:#e0a08a;font-size:25px">Удаление персонажа</h2><p>Это <b>запрос администрации</b>, а не мгновенное удаление. До решения администратора персонаж остаётся в мире. При одобрении он будет архивирован, а история сохранится.</p><p>Чтобы подтвердить намерение, перепиши фразу <b>точно, без кавычек и точки</b>:</p><div data-exact-phrase style="padding:12px;margin:12px 0;border:1px solid #59472c;border-radius:8px;background:#100d09;color:#e7c981;overflow-wrap:anywhere"></div><label style="display:block;margin:12px 0 6px;color:#b9a88b;font-size:13px" for="lorgus-delete-confirm">Подтверждение</label><textarea id="lorgus-delete-confirm" rows="3" autocomplete="off" spellcheck="false" style="width:100%;box-sizing:border-box;resize:vertical;padding:12px;border:1px solid #655235;border-radius:8px;background:#100d09;color:#eadfc8;font:16px/1.5 Georgia,serif"></textarea><p data-delete-status role="status" style="min-height:24px;color:#c7a66a;font-size:13px"></p><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end"><button type="button" data-delete-cancel style="padding:10px 14px;border:1px solid #59472c;border-radius:8px;background:#272016;color:#eadfc8">Отмена</button><button type="button" data-delete-submit disabled style="padding:10px 14px;border:1px solid #8b5145;border-radius:8px;background:#48211c;color:#ffe5d9;font-weight:700;opacity:.5">Отправить запрос</button></div>';
        panel.querySelector("[data-exact-phrase]").textContent = expected;
        overlay.appendChild(panel);
        document.body.appendChild(overlay);
        const input = panel.querySelector("#lorgus-delete-confirm");
        const submit = panel.querySelector("[data-delete-submit]");
        const status = panel.querySelector("[data-delete-status]");
        const close = () => overlay.remove();
        panel.querySelector("[data-delete-cancel]").addEventListener("click", close);
        overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
        input.addEventListener("input", () => {
            const valid = input.value === expected;
            submit.disabled = !valid;
            submit.style.opacity = valid ? "1" : ".5";
            status.textContent = input.value && !valid ? "Фраза должна полностью совпадать, включая имя персонажа." : "";
        });
        submit.addEventListener("click", async () => {
            if (input.value !== expected || submit.disabled) return;
            submit.disabled = true;
            submit.textContent = "Отправляем…";
            status.textContent = "Создаём запрос для администрации…";
            const { error } = await window.supabaseClient.rpc("request_character_deletion", {
                p_character_id: character.id,
                p_confirmation_text: input.value
            });
            if (error) {
                submit.disabled = false;
                submit.textContent = "Отправить запрос";
                status.textContent = error.message === "DELETION_REQUEST_ALREADY_PENDING"
                    ? "Запрос на удаление этого персонажа уже ожидает решения."
                    : error.message === "CONFIRMATION_TEXT_MISMATCH"
                        ? "Текст подтверждения не совпадает."
                        : "Не удалось отправить запрос: " + error.message;
                return;
            }
            panel.innerHTML = '<div style="font-size:11px;letter-spacing:.18em;color:#c7a66a">ЛОРГУС · КАНЦЕЛЯРИЯ</div><h2 style="color:#c4dda4">Запрос отправлен</h2><p>Запрос на архивирование персонажа передан администрации.</p><p>Персонаж пока не удалён и остаётся доступен до решения администратора.</p><div style="display:flex;justify-content:flex-end"><button type="button" data-delete-close style="padding:10px 14px;border:1px solid #94743c;border-radius:8px;background:#d9bb76;color:#171108;font-weight:700">Понятно</button></div>';
            panel.querySelector("[data-delete-close]").addEventListener("click", close);
        });
        input.focus();
    }, true);
}
