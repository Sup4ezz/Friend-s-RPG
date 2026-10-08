/* LORGUS character dossier */
async function renderLorgusCharacterHub() {
    const container = document.getElementById("cabinet-content");
    const c = window.activeCharacter;
    if (!container || !c) return;
    container.className = "lorgus-subpage-container";
    container.innerHTML = `
        <button type="button" class="lorgus-subpage-back-arrow top" onclick="window.lorgusSubpageTransition('top', window.renderLorgusWorldMapCurrent)" aria-label="Вернуться на карту">
            <span>▼</span><b>КАРТА</b>
        </button>
        <main class="lorgus-subpage-shell lorgus-character-page">
            <header class="lorgus-subpage-heading">
                <span class="lorgus-command-kicker">ПЕРСОНАЖ</span>
                <h1>${window.escapeHtml(c.name || "Без имени")}</h1>
                <p>${window.escapeHtml(c.race || "Раса")} · ${window.escapeHtml(c.homeland || "Родина не указана")}</p>
                ${window.renderTitleBadge(window.activeTitle, "lorgus-profile-title")}
                <button type="button" class="lorgus-subpage-action" onclick="window.openTitlePicker()">Выбрать титул</button>
            </header>

            <section class="lorgus-character-grid">
                <article><span>ПРОИСХОЖДЕНИЕ</span><strong>${window.escapeHtml(c.homeland || "Не указано")}</strong></article>
                <article><span>СОСТОЯНИЕ</span><strong>${window.escapeHtml(String(c.status || "ACTIVE"))}</strong></article>
                <article class="lorgus-character-abilities"><span>СПОСОБНОСТИ</span><strong>Подтверждённые способности</strong><div class="lorgus-ability-list"><div class="lorgus-ability-empty">Загрузка...</div></div></article>
                <article class="lorgus-character-wide"><span>ОТНОШЕНИЯ</span><strong>Связи персонажа</strong><p>Доверие, дружба, вражда, семья, долги и обещания.</p></article>
                <article class="lorgus-character-wide"><span>ИСТОРИЯ</span><strong>Личная хроника</strong><p>События жизни и последствия решений персонажа.</p></article>
            </section>
        </main>
    `;
    const abilities = await window.loadCharacterAbilities(c.id);
    const list = container.querySelector(".lorgus-ability-list");
    if (list) list.innerHTML = window.renderAbilityList(abilities);
}
