/* LORGUS mail */
async function renderMail() {
    const container = document.getElementById("cabinet-content");
    if (!container || !window.activeCharacter) return;

    const character = window.activeCharacter;
    const name = escapeHtml(character.name || "Без имени");

    container.className = "lorgus-mail-page";
    container.innerHTML = `
        <div class="lorgus-mail-shell">
            <aside class="lorgus-mail-sidebar">
                <div class="lorgus-mail-brand">
                    <span class="lorgus-mail-brand-mark">✦</span>
                    <div>
                        <span>ЛОРГУС</span>
                        <strong>ПОЧТА</strong>
                    </div>
                </div>

                <div class="lorgus-mail-sidebar-character">
                    <span class="lorgus-mail-avatar">${escapeHtml((character.name || "?").charAt(0))}</span>
                    <div>
                        <strong>${name}</strong>
                        <small>Личный почтовый ящик</small>
                    </div>
                </div>

                <nav class="lorgus-mail-nav" aria-label="Почта">
                    <button type="button" class="active">
                        <span>▱</span><strong>Входящие</strong><em id="lorgus-mail-nav-count">—</em>
                    </button>
                    <button type="button" onclick="document.getElementById('lorgus-mail-recipient')?.focus()">
                        <span>✎</span><strong>Новое письмо</strong>
                    </button>
                </nav>

                <div class="lorgus-mail-sidebar-note">
                    <span>ПОЧТОВЫЙ ПУТЬ</span>
                    <p>Послания не появляются у адресата мгновенно. Голубь действительно должен добраться до цели.</p>
                </div>

                <button type="button" class="lorgus-mail-back" onclick="window.lorgusSubpageTransition('top', window.renderLorgusWorldMapCurrent)">
                    ← Вернуться на карту
                </button>
            </aside>

            <main class="lorgus-mail-main">
                <header class="lorgus-mail-header">
                    <div>
                        <span class="lorgus-mail-kicker">ЛИЧНАЯ КОРРЕСПОНДЕНЦИЯ</span>
                        <h1>Послания</h1>
                    </div>
                    <div class="lorgus-mail-header-meta">
                        <span><i></i> ПОЧТА АКТИВНА</span>
                        <button type="button" onclick="window.logout?.()">ВЫЙТИ</button>
                    </div>
                </header>

                <section class="lorgus-mail-workspace">
                    <div class="lorgus-mail-inbox">
                        <div class="lorgus-mail-panel-head">
                            <div>
                                <span>ЯЩИК</span>
                                <h2>Входящие</h2>
                            </div>
                            <b id="lorgus-mail-inbox-total">—</b>
                        </div>
                        <div id="lorgus-mail-inbox-list" class="lorgus-mail-list">
                            <div class="lorgus-mail-loading"><span></span><strong>Открываем почту…</strong></div>
                        </div>
                    </div>

                    <div class="lorgus-mail-compose">
                        <div class="lorgus-mail-panel-head">
                            <div>
                                <span>НОВОЕ ПОСЛАНИЕ</span>
                                <h2>Написать письмо</h2>
                            </div>
                            <span class="lorgus-mail-compose-mark">✎</span>
                        </div>

                        <div class="lorgus-mail-form">
                            <label for="lorgus-mail-recipient">АДРЕСАТ</label>
                            <select id="lorgus-mail-recipient"><option value="">Загрузка персонажей…</option></select>

                            <label for="lorgus-mail-body">ПОСЛАНИЕ</label>
                            <textarea id="lorgus-mail-body" rows="12" maxlength="10000" placeholder="Начни писать…"></textarea>

                            <div class="lorgus-mail-compose-bottom">
                                <div>
                                    <span class="lorgus-mail-method">✦</span>
                                    <div><strong>Голубиная почта</strong><small>Доставка занимает около 5 минут</small></div>
                                </div>
                                <button class="lorgus-mail-send" type="button" onclick="sendLorgusMail()">
                                    <span>Отправить</span><b>➜</b>
                                </button>
                            </div>
                            <div id="lorgus-mail-status" class="lorgus-mail-status"></div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    `;

    await loadMailRecipients();
    await loadMailInbox();
}

async function loadMailRecipients() {
    const select = document.getElementById("lorgus-mail-recipient");
    if (!select) return;

    // Статус персонажа хранится не в characters, а в character_applications.
    // Для почты показываем только персонажей с одобренной заявкой.
    const { data: applications, error: applicationsError } = await window.supabaseClient
        .from("character_applications")
        .select("character_id")
        .eq("status", "approved")
        .not("character_id", "is", null);

    if (applicationsError) {
        console.error("Не удалось загрузить одобренные заявки:", applicationsError);
        select.innerHTML = `<option value="">Не удалось загрузить персонажей: ${escapeHtml(applicationsError.message)}</option>`;
        return;
    }

    const characterIds = [...new Set(
        (applications || [])
            .map(application => application.character_id)
            .filter(Boolean)
            .filter(id => String(id) !== String(window.activeCharacterId))
    )];

    if (!characterIds.length) {
        select.innerHTML = '<option value="">Нет доступных адресатов</option>';
        return;
    }

    const { data: characters, error: charactersError } = await window.supabaseClient
        .from("characters")
        .select("id, name, race")
        .in("id", characterIds)
        .order("name", { ascending: true });

    if (charactersError) {
        console.error("Не удалось загрузить персонажей:", charactersError);
        select.innerHTML = `<option value="">Не удалось загрузить персонажей: ${escapeHtml(charactersError.message)}</option>`;
        return;
    }

    if (!characters?.length) {
        select.innerHTML = '<option value="">Нет доступных адресатов</option>';
        return;
    }

    select.innerHTML =
        '<option value="">Выбери персонажа</option>' +
        characters.map(character =>
            `<option value="${escapeHtml(character.id)}">${escapeHtml(character.name || "Без имени")} · ${escapeHtml(character.race || "персонаж")}</option>`
        ).join("");
}

