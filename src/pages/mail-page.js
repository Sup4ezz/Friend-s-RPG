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
                    <button type="button" class="active" id="lorgus-mail-folder-inbox">
                        <span>▱</span><strong>Входящие</strong><em id="lorgus-mail-nav-count">—</em>
                    </button>
                    <button type="button" id="lorgus-mail-folder-sent">
                        <span>➤</span><strong>Отправленные</strong>
                    </button>
                    <button type="button" onclick="document.getElementById('lorgus-mail-recipient')?.focus()">
                        <span>✎</span><strong>Новое письмо</strong>
                    </button>
                </nav>

                <div class="lorgus-mail-sidebar-note">
                    <span>ПОЧТОВЫЙ ПУТЬ</span>
                    <p>Каждое послание проходит свой путь. Срок зависит от выбранного способа доставки.</p>
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
                            <div class="lorgus-mail-inbox-actions"><b id="lorgus-mail-inbox-total">—</b><button type="button" id="lorgus-mail-read-all">Прочитать всё</button></div>
                        </div>
                        <div class="lorgus-mail-tools"><label for="lorgus-mail-search">⌕</label><input id="lorgus-mail-search" type="search" placeholder="Найти отправителя или письмо…" autocomplete="off"><select id="lorgus-mail-filter" aria-label="Фильтр писем"><option value="all">Все письма</option><option value="unread">Непрочитанные</option><option value="transit">В пути</option><option value="delivered">Доставленные</option></select></div>
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
                                <label class="lorgus-mail-method-picker" for="lorgus-mail-method">
                                    <span class="lorgus-mail-method">✦</span>
                                    <span><strong>Способ доставки</strong><small id="lorgus-mail-eta-preview">Голубь · около 5 мин.</small></span>
                                    <select id="lorgus-mail-method" aria-label="Способ доставки">
                                        <option value="pigeon">Голубь · 5 минут</option>
                                        <option value="courier">Курьер · 20 минут</option>
                                    </select>
                                </label>
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
    document.getElementById("lorgus-mail-search")?.addEventListener("input", filterLorgusMail);
    document.getElementById("lorgus-mail-filter")?.addEventListener("change", filterLorgusMail);
    document.getElementById("lorgus-mail-read-all")?.addEventListener("click", markAllLorgusMailRead);
    document.getElementById("lorgus-mail-folder-inbox")?.addEventListener("click", () => switchLorgusMailFolder("inbox"));
    document.getElementById("lorgus-mail-folder-sent")?.addEventListener("click", () => switchLorgusMailFolder("sent"));
    document.getElementById("lorgus-mail-method")?.addEventListener("change", updateMailDeliveryPreview);
    if (window.lorgusMailEtaTimer) clearInterval(window.lorgusMailEtaTimer);
    window.lorgusMailEtaTimer = setInterval(updateMailCountdowns, 30000);
    updateMailDeliveryPreview();
}

