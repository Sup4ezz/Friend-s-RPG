/* LORGUS shared interface and world render helpers */
function selectLorgusMapRegion(region) {
    const title = document.getElementById("lorgus-map-selection-title");
    const text = document.getElementById("lorgus-map-selection-text");
    const buttons = document.querySelectorAll(".lorgus-map-region-button");

    buttons.forEach(button => {
        button.classList.toggle("active", button.dataset.region === region);
    });

    const descriptions = {
        "Атэрон": "Знания, древности, исследования и руины.",
        "Каэлор": "Горы, кузницы, шахты и древнее мастерство.",
        "Ксандр": "Торговля, банки, дороги и большие рынки.",
        "Лирэн": "Леса, плодородные земли и древняя природа.",
        "Морвейн": "Паломничество, память и туманные долины.",
        "Святые Земли": "Нейтральная территория для переговоров монархов и глав церквей.",
        "Спорные Земли": "Независимые поселения и территории вне власти пяти королевств."
    };

    if (title) title.textContent = region;
    if (text) text.textContent = descriptions[region] || "Выбери край мира, чтобы узнать больше.";

    const enterButton = document.getElementById("lorgus-map-enter-button");
    if (!enterButton) return;

    const openable = Object.prototype.hasOwnProperty.call(descriptions, region);
    enterButton.disabled = !openable;
    enterButton.textContent = openable ? "Открыть край" : "Территория закрыта";
    enterButton.onclick = openable ? () => renderKingdomLocations(region) : null;
}

function renderCharacter(container, character) {
    renderLorgusWorldMap(container, character);
}

async function refreshLorgusNotificationBadge() {
    const badgeNodes = document.querySelectorAll(".lorgus-notification-badge");
    if (!badgeNodes.length || !window.lorgusCurrentUserId || !window.supabaseClient) return;

    const { count, error } = await window.supabaseClient
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null);

    if (error) {
        console.error("Не удалось загрузить счётчик уведомлений:", error);
        return;
    }

    badgeNodes.forEach(badge => {
        const unread = Number(count || 0);
        badge.textContent = unread > 99 ? "99+" : String(unread);
        badge.classList.toggle("visible", unread > 0);
    });
}

