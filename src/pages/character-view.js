/* LORGUS character view */
async function loadCharacter(
    container,
    characterId
) {
    const {
        data: character,
        error
    } = await window.supabaseClient
        .from("characters")
        .select("*")
        .eq("id", characterId)
        .single();

    if (error) {
        console.error(error);

        showCharacterError(
            container,
            error.message
        );

        return;
    }

    renderCharacter(
        container,
        character
    );
}

/* =========================================================
   ОТОБРАЖЕНИЕ ПЕРСОНАЖА — LEGACY
   ========================================================= */

function renderCharacterLegacy(
    container,
    character
) {
    container.className = "lorgus-world-page";

    const name = escapeHtml(character.name || "Без имени");
    const race = escapeHtml(character.race || "Раса не указана");
    const homeland = escapeHtml(character.homeland || "Родина не указана");

    container.innerHTML = `
        <div class="lorgus-world-shell">
            <aside class="lorgus-world-sidebar">
                <div class="lorgus-world-sidebar-symbol lorgus-world-symbol lorgus-world-symbol-character" aria-hidden="true"></div>
                <div class="lorgus-world-sidebar-label">ПЕРСОНАЖ</div>
                <div class="lorgus-world-sidebar-name">${name}</div>
                <div class="lorgus-world-sidebar-meta">${race}</div>
                <div class="lorgus-world-sidebar-meta">${homeland}</div>

                <button class="gold-button lorgus-world-sidebar-button" type="button" onclick="openActiveCharacterProfile()">
                    Профиль
                </button>
                <button class="character-secondary-button lorgus-world-sidebar-button" type="button" onclick="renderWorldCharacterTracker()">
                    Люди мира
                </button>
                <button class="character-secondary-button lorgus-world-sidebar-button" type="button" onclick="renderMail()">
                    Письма
                </button>
                <button class="character-secondary-button lorgus-world-sidebar-button" type="button" onclick="switchCharacter()">
                    Сменить персонажа
                </button>
            </aside>

            <main class="lorgus-world-browser">
                <header class="lorgus-world-header">
                    <span class="lorgus-world-kicker">МИР ЛОРГУСА</span>
                    <h1>Мир</h1>
                    <p>Выбери край, в который хочешь войти. Здесь начинается навигация по миру и его RP-сценам.</p>
                </header>

                <section class="lorgus-world-section">
                    <div class="lorgus-world-section-title">КОРОЛЕВСТВА</div>
                    <div class="lorgus-region-grid">
                        <button class="lorgus-region-card" type="button" onclick="renderKingdomLocations('Атэрон')">
                            <span class="lorgus-region-card-symbol lorgus-region-glyph lorgus-region-glyph-aetheron" aria-hidden="true"></span>
                            <strong>Атэрон</strong>
                            <small>Королевство Нечто</small>
                            <p>Знания, древности, исследования и руины.</p>
                        </button>

                        <button class="lorgus-region-card" type="button" onclick="renderKingdomLocations('Каэлор')">
                            <span class="lorgus-region-card-symbol lorgus-region-glyph lorgus-region-glyph-kaelor" aria-hidden="true"></span>
                            <strong>Каэлор</strong>
                            <small>Королевство Вечного Пламени</small>
                            <p>Горы, кузницы, шахты и древнее мастерство.</p>
                        </button>

                        <button class="lorgus-region-card" type="button" onclick="renderKingdomLocations('Ксандр')">
                            <span class="lorgus-region-card-symbol lorgus-region-glyph lorgus-region-glyph-xandr" aria-hidden="true"></span>
                            <strong>Ксандр</strong>
                            <small>Королевство Воздаяния</small>
                            <p>Торговля, банки, дороги и большие рынки.</p>
                        </button>

                        <button class="lorgus-region-card" type="button" onclick="renderKingdomLocations('Лирэн')">
                            <span class="lorgus-region-card-symbol lorgus-region-glyph lorgus-region-glyph-lyren" aria-hidden="true"></span>
                            <strong>Лирэн</strong>
                            <small>Королевство Плодородия</small>
                            <p>Леса, плодородные земли и древняя природа.</p>
                        </button>

                        <button class="lorgus-region-card" type="button" onclick="renderKingdomLocations('Морвейн')">
                            <span class="lorgus-region-card-symbol lorgus-region-glyph lorgus-region-glyph-morvein" aria-hidden="true"></span>
                            <strong>Морвейн</strong>
                            <small>Королевство Последнего Пути</small>
                            <p>Паломничество, память, туманные долины и Фин.</p>
                        </button>
                    </div>
                </section>

                <section class="lorgus-world-section">
                    <div class="lorgus-world-section-title">НЕЗАВИСИМЫЕ ЗЕМЛИ</div>
                    <div class="lorgus-region-grid lorgus-region-grid-small">
                        <button class="lorgus-region-card" type="button" onclick="renderKingdomLocations('Святые Земли')">
                            <span class="lorgus-region-card-symbol lorgus-region-glyph lorgus-region-glyph-holy" aria-hidden="true"></span>
                            <strong>Святые Земли</strong>
                            <small>Нейтральная территория</small>
                            <p>Место переговоров монархов и глав церквей.</p>
                        </button>

                        <button class="lorgus-region-card" type="button" onclick="renderKingdomLocations('Спорные Земли')">
                            <span class="lorgus-region-card-symbol">◇</span>
                            <strong>Спорные Земли</strong>
                            <small>Вне власти пяти королевств</small>
                            <p>Независимые поселения и земли без единого хозяина.</p>
                        </button>

                        <div class="lorgus-region-card lorgus-region-card-closed">
                            <span class="lorgus-region-card-symbol lorgus-region-glyph lorgus-region-glyph-disputed" aria-hidden="true"></span>
                            <strong>Геена</strong>
                            <small>Континент закрыт для игроков</small>
                            <p>Эта территория пока недоступна для посещения и происхождения персонажей.</p>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    `;
}

