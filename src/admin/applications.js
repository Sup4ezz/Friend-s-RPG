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
            <div class="admin-section-heading">
                <div><h2>Персонажи мира</h2><p>Активные персонажи, созданные после одобрения заявок.</p></div>
            </div>
            <div class="admin-applications">
                ${approved.length ? approved.map(window.renderAdminCharacterManagement).join("") : '<div class="admin-empty"><h2>Персонажей нет</h2><p>Список пуст.</p></div>'}
            </div>
        </section>
        <section class="admin-section admin-item-use-management">
            <div class="admin-section-heading">
                <div><h2>Использование предметов</h2><p>Журнал предметов, использованных в RP-постах. Здесь можно отменить некорректное использование вместе с постом.</p></div>
            </div>
            <div id="admin-item-use-log" class="admin-item-use-log"><div class="admin-empty"><h2>Загрузка журнала...</h2></div></div>
        </section>
    `;

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
    window.loadAdminItemUseLog(container);
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
function window.renderAdminCharacterManagement(application) {
    const fields = [
        ["Раса", application.race],
        ["Возраст", application.age ? `${application.age} лет` : null],
        ["Родина", application.homeland],
        ["Род занятий", application.occupation],
        ["Оружие", application.preferred_weapon],
        ["Характер", application.personality],
        ["Предыстория", application.backstory],
        ["Особые навыки", application.special_skills]
    ].filter(([, value]) => value);

    return `
        <article class="admin-hero-character" data-character-id="${application.character_id || ""}">
            <div class="admin-hero-character-portrait">
                ${application.photo_url
                    ? `<img src="${window.escapeHtml(application.photo_url)}" alt="">`
                    : '<div class="admin-character-sigil">✦</div>'}
            </div>
            <div class="admin-hero-character-body">
                <div class="admin-character-heading">
                    <div>
                        <span class="admin-character-rank">ЖИТЕЛЬ ЛОРГУСА · ЗАПИСЬ В ЛЕТОПИСИ #${window.escapeHtml(String(application.id))}</span>
                        <h3>${window.escapeHtml(application.name || "Без имени")}</h3>
                        <p>${window.escapeHtml(application.race || "Раса не указана")} · ${window.escapeHtml(application.homeland || "Родина не указана")}</p>
                    </div>
                    <span class="admin-character-status">ОДОБРЕН</span>
                </div>
                <div class="admin-character-facts">
                    ${fields.slice(0,5).map(([label,value]) => `<div><small>${label}</small><strong>${window.escapeHtml(String(value))}</strong></div>`).join("")}
                </div>
                <div class="admin-character-lore">
                    <div><small>ХАРАКТЕР</small><p>${window.escapeHtml(application.personality || "—")}</p></div>
                    <div><small>ПРЕДЫСТОРИЯ</small><p>${window.escapeHtml(application.backstory || "—")}</p></div>
                    <div><small>ОСОБЫЕ НАВЫКИ</small><p>${window.escapeHtml(application.special_skills || "—")}</p></div>
                </div>
                <div class="admin-character-actions">
                    <button class="admin-character-details-button" type="button" data-character-detail-id="${application.id}">Открыть полную запись</button>
                    <button class="admin-character-details-button admin-character-titles-button" type="button" data-character-title-id="${application.id}">Титулы</button>
                    <button class="admin-character-details-button admin-character-abilities-button" type="button" data-character-ability-id="${application.id}">Способности</button><button class="admin-character-details-button admin-character-inventory-button" type="button" data-character-inventory-id="${application.id}">Инвентарь</button>
                    <button class="admin-reject-button admin-delete-character-button" data-character-id="${application.character_id || ""}" data-character-name="${window.escapeHtml(application.name || "персонажа")}">Удалить персонажа</button>
                </div>
            </div>
        </article>
    `;
}

window.loadAdminPanel = loadAdminPanel;
window.renderAdminApplications = renderAdminApplications;