function formatLorgusNotificationTime(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    const diff = Math.max(0, Date.now() - date.getTime());
    if (diff < 60 * 1000) return "только что";
    if (diff < 60 * 60 * 1000) return Math.floor(diff / (60 * 1000)) + " мин назад";
    if (diff < 24 * 60 * 60 * 1000) return Math.floor(diff / (60 * 60 * 1000)) + " ч назад";

    return date.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

async function openLorgusNotifications() {
    const existing = document.querySelector(".lorgus-notifications-overlay");
    if (existing) {
        existing.remove();
        return;
    }

    const overlay = document.createElement("div");
    overlay.className = "lorgus-notifications-overlay";
    overlay.innerHTML = `
        <div class="lorgus-notifications-backdrop"></div>
        <article class="lorgus-notifications-panel">
            <button type="button" class="lorgus-notifications-close" aria-label="Закрыть">×</button>
            <div class="lorgus-notifications-heading">
                <div>
                    <span class="lorgus-command-kicker">ЛОРГУС · ВЕСТИ</span>
                    <h2>Уведомления</h2>
                    <p>События, которые произошли, пока тебя не было.</p>
                </div>
                <button type="button" class="lorgus-notifications-read-all">Прочитать всё</button>
            </div>
            <div class="lorgus-notifications-list">
                <div class="lorgus-notifications-loading">Загружаем вести...</div>
            </div>
        </article>
    `;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector(".lorgus-notifications-close").addEventListener("click", close);
    overlay.querySelector(".lorgus-notifications-backdrop").addEventListener("click", close);

    const list = overlay.querySelector(".lorgus-notifications-list");
    const readAll = overlay.querySelector(".lorgus-notifications-read-all");

    const render = rows => {
        if (!rows.length) {
            list.innerHTML = `
                <div class="lorgus-notifications-empty">
                    <span>✦</span>
                    <strong>Пока тихо</strong>
                    <p>Здесь появятся важные события, произошедшие в твоё отсутствие.</p>
                </div>
            `;
            return;
        }

        list.innerHTML = rows.map(row => `
            <button type="button"
                class="lorgus-notification-entry${row.read_at ? "" : " unread"}"
                data-notification-id="${escapeHtml(row.id)}">
                <span class="lorgus-notification-mark">${row.type === "currency_received" ? "₵" : "✦"}</span>
                <span class="lorgus-notification-content">
                    <strong>${escapeHtml(row.title)}</strong>
                    <span>${escapeHtml(row.body)}</span>
                    <small>${escapeHtml(formatLorgusNotificationTime(row.created_at))}</small>
                </span>
                ${row.read_at ? "" : '<i class="lorgus-notification-unread-dot"></i>'}
            </button>
        `).join("");

        list.querySelectorAll(".lorgus-notification-entry.unread").forEach(entry => {
            entry.addEventListener("click", async () => {
                const id = entry.dataset.notificationId;
                const { error } = await window.supabaseClient
                    .from("notifications")
                    .update({ read_at: new Date().toISOString() })
                    .eq("id", id)
                    .is("read_at", null);

                if (error) {
                    console.error("Не удалось отметить уведомление:", error);
                    return;
                }

                entry.classList.remove("unread");
                entry.querySelector(".lorgus-notification-unread-dot")?.remove();
                await refreshLorgusNotificationBadge();
            });
        });
    };

    const { data, error } = await window.supabaseClient
        .from("notifications")
        .select("id, type, title, body, read_at, created_at, data")
        .order("created_at", { ascending: false })
        .limit(50);

    if (error) {
        list.innerHTML = '<div class="lorgus-notifications-empty"><strong>Не удалось загрузить уведомления.</strong><p>' + escapeHtml(error.message) + '</p></div>';
        console.error("Не удалось загрузить уведомления:", error);
        return;
    }

    render(data || []);

    readAll.addEventListener("click", async () => {
        const now = new Date().toISOString();
        const { error: updateError } = await window.supabaseClient
            .from("notifications")
            .update({ read_at: now })
            .is("read_at", null);

        if (updateError) {
            alert("Не удалось отметить уведомления:\\n\\n" + updateError.message);
            return;
        }

        (data || []).forEach(row => { row.read_at = now; });
        render(data || []);
        await refreshLorgusNotificationBadge();
    });
}


async function openLorgusUpdateLog() {
    const existing = document.querySelector(".lorgus-update-log-overlay");
    if (existing) { existing.remove(); return; }

    const overlay = document.createElement("div");
    overlay.className = "lorgus-update-log-overlay";
    overlay.innerHTML = `
        <div class="lorgus-update-log-backdrop"></div>
        <article class="lorgus-update-log-panel">
            <button type="button" class="lorgus-update-log-close" aria-label="Закрыть">×</button>
            <div class="lorgus-update-log-heading">
                <span class="lorgus-command-kicker">ЛОРГУС · ЛЕТОПИСЬ</span>
                <h2>Обновления</h2>
                <p>Здесь остаётся история того, как меняется мир.</p>
            </div>
            <div class="lorgus-update-log-list"><div class="lorgus-update-log-loading">Загружаем летопись...</div></div>
        </article>`;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector(".lorgus-update-log-close").addEventListener("click", close);
    overlay.querySelector(".lorgus-update-log-backdrop").addEventListener("click", close);

    const list = overlay.querySelector(".lorgus-update-log-list");
    const { data, error } = await window.supabaseClient
        .from("lorgus_updates")
        .select("id,version,title,body,author,published_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false });

    if (error) {
        list.innerHTML = '<div class="lorgus-update-log-empty"><strong>Не удалось загрузить летопись.</strong><p>' + escapeHtml(error.message) + '</p></div>';
        return;
    }

    list.innerHTML = (data || []).map(update => `
        <article class="lorgus-update-entry">
            <div class="lorgus-update-entry-meta">
                <span>v${escapeHtml(update.version)}</span>
                <time>${escapeHtml(formatLorgusNotificationTime(update.published_at))}</time>
            </div>
            <h3>${escapeHtml(update.title)}</h3>
            <div class="lorgus-update-entry-body">${escapeHtml(update.body).replace(/\n/g, "<br>")}</div>
            <footer>Автор обновления: <strong>${escapeHtml(update.author)}</strong></footer>
        </article>`).join("") || '<div class="lorgus-update-log-empty"><strong>Летопись пока пуста.</strong></div>';
}

function renderLorgusInterfaceNav(active = "world") {
    const items = [
        ["overview", "⌂", "Обзор", "/overview"],
        ["world", "✦", "Мир", "/world"],
        ["character", "♙", "Персонаж", "/character"],
        ["rp", "◈", "Ролевая", "/rp"],
        ["people", "♧", "Люди", "/people"],
        ["mail", "✉", "Письма", "/mail"],
        ["inventory", "◈", "Инвентарь", "/inventory"]
    ];
    window.setTimeout(() => refreshLorgusNotificationBadge(), 0);

    return `
        <nav class="lorgus-global-nav" aria-label="Разделы Лоргуса">
            <div class="lorgus-global-brand"><span>✦</span><strong>ЛОРГУС</strong><small>ЖИВОЙ МИР</small></div>
            <div class="lorgus-global-links">
                ${items.map(([id, icon, label, action]) => `
                    <button type="button" class="${id === active ? "active" : ""}" data-route="${action}">
                        <span>${icon}</span><b>${label}</b>
                    </button>`).join("")}
            </div>
            <div class="lorgus-global-account">
                <div class="lorgus-global-presence"><i></i><span>МИР АКТИВЕН</span></div>
                <span class="lorgus-global-user">${escapeHtml(window.lorgusCurrentUsername || "Игрок")}</span>${renderTitleBadge(window.activeTitle, "lorgus-global-nav-title")}
                <button type="button" class="lorgus-notification-trigger" onclick="openLorgusNotifications()" aria-label="Уведомления" title="Уведомления">
                    <span class="lorgus-notification-icon">♢</span>
                    <b class="lorgus-notification-badge"></b>
                </button>
                <button type="button" class="lorgus-global-logout" onclick="logout()">ВЫЙТИ</button>
            </div>
        </nav>
    `;
}

function renderLorgusOverview() {
    const container = document.getElementById("cabinet-content");
    const character = window.activeCharacter;
    if (!container || !character) return;

    const name = escapeHtml(character.name || "Без имени");
    const race = escapeHtml(character.race || "Раса не указана");
    const homeland = escapeHtml(character.homeland || "Родина не указана");
    const presence = window.activeRpPresence;
    const place = presence?.type === "location" ? presence.location : presence?.type === "road" ? "В пути" : "Не определено";

    container.className = "lorgus-command-page";
    container.innerHTML = `
        ${renderLorgusInterfaceNav("overview")}
        <main class="lorgus-command-main">
            <section class="lorgus-command-hero">
                <div>
                    <span class="lorgus-command-kicker">ЛОРГУС · ЛИЧНАЯ ХРОНИКА</span>
                    <h1>${name}</h1>
                    <p>${race} · Родина: ${homeland}</p>
                </div>
                <div class="lorgus-command-status"><i></i><span>МИР ПРОДОЛЖАЕТСЯ</span><small>Даже когда тебя нет</small></div>
            </section>
            <section class="lorgus-command-grid">
                <article class="lorgus-command-card command-location">
                    <span>ФИЗИЧЕСКОЕ ПОЛОЖЕНИЕ</span><strong>${escapeHtml(place)}</strong>
                    <small>Положение персонажа фиксируется только ролевым действием.</small>
                    <button type="button" onclick="renderLorgusWorldMapCurrent()">Открыть карту →</button>
                </article>
                <article class="lorgus-command-card"><span>ПЕРСОНАЖ</span><strong>История и состояние</strong><small>Характеристики, навыки, снаряжение, деньги и биография.</small><button type="button" onclick="renderLorgusCharacterHub()">Открыть досье →</button></article>
                <article class="lorgus-command-card"><span>РОЛЕВАЯ</span><strong>Текущая сцена</strong><small>Место, участники, сообщения и последствия действий.</small><button type="button" onclick="renderLorgusRpHub()">Войти в RP →</button></article>
                <article class="lorgus-command-card"><span>СВЯЗИ</span><strong>Люди мира</strong><small>Знакомства, отношения и персонажи, находящиеся рядом с историей.</small><button type="button" onclick="renderWorldCharacterTracker()">Люди мира →</button></article>
                <article class="lorgus-command-card"><span>ЛЕТОПИСЬ</span><strong>Обновления ЛОРГУСА</strong><small>Новые версии, изменения мира и сообщения от создателей проекта.</small><button type="button" onclick="openLorgusUpdateLog()">Открыть летопись →</button></article>
                <article class="lorgus-command-card command-mail"><span>ПОСЛАНИЯ</span><strong>Письма</strong><small>Связь с другими персонажами независимо от расстояния.</small><button type="button" onclick="renderMail()">Открыть почту →</button></article>
            </section>
            <section class="lorgus-command-bottom">
                <div><span class="lorgus-command-kicker">ПРИНЦИП ЛОРГУСА</span><h2>Ты не главный герой этого мира.</h2><p>Королевства принимают решения, торговцы ведут дела, люди рождаются и умирают, армии двигаются, а слухи распространяются — независимо от того, смотришь ли ты на это.</p></div>
                <div class="lorgus-command-metrics"><div><b>07</b><span>КРАЁВ</span></div><div><b>∞</b><span>ИСТОРИЙ</span></div><div><b>01</b><span>ТВОЯ ЖИЗНЬ</span></div></div>
            </section>
        </main>
    `;
}

function renderLorgusWorldMapCurrent() {
    const container = document.getElementById("cabinet-content");
    if (container && window.activeCharacter) renderLorgusWorldMap(container, window.activeCharacter);
}




window.renderLorgusWorldMapCurrent = renderLorgusWorldMapCurrent;
window.renderLorgusRpHub = renderLorgusRpHub;
window.openTitlePicker = openTitlePicker;
window.openAdminCharacterTitles = openAdminCharacterTitles;
window.openAdminCharacterAbilities = openAdminCharacterAbilities;
window.renderLorgusInventory = renderLorgusInventory;
window.openAdminCharacterInventory = openAdminCharacterInventory;

window.selectLorgusMapRegion = selectLorgusMapRegion;
window.selectLorgusMapMarker = selectLorgusMapMarker;
window.handleLorgusMapSurfaceClick = handleLorgusMapSurfaceClick;
window.lorgusMapZoom = lorgusMapZoom;
window.lorgusMapReset = lorgusMapReset;


/* =========================================================
   LORGUS // THREE.JS DEPTH GATE
   ========================================================= */
async function appendRpMessage(message) {
    const feed = document.getElementById("lorgus-rp-feed");
    if (!feed || feed.querySelector('[data-rp-message-id="' + message.id + '"]')) return;
    const empty = feed.querySelector(".lorgus-messenger-start");
    if (empty) empty.remove();

    const photo = await getRpCharacterPhoto(message.character_id);
    const mine = String(message.character_id) === String(window.activeCharacterId);
    const article = document.createElement("article");
    article.className = "lorgus-messenger-message" + (mine ? " mine" : "") + (message.status === "reverted" ? " reverted" : "");
    article.dataset.rpMessageId = message.id;
    const time = new Date(message.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

    article.innerHTML =
        '<div class="lorgus-messenger-message-avatar">' +
            (photo ? '<img src="' + escapeHtml(photo) + '" alt="">' : '<span>✦</span>') +
        '</div>' +
        '<div class="lorgus-messenger-message-content">' +
            '<div class="lorgus-messenger-message-meta"><strong>' + escapeHtml(message.characters?.name || "Без имени") + '</strong><time>' + escapeHtml(time) + '</time></div>' +
            '<div class="lorgus-messenger-bubble">' +
                '<p>' + escapeHtml(message.body) + '</p>' +
                (message.status === "reverted" ? '<div class="lorgus-rp-reverted-mark">Пост отменён администрацией' + (message.revert_reason ? ' · ' + escapeHtml(message.revert_reason) : '') + '</div>' : '') +
                '<div class="lorgus-rp-item-uses"></div>' +
            '</div>' +
        '</div>';

    feed.appendChild(article);

    const characterLink = article.querySelector(".lorgus-messenger-message-meta strong");
    if (characterLink && typeof window.openRpCharacterQuickCard === "function") {
        characterLink.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            window.openRpCharacterQuickCard(message.character_id, characterLink);
        });
    }

    const { data: uses, error } = await window.supabaseClient
        .from("rp_message_item_uses")
        .select("item_id, quantity, status, items(name, icon, color, rarity)")
        .eq("message_id", message.id)
        .eq("status", "active");

    const useBox = article.querySelector(".lorgus-rp-item-uses");
    if (useBox && !error && uses?.length) {
        useBox.innerHTML = uses.map(use => {
            const item = use.items || {};
            return '<span class="lorgus-rp-item-use" style="--item-color:' + escapeHtml(item.color || "#d6b36a") + '"><span>' + escapeHtml(item.icon || "◆") + '</span><strong>' + escapeHtml(item.name || "Предмет") + '</strong>' + (use.quantity > 1 ? '<small>×' + escapeHtml(String(use.quantity)) + '</small>' : '') + '</span>';
        }).join("");
    }
    feed.scrollTop = feed.scrollHeight;
}

window.selectLorgusMapRegion = selectLorgusMapRegion;
window.renderCharacter = renderCharacter;
window.refreshLorgusNotificationBadge = refreshLorgusNotificationBadge;
window.formatLorgusNotificationTime = formatLorgusNotificationTime;
window.openLorgusNotifications = openLorgusNotifications;
window.renderLorgusInterfaceNav = renderLorgusInterfaceNav;
window.renderLorgusOverview = renderLorgusOverview;
window.renderLorgusWorldMapCurrent = renderLorgusWorldMapCurrent;
window.appendRpMessage = appendRpMessage;
