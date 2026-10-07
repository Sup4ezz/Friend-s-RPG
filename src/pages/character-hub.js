/* LORGUS character dossier */
async function renderLorgusCharacterHub() {
    const container = document.getElementById("cabinet-content");
    const c = window.activeCharacter;
    if (!container || !c) return;
    container.className = "lorgus-command-page";
    container.innerHTML = `
        ${window.renderLorgusInterfaceNav("character")}
        <main class="lorgus-command-main">
            <section class="lorgus-profile-hero">
                <div class="lorgus-profile-sigil">✦</div>
                <div><span class="lorgus-command-kicker">ЛИЧНОЕ ДОСЬЕ</span><h1>${window.escapeHtml(c.name || "Без имени")}</h1><p>${window.escapeHtml(c.race || "Раса")} · ${window.escapeHtml(c.homeland || "Родина не указана")}</p>${window.renderTitleBadge(window.activeTitle, "lorgus-profile-title")}</div>
                <button type="button" class="lorgus-title-manage-button" onclick="window.openTitlePicker()">Выбрать титул</button>
            </section>
            <section class="lorgus-dossier-grid">
                <article><span>ПРОИСХОЖДЕНИЕ</span><strong>${window.escapeHtml(c.homeland || "Не указано")}</strong><p>Родина определяет происхождение, но не физическое положение персонажа.</p></article>
                <article><span>СОСТОЯНИЕ</span><strong>${window.escapeHtml(String(c.status || "ACTIVE"))}</strong><p>Жизнь персонажа продолжается в мире Лоргуса.</p></article>
                <article class="lorgus-dossier-abilities"><span>СПОСОБНОСТИ</span><strong>Подтверждённые администрацией</strong><div class="lorgus-ability-list"><div class="lorgus-ability-empty">Загрузка...</div></div></article>
                <article class="lorgus-dossier-inventory"><span>СНАРЯЖЕНИЕ</span><strong>Инвентарь</strong><p>Оружие, броня, предметы и вещи, которыми владеет персонаж.</p><button type="button" onclick="window.renderLorgusInventory()">Открыть инвентарь →</button></article>
                <article><span>ОТНОШЕНИЯ</span><strong>Связи</strong><p>Доверие, дружба, вражда, семья, долги и обещания.</p></article>
                <article><span>ИСТОРИЯ</span><strong>Личная хроника</strong><p>События жизни и последствия решений персонажа.</p></article>
            </section>
        </main>
    `;
    const abilities = await window.loadCharacterAbilities(c.id);
    const list = container.querySelector(".lorgus-ability-list");
    if (list) list.innerHTML = window.renderAbilityList(abilities);
}