async function loadMailRecipients() {
    const select = document.getElementById("lorgus-mail-recipient");
    if (!select) return;

    // The guarded RPC returns only minimal fields for approved characters.
    const { data: characters, error } = await window.supabaseClient
        .rpc("get_lorgus_mail_recipients");

    if (error) {
        console.error("Не удалось загрузить адресатов:", error);
        select.innerHTML = `<option value="">Не удалось загрузить персонажей: ${escapeHtml(error.message)}</option>`;
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

function getMailMethodDetails(method) {
    return method === "courier"
        ? { label: "Курьер", duration: 20 * 60 * 1000, minutes: 20, icon: "✉" }
        : { label: "Голубь", duration: 5 * 60 * 1000, minutes: 5, icon: "🕊" };
}

function formatMailRemaining(deliverAt) {
    const remaining = new Date(deliverAt).getTime() - Date.now();
    if (!Number.isFinite(remaining) || remaining <= 0) return "доставка ожидается";
    const minutes = Math.ceil(remaining / 60000);
    if (minutes < 60) return "прибытие через " + minutes + (minutes === 1 ? " минуту" : minutes < 5 ? " минуты" : " минут");
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return "прибытие через " + hours + " ч" + (rest ? " " + rest + " мин" : "");
}

function updateMailDeliveryPreview() {
    const method = document.getElementById("lorgus-mail-method")?.value || "pigeon";
    const details = getMailMethodDetails(method);
    const preview = document.getElementById("lorgus-mail-eta-preview");
    if (preview) preview.textContent = details.label + " · около " + details.minutes + " мин.";
}

function updateMailCountdowns() {
    document.querySelectorAll("#lorgus-mail-inbox-list [data-mail-deliver-at]").forEach(card => {
        const eta = card.querySelector(".lorgus-mail-card-eta");
        if (eta && card.dataset.mailState !== "delivered") eta.textContent = formatMailRemaining(card.dataset.mailDeliverAt);
    });
}

async function loadMailInbox() {
    const list = document.getElementById("lorgus-mail-inbox-list");
    if (!list || !window.activeCharacterId) return;

    const folder = window.lorgusMailFolder || "inbox";
    if (folder !== "sent") {
        const { error: deliveryError } = await window.supabaseClient.rpc("lorgus_deliver_due_mail");
        if (deliveryError) {
            // RLS still hides letters until deliver_at; keep the inbox usable if delivery bookkeeping is unavailable.
            console.error("Не удалось зафиксировать доставку почты:", deliveryError);
        }
    }
    const { data, error } = await window.supabaseClient
        .from("lorgus_mail")
        .select("id, sender_character_id, recipient_character_id, body, method, sent_at, deliver_at, delivered_at, read_at, sender:characters!lorgus_mail_sender_character_id_fkey(name), recipient:characters!lorgus_mail_recipient_character_id_fkey(name)")
        .eq(folder === "sent" ? "sender_character_id" : "recipient_character_id", window.activeCharacterId)
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

    const unreadCount = data.filter(mail => !mail.read_at && (mail.delivered_at || new Date(mail.deliver_at).getTime() <= now)).length;
    const navCount = document.getElementById("lorgus-mail-nav-count");
    const totalCount = document.getElementById("lorgus-mail-inbox-total");
    const inboxMode = folder !== "sent";
    if (navCount) navCount.textContent = String(unreadCount);
    if (totalCount) totalCount.textContent = data.length + (data.length % 10 === 1 && data.length % 100 !== 11 ? " письмо" : data.length % 10 >= 2 && data.length % 10 <= 4 && (data.length % 100 < 12 || data.length % 100 > 14) ? " письма" : " писем");
    const title = document.querySelector(".lorgus-mail-inbox .lorgus-mail-panel-head h2");
    if (title) title.textContent = inboxMode ? "Входящие" : "Отправленные";
    const readAll = document.getElementById("lorgus-mail-read-all");
    if (readAll) readAll.hidden = !inboxMode;

    list.innerHTML = data.map(mail => {
        const delivered = Boolean(mail.delivered_at) || new Date(mail.deliver_at).getTime() <= now;
        const sender = mail.sender?.name || "Неизвестный отправитель";
        const recipient = mail.recipient?.name || "Неизвестный адресат";
        const unread = inboxMode && !mail.read_at && delivered;
        const contact = inboxMode ? sender : recipient;

        const method = getMailMethodDetails(mail.method);
        const deliveryLabel = delivered
            ? "Доставлено " + formatMailDate(mail.delivered_at || mail.deliver_at)
            : formatMailRemaining(mail.deliver_at);
        const progress = delivered ? 100 : Math.max(3, Math.min(96,
            ((now - new Date(mail.sent_at).getTime()) /
            Math.max(1, new Date(mail.deliver_at).getTime() - new Date(mail.sent_at).getTime())) * 100
        ));

        return `
            <article class="lorgus-mail-card ${unread ? "unread" : ""} ${delivered ? "delivered" : "in-transit"}" data-mail-id="${escapeHtml(mail.id)}" data-mail-sender="${escapeHtml(contact.toLocaleLowerCase("ru-RU"))}" data-mail-body="${escapeHtml(mail.body.toLocaleLowerCase("ru-RU"))}" data-mail-state="${delivered ? "delivered" : "transit"}" data-mail-unread="${unread ? "true" : "false"}" data-mail-deliver-at="${escapeHtml(mail.deliver_at || "")}">
                <div class="lorgus-mail-card-top">
                    <strong>${inboxMode ? "От: " : "Кому: "}${escapeHtml(contact)}</strong>
                    <span class="lorgus-mail-state"><i></i>${delivered ? "Доставлено" : "В пути"}</span>
                </div>
                <div class="lorgus-mail-card-meta">
                    <span>${method.icon} ${method.label}</span><span>Отправлено ${formatMailDate(mail.sent_at)}</span>
                </div>
                <p>${escapeHtml(mail.body)}</p>
                <div class="lorgus-mail-card-route">
                    <div class="lorgus-mail-route-track"><span style="width:${progress}%"></span></div>
                    <small class="lorgus-mail-card-eta">${deliveryLabel}</small>
                </div>
                ${unread ? '<button class="lorgus-mail-mark-read" type="button" onclick="markLorgusMailRead(\\'' + escapeHtml(mail.id) + '\\')">Отметить прочитанным</button>' : ""}
            </article>
        `;
    }).join("");
}

function switchLorgusMailFolder(folder) {
    window.lorgusMailFolder = folder === "sent" ? "sent" : "inbox";
    document.getElementById("lorgus-mail-folder-inbox")?.classList.toggle("active", window.lorgusMailFolder === "inbox");
    document.getElementById("lorgus-mail-folder-sent")?.classList.toggle("active", window.lorgusMailFolder === "sent");
    const filter = document.getElementById("lorgus-mail-filter");
    if (filter) filter.value = "all";
    const search = document.getElementById("lorgus-mail-search");
    if (search) search.value = "";
    loadMailInbox();
}

function filterLorgusMail() {
    const query = (document.getElementById("lorgus-mail-search")?.value || "").trim().toLocaleLowerCase("ru-RU");
    const mode = document.getElementById("lorgus-mail-filter")?.value || "all";
    const cards = [...document.querySelectorAll("#lorgus-mail-inbox-list .lorgus-mail-card")];
    let visible = 0;
    cards.forEach(card => {
        const matchesQuery = !query || (card.dataset.mailSender || "").includes(query) || (card.dataset.mailBody || "").includes(query);
        const matchesMode = mode === "all" || (mode === "unread" && card.dataset.mailUnread === "true") || card.dataset.mailState === mode;
        card.hidden = !(matchesQuery && matchesMode);
        if (!card.hidden) visible++;
    });
    let empty = document.querySelector("#lorgus-mail-inbox-list .lorgus-mail-filter-empty");
    if (!visible && cards.length) {
        if (!empty) {
            empty = document.createElement("div");
            empty.className = "lorgus-mail-filter-empty";
            empty.innerHTML = "<span>⌕</span><h2>Ничего не найдено</h2><p>Измени запрос или фильтр писем.</p>";
            document.getElementById("lorgus-mail-inbox-list")?.appendChild(empty);
        }
        empty.hidden = false;
    } else if (empty) empty.hidden = true;
}

async function markAllLorgusMailRead() {
    const button = document.getElementById("lorgus-mail-read-all");
    if (!window.activeCharacterId || !button) return;
    button.disabled = true;
    const { error } = await window.supabaseClient
        .from("lorgus_mail")
        .update({ read_at: new Date().toISOString() })
        .eq("recipient_character_id", window.activeCharacterId)
        .is("read_at", null)
        .lte("deliver_at", new Date().toISOString());
    button.disabled = false;
    const status = document.getElementById("lorgus-mail-status");
    if (error) {
        if (status) status.textContent = "Не удалось отметить письма: " + error.message;
        return;
    }
    await loadMailInbox();
    filterLorgusMail();
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

    const method = document.getElementById("lorgus-mail-method")?.value === "courier" ? "courier" : "pigeon";
    const methodDetails = getMailMethodDetails(method);

    const { error } = await window.supabaseClient
        .from("lorgus_mail")
        .insert({
            sender_character_id: window.activeCharacterId,
            sender_player_id: userData.user.id,
            recipient_character_id: recipient,
            body,
            method
        });

    if (error) {
        console.error("Не удалось отправить письмо:", error);
        if (status) status.textContent = "Не удалось отправить письмо: " + error.message;
        return;
    }

    bodyInput.value = "";
    if (status) status.textContent = methodDetails.label + " отправлен. Ожидаемый срок доставки — около " + methodDetails.minutes + " мин.";
    await loadMailInbox();
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
