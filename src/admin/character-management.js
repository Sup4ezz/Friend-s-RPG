/* LORGUS admin character management */
function openAdminCharacterRecord(application, container) {
    const existing = container.querySelector(".admin-character-record-overlay");
    if (existing) existing.remove();
    const esc = value => escapeHtml(value ?? "—");
    const date = value => value ? new Date(value).toLocaleString("ru-RU", { dateStyle:"medium", timeStyle:"short" }) : "—";

    const overlay = document.createElement("div");
    overlay.className = "admin-character-record-overlay";
    overlay.innerHTML = `
        <div class="admin-character-record-backdrop"></div>
        <article class="admin-character-record">
            <button class="admin-character-record-close" type="button">×</button>
            <div class="admin-character-record-top">
                <div class="admin-character-record-portrait">${application.photo_url ? `<img src="${esc(application.photo_url)}" alt="">` : "<span>✦</span>"}</div>
                <div>
                    <span class="admin-character-record-kicker">ЛЕТОПИСЬ ЛОРГУСА · ПОЛНАЯ ЗАПИСЬ #${esc(application.id)}</span>
                    <h2>${esc(application.name)}</h2>
                    <p>${esc(application.race)} · ${esc(application.homeland)}</p>
                    <span class="admin-character-record-status">ОДОБРЕН · ЖИТЕЛЬ МИРА</span>
                </div>
            </div>
            <div class="admin-character-record-facts">
                <div><small>ВОЗРАСТ</small><strong>${esc(application.age ? application.age + " лет" : null)}</strong></div>
                <div><small>РОД ЗАНЯТИЙ</small><strong>${esc(application.occupation)}</strong></div>
                <div><small>ОРУЖИЕ</small><strong>${esc(application.preferred_weapon)}</strong></div>
                <div><small>CHARACTER ID</small><strong>${esc(application.character_id)}</strong></div>
            </div>
            <div class="admin-character-record-story">
                <section><small>ХАРАКТЕР</small><p>${esc(application.personality)}</p></section>
                <section><small>ПРЕДЫСТОРИЯ</small><p>${esc(application.backstory)}</p></section>
                <section><small>ОСОБЫЕ НАВЫКИ</small><p>${esc(application.special_skills)}</p></section>
            </div>
            <div class="admin-character-record-footer">
                <span>СОЗДАНА: <b>${date(application.created_at)}</b></span>
                <span>ОБНОВЛЕНА: <b>${date(application.updated_at)}</b></span>
                <span>ОДОБРЕНА: <b>${date(application.approved_at)}</b></span>
            </div>
            ${application.review_notes ? `<div class="admin-character-record-notes"><small>ЗАПИСКА ХРАНИТЕЛЯ</small><p>${esc(application.review_notes)}</p></div>` : ""}
            <div class="admin-character-record-controls">
                <button class="admin-character-edit-button" type="button">✦ Внести изменения в персонажа</button>
            </div>
            <div class="admin-character-history"><small>ЛЕТОПИСЬ ИЗМЕНЕНИЙ</small><div class="admin-character-history-list">Загрузка истории...</div></div>
        </article>`;
    container.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("open"));

    const close = () => { overlay.classList.remove("open"); setTimeout(() => overlay.remove(), 180); };
    overlay.querySelector(".admin-character-record-close").addEventListener("click", close);
    overlay.querySelector(".admin-character-record-backdrop").addEventListener("click", close);

    const historyBox = overlay.querySelector(".admin-character-history-list");
    const { data: history } = await window.supabaseClient.from("character_application_history")
        .select("action,created_at,admin_id,before_data,after_data")
        .eq("application_id", application.id)
        .order("created_at", { ascending:false });
    if (historyBox) {
        historyBox.innerHTML = (history || []).map(item => `
            <div class="admin-history-entry">
                <strong>${esc(({created:"Создана",updated:"Изменена",approved:"Одобрена",rejected:"Отклонена",revision_requested:"Запрошены правки"})[item.action] || item.action)}</strong>
                <span>${date(item.created_at)}</span>
            </div>`).join("") || "История пока пуста.";
    }

    overlay.querySelector(".admin-character-edit-button").addEventListener("click", () => {
        const body = overlay.querySelector(".admin-character-record");
        const form = document.createElement("form");
        form.className = "admin-character-edit-form";
        form.innerHTML = `
            <div class="admin-edit-grid">
                <label>Имя<input name="name" value="${esc(application.name)}"></label>
                <label>Возраст<input name="age" type="number" value="${esc(application.age)}"></label>
                <label>Раса<input name="race" value="${esc(application.race)}"></label>
                <label>Родина<input name="homeland" value="${esc(application.homeland)}"></label>
                <label>Занятие<input name="occupation" value="${esc(application.occupation)}"></label>
                <label>Оружие<input name="preferred_weapon" value="${esc(application.preferred_weapon)}"></label>
            </div>
            <label>Характер<textarea name="personality">${esc(application.personality)}</textarea></label>
            <label>Предыстория<textarea name="backstory">${esc(application.backstory)}</textarea></label>
            <label>Особые навыки<textarea name="special_skills">${esc(application.special_skills)}</textarea></label>
            <div class="admin-character-edit-actions">
                <button type="submit">Сохранить изменения</button>
                <button type="button" class="cancel">Отмена</button>
            </div>`;
        body.querySelector(".admin-character-edit-form")?.remove();
        body.appendChild(form);
        form.scrollIntoView({ behavior:"smooth", block:"end" });
        form.querySelector(".cancel").addEventListener("click", () => form.remove());
        form.addEventListener("submit", async event => {
            event.preventDefault();
            const patch = Object.fromEntries(new FormData(form).entries());
            patch.age = Number(patch.age);
            const save = form.querySelector("button[type=submit]");
            save.disabled = true; save.textContent = "Сохранение...";
            const { data, error } = await window.supabaseClient.rpc("admin_update_character_application", {
                p_application_id: application.id,
                p_patch: patch
            });
            if (error) {
                alert("Не удалось сохранить изменения:\\n\\n" + error.message);
                save.disabled = false; save.textContent = "Сохранить изменения";
                return;
            }
            Object.assign(application, data);
            form.remove();
            overlay.remove();
            openAdminCharacterRecord(application, container);
        });
    });
}

