/* LORGUS character application editor */
function renderPendingApplication(container, application) {
    container.className = "character-application";
    const reviewNotes = application.review_notes
        ? `<div class="character-review-notes"><h3>Правки от администрации</h3><p>${window.escapeHtml(application.review_notes)}</p></div>`
        : "";

    container.innerHTML = `
        <button type="button" class="lorgus-screen-window.logout" onclick="window.logout()">ВЫХОД</button>
        <div class="character-creation-shell character-edit-shell">
        <div class="character-header">
            <div class="welcome-symbol">✦</div>
            <h1>${window.escapeHtml(application.name)}</h1>
            <p>Твоя анкета находится на рассмотрении.</p>
        </div>
        ${reviewNotes}
        <form id="character-application-form" onsubmit="updateCharacterApplication(event, '${application.id}')">
            <div class="character-grid">
                <div class="character-field"><label>Имя персонажа</label><input id="character-name" type="text" value="${window.escapeHtml(application.name)}" required></div>
                <div class="character-field"><label>Раса</label><input id="character-race" type="text" value="${window.escapeHtml(application.race)}" required></div>
                <div class="character-field"><label>Возраст</label><input id="character-age" type="number" min="1" max="1000" value="${application.age}" required></div>
                <div class="character-field"><label>Родина</label><input id="character-homeland" type="text" value="${window.escapeHtml(application.homeland)}" required></div>
                <div class="character-field full"><label>Характер</label><textarea id="character-personality" required>${window.escapeHtml(application.personality)}</textarea></div>
                <div class="character-field full"><label>Предыстория</label><textarea id="character-backstory" required>${window.escapeHtml(application.backstory)}</textarea></div>
                <div class="character-field full"><label>Особые навыки</label><textarea id="character-skills" required>${window.escapeHtml(application.special_skills)}</textarea></div>
                <div class="character-field"><label>Предпочитаемое оружие</label><input id="character-weapon" type="text" value="${window.escapeHtml(application.preferred_weapon || "")}"></div>
                <div class="character-field"><label>Род занятий</label><input id="character-occupation" type="text" value="${window.escapeHtml(application.occupation)}" required></div>
            </div>
            <div id="character-message" class="character-message"></div>
            <button type="submit" class="gold-button character-submit">Сохранить исправления и отправить на проверку</button>
        </form>
            </div>
        </div>
        `;
}

async function updateCharacterApplication(event, applicationId) {
    event.preventDefault();
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) {
        window.setCharacterMessage("Необходимо войти в аккаунт.", "error");
        return;
    }

    const values = {
        name: document.getElementById("character-name").value.trim(),
        race: document.getElementById("character-race").value.trim(),
        age: Number(document.getElementById("character-age").value),
        homeland: document.getElementById("character-homeland").value.trim(),
        personality: document.getElementById("character-personality").value.trim(),
        backstory: document.getElementById("character-backstory").value.trim(),
        special_skills: document.getElementById("character-skills").value.trim(),
        preferred_weapon: document.getElementById("character-weapon").value.trim() || null,
        occupation: document.getElementById("character-occupation").value.trim(),
        review_notes: null,
        status: "pending"
    };

    if (!values.name || !values.race || !values.age || !values.homeland || !values.personality || !values.backstory || !values.special_skills || !values.occupation) {
        window.setCharacterMessage("Заполни все обязательные поля.", "error");
        return;
    }

    const button = document.querySelector(".character-submit");
    if (button) {
        button.disabled = true;
        button.textContent = "Сохранение...";
    }

    const { error } = await window.supabaseClient
        .from("character_applications")
        .update(values)
        .eq("id", applicationId)
        .eq("player_id", user.id)
        .eq("status", "pending");

    if (error) {
        console.error(error);
        window.setCharacterMessage("Не удалось сохранить исправления: " + error.message, "error");
        if (button) {
            button.disabled = false;
            button.textContent = "Сохранить исправления и отправить на проверку";
        }
        return;
    }

    await window.loadPlayerState({ user });
}

window.renderPendingApplication = renderPendingApplication;
window.updateCharacterApplication = updateCharacterApplication;
