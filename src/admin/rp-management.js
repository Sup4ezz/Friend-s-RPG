/* LORGUS admin RP control room: all chats + NRP actors + NRP posting */

(() => {
    const state = {
        messages: [],
        chats: [],
        nrp: [],
        activeChatKey: null,
        filter: ""
    };

    const esc = value => window.escapeHtml(String(value ?? ""));
    const time = value => value
        ? new Date(value).toLocaleString("ru-RU", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" })
        : "—";

    function chatKey(row) {
        if (row.presence_type === "road") {
            return ["road", row.from_region, row.from_location, row.to_region, row.to_location].map(v => v || "").join("|");
        }
        return ["location", row.region || "", row.location || ""].join("|");
    }

    function chatLabel(row) {
        if (row.presence_type === "road") {
            return "Дорога · " + (row.from_location || "—") + " → " + (row.to_location || "—");
        }
        return (row.location || "Без локации") + " · " + (row.region || "Без края");
    }

    function chatDescriptor(row) {
        if (row.presence_type === "road") {
            return {
                type: "road",
                region: null,
                location: null,
                from_region: row.from_region,
                from_location: row.from_location,
                to_region: row.to_region,
                to_location: row.to_location
            };
        }
        return {
            type: "location",
            region: row.region,
            location: row.location,
            from_region: null,
            from_location: null,
            to_region: null,
            to_location: null
        };
    }

    function buildChatIndex(messages) {
        const map = new Map();
        for (const row of messages) {
            const key = chatKey(row);
            if (!map.has(key)) {
                map.set(key, {
                    key,
                    label: chatLabel(row),
                    descriptor: chatDescriptor(row),
                    lastMessageAt: row.created_at
                });
            } else if (new Date(row.created_at) > new Date(map.get(key).lastMessageAt)) {
                map.get(key).lastMessageAt = row.created_at;
            }
        }
        return [...map.values()].sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
    }

    async function loadAdminRpData() {
        const messages = [];
        const pageSize = 1000;
        for (let offset = 0; ; offset += pageSize) {
            const page = await window.supabaseClient
                .from("rp_messages")
                .select("id,character_id,body,created_at,status,reverted_at,revert_reason,presence_type,region,location,from_region,from_location,to_region,to_location,characters(id,name,race)")
                .order("created_at", { ascending: false })
                .range(offset, offset + pageSize - 1);
            if (page.error) throw page.error;
            messages.push(...(page.data || []));
            if (!page.data || page.data.length < pageSize) break;
        }

        const [nrpResult, presenceResult] = await Promise.all([
            window.supabaseClient
                .from("lorgus_nrp_characters")
                .select("character_id,is_active,created_at,characters(id,name,race,age,homeland,occupation,personality,backstory,special_skills,preferred_weapon,kingdom,location)")
                .order("created_at", { ascending: false }),
            window.supabaseClient
                .from("rp_presence")
                .select("presence_type,region,location,from_region,from_location,to_region,to_location,updated_at")
                .eq("visibility", "public")
        ]);

        if (nrpResult.error) throw nrpResult.error;
        if (presenceResult.error) throw presenceResult.error;

        state.messages = messages;
        state.nrp = nrpResult.data || [];
        state.chats = buildChatIndex(state.messages);

        for (const presence of (presenceResult.data || [])) {
            const key = chatKey(presence);
            if (!state.chats.some(chat => chat.key === key)) {
                state.chats.push({
                    key,
                    label: chatLabel(presence),
                    descriptor: chatDescriptor(presence),
                    lastMessageAt: presence.updated_at
                });
            }
        }
        state.chats.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
        if (!state.activeChatKey && state.chats[0]) state.activeChatKey = state.chats[0].key;
        if (state.activeChatKey && !state.chats.some(chat => chat.key === state.activeChatKey)) {
            state.activeChatKey = state.chats[0]?.key || null;
        }
    }

    function renderChatList(root) {
        const query = state.filter.trim().toLowerCase();
        const visible = state.chats.filter(chat => !query || chat.label.toLowerCase().includes(query));
        const box = root.querySelector(".admin-rp-chat-list");
        if (!box) return;

        box.innerHTML = visible.length
            ? visible.map(chat => {
                const count = state.messages.filter(row => chatKey(row) === chat.key).length;
                return `
                    <button type="button" class="admin-rp-chat-row ${chat.key === state.activeChatKey ? "active" : ""}" data-chat-key="${esc(chat.key)}">
                        <span class="admin-rp-chat-mark">${chat.descriptor.type === "road" ? "↗" : "✦"}</span>
                        <span><strong>${esc(chat.label)}</strong><small>${count} сообщений · ${esc(time(chat.lastMessageAt))}</small></span>
                    </button>`;
            }).join("")
            : '<div class="admin-rp-empty">Чаты не найдены.</div>';

        box.querySelectorAll("[data-chat-key]").forEach(button => {
            button.addEventListener("click", () => {
                state.activeChatKey = button.dataset.chatKey;
                renderChatList(root);
                renderChatMessages(root);
                syncComposerChat(root);
            });
        });
    }

    function renderChatMessages(root) {
        const box = root.querySelector(".admin-rp-message-list");
        const title = root.querySelector(".admin-rp-active-chat-title");
        const active = state.chats.find(chat => chat.key === state.activeChatKey);
        if (!box || !title) return;

        title.textContent = active?.label || "Чат не выбран";
        const rows = state.messages
            .filter(row => !active || chatKey(row) === active.key)
            .sort((a,b) => new Date(a.created_at) - new Date(b.created_at));

        box.innerHTML = rows.length
            ? rows.map(row => {
                const character = row.characters || {};
                const reverted = row.status === "reverted";
                return `
                    <article class="admin-rp-message ${reverted ? "reverted" : ""}">
                        <div class="admin-rp-message-avatar">✦</div>
                        <div class="admin-rp-message-main">
                            <div class="admin-rp-message-meta">
                                <strong>${esc(character.name || "Неизвестный персонаж")}</strong>
                                <span>${esc(character.race || "Персонаж")} · ${esc(time(row.created_at))} · #${esc(row.id)}</span>
                            </div>
                            <p>${esc(row.body)}</p>
                            ${reverted ? `<small class="admin-rp-message-reverted">Пост отменён${row.revert_reason ? " · " + esc(row.revert_reason) : ""}</small>` : ""}
                        </div>
                    </article>`;
            }).join("")
            : '<div class="admin-rp-empty">В этом чате сообщений пока нет.</div>';

        box.scrollTop = box.scrollHeight;
    }

    function renderNrpList(root) {
        const box = root.querySelector(".admin-rp-nrp-list");
        if (!box) return;

        box.innerHTML = state.nrp.length
            ? state.nrp.map(row => {
                const c = row.characters || {};
                return `
                    <article class="admin-rp-nrp-row ${row.is_active ? "" : "inactive"}">
                        <div class="admin-rp-nrp-avatar">✦</div>
                        <div>
                            <strong>${esc(c.name || "Без имени")}</strong>
                            <span>${esc(c.race || "НРП-персонаж")} · ${esc(c.occupation || "Занятие не указано")}</span>
                            <small>${row.is_active ? "АКТИВЕН" : "ОТКЛЮЧЁН"}</small>
                        </div>
                        <button type="button" data-nrp-toggle="${esc(row.character_id)}">${row.is_active ? "Отключить" : "Включить"}</button>
                    </article>`;
            }).join("")
            : '<div class="admin-rp-empty">НРП-персонажей пока нет. Создай первого справа.</div>';

        box.querySelectorAll("[data-nrp-toggle]").forEach(button => {
            button.addEventListener("click", async () => {
                button.disabled = true;
                const current = state.nrp.find(row => String(row.character_id) === String(button.dataset.nrpToggle));
                const { error } = await window.supabaseClient.rpc("admin_set_nrp_character_active", {
                    p_character_id: button.dataset.nrpToggle,
                    p_is_active: !current?.is_active
                });
                if (error) {
                    alert("Не удалось изменить статус НРП-персонажа:\n\n" + error.message);
                    button.disabled = false;
                    return;
                }
                await refreshAdminRp(root);
            });
        });
    }

    function syncComposerChat(root) {
        const select = root.querySelector(".admin-rp-composer-chat");
        if (!select) return;
        select.value = state.activeChatKey || "";
    }

    function renderComposerOptions(root) {
        const characterSelect = root.querySelector(".admin-rp-composer-character");
        const chatSelect = root.querySelector(".admin-rp-composer-chat");
        if (!characterSelect || !chatSelect) return;

        const activeNrp = state.nrp.filter(row => row.is_active);
        characterSelect.innerHTML = '<option value="">Выбери НРП-персонажа…</option>' +
            activeNrp.map(row => `<option value="${esc(row.character_id)}">${esc(row.characters?.name || "Без имени")}</option>`).join("");

        chatSelect.innerHTML = '<option value="">Выбери чат…</option>' +
            state.chats.map(chat => `<option value="${esc(chat.key)}">${esc(chat.label)}</option>`).join("");

        syncComposerChat(root);
    }

    async function submitNrpPost(root) {
        const characterSelect = root.querySelector(".admin-rp-composer-character");
        const chatSelect = root.querySelector(".admin-rp-composer-chat");
        const input = root.querySelector(".admin-rp-composer-input");
        const send = root.querySelector(".admin-rp-composer-send");
        const characterId = characterSelect?.value;
        const chat = state.chats.find(item => item.key === chatSelect?.value);
        const body = input?.value.trim();

        if (!characterId || !chat || !body) {
            alert("Выбери НРП-персонажа, чат и напиши пост.");
            return;
        }

        send.disabled = true;
        send.textContent = "Публикация…";

        const d = chat.descriptor;
        const { error } = await window.supabaseClient.rpc("admin_send_nrp_rp_message", {
            p_nrp_character_id: characterId,
            p_presence_type: d.type,
            p_region: d.region,
            p_location: d.location,
            p_from_region: d.from_region,
            p_from_location: d.from_location,
            p_to_region: d.to_region,
            p_to_location: d.to_location,
            p_body: body
        });

        if (error) {
            alert("Не удалось отправить НРП-пост:\n\n" + error.message);
            send.disabled = false;
            send.textContent = "Опубликовать";
            return;
        }

        input.value = "";
        send.disabled = false;
        send.textContent = "Опубликовать";
        await refreshAdminRp(root);
    }

    async function createNrpCharacter(root) {
        const form = root.querySelector(".admin-rp-nrp-create");
        if (!form) return;

        const get = name => form.querySelector("[name=" + name + "]");
        const name = get("name")?.value.trim();
        if (!name) {
            alert("Укажи имя НРП-персонажа.");
            return;
        }

        const button = form.querySelector("button[type=submit]");
        button.disabled = true;
        button.textContent = "Создание…";

        const payload = {
            p_name: name,
            p_race: get("race")?.value.trim() || null,
            p_age: get("age")?.value ? Number(get("age").value) : null,
            p_homeland: get("homeland")?.value.trim() || null,
            p_occupation: get("occupation")?.value.trim() || null,
            p_personality: get("personality")?.value.trim() || null,
            p_backstory: get("backstory")?.value.trim() || null,
            p_special_skills: get("special_skills")?.value.trim() || null,
            p_preferred_weapon: get("preferred_weapon")?.value.trim() || null,
            p_kingdom: get("kingdom")?.value.trim() || null,
            p_location: get("location")?.value.trim() || null
        };

        const { error } = await window.supabaseClient.rpc("admin_create_nrp_character", payload);
        if (error) {
            alert("Не удалось создать НРП-персонажа:\n\n" + error.message);
            button.disabled = false;
            button.textContent = "Создать НРП-персонажа";
            return;
        }

        form.reset();
        button.disabled = false;
        button.textContent = "Создать НРП-персонажа";
        await refreshAdminRp(root);
    }

    async function refreshAdminRp(root) {
        root.querySelector(".admin-rp-status").textContent = "Обновление…";
        try {
            await loadAdminRpData();
            renderChatList(root);
            renderChatMessages(root);
            renderNrpList(root);
            renderComposerOptions(root);
            root.querySelector(".admin-rp-status").textContent =
                state.messages.length + " сообщений · " + state.chats.length + " чатов · " + state.nrp.length + " НРП-персонажей";
        } catch (error) {
            console.error("Ошибка RP-админки:", error);
            root.querySelector(".admin-rp-status").textContent = "Ошибка загрузки";
            root.querySelector(".admin-rp-message-list").innerHTML =
                '<div class="admin-rp-empty"><strong>Не удалось загрузить RP-данные.</strong><p>' + esc(error.message) + '</p></div>';
        }
    }

    async function loadAdminRpManagement(container) {
        let root = container.querySelector(".admin-rp-control-room");
        if (root) {
            await refreshAdminRp(root);
            return;
        }

        root = document.createElement("section");
        root.className = "admin-section admin-rp-control-room";
        root.innerHTML = `
            <div class="admin-section-heading admin-rp-heading">
                <div>
                    <h2>Ролевая · контрольная комната</h2>
                    <p>Все RP-чаты, НРП-персонажи и публикация постов от их имени.</p>
                </div>
                <div class="admin-rp-status">Загрузка…</div>
            </div>

            <div class="admin-rp-layout">
                <section class="admin-rp-chat-browser">
                    <div class="admin-rp-chat-list-head">
                        <strong>ВСЕ ЧАТЫ</strong>
                        <button type="button" class="admin-rp-refresh">↻</button>
                    </div>
                    <input class="admin-rp-chat-search" type="search" placeholder="Поиск по локации или дороге…">
                    <div class="admin-rp-chat-list"></div>
                </section>

                <section class="admin-rp-chat-view">
                    <div class="admin-rp-chat-view-head">
                        <div>
                            <span>ПРОСМОТР RP</span>
                            <h3 class="admin-rp-active-chat-title">Чат не выбран</h3>
                        </div>
                    </div>
                    <div class="admin-rp-message-list"></div>
                </section>

                <section class="admin-rp-tools">
                    <div class="admin-rp-tool">
                        <span>НРП-ПОСТ</span>
                        <h3>Написать от лица персонажа</h3>
                        <p>Пост сразу появляется в выбранном RP-чате от имени НРП-персонажа.</p>
                        <select class="admin-rp-composer-character"></select>
                        <select class="admin-rp-composer-chat"></select>
                        <textarea class="admin-rp-composer-input" rows="7" maxlength="10000" placeholder="Действие, реплика или описание сцены…"></textarea>
                        <button type="button" class="admin-rp-composer-send">Опубликовать</button>
                    </div>

                    <div class="admin-rp-tool">
                        <span>НРП-ПЕРСОНАЖИ</span>
                        <h3>Актёры мира</h3>
                        <div class="admin-rp-nrp-list"></div>
                        <form class="admin-rp-nrp-create">
                            <input name="name" required maxlength="120" placeholder="Имя">
                            <input name="race" maxlength="80" placeholder="Раса">
                            <input name="age" type="number" min="0" max="999" placeholder="Возраст">
                            <input name="homeland" maxlength="120" placeholder="Родина">
                            <input name="kingdom" maxlength="120" placeholder="Королевство">
                            <input name="location" maxlength="120" placeholder="Локация">
                            <input name="occupation" maxlength="120" placeholder="Род занятий">
                            <input name="preferred_weapon" maxlength="120" placeholder="Оружие">
                            <input name="personality" maxlength="1000" placeholder="Характер">
                            <textarea name="backstory" rows="3" maxlength="5000" placeholder="Краткая предыстория"></textarea>
                            <textarea name="special_skills" rows="2" maxlength="2000" placeholder="Особые навыки"></textarea>
                            <button type="submit">Создать НРП-персонажа</button>
                        </form>
                    </div>
                </section>
            </div>
        `;

        container.appendChild(root);

        root.querySelector(".admin-rp-chat-search").addEventListener("input", event => {
            state.filter = event.target.value;
            renderChatList(root);
        });
        root.querySelector(".admin-rp-refresh").addEventListener("click", () => refreshAdminRp(root));
        root.querySelector(".admin-rp-composer-send").addEventListener("click", () => submitNrpPost(root));
        root.querySelector(".admin-rp-nrp-create").addEventListener("submit", event => {
            event.preventDefault();
            createNrpCharacter(root);
        });

        await refreshAdminRp(root);
    }

    window.loadAdminRpManagement = loadAdminRpManagement;
})();