function formatMailDate(value) {
    if (!value) return "";
    return new Date(value).toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}

async function loadMailInbox() {
    const list = document.getElementById("lorgus-mail-inbox-list");
    if (!list || !window.activeCharacterId) return;

    const { data, error } = await window.supabaseClient
        .from("lorgus_mail")
        .select("id, sender_character_id, recipient_character_id, body, method, sent_at, deliver_at, delivered_at, read_at, sender:characters!lorgus_mail_sender_character_id_fkey(name)")
        .eq("recipient_character_id", window.activeCharacterId)
        .order("sent_at", { ascending: false })
        .limit(100);

    if (error) {
        console.error("Не удалось загрузить письма:", error);
        list.innerHTML = `<div class="lorgus-empty-location"><span>!</span><h2>Почта пока не готова</h2><p>${escapeHtml(error.message)}</p><small>После создания таблицы lorgus_mail здесь появятся письма.</small></div>`;
        return;
    }

    if (!data?.length) {
        list.innerHTML = '<div class="lorgus-empty-location"><span>✉</span><h2>Почтовый ящик пуст</h2><p>Ни одного послания пока не доставлено.</p></div>';
        return;
    }

    const now = Date.now();

    list.innerHTML = data.map(mail => {
        const delivered = mail.delivered_at || new Date(mail.deliver_at).getTime() <= now;
        const sender = mail.sender?.name || "Неизвестный отправитель";
        const unread = !mail.read_at && delivered;

        return `
            <article class="lorgus-mail-card ${unread ? "unread" : ""}" data-mail-id="${escapeHtml(mail.id)}">
                <div class="lorgus-mail-card-top">
                    <strong>${escapeHtml(sender)}</strong>
                    <span>${delivered ? "Доставлено" : "В пути"}</span>
                </div>
                <div class="lorgus-mail-card-meta">
                    ${mail.method === "pigeon" ? "🕊 Голубь" : "✉ Письмо"} · отправлено ${formatMailDate(mail.sent_at)}
                    ${delivered ? " · доставлено " + formatMailDate(mail.delivered_at || mail.deliver_at) : " · прибудет " + formatMailDate(mail.deliver_at)}
                </div>
                <p>${escapeHtml(mail.body)}</p>
                ${unread ? '<button class="character-secondary-button" type="button" onclick="markLorgusMailRead(\'' + escapeHtml(mail.id) + '\')">Прочитано</button>' : ""}
            </article>
        `;
    }).join("");
}

async function sendLorgusMail() {
    const recipient = document.getElementById("lorgus-mail-recipient")?.value;
    const bodyInput = document.getElementById("lorgus-mail-body");
    const status = document.getElementById("lorgus-mail-status");

    if (!recipient || !bodyInput) return;

    const body = bodyInput.value.trim();
    if (!body) {
        if (status) status.textContent = "Письмо не может быть пустым.";
        return;
    }

    if (recipient === window.activeCharacterId) {
        if (status) status.textContent = "Нельзя отправить письмо самому себе.";
        return;
    }

    const { data: userData } = await window.supabaseClient.auth.getUser();
    if (!userData?.user) return;

    const now = new Date();
    const deliverAt = new Date(now.getTime() + 5 * 60 * 1000);

    const { error } = await window.supabaseClient
        .from("lorgus_mail")
        .insert({
            sender_character_id: window.activeCharacterId,
            sender_player_id: userData.user.id,
            recipient_character_id: recipient,
            body,
            method: "pigeon",
            sent_at: now.toISOString(),
            deliver_at: deliverAt.toISOString()
        });

    if (error) {
        console.error("Не удалось отправить письмо:", error);
        if (status) status.textContent = "Не удалось отправить письмо: " + error.message;
        return;
    }

    bodyInput.value = "";
    if (status) status.textContent = "Голубь отправлен. Письмо прибудет позже.";
}

async function markLorgusMailRead(mailId) {
    const { error } = await window.supabaseClient
        .from("lorgus_mail")
        .update({ read_at: new Date().toISOString() })
        .eq("id", mailId)
        .eq("recipient_character_id", window.activeCharacterId);

    if (error) {
        console.error("Не удалось отметить письмо прочитанным:", error);
        return;
    }

    await loadMailInbox();
}
