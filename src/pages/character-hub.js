/* LORGUS character dossier — redesigned as an illustrated character sheet */
async function renderLorgusCharacterHub() {
    // При прямом открытии мобильного маршрута кабинет и персонаж восстанавливаются
    // асинхронно. Не завершаем рендер молча, если роутер вызвал страницу раньше.
    let container = document.getElementById("cabinet-content");
    let c = window.activeCharacter;
    if (!container || !c) {
        const deadline = Date.now() + 7000;
        while (Date.now() < deadline && (!container || !c)) {
            await new Promise(resolve => window.setTimeout(resolve, 100));
            container = document.getElementById("cabinet-content");
            c = window.activeCharacter;
        }
    }
    if (!container) {
        console.error("LORGUS character page: #cabinet-content не появился после ожидания.");
        return;
    }
    if (!c) {
        container.className = "lorgus-character-page";
        container.innerHTML = '<section style="max-width:560px;margin:10vh auto;padding:28px 22px;color:#e9dfca;background:#15110c;border:1px solid rgba(215,182,109,.35);font:16px/1.6 Georgia,serif"><h2 style="margin-top:0;color:#d7b66d">Персонаж ещё загружается</h2><p>Не удалось восстановить данные персонажа для этого раздела.</p><button type="button" onclick="location.reload()" style="min-height:46px;padding:10px 18px;background:#d7b66d;color:#17110a;border:0;font-weight:700">Повторить загрузку</button></section>';
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
                <button type="button" class="lorgus-character-map-button" onclick="window.lorgusSubpageTransition ? window.lorgusSubpageTransition('bottom', () => window.lorgusNavigate ? window.lorgusNavigate('/map') : window.renderLorgusWorldMapCurrent?.()) : (window.lorgusNavigate ? window.lorgusNavigate('/map') : window.renderLorgusWorldMapCurrent?.())">Вернуться на карту</button>
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
        if (photoUrl && portrait && container.isConnected) {
            portrait.innerHTML = '<img src="' + esc(photoUrl) + '" alt="Портрет ' + name + '">';
            portrait.classList.add("has-photo");
        }
    } catch (error) {
        console.warn("Не удалось загрузить портрет персонажа:", error);
    }

    const abilities = await window.loadCharacterAbilities?.(c.id) || [];
    const list = container.querySelector(".lorgus-ability-list");
    if (list) list.innerHTML = window.renderAbilityList?.(abilities) || '<div class="lorgus-ability-empty">Подтверждённых способностей пока нет.</div>';
    await window.renderLorgusCharacterCanvas?.(c.id);
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
