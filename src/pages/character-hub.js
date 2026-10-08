/* LORGUS character dossier */
async function renderLorgusCharacterHub() {
    const container = document.getElementById("cabinet-content");
    const c = window.activeCharacter;
    if (!container || !c) return;
    const esc = window.escapeHtml;
    const name = esc(c.name || "Без имени");
    const race = esc(c.race || "Раса не указана");
    const homeland = esc(c.homeland || "Родина не указана");
    const status = String(c.status || "ACTIVE").toUpperCase();
    const statusLabel = status === "ACTIVE" ? "АКТИВЕН" : status;
    container.className = "lorgus-character-page";
    container.innerHTML = `
        <div class="lorgus-character-shell">
            <aside class="lorgus-character-sidebar">
                <div class="lorgus-character-brand"><span>LORGUS</span><small>ДОСЬЕ ПЕРСОНАЖА</small></div>
                <div class="lorgus-character-portrait" aria-hidden="true"><div class="lorgus-character-portrait-ring"></div><div class="lorgus-character-portrait-mark">✦</div></div>
                <div class="lorgus-character-identity"><span>ПЕРСОНАЖ</span><strong>__NAME__</strong><small>__RACE__</small></div>
                <nav class="lorgus-character-nav" aria-label="Разделы персонажа">
                    <button type="button" class="active"><span>◈</span> Досье</button>
                    <button type="button" onclick="window.renderLorgusInventory?.()"><span>◇</span> Снаряжение</button>
                    <button type="button" onclick="window.renderMail?.()"><span>✉</span> Письма</button>
                    <button type="button" onclick="window.renderLorgusRpHub?.()"><span>◆</span> Ролевая</button>
                </nav>
                <button type="button" class="lorgus-character-back" onclick="window.lorgusSubpageTransition('bottom', window.renderLorgusWorldMapCurrent)" aria-label="Вернуться на карту">
                    <span>↓</span><div><b>ВЕРНУТЬСЯ НА КАРТУ</b><small>Продолжить путь</small></div>
                </button>
            </aside>
            <main class="lorgus-character-main">
                <header class="lorgus-character-header">
                    <div><span class="lorgus-command-kicker">ЛИЧНОЕ ДОСЬЕ</span><h1>__NAME__</h1><p>__RACE__ <i>·</i> __HOMELAND__</p></div>
                    <div class="lorgus-character-header-actions"><span class="lorgus-character-status"><i></i>__STATUS__</span><button type="button" class="lorgus-character-title-button" onclick="window.openTitlePicker()">ВЫБРАТЬ ТИТУЛ</button></div>
                </header>
                <section class="lorgus-character-overview">
                    <article class="lorgus-character-card"><span class="lorgus-character-card-kicker">ПРОИСХОЖДЕНИЕ</span><strong>__HOMELAND__</strong><small>Место, с которым связан персонаж</small></article>
                    <article class="lorgus-character-card"><span class="lorgus-character-card-kicker">СОСТОЯНИЕ</span><strong>__STATUS__</strong><small>Текущий статус персонажа</small></article>
                    <article class="lorgus-character-card lorgus-character-title-card"><span class="lorgus-character-card-kicker">ТИТУЛ</span><div class="lorgus-character-title-value">__TITLE__</div><small>Принадлежность и признание</small></article>
                </section>
                <section class="lorgus-character-content-grid">
                    <article class="lorgus-character-panel lorgus-character-abilities">
                        <div class="lorgus-character-panel-head"><div><span>СПОСОБНОСТИ</span><strong>Подтверждённые способности</strong></div><b>✦</b></div>
                        <div class="lorgus-ability-list"><div class="lorgus-ability-empty">Загрузка...</div></div>
                    </article>
                    <article class="lorgus-character-panel">
                        <div class="lorgus-character-panel-head"><div><span>ОТНОШЕНИЯ</span><strong>Связи персонажа</strong></div><b>∞</b></div>
                        <p class="lorgus-character-placeholder">Доверие, дружба, вражда, семья, долги и обещания.</p>
                    </article>
                    <article class="lorgus-character-panel lorgus-character-wide">
                        <div class="lorgus-character-panel-head"><div><span>ИСТОРИЯ</span><strong>Личная хроника</strong></div><b>⌁</b></div>
                        <p class="lorgus-character-placeholder">События жизни и последствия решений персонажа появятся здесь.</p>
                    </article>
                </section>
            </main>
        </div>`.replaceAll("__NAME__", name).replaceAll("__RACE__", race).replaceAll("__HOMELAND__", homeland).replaceAll("__STATUS__", statusLabel).replace("__TITLE__", window.renderTitleBadge(window.activeTitle, "lorgus-profile-title") || "<strong>Без титула</strong>");
    const abilities = await window.loadCharacterAbilities(c.id);
    const list = container.querySelector(".lorgus-ability-list");
    if (list) list.innerHTML = window.renderAbilityList(abilities);
}
