/* LORGUS admin applications */
async function loadAdminPanel(container) {
    const {
        data: applications,
        error
    } = await window.supabaseClient
        .from("character_applications")
        .select("*")
        .order("id", {
            ascending: false
        });

    if (error) {
        console.error(
            "Ошибка загрузки заявок:",
            error
        );

        container.className = "welcome-panel";

        container.innerHTML = `
            <div class="welcome-symbol">!</div>
            <h1>Ошибка загрузки</h1>
            <p>${window.escapeHtml(error.message)}</p>
        `;

        return;
    }

    window.renderAdminApplications(
        container,
        applications || []
    );
}

/* =========================================================
   ОТОБРАЖЕНИЕ ЗАЯВОК В АДМИНКЕ
   ========================================================= */

async function renderAdminApplications(container, applications) {
    container.className = "admin-panel";

    window.adminApplications = applications;

    for (const application of applications) {
        if (!application.photo_path) {
            application.photo_url = null;
            continue;
        }

        const { data, error } = await window.supabaseClient.storage
            .from("character-applications")
            .createSignedUrl(application.photo_path, 60 * 60);

        application.photo_url = error ? null : (data?.signedUrl || null);
    }

    const pending = applications.filter(a => a.status === "pending");
    const approved = applications.filter(a => a.status === "approved");
    const rejected = applications.filter(a => a.status === "rejected");

    container.innerHTML = `
        <div class="admin-dashboard-head">
            <div>
                <div class="admin-kicker">✦ ЛОРГУС · ПАНЕЛЬ УПРАВЛЕНИЯ</div>
                <h1>Администрация</h1>
                <p>Заявки, персонажи и модерация мира.</p>
            </div>
            <div class="admin-head-actions">
                <button type="button" class="admin-tool-button" id="admin-refresh-button">↻ Обновить</button>
                <button type="button" class="window.logout-button admin-logout-button" onclick="logout()">Выйти</button>
            </div>
        </div>

        <section class="admin-section admin-lore-tree-section">
            <div class="admin-section-heading">
                <div><h2>Древо мира</h2><p>Навигация по лору: королевские семьи, церковники, боги, церкви, земли и легенды.</p></div>
            </div>
            <div id="admin-lore-tree"></div>
        </section>

        <div class="admin-stats">
            <button class="admin-stat admin-filter-stat active" data-admin-filter="pending">
                <span class="admin-stat-value">${pending.length}</span><span class="admin-stat-label">На рассмотрении</span>
            </button>
            <button class="admin-stat admin-filter-stat" data-admin-filter="approved">
                <span class="admin-stat-value">${approved.length}</span><span class="admin-stat-label">Одобрено</span>
            </button>
            <button class="admin-stat admin-filter-stat" data-admin-filter="rejected">
                <span class="admin-stat-value">${rejected.length}</span><span class="admin-stat-label">Отклонено</span>
            </button>
            <button class="admin-stat admin-filter-stat" data-admin-filter="all">
                <span class="admin-stat-value">${applications.length}</span><span class="admin-stat-label">Все заявки</span>
            </button>
        </div>

        <div class="admin-toolbar">
            <input id="admin-search" type="search" placeholder="Поиск по имени, расе, родине или занятию...">
            <select id="admin-status-filter">
                <option value="pending">На рассмотрении</option>
                <option value="approved">Одобрено</option>
                <option value="rejected">Отклонено</option>
                <option value="all">Все статусы</option>
            </select>
        </div>

        <section class="admin-section">
            <div class="admin-section-heading">
                <div><h2>Заявки персонажей</h2><p id="admin-results-count"></p></div>
            </div>
            <div id="admin-application-list" class="admin-applications"></div>
        </section>

        <section class="admin-section admin-character-management">
            <div class="admin-section-heading admin-character-directory-heading">
                <div><h2>Персонажи мира</h2><p>Каталог одобренных персонажей. Ищи, фильтруй и сортируй записи без прокрутки всего списка.</p></div>
                <span class="admin-directory-total" id="admin-character-total">${approved.length} персонажей</span>
            </div>
            <div class="admin-character-filter-panel">
                <label class="admin-character-search-wrap">
                    <span>ПОИСК ПО КАТАЛОГУ</span>
                    <input id="admin-character-search" type="search" autocomplete="off" placeholder="Имя, описание, раса, регион, оружие…">
                </label>
                <label><span>РАСА</span><select id="admin-character-race"><option value="">Все расы</option></select></label>
                <label><span>РОДИНА</span><select id="admin-character-homeland"><option value="">Все регионы</option></select></label>
                <label><span>ЗАНЯТИЕ</span><select id="admin-character-occupation"><option value="">Все занятия</option></select></label>
                <label><span>ВОЗРАСТ</span><select id="admin-character-age"><option value="">Любой возраст</option><option value="young">До 25 лет</option><option value="adult">26–60 лет</option><option value="senior">Старше 60 лет</option><option value="unknown">Не указан</option></select></label>
                <label><span>ПРОФИЛЬ</span><select id="admin-character-completeness"><option value="">Любое заполнение</option><option value="complete">Есть описание и навыки</option><option value="incomplete">Не хватает данных</option><option value="no-photo">Без портрета</option></select></label>
                <label><span>СОРТИРОВКА</span><select id="admin-character-sort"><option value="newest">Сначала новые</option><option value="name-asc">Имя: А—Я</option><option value="name-desc">Имя: Я—А</option><option value="age-asc">Возраст: по возрастанию</option><option value="age-desc">Возраст: по убыванию</option></select></label>
                <button type="button" id="admin-character-reset" class="admin-character-reset">Сбросить всё <span>↺</span></button>
            </div>
            <div class="admin-character-toolbar">
                <div class="admin-character-results-line"><strong id="admin-character-results-count">Загрузка списка…</strong><span id="admin-character-active-summary">Все персонажи</span></div>
                <div class="admin-character-view-tools">
                    <button type="button" id="admin-character-expand-all" class="admin-character-export">Развернуть все</button>
                    <button type="button" id="admin-character-collapse-all" class="admin-character-export">Свернуть все</button>
                    <button type="button" id="admin-character-export" class="admin-character-export">Экспорт CSV ↗</button>
                </div>
            </div>
            <div id="admin-character-active-filters" class="admin-character-active-filters" aria-live="polite"></div>
            <div id="admin-character-list" class="admin-applications admin-character-grid">
                ${approved.length ? approved.map(window.renderAdminCharacterManagement).join("") : '<div class="admin-empty"><h2>Персонажей пока нет</h2><p>Одобренные персонажи появятся здесь.</p></div>'}
            </div>

        </section>
        <section class="admin-section admin-item-use-management">
            <div class="admin-section-heading">
                <div><h2>Использование предметов</h2><p>Журнал предметов, использованных в RP-постах. Здесь можно отменить некорректное использование вместе с постом.</p></div>
            </div>
            <div id="admin-item-use-log" class="admin-item-use-log"><div class="admin-empty"><h2>Загрузка журнала...</h2></div></div>
        </section>
    `;

    if (typeof window.renderAdminLoreTree === "function") {
        window.renderAdminLoreTree(container.querySelector("#admin-lore-tree"));
    }

    const list = container.querySelector("#admin-application-list");
    const search = container.querySelector("#admin-search");
    const status = container.querySelector("#admin-status-filter");
    const count = container.querySelector("#admin-results-count");

    const renderList = () => {
        const query = search.value.trim().toLowerCase();
        const filter = status.value;
        const filtered = applications.filter(a => {
            const haystack = [
                a.name, a.race, a.homeland, a.occupation,
                a.personality, a.backstory, a.special_skills
            ].filter(Boolean).join(" ").toLowerCase();
            return (filter === "all" || a.status === filter) && (!query || haystack.includes(query));
        });

        count.textContent = `Показано: ${filtered.length} из ${applications.length}`;
        list.innerHTML = filtered.length
            ? filtered.map(renderAdminApplication).join("")
            : '<div class="admin-empty"><h2>Ничего не найдено</h2><p>Измени поиск или фильтр.</p></div>';

        bindAdminButtons(container);
    };

    container.querySelectorAll(".admin-filter-stat").forEach(button => {
        button.addEventListener("click", () => {
            container.querySelectorAll(".admin-filter-stat").forEach(b => b.classList.remove("active"));
            button.classList.add("active");
            status.value = button.dataset.adminFilter;
            renderList();
        });
    });

    search.addEventListener("input", renderList);
    status.addEventListener("change", () => {
        container.querySelectorAll(".admin-filter-stat").forEach(b =>
            b.classList.toggle("active", b.dataset.adminFilter === status.value)
        );
        renderList();
    });

    container.querySelector("#admin-refresh-button").addEventListener("click", async event => {
        const button = event.currentTarget;
        button.disabled = true;
        button.textContent = "↻ Обновление...";
        await loadAdminPanel(container);
    });

    renderList();

    // Каталог персонажей: фильтрация, сортировка, постраничный просмотр и экспорт.
    const characterList = container.querySelector("#admin-character-list");
    const characterSearch = container.querySelector("#admin-character-search");
    const characterRace = container.querySelector("#admin-character-race");
    const characterHomeland = container.querySelector("#admin-character-homeland");
    const characterOccupation = container.querySelector("#admin-character-occupation");
    const characterAge = container.querySelector("#admin-character-age");
    const characterCompleteness = container.querySelector("#admin-character-completeness");
    const characterSort = container.querySelector("#admin-character-sort");
    const characterCount = container.querySelector("#admin-character-results-count");
    const characterTotal = container.querySelector("#admin-character-total");
    const characterActiveSummary = container.querySelector("#admin-character-active-summary");
    const characterActiveFilters = container.querySelector("#admin-character-active-filters");
    const characterFilters = [characterSearch, characterRace, characterHomeland, characterOccupation, characterAge, characterCompleteness, characterSort];
    let filteredCharacters = [...approved];

    const fillCharacterFilter = (select, field, placeholder) => {
        const values = [...new Set(approved.map(a => String(a[field] ?? "").trim()).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, "ru", { sensitivity: "base" }));
        select.innerHTML = '<option value="">' + placeholder + '</option>' +
            values.map(value => '<option value="' + window.escapeHtml(value) + '">' + window.escapeHtml(value) + '</option>').join("");
    };
    fillCharacterFilter(characterRace, "race", "Все расы");
    fillCharacterFilter(characterHomeland, "homeland", "Все регионы");
    fillCharacterFilter(characterOccupation, "occupation", "Все занятия");
    const pluralCharacters = n => n + (n % 10 === 1 && n % 100 !== 11 ? " персонаж" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? " персонажа" : " персонажей");
    characterTotal.textContent = pluralCharacters(approved.length);

    const csvCell = value => '"' + String(value ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ") + '"';
    const renderCharacterDirectory = resetPage => {
        const query = characterSearch.value.trim().toLocaleLowerCase("ru");
        filteredCharacters = approved.filter(a => {
            const haystack = [a.name, a.race, a.homeland, a.occupation, a.personality, a.backstory, a.special_skills, a.preferred_weapon, a.character_id]
                .filter(Boolean).join(" ").toLocaleLowerCase("ru");
            const age = Number(a.age);
            const ageMatches = !characterAge.value ||
                (characterAge.value === "young" && Number.isFinite(age) && age > 0 && age <= 25) ||
                (characterAge.value === "adult" && Number.isFinite(age) && age >= 26 && age <= 60) ||
                (characterAge.value === "senior" && Number.isFinite(age) && age > 60) ||
                (characterAge.value === "unknown" && (!Number.isFinite(age) || age <= 0));
            const complete = Boolean(a.personality?.trim() && a.backstory?.trim() && a.special_skills?.trim());
            const profileMatches = !characterCompleteness.value ||
                (characterCompleteness.value === "complete" && complete) ||
                (characterCompleteness.value === "incomplete" && !complete) ||
                (characterCompleteness.value === "no-photo" && !a.photo_url);
            return (!query || haystack.includes(query)) &&
                (!characterRace.value || a.race === characterRace.value) &&
                (!characterHomeland.value || a.homeland === characterHomeland.value) &&
                (!characterOccupation.value || a.occupation === characterOccupation.value) &&
                ageMatches && profileMatches;
        });
        const sort = characterSort.value;
        filteredCharacters.sort((a, b) => {
            if (sort === "name-asc") return String(a.name || "").localeCompare(String(b.name || ""), "ru");
            if (sort === "name-desc") return String(b.name || "").localeCompare(String(a.name || ""), "ru");
            if (sort === "age-asc") return (Number(a.age) || Number.MAX_SAFE_INTEGER) - (Number(b.age) || Number.MAX_SAFE_INTEGER);
            if (sort === "age-desc") return (Number(b.age) || 0) - (Number(a.age) || 0);
            return Number(b.id || 0) - Number(a.id || 0);
        });
        characterCount.textContent = filteredCharacters.length ? `Найдено: ${filteredCharacters.length} персонажей` : "Ничего не найдено";
        characterActiveSummary.textContent = filteredCharacters.length === approved.length ? "Все персонажи мира" : `Отобрано из ${approved.length}`;
        characterList.innerHTML = filteredCharacters.length
            ? filteredCharacters.map(window.renderAdminCharacterManagement).join("")
            : '<div class="admin-empty admin-character-no-results"><h2>Ничего не найдено</h2><p>Попробуй убрать часть фильтров или изменить запрос.</p><button type="button" class="admin-character-reset-empty">Сбросить фильтры</button></div>';
        const active = [];
        if (query) active.push("Поиск: " + characterSearch.value.trim());
        if (characterRace.value) active.push("Раса: " + characterRace.value);
        if (characterHomeland.value) active.push("Родина: " + characterHomeland.value);
        if (characterOccupation.value) active.push("Занятие: " + characterOccupation.value);
        if (characterAge.value) active.push("Возраст: " + characterAge.options[characterAge.selectedIndex].text);
        if (characterCompleteness.value) active.push("Профиль: " + characterCompleteness.options[characterCompleteness.selectedIndex].text);
        characterActiveFilters.innerHTML = active.map((label, i) => '<span class="admin-character-filter-chip">' + window.escapeHtml(label) + '<button type="button" data-remove-filter="' + i + '" aria-label="Убрать фильтр">×</button></span>').join("");
        characterActiveFilters.hidden = !active.length;
        bindAdminButtons(container);
    };
    characterFilters.forEach(control => control.addEventListener(control === characterSearch ? "input" : "change", () => renderCharacterDirectory(true)));
    container.querySelector("#admin-character-expand-all").addEventListener("click", () => {
        characterList.querySelectorAll(".admin-character-accordion").forEach(item => { item.open = true; });
    });
    container.querySelector("#admin-character-collapse-all").addEventListener("click", () => {
        characterList.querySelectorAll(".admin-character-accordion").forEach(item => { item.open = false; });
    });
    characterActiveFilters.addEventListener("click", event => {
        const button = event.target.closest("[data-remove-filter]");
        if (!button) return;
        const index = Number(button.dataset.removeFilter);
        [characterSearch, characterRace, characterHomeland, characterOccupation, characterAge, characterCompleteness][index]?.dispatchEvent(new Event(index === 0 ? "input" : "change", { bubbles: true }));
        const control = [characterSearch, characterRace, characterHomeland, characterOccupation, characterAge, characterCompleteness][index];
        if (control) control.value = "";
        renderCharacterDirectory(true);
    });
    characterList.addEventListener("click", event => {
        if (!event.target.closest(".admin-character-reset-empty")) return;
        container.querySelector("#admin-character-reset").click();
    });
    container.querySelector("#admin-character-reset").addEventListener("click", () => {
        characterSearch.value = "";
        characterRace.value = "";
        characterHomeland.value = "";
        characterOccupation.value = "";
        characterAge.value = "";
        characterCompleteness.value = "";
        characterSort.value = "newest";
        renderCharacterDirectory(true);
    });
    container.querySelector("#admin-character-export").addEventListener("click", () => {
        const columns = [["id","ID заявки"],["character_id","ID персонажа"],["name","Имя"],["race","Раса"],["age","Возраст"],["homeland","Родина"],["occupation","Занятие"],["preferred_weapon","Оружие"],["personality","Характер"],["backstory","Предыстория"],["special_skills","Особые навыки"]];
        const csv = "\uFEFF" + [columns.map(c => csvCell(c[1])).join(";"), ...filteredCharacters.map(a => columns.map(c => csvCell(a[c[0]])).join(";"))].join("\r\n");
        const url = URL.createObjectURL(new Blob([csv], { type:"text/csv;charset=utf-8;" }));
        const link = document.createElement("a");
        link.href = url; link.download = "lorgus-characters.csv"; link.click();
        URL.revokeObjectURL(url);
    });
    renderCharacterDirectory(true);

    window.loadAdminItemUseLog(container);
    if (typeof window.loadAdminRpManagement === "function") window.loadAdminRpManagement(container);
}

/* =========================================================
   ОДНА ЗАЯВКА
   ========================================================= */

function renderAdminApplication(application) {
    return `
        <article
            class="admin-application"
            data-application-id="${application.id}"
        >
            <div class="admin-application-main">
                <h3>
                    ${window.escapeHtml(application.name)}
                </h3>

                <div class="admin-application-info">
                    <span>
                        <strong>Раса:</strong>
                        ${window.escapeHtml(application.race)}
                    </span>

                    <span>
                        <strong>Возраст:</strong>
                        ${application.age} лет
                    </span>

                    <span>
                        <strong>Родина:</strong>
                        ${window.escapeHtml(application.homeland)}
                    </span>

                    <span>
                        <strong>Род занятий:</strong>
                        ${window.escapeHtml(application.occupation)}
                    </span>

                    <span>
                        <strong>Оружие:</strong>
                        ${
                            application.preferred_weapon
                                ? window.escapeHtml(
                                    application.preferred_weapon
                                )
                                : "Не указано"
                        }
                    </span>

                    <span>
                        <strong>Характер:</strong>
                        ${window.escapeHtml(application.personality)}
                    </span>

                    <span>
                        <strong>Предыстория:</strong>
                        ${window.escapeHtml(application.backstory)}
                    </span>

                    <span>
                        <strong>Особые навыки:</strong>
                        ${window.escapeHtml(application.special_skills)}
                    </span>

                    <span>
                        <strong>Изображение персонажа:</strong>

                        ${
                            application.photo_url
                                ? `
                                    <img
                                        class="admin-application-photo"
                                        src="${window.escapeHtml(application.photo_url)}"
                                        alt="Изображение персонажа"
                                    >
                                `
                                : "Не загружено."
                        }
                    </span>
                </div>
            </div>

            <div class="admin-application-actions">
                <button
                    class="gold-button admin-revision-button"
                    data-application-id="${application.id}"
                >
                    Выписать правки
                </button>

                <button
                    class="gold-button admin-approve-button"
                    data-application-id="${application.id}"
                >
                    Одобрить
                </button>

                <button
                    class="admin-reject-button"
                    data-application-id="${application.id}"
                >
                    Отклонить
                </button>
            </div>
        </article>
    `;
}

/* =========================================================
   КНОПКИ АДМИНКИ
   ========================================================= */
function renderAdminCharacterManagement(application) {
    const esc = value => window.escapeHtml(String(value ?? "—"));
    return `
        <details class="admin-character-accordion" data-character-id="${esc(application.character_id || "")}">
            <summary class="admin-character-accordion-summary">
                <span class="admin-character-accordion-portrait">${application.photo_url ? `<img src="${esc(application.photo_url)}" alt="">` : "✦"}</span>
                <span class="admin-character-accordion-main">
                    <strong>${esc(application.name || "Без имени")}</strong>
                    <span>${esc(application.race || "Раса не указана")} · ${esc(application.homeland || "Родина не указана")}</span>
                </span>
                <span class="admin-character-accordion-meta">
                    <span>${esc(application.occupation || "Занятие не указано")}</span>
                    <small>${application.age ? esc(application.age + " лет") : "Возраст не указан"} · #${esc(application.id)}</small>
                </span>
                <span class="admin-character-accordion-status">ОДОБРЕН</span>
                <span class="admin-character-accordion-chevron" aria-hidden="true">⌄</span>
            </summary>
            <div class="admin-character-accordion-content">
                <div class="admin-character-accordion-facts">
                    <div><small>РАСА</small><strong>${esc(application.race)}</strong></div>
                    <div><small>ВОЗРАСТ</small><strong>${application.age ? esc(application.age + " лет") : "—"}</strong></div>
                    <div><small>РОДИНА</small><strong>${esc(application.homeland)}</strong></div>
                    <div><small>ЗАНЯТИЕ</small><strong>${esc(application.occupation)}</strong></div>
                    <div><small>ОРУЖИЕ</small><strong>${esc(application.preferred_weapon)}</strong></div>
                    <div><small>ID ПЕРСОНАЖА</small><strong>${esc(application.character_id)}</strong></div>
                </div>
                <div class="admin-character-accordion-lore">
                    <section><small>ХАРАКТЕР</small><p>${esc(application.personality)}</p></section>
                    <section><small>ПРЕДЫСТОРИЯ</small><p>${esc(application.backstory)}</p></section>
                    <section><small>ОСОБЫЕ НАВЫКИ</small><p>${esc(application.special_skills)}</p></section>
                </div>
                <div class="admin-character-actions">
                    <button class="admin-character-details-button" type="button" data-character-detail-id="${esc(application.id)}">Полная запись</button>
                    <button class="admin-character-details-button admin-character-titles-button" type="button" data-character-title-id="${esc(application.id)}">Титулы</button>
                    <button class="admin-character-details-button admin-character-abilities-button" type="button" data-character-ability-id="${esc(application.id)}">Способности</button>
                    <button class="admin-character-details-button admin-character-inventory-button" type="button" data-character-inventory-id="${esc(application.id)}">Инвентарь</button>
                    <button class="admin-reject-button admin-delete-character-button" data-character-id="${esc(application.character_id || "")}" data-character-name="${esc(application.name || "персонажа")}">Удалить персонажа</button>
                </div>
            </div>
        </details>
    `;
}

window.loadAdminPanel = loadAdminPanel;
window.renderAdminApplications = renderAdminApplications;

window.renderAdminCharacterManagement = renderAdminCharacterManagement;
