/* LORGUS RP hub */
function renderLorgusRpHub() {
    const container = document.getElementById("cabinet-content");
    if (!container || !window.activeCharacter) return;
    const p = window.activeRpPresence;
    const place = p?.type === "location" ? p.location : p?.type === "road" ? "В пути" : "Свободное состояние";
    container.className = "lorgus-command-page";
    container.innerHTML = `
        ${renderLorgusInterfaceNav("rp")}
        <main class="lorgus-command-main">
            <section class="lorgus-command-hero"><div><span class="lorgus-command-kicker">РОЛЕВАЯ ЖИЗНЬ</span><h1>Текущая сцена</h1><p>Место действия определяется поступками персонажа, а не открытием страницы.</p></div><div class="lorgus-command-status"><i></i><span>СЦЕНА</span><small>${escapeHtml(place)}</small></div></section>
            <section class="lorgus-rp-grid">
                <article><span>МЕСТО</span><strong>${escapeHtml(place)}</strong><p>Первое сообщение в локации фиксирует физическое положение.</p><button onclick="renderLorgusWorldMapCurrent()">Открыть мир →</button></article>
                <article><span>УЧАСТНИКИ</span><strong>Люди рядом</strong><p>Персонажи, находящиеся в доступной сцене.</p><button onclick="renderWorldCharacterTracker()">Отследить →</button></article>
                <article><span>ПУТЬ</span><strong>Дороги и переходы</strong><p>Путешествие требует отдельной дорожной сцены и последовательности действий.</p><button onclick="renderLorgusWorldMapCurrent()">Выбрать путь →</button></article>
            </section>
        </main>
    `;
}

window.renderLorgusOverview = renderLorgusOverview;
window.renderLorgusWorldMapCurrent = renderLorgusWorldMapCurrent;
window.renderLorgusCharacterHub = renderLorgusCharacterHub;
