/* LORGUS RP hub */
// Единая точка возврата из ролевой: URL и экран карты всегда должны совпадать.
window.lorgusReturnToMapFromRp = function() {
    // Снимаем зависший флаг старого перехода: он мог блокировать повторный клик.
    window.lorgusMainMenuNavigating = false;
    delete document.documentElement.dataset.lorgusTransition;

    const openMap = () => {
        // Маршрут меняется только через SPA-роутер, который сам синхронизирует URL.
        const opened = typeof window.lorgusNavigate === "function"
            ? window.lorgusNavigate("/map")
            : false;

        // Резервный путь на случай, если роутер ещё не загрузился.
        if (!opened) {
            window.history.replaceState({ lorgusRoute: "/map" }, "", "/map");
            if (typeof window.renderLorgusWorldMapCurrent === "function") {
                window.renderLorgusWorldMapCurrent();
            }
        }
        return opened;
    };

    if (typeof window.lorgusSubpageTransition === "function") {
        return window.lorgusSubpageTransition("right", openMap);
    }
    return openMap();
};
function renderLorgusRpHub() {
    const container = document.getElementById("cabinet-content");
    if (!container || !window.activeCharacter) return;

    const p = window.activeRpPresence;
    const isLocation = p?.type === "location";
    const isRoad = p?.type === "road";
    const place = isLocation ? p.location : isRoad ? "В пути" : "Место не выбрано";
    const region = isLocation ? (p.region || "Неизвестный регион") : isRoad ? ((p.fromRegion || "?") + " → " + (p.toRegion || "?")) : "Мир ещё не определил твоё положение";
    const characterName = window.activeCharacter.name || "Персонаж";
    const sceneArt = isLocation ? window.getLorgusRpLocationArt?.(p.location) : null;

    const enterAction = isLocation
        ? "window.enterLocationRp(" + JSON.stringify(p.location) + "," + JSON.stringify(p.region) + ")"
        : isRoad
            ? "window.renderRoadChat(window.activeRpPresence)"
            : "window.renderLorgusRpPlacePicker()";

    const stateLabel = isLocation ? "СЦЕНА ДОСТУПНА" : isRoad ? "ПЕРСОНАЖ В ПУТИ" : "СЦЕНА НЕ НАЧАТА";
    const stateClass = isLocation ? "live" : isRoad ? "road" : "empty";
    const actionLabel = isLocation ? "ВОЙТИ В СЦЕНУ" : isRoad ? "ОТКРЫТЬ ПУТЬ" : "ВЫБРАТЬ МЕСТО";

    container.className = "lorgus-subpage-container lorgus-rp-page-container";
    container.innerHTML = `
        <div class="lorgus-rp-atmosphere" aria-hidden="true">
            <i></i><i></i><i></i><i></i>
        </div>

        <button type="button" class="lorgus-subpage-back-arrow right" onclick="window.history.pushState({lorgusRoute:'/map'}, '', '/map'); if (typeof window.lorgusNavigate === 'function') { window.lorgusNavigate('/map', {replace:true}); } else if (typeof window.renderLorgusWorldMapCurrent === 'function') { window.renderLorgusWorldMapCurrent(); }" aria-label="Вернуться на карту">
            <span>▶</span><b>КАРТА</b>
        </button>

        <div class="lorgus-subpage-utility">
            <span class="lorgus-subpage-username">${window.escapeHtml(window.lorgusCurrentUsername || "Игрок")}</span>
            <button type="button" class="lorgus-subpage-notifications" onclick="window.openLorgusNotifications?.()" aria-label="Уведомления" title="Уведомления">♢<b class="lorgus-notification-badge"></b></button>
            <button type="button" class="lorgus-subpage-logout" onclick="window.logout?.()">ВЫЙТИ</button>
        </div>

        <main class="lorgus-subpage-shell lorgus-rp-page">
            <header class="lorgus-rp-hero">
                <div class="lorgus-rp-eyebrow"><span>ЛОРГУС</span><em>·</em><span>РОЛЕВАЯ</span></div>
                <h1>Живой мир</h1>
                <p>Твоя история продолжается здесь.</p>
            </header>

            <section class="lorgus-rp-command-grid">
                <article class="lorgus-rp-scene ${stateClass}">
                    <div class="lorgus-rp-scene-top">
                        <span class="lorgus-rp-state"><i></i>${stateLabel}</span>
                        <span class="lorgus-rp-scene-index">01</span>
                    </div>
${sceneArt ? `<div class="lorgus-rp-scene-art" style="background-image:url('${sceneArt}')" aria-hidden="true"></div>` : ""}
                    <div class="lorgus-rp-scene-center">
                        <span class="lorgus-rp-label">ТЕКУЩАЯ СЦЕНА</span>
                        <h2>${window.escapeHtml(place)}</h2>
                        <p>${window.escapeHtml(region)}</p>
                        <div class="lorgus-rp-rule"></div>
                        <strong>${window.escapeHtml(characterName)}</strong>
                    </div>
                    <button type="button" class="lorgus-rp-enter" onclick='${enterAction}'>
                        <span>${actionLabel}</span><b>→</b>
                    </button>
                </article>

                <aside class="lorgus-rp-side">
                    <button type="button" class="lorgus-rp-side-card" onclick="window.renderWorldCharacterTracker?.()">
                        <span class="lorgus-rp-side-number">02</span>
                        <div><small>МИР</small><strong>Люди рядом</strong><p>Посмотреть персонажей, чьё местоположение открыто.</p></div>
                        <b>→</b>
                    </button>
                    <button type="button" class="lorgus-rp-side-card" onclick="return window.openLorgusWorldRoads?.(event)">
                        <span class="lorgus-rp-side-number">03</span>
                        <div><small>ПУТЬ</small><strong>Дороги мира</strong><p>Выбрать новое направление и отправиться в путешествие.</p></div>
                        <b>→</b>
                    </button>

                    <button type="button" class="lorgus-rp-side-card lorgus-rp-flood-card" onclick="window.renderFloodChat?.()">
                        <span class="lorgus-rp-side-number">04</span>
                        <div><small>ВНЕ РОЛИ</small><strong>Флуд</strong><p>Общаться с игроками вне ролевых сцен. Сообщения не влияют на путь персонажа.</p></div>
                        <b>→</b>
                    </button>
                </aside>
            </section>

            <footer class="lorgus-rp-footer">
                <span>АКТИВНЫЙ ПЕРСОНАЖ</span>
                <strong>${window.escapeHtml(characterName)}</strong>
                <i></i>
                <span>${isLocation ? "Мир зафиксировал твоё присутствие." : isRoad ? "Дорога уже начата. Путь продолжается." : "Первое сообщение в сцене определит твоё местоположение."}</span>
            </footer>
        </main>
    `;
}
// First-time RP entry: choose a region directly instead of returning to the mobile home screen.
function renderLorgusRpPlacePicker() {
    const container = document.getElementById("cabinet-content");
    if (!container || !window.activeCharacter) return;

    const regions = Object.entries(window.LORGUS_LOCATIONS || LORGUS_LOCATIONS || {});
    container.className = "lorgus-world-page lorgus-region-arrival lorgus-rp-place-picker";
    container.innerHTML = `
        <div class="lorgus-world-shell">
            <aside class="lorgus-world-sidebar">
                <div class="lorgus-world-sidebar-symbol">✦</div>
                <div class="lorgus-world-sidebar-label">РОЛЕВАЯ · ПЕРВЫЙ ШАГ</div>
                <div class="lorgus-world-sidebar-name">${window.escapeHtml(window.activeCharacter.name || "Персонаж")}</div>
                <p class="lorgus-world-sidebar-meta">Выбери край, в котором начнётся путь персонажа.</p>
                <button class="character-secondary-button lorgus-world-sidebar-button" type="button" onclick="window.renderLorgusRpHub?.()">
                    ← Вернуться в ролевую
                </button>
            </aside>
            <main class="lorgus-world-browser">
                <header class="lorgus-world-header">
                    <span class="lorgus-world-kicker">НАЧАЛО ПУТИ</span>
                    <h1>Выбрать место</h1>
                    <p>Сначала выбери край мира, затем конкретную локацию. Главное меню открывать не нужно.</p>
                </header>
                <section class="lorgus-world-section">
                    <div class="lorgus-world-section-title">КРАЯ МИРА</div>
                    <div class="lorgus-location-grid">
                        ${regions.map(([regionName, region]) => `
                            <button class="lorgus-location-card" type="button" onclick='window.renderKingdomLocations(${JSON.stringify(regionName)})'>
                                <span class="lorgus-location-card-mark" aria-hidden="true"><span class="lorgus-location-card-glyph"></span></span>
                                <strong>${window.escapeHtml(regionName)}</strong>
                                <small>${window.escapeHtml(region.subtitle || "Край мира")}</small>
                                <p>${window.escapeHtml(region.description || "Выбрать локацию в этом крае.")}</p>
                                <span class="lorgus-location-card-access">Выбрать край →</span>
                            </button>
                        `).join("")}
                    </div>
                </section>
            </main>
        </div>
    `;
}
window.renderLorgusRpPlacePicker = renderLorgusRpPlacePicker;

// Explicit global export: world-map.js passes this renderer into the navigation handler.
window.renderLorgusRpHub = renderLorgusRpHub;