const LORGUS_LOCATIONS = {
    "Атэрон": {
        subtitle: "Королевство Нечто",
        description: "Земля знаний, исследований, древних руин и реликвий.",
        locations: [
            ["Примум", "Столица Атэрона", "Центр образования, исследований и древних знаний."]
        ]
    },
    "Каэлор": {
        subtitle: "Королевство Вечного Пламени",
        description: "Горное королевство дварфов, кузниц, шахт и торговых путей.",
        locations: [
            ["Хелион", "Столица Каэлора", "Дворец, кузницы, рынки и учреждения королевства."],
            ["Древнее Пламя", "Священное место", "Священное место Вечного Пламени."]
        ]
    },
    "Ксандр": {
        subtitle: "Королевство Воздаяния",
        description: "Торговое и финансовое сердце континента.",
        locations: [
            ["Арджент", "Столица Ксандра", "Великий рынок, королевский двор и финансовые дома."],
            ["Меридиан", "Город Ксандра", "Один из известных городов королевства."],
            ["Валькрофт", "Город Ксандра", "Город на торговых путях."],
            ["Солмир", "Город Ксандра", "Город торгового королевства."]
        ]
    },
    "Лирэн": {
        subtitle: "Королевство Плодородия",
        description: "Леса, плодородные земли и владения лесных эльфов.",
        locations: [
            ["Аврора", "Столица Лирэна", "Город, построенный внутри огромного древнего дерева."],
            ["Элвэйн", "Город Лирэна", "Один из городов лесного королевства."],
            ["Таллирион", "Город Лирэна", "Город среди лесов и плодородных земель."],
            ["Эстерваль", "Город Лирэна", "Город западного королевства."]
        ]
    },
    "Морвейн": {
        subtitle: "Королевство Последнего Пути",
        description: "Холодная земля паломничества, памяти и Последнего Пути.",
        locations: [
            ["Фин", "Столица Морвейна", "Дворец, храмы, архивы и главные паломнические учреждения."]
        ]
    },
    "Святые Земли": {
        subtitle: "Нейтральная территория",
        description: "Земли, где встречаются представители пяти королевств и церквей.",
        locations: []
    },
    "Спорные Земли": {
        subtitle: "Независимые территории",
        description: "Земли вне власти пяти королевств.",
        locations: []
    }
};

async

window.loadCharacter = loadCharacter;
window.renderCharacterLegacy = renderCharacterLegacy;