function bindAdminButtons(container) {
    container.querySelectorAll(".admin-character-details-button").forEach(button => {
        if (button.dataset.bound) return;
        button.dataset.bound = "1";
        button.addEventListener("click", event => {
            event.stopPropagation();
            const application = (window.adminApplications || []).find(a => String(a.id) === String(button.dataset.characterDetailId));
            if (application) openAdminCharacterRecord(application, container);
        });
    });

    container.querySelectorAll(".admin-character-titles-button").forEach(button => {
        button.addEventListener("click", event => {
            event.stopPropagation();
            const application = (window.adminApplications || []).find(a => String(a.id) === String(button.dataset.characterTitleId));
            if (application) openAdminCharacterTitles(application, container);
        });
    });

    container.querySelectorAll(".admin-character-abilities-button").forEach(button => {
        button.addEventListener("click", event => {
            event.stopPropagation();
            const application = (window.adminApplications || []).find(a => String(a.id) === String(button.dataset.characterAbilityId));
            if (application) openAdminCharacterAbilities(application, container);
        });
    });
    container.querySelectorAll(".admin-character-inventory-button").forEach(button => {
        button.addEventListener("click", event => {
            event.stopPropagation();
            const application = (window.adminApplications || []).find(a => String(a.id) === String(button.dataset.characterInventoryId));
            if (application) openAdminCharacterInventory(application, container);
        });
    });

    container.querySelectorAll(".admin-delete-character-button").forEach(button => {
        button.addEventListener("click", async () => {
            const characterId = button.dataset.characterId;
            const characterName = button.dataset.characterName || "этого персонажа";

            if (!characterId) {
                alert("У персонажа отсутствует ID.");
                return;
            }

            if (!confirm(`Удалить персонажа «${characterName}»?\\n\\nБудут удалены его RP-присутствие, RP-сообщения и заявка. Отменить действие нельзя.`)) {
                return;
            }

            button.disabled = true;
            button.textContent = "Удаление...";

            const { error } = await window.supabaseClient.rpc("admin_delete_character", {
                p_character_id: characterId
            });

            if (error) {
                console.error(error);
                alert("Не удалось удалить персонажа:\\n\\n" + error.message);
                button.disabled = false;
                button.textContent = "Удалить персонажа";
                return;
            }

            await window.loadAdminPanel(container);
        });
    });

    container.querySelectorAll(".admin-approve-button").forEach(button => {
        button.addEventListener("click", async () => {
            const applicationId = button.dataset.applicationId;
            if (!confirm("Одобрить эту заявку и создать персонажа?")) return;
            button.disabled = true;
            button.textContent = "Одобрение...";
            const { error } = await window.supabaseClient.rpc("approve_character_application", { application_id: applicationId });
            if (error) {
                console.error(error);
                alert("Не удалось одобрить заявку:\n\n" + error.message);
                button.disabled = false;
                button.textContent = "Одобрить";
                return;
            }
            await window.loadAdminPanel(container);
        });
    });

    container.querySelectorAll(".admin-revision-button").forEach(button => {
        button.addEventListener("click", async () => {
            const applicationId = button.dataset.applicationId;
            const notes = prompt("Укажи, что игроку необходимо исправить:", "");
            if (notes === null) return;
            const cleanNotes = notes.trim();
            if (!cleanNotes) {
                alert("Укажи хотя бы одну правку.");
                return;
            }
            button.disabled = true;
            button.textContent = "Сохранение...";
            const { error } = await window.supabaseClient
                .from("character_applications")
                .update({ review_notes: cleanNotes, status: "pending" })
                .eq("id", applicationId);
            if (error) {
                console.error(error);
                alert("Не удалось отправить правки игроку:\n\n" + error.message);
                button.disabled = false;
                button.textContent = "Выписать правки";
                return;
            }
            await window.loadAdminPanel(container);
        });
    });

    container.querySelectorAll(".admin-reject-button").forEach(button => {
        button.addEventListener("click", async () => {
            const applicationId = button.dataset.applicationId;
            const reason = prompt("Укажи причину отклонения:", "");
            if (reason === null) return;
            const cleanReason = reason.trim();
            if (!cleanReason) {
                alert("Укажи причину отклонения.");
                return;
            }
            button.disabled = true;
            button.textContent = "Отклонение...";
            const { error } = await window.supabaseClient.rpc("reject_character_application", { application_id: applicationId });
            if (error) {
                console.error(error);
                alert("Не удалось отклонить заявку:\n\n" + error.message);
                button.disabled = false;
                button.textContent = "Отклонить";
                return;
            }
            await window.loadAdminPanel(container);
        });
    });
}

function findApplicationById(id) {
    const article =
        document.querySelector(
            `.admin-application[data-application-id="${id}"]`
        );

    if (!article) return null;

    return window.adminApplications?.find(        application =>
            application.id === id
    ) || null;
}

/* =========================================================   РЕДАКТИРОВАНИЕ ЗАЯВКИ
   ========================================================= */

window.openAdminCharacterRecord = openAdminCharacterRecord;
window.bindAdminButtons = bindAdminButtons;
window.findApplicationById = findApplicationById;
