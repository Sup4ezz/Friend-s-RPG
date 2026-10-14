/* LORGUS character application editor */
function renderPendingApplication(container, application) {
    container.className = "character-application";
    const esc = value => window.escapeHtml(value ?? "");
    const reincarnated = application.origin_type === "reincarnated";
    const reviewNotes = application.review_notes
        ? `<div class="character-review-notes"><h3>Правки от администрации</h3><p>${esc(application.review_notes)}</p></div>`
        : "";

    container.innerHTML = `
        <button type="button" class="lorgus-screen-logout" onclick="window.logout()">ВЫХОД</button>
        <div class="character-creation-shell character-edit-shell">
            <div class="character-header">
                <div class="welcome-symbol">✦</div>
                <h1>${esc(application.name) || "Анкета персонажа"}</h1>
                <p>${application.status === "revision_required" ? "Администрация запросила исправления." : "Твоя анкета находится на рассмотрении."}</p>
                <p class="character-origin-edit-label">${reincarnated ? "РЕИНКАРНИРОВАННЫЙ · БЕЗ ЛОРБУКА" : "РОЖДЁН В ЛОРГУСЕ"}</p>
            </div>
            ${reviewNotes}
            <form id="character-application-form" onsubmit="updateCharacterApplication(event, '${esc(application.id)}')">
                <input type="hidden" id="character-origin-type" value="${reincarnated ? "reincarnated" : "born_in_lorgus"}">
                <div class="character-grid">
                    <div class="character-field"><label for="character-name">Имя персонажа</label><input id="character-name" name="name" type="text" value="${esc(application.name)}" required></div>
                    <div class="character-field"><label for="character-race">Раса</label><input id="character-race" name="race" type="text" value="${esc(application.race)}" required></div>
                    <div class="character-field"><label for="character-age">Возраст</label><input id="character-age" name="age" type="number" min="1" max="1000" value="${esc(application.age)}" required></div>
                    <div class="character-field"><label for="character-homeland">Родина</label><input id="character-homeland" name="homeland" type="text" value="${esc(application.homeland)}" required></div>
                    <div class="character-field full"><label for="character-personality">Характер</label><textarea id="character-personality" name="personality" required>${esc(application.personality)}</textarea></div>
                    ${reincarnated
                        ? `
                            <div class="character-field full"><label for="character-past-life-bio">Предыдущая жизнь</label><textarea id="character-past-life-bio" name="past_life_bio" required>${esc(application.past_life_bio)}</textarea></div>
                            <div class="character-field full"><label for="character-death-reason">Причина смерти</label><textarea id="character-death-reason" name="death_reason" required>${esc(application.death_reason)}</textarea></div>
                        `
                        : `<div class="character-field full"><label for="character-backstory">Предыстория</label><textarea id="character-backstory" name="backstory" required>${esc(application.backstory)}</textarea></div>`}
                    <div class="character-field full"><label for="character-skills">Особые навыки</label><textarea id="character-skills" name="special_skills" required>${esc(application.special_skills)}</textarea></div>
                    <div class="character-field"><label for="character-weapon">Предпочитаемое оружие</label><input id="character-weapon" name="preferred_weapon" type="text" value="${esc(application.preferred_weapon)}"></div>
                    <div class="character-field"><label for="character-occupation">Род занятий</label><input id="character-occupation" name="occupation" type="text" value="${esc(application.occupation)}" required></div>
                </div>
                <div id="character-message" class="character-message"></div>
                <button type="submit" class="gold-button character-submit">Сохранить исправления и отправить на проверку</button>
            </form>
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
        backstory: document.getElementById("character-backstory")?.value.trim() || null,
        past_life_bio: document.getElementById("character-past-life-bio")?.value.trim() || null,
        death_reason: document.getElementById("character-death-reason")?.value.trim() || null,
        origin_type: document.getElementById("character-origin-type")?.value || "born_in_lorgus",
        special_skills: document.getElementById("character-skills").value.trim(),
        preferred_weapon: document.getElementById("character-weapon").value.trim() || null,
        occupation: document.getElementById("character-occupation").value.trim(),
    };

    const storyIsMissing = values.origin_type === "reincarnated"
        ? (!values.past_life_bio || !values.death_reason)
        : !values.backstory;
    if (!values.name || !values.race || !values.age || !values.homeland || !values.personality || storyIsMissing || !values.special_skills || !values.occupation) {
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
