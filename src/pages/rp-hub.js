/* LORGUS RP hub */
function renderLorgusRpHub() {
    const container = document.getElementById("cabinet-content");
    if (!container || !window.activeCharacter) return;
    const p = window.activeRpPresence;
    const place = p?.type === "location" ? p.location : p?.type === "road" ? "В пути" : "Свободное состояние";
    container.className = "lorgus-subpage-container";
    container.innerHTML = `
        <button type="button" class="lorgus-subpage-back-arrow right" onclick="window.lorgusSubpageTransition('left', window.renderLorgusWorldMapCurrent)" aria-label="Вернуться на карту">
            <span>▶</span><b>КАРТА</b>
        </button>
        <div class="lorgus-subpage-utility">
    <span class="lorgus-subpage-username">${window.escapeHtml(window.lorgusCurrentUsername || "Игрок")}</span>
    <button type="button" class="lorgus-subpage-notifications" onclick="window.openLorgusNotifications?.()" aria-label="Уведомления" title="Уведомления">♢<b class="lorgus-notification-badge"></b></button>
    <button type="button" class="lorgus-subpage-logout" onclick="window.logout?.()">ВЫЙТИ</button>
</div>
        <main class="lorgus-subpage-shell lorgus-rp-page">
            <header class="lorgus-subpage-heading">
                <span class="lorgus-command-kicker">РОЛЕВАЯ</span>
                <h1>Текущая сцена</h1>
                <p>${escapeHtml(place)}</p>
            </header>

            <section class="lorgus-rp-grid">
                <article class="lorgus-rp-focus"><span>МЕСТО</span><strong>${escapeHtml(place)}</strong><p>Физическое положение персонажа в мире.</p><button type="button" onclick="renderLorgusWorldMapCurrent()">Открыть карту</button></article>
                <article><span>УЧАСТНИКИ</span><strong>Люди рядом</strong><p>Персонажи, находящиеся в доступной сцене.</p><button type="button" onclick="renderWorldCharacterTracker()">Отследить</button></article>
                <article><span>ПУТЬ</span><strong>Дороги и переходы</strong><p>Путешествие развивается через ролевые действия.</p><button type="button" onclick="renderLorgusWorldMapCurrent()">Выбрать путь</button></article>
            </section>
        </main>
    `;
}
