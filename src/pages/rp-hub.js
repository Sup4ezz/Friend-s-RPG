/* LORGUS RP hub */
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
            : "window.renderLorgusWorldMapCurrent()";

    const stateLabel = isLocation ? "СЦЕНА ДОСТУПНА" : isRoad ? "ПЕРСОНАЖ В ПУТИ" : "СЦЕНА НЕ НАЧАТА";
    const stateClass = isLocation ? "live" : isRoad ? "road" : "empty";
    const actionLabel = isLocation ? "ВОЙТИ В СЦЕНУ" : isRoad ? "ОТКРЫТЬ ПУТЬ" : "ВЫБРАТЬ МЕСТО";

    container.className = "lorgus-subpage-container lorgus-rp-page-container";
    container.innerHTML = `
        <div class="lorgus-rp-atmosphere" aria-hidden="true">
            <i></i><i></i><i></i><i></i>
        </div>

        <button type="button" class="lorgus-subpage-back-arrow right" onclick="window.lorgusSubpageTransition('right', window.renderLorgusWorldMapCurrent)" aria-label="Вернуться на карту">
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
// Explicit global export: world-map.js passes this renderer into the navigation handler.
window.renderLorgusRpHub = renderLorgusRpHub;

