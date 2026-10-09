/* LORGUS admin RP control room: all chats + RP actors + RP posting */

(() => {
    const state = {
        messages: [],
        chats: [],
        rpCharacters: [],
        allCharacters: [],
        portraitFilter: "",
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
                .select("id,character_id,body,created_at,status,reverted_at,revert_reason,presence_type,region,location,from_region,from_location,to_region,to_location,characters(id,name,race,photo_path)")
                .order("created_at", { ascending: false })
                .range(offset, offset + pageSize - 1);
            if (page.error) throw page.error;
            messages.push(...(page.data || []));
            if (!page.data || page.data.length < pageSize) break;
        }

        const [rpCharactersResult, presenceResult] = await Promise.all([
            window.supabaseClient
                .from("lorgus_nrp_characters")
                .select("character_id,is_active,created_at,characters(id,name,race,age,homeland,occupation,personality,backstory,special_skills,preferred_weapon,kingdom,location,photo_path)")
                .order("created_at", { ascending: false }),
            window.supabaseClient
                .from("rp_presence")
                .select("presence_type,region,location,from_region,from_location,to_region,to_location,updated_at")
                .eq("visibility", "public")
        ]);

        if (rpCharactersResult.error) throw rpCharactersResult.error;
        if (presenceResult.error) throw presenceResult.error;

        state.messages = messages;
        state.rpCharacters = rpCharactersResult.data || [];
        const allCharactersResult = await window.supabaseClient
            .from("characters")
            .select("id,name,race,kingdom,location,photo_path")
            .order("name", { ascending: true });
        if (allCharactersResult.error) throw allCharactersResult.error;
        state.allCharacters = allCharactersResult.data || [];
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
        const chatCount = root.querySelector("[data-rp-chat-count]");
        if (chatCount) chatCount.textContent = visible.length + " / " + state.chats.length;

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
                        <div class="admin-rp-message-avatar" data-message-avatar="${esc(row.character_id)}" data-photo-path="${esc(character.photo_path || "")}">${character.photo_path ? "" : "✦"}</div>
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
        hydrateMessageAvatars(box);
    }

    async function hydrateMessageAvatars(box) {
        const avatars = Array.from(box.querySelectorAll(".admin-rp-message-avatar[data-photo-path]"));
        await Promise.all(avatars.map(async avatar => {
            const path = avatar.dataset.photoPath;
            if (!path) return;
            try {
                const { data, error } = await window.supabaseClient.storage.from("character-applications").createSignedUrl(path, 3600);
                if (!error && data?.signedUrl && avatar.isConnected) {
                    avatar.innerHTML = '<img src="' + esc(data.signedUrl) + '" alt="">';
                }
            } catch (_) {}
        }));
    }

    async function editPortraitImage(file) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const image = new Image();
            image.onload = () => {
                const overlay = document.createElement("div");
                overlay.className = "admin-rp-crop-overlay";
                overlay.innerHTML = `
                    <section class="admin-rp-crop-dialog" role="dialog" aria-modal="true" aria-label="Настройка портрета">
                        <header><strong>Настроить портрет</strong><button type="button" data-crop-cancel aria-label="Закрыть">×</button></header>
                        <p>Меняй размер персонажа и двигай его внутри рамки. Результат сохранится для всех мест, где показывается портрет.</p>
                        <div class="admin-rp-crop-stage"><canvas width="440" height="440"></canvas></div>
                        <label>Размер персонажа <output data-crop-zoom>100%</output><input data-crop-zoom-range type="range" min="50" max="500" value="100"></label>
                        <label>По горизонтали <output data-crop-x>0</output><input data-crop-x-range type="range" min="-100" max="100" value="0"></label>
                        <label>По вертикали <output data-crop-y>0</output><input data-crop-y-range type="range" min="-100" max="100" value="0"></label>
                        <footer><button type="button" data-crop-reset>Сбросить</button><button type="button" data-crop-save>Применить портрет</button></footer>
                    </section>`;
                document.body.appendChild(overlay);
                const canvas = overlay.querySelector("canvas");
                const ctx = canvas.getContext("2d");
                const zoomInput = overlay.querySelector("[data-crop-zoom-range]");
                const xInput = overlay.querySelector("[data-crop-x-range]");
                const yInput = overlay.querySelector("[data-crop-y-range]");
                let zoom = 1, offsetX = 0, offsetY = 0;
                const draw = () => {
                    const W = canvas.width, H = canvas.height;
                    const scale = Math.max(W / image.naturalWidth, H / image.naturalHeight) * zoom;
                    const dw = image.naturalWidth * scale, dh = image.naturalHeight * scale;
                    const maxX = Math.max(0, (dw - W) / 2), maxY = Math.max(0, (dh - H) / 2);
                    const x = (W - dw) / 2 + maxX * offsetX / 100;
                    const y = (H - dh) / 2 + maxY * offsetY / 100;
                    ctx.clearRect(0, 0, W, H);
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(W / 2, H / 2, Math.min(W, H) / 2, 0, Math.PI * 2);
                    ctx.clip();
                    ctx.fillStyle = "#11100d";
                    ctx.fillRect(0, 0, W, H);
                    ctx.drawImage(image, x, y, dw, dh);
                    ctx.restore();
                    overlay.querySelector("[data-crop-zoom]").textContent = Math.round(zoom * 100) + "%";
                    overlay.querySelector("[data-crop-x]").textContent = offsetX;
                    overlay.querySelector("[data-crop-y]").textContent = offsetY;
                };
                const close = () => { URL.revokeObjectURL(url); overlay.remove(); };
                const cancel = () => { close(); resolve(null); };
                overlay.querySelector("[data-crop-cancel]").addEventListener("click", cancel);
                overlay.addEventListener("click", e => { if (e.target === overlay) cancel(); });
                zoomInput.addEventListener("input", () => { zoom = Number(zoomInput.value) / 100; draw(); });
                xInput.addEventListener("input", () => { offsetX = Number(xInput.value); draw(); });
                yInput.addEventListener("input", () => { offsetY = Number(yInput.value); draw(); });
                overlay.querySelector("[data-crop-reset]").addEventListener("click", () => {
                    zoom = 1; offsetX = 0; offsetY = 0;
                    zoomInput.value = 100; xInput.value = 0; yInput.value = 0; draw();
                });
                overlay.querySelector("[data-crop-save]").addEventListener("click", () => {
                    const output = document.createElement("canvas");
                    output.width = canvas.width;
                    output.height = canvas.height;
                    const outCtx = output.getContext("2d");
                    outCtx.clearRect(0, 0, output.width, output.height);
                    outCtx.save();
                    outCtx.beginPath();
                    outCtx.arc(output.width / 2, output.height / 2, Math.min(output.width, output.height) / 2, 0, Math.PI * 2);
                    outCtx.clip();
                    outCtx.drawImage(canvas, 0, 0);
                    outCtx.restore();
                    output.toBlob(blob => {
                        if (!blob) { alert("Не удалось подготовить изображение."); return; }
                        close(); resolve(blob);
                    }, "image/png");
                });
                draw();
            };
            image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Не удалось открыть изображение.")); };
            image.src = url;
        });
    }

    function renderRpList(root) {
        const box = root.querySelector(".admin-rp-nrp-list");
        if (!box) return;

        box.innerHTML = state.rpCharacters.length
            ? state.rpCharacters.map(row => {
                const c = row.characters || {};
                return `
                    <article class="admin-rp-nrp-row ${row.is_active ? "" : "inactive"}">
                        <div class="admin-rp-nrp-avatar">${c.photo_path ? "◉" : "✦"}</div>
                        <div>
                            <strong>${esc(c.name || "Без имени")}</strong>
                            <span>${esc(c.race || "RP-персонаж")} · ${esc(c.occupation || "Занятие не указано")}</span>
                            <small>${c.photo_path ? "ПОРТРЕТ ЗАГРУЖЕН" : "НЕТ ПОРТРЕТА"} · ${row.is_active ? "АКТИВЕН" : "ОТКЛЮЧЁН"}</small>
                        </div>
                        <button type="button" data-nrp-toggle="${esc(row.character_id)}">${row.is_active ? "Отключить" : "Включить"}</button>
                        <label class="admin-rp-photo-upload ${c.photo_path ? "has-photo" : ""}">Загрузить портрет<input type="file" accept="image/png,image/jpeg,image/webp,image/avif" data-rp-photo="${esc(row.character_id)}"></label>
                    </article>`;
            }).join("")
            : '<div class="admin-rp-empty">RP-персонажей пока нет. Создай первого справа.</div>';

        box.querySelectorAll("[data-rp-photo]").forEach(input => {
            input.addEventListener("change", async () => {
                const file = input.files?.[0];
                const characterId = input.dataset.rpPhoto;
                if (!file || !characterId) return;
                if (!/^image\/(png|jpeg|webp|avif)$/.test(file.type) || file.size > 8 * 1024 * 1024) {
                    alert("Выбери PNG, JPG, WEBP или AVIF размером не более 8 МБ.");
                    input.value = "";
                    return;
                }
                input.disabled = true;
                try {
                    const editedBlob = await editPortraitImage(file);
                    if (!editedBlob) { input.disabled = false; input.value = ""; return; }
                    const path = "rp-characters/" + characterId + "/" + Date.now() + "-portrait.png";
                    const { error: uploadError } = await window.supabaseClient.storage.from("character-applications")
                        .upload(path, editedBlob, { upsert: true, contentType: "image/png" });
                    if (uploadError) throw uploadError;
                    const { error: saveError } = await window.supabaseClient.rpc("admin_set_rp_character_photo", {
                        p_character_id: characterId,
                        p_photo_path: path
                    });
                    if (saveError) throw saveError;
                    window.rpCharacterPhotoCache = window.rpCharacterPhotoCache || {};
                    delete window.rpCharacterPhotoCache[String(characterId)];
                    await refreshAdminRp(root);
                } catch (error) {
                    console.error("Не удалось сохранить портрет RP-персонажа:", error);
                    alert("Не удалось загрузить портрет:\n\n" + (error.message || error));
                    input.disabled = false;
                }
            });
        });

        box.querySelectorAll("[data-nrp-toggle]").forEach(button => {
            button.addEventListener("click", async () => {
                button.disabled = true;
                const current = state.rpCharacters.find(row => String(row.character_id) === String(button.dataset.nrpToggle));
                const { error } = await window.supabaseClient.rpc("admin_set_nrp_character_active", {
                    p_character_id: button.dataset.nrpToggle,
                    p_is_active: !current?.is_active
                });
                if (error) {
                    alert("Не удалось изменить статус RP-персонажа:\n\n" + error.message);
                    button.disabled = false;
                    return;
                }
                await refreshAdminRp(root);
            });
        });
    }

    async function renderPortraitLibrary(root) {
        const box = root.querySelector(".admin-rp-portrait-library");
        const search = root.querySelector(".admin-rp-portrait-search");
        if (!box) return;
        const query = (search?.value || state.portraitFilter || "").trim().toLocaleLowerCase("ru-RU");
        const rows = state.allCharacters.filter(c =>
            !query || [c.name, c.race, c.kingdom, c.location].some(v => String(v || "").toLocaleLowerCase("ru-RU").includes(query))
        );
        box.innerHTML = rows.length ? rows.map(c => `
            <article class="admin-rp-portrait-row">
                <div class="admin-rp-portrait-preview" data-portrait-preview="${esc(c.id)}"><span>✦</span></div>
                <div class="admin-rp-portrait-info">
                    <strong>${esc(c.name || "Без имени")}</strong>
                    <small>${esc([c.race, c.kingdom, c.location].filter(Boolean).join(" · ") || "Данные не указаны")}</small>
                    <em>${c.photo_path ? "ПОРТРЕТ ПРИКРЕПЛЁН" : "ПОРТРЕТ НЕ НАЗНАЧЕН"}</em>
                </div>
                <label class="admin-rp-photo-upload ${c.photo_path ? "has-photo" : ""}">${c.photo_path ? "Заменить фото" : "Загрузить фото"}<input type="file" accept="image/png,image/jpeg,image/webp,image/avif" data-character-portrait="${esc(c.id)}"></label>
            </article>`).join("") : '<div class="admin-rp-empty">Персонажи не найдены.</div>';

        for (const c of rows) {
            if (!c.photo_path) continue;
            const target = box.querySelector('[data-portrait-preview="' + c.id + '"]');
            if (!target) continue;
            try {
                const { data, error } = await window.supabaseClient.storage.from("character-applications").createSignedUrl(c.photo_path, 3600);
                if (!error && data?.signedUrl && target.isConnected) target.innerHTML = '<img src="' + esc(data.signedUrl) + '" alt="">';
            } catch (_) {}
        }

        box.querySelectorAll("[data-character-portrait]").forEach(input => {
            input.addEventListener("change", async () => {
                const file = input.files?.[0];
                const characterId = input.dataset.characterPortrait;
                if (!file || !characterId) return;
                if (!/^image\/(png|jpeg|webp|avif)$/.test(file.type) || file.size > 8 * 1024 * 1024) {
                    alert("Выбери PNG, JPG, WEBP или AVIF размером не более 8 МБ.");
                    input.value = "";
                    return;
                }
                input.disabled = true;
                try {
                    const editedBlob = await editPortraitImage(file);
                    if (!editedBlob) { input.disabled = false; input.value = ""; return; }
                    const path = "rp-characters/" + characterId + "/" + Date.now() + "-portrait.png";
                    const { error: uploadError } = await window.supabaseClient.storage.from("character-applications")
                        .upload(path, editedBlob, { upsert: true, contentType: "image/png" });
                    if (uploadError) throw uploadError;
                    const { error: saveError } = await window.supabaseClient.rpc("admin_set_rp_character_photo", {
                        p_character_id: characterId, p_photo_path: path
                    });
                    if (saveError) throw saveError;
                    window.rpCharacterPhotoCache = window.rpCharacterPhotoCache || {};
                    delete window.rpCharacterPhotoCache[String(characterId)];
                    await refreshAdminRp(root);
                } catch (error) {
                    console.error("Не удалось прикрепить портрет:", error);
                    alert("Не удалось загрузить или прикрепить фото:\n\n" + (error.message || error));
                    input.disabled = false;
                }
            });
        });
    }

    function syncComposerChat(root) {
        const select = root.querySelector(".admin-rp-composer-chat");
        if (!select) return;
        select.value = state.activeChatKey || "";
    }

    function renderComposerCharacterPicker(root) {
        const characterSelect = root.querySelector(".admin-rp-composer-character");
        const search = root.querySelector(".admin-rp-character-search");
        const results = root.querySelector(".admin-rp-character-results");
        const selected = root.querySelector(".admin-rp-character-selected");
        if (!characterSelect || !search || !results || !selected) return;

        const activeNrp = state.rpCharacters.filter(row => row.is_active);
        const selectedRow = activeNrp.find(row => String(row.character_id) === String(characterSelect.value));
        selected.innerHTML = selectedRow
            ? `<span class="admin-rp-selected-check">✓</span><span><small>ВЫБРАН ПЕРСОНАЖ</small><strong>${esc(selectedRow.characters?.name || "Без имени")}</strong><em>${esc([selectedRow.characters?.race, selectedRow.characters?.kingdom].filter(Boolean).join(" · ") || "RP-персонаж")}</em></span><button type="button" class="admin-rp-character-clear" aria-label="Сбросить выбор">×</button>`
            : '<span class="admin-rp-selected-empty">Персонаж не выбран</span>';

        const query = search.value.trim().toLocaleLowerCase("ru-RU");
        if (!query) {
            results.innerHTML = '<div class="admin-rp-character-hint">Начни вводить имя, расу или королевство — покажу подходящих персонажей.</div>';
            results.hidden = false;
            return;
        }

        const matches = activeNrp.filter(row => {
            const c = row.characters || {};
            return [c.name, c.race, c.kingdom, c.location, c.occupation]
                .some(value => String(value || "").toLocaleLowerCase("ru-RU").includes(query));
        }).slice(0, 12);

        results.innerHTML = matches.length ? matches.map(row => {
            const c = row.characters || {};
            const isSelected = String(row.character_id) === String(characterSelect.value);
            return `<button type="button" class="admin-rp-character-result ${isSelected ? "is-selected" : ""}" data-rp-character-choice="${esc(row.character_id)}">
                <span class="admin-rp-character-result-mark">${isSelected ? "✓" : "✦"}</span>
                <span><strong>${esc(c.name || "Без имени")}</strong><small>${esc([c.race, c.kingdom, c.location].filter(Boolean).join(" · ") || "RP-персонаж")}</small></span>
                <em>${isSelected ? "ВЫБРАН" : "ВЫБРАТЬ"}</em>
            </button>`;
        }).join("") : '<div class="admin-rp-character-hint">Ничего не найдено. Попробуй другое имя или часть названия.</div>';
        results.hidden = false;

        results.querySelectorAll("[data-rp-character-choice]").forEach(button => {
            button.addEventListener("click", () => {
                characterSelect.value = button.dataset.rpCharacterChoice;
                renderComposerCharacterPicker(root);
            });
        });
        selected.querySelector(".admin-rp-character-clear")?.addEventListener("click", () => {
            characterSelect.value = "";
            search.value = "";
            renderComposerCharacterPicker(root);
            search.focus();
        });
    }

    function renderComposerOptions(root) {
        const characterSelect = root.querySelector(".admin-rp-composer-character");
        const chatSelect = root.querySelector(".admin-rp-composer-chat");
        if (!characterSelect || !chatSelect) return;

        const activeNrp = state.rpCharacters.filter(row => row.is_active);
        const previousCharacterId = characterSelect.value;
        characterSelect.innerHTML = '<option value="">Выбери RP-персонажа…</option>' +
            activeNrp.map(row => `<option value="${esc(row.character_id)}">${esc(row.characters?.name || "Без имени")}</option>`).join("");
        if (activeNrp.some(row => String(row.character_id) === String(previousCharacterId))) {
            characterSelect.value = previousCharacterId;
        }

        chatSelect.innerHTML = '<option value="">Выбери чат…</option>' +
            state.chats.map(chat => `<option value="${esc(chat.key)}">${esc(chat.label)}</option>`).join("");

        syncComposerChat(root);
        const pendingId = window.lorgusPendingRpCharacterId;
        if (pendingId && Array.from(characterSelect.options).some(option => option.value === String(pendingId))) {
            characterSelect.value = String(pendingId);
            window.lorgusPendingRpCharacterId = null;
        }
        renderComposerCharacterPicker(root);
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
            alert("Выбери RP-персонажа, чат и напиши пост.");
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
            alert("Не удалось отправить RP-пост:\n\n" + error.message);
            send.disabled = false;
            send.textContent = "Опубликовать";
            return;
        }

        input.value = "";
        send.disabled = false;
        send.textContent = "Опубликовать";
        await refreshAdminRp(root);
    }

    async function createRpCharacter(root) {
        const form = root.querySelector(".admin-rp-nrp-create");
        if (!form) return;

        const get = name => form.querySelector("[name=" + name + "]");
        const name = get("name")?.value.trim();
        if (!name) {
            alert("Укажи имя RP-персонажа.");
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
            alert("Не удалось создать RP-персонажа:\n\n" + error.message);
            button.disabled = false;
            button.textContent = "Создать RP-персонажа";
            return;
        }

        form.reset();
        button.disabled = false;
        button.textContent = "Создать RP-персонажа";
        await refreshAdminRp(root);
    }

    async function refreshAdminRp(root) {
        root.querySelector(".admin-rp-status").textContent = "Обновление…";
        try {
            await loadAdminRpData();
            renderChatList(root);
            renderChatMessages(root);
            renderRpList(root);
            renderPortraitLibrary(root);
            renderComposerOptions(root);
            root.querySelector(".admin-rp-status").textContent =
                state.messages.length + " сообщений · " + state.chats.length + " чатов · " + state.rpCharacters.length + " RP-персонажей";
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
                    <span class="admin-rp-eyebrow">LORGUS / CONTROL DESK</span>
                    <h2>Ролевая комната</h2>
                    <p>Чаты, игровые посты, персонажи и портреты — в одном рабочем пространстве.</p>
                </div>
                <div class="admin-rp-heading-actions">
                    <span class="admin-rp-status">Загрузка…</span>
                    <button type="button" class="admin-rp-refresh" aria-label="Обновить данные" title="Обновить данные">↻ Обновить</button>
                </div>
            </div>

            <div class="admin-rp-layout">
                <aside class="admin-rp-chat-browser">
                    <div class="admin-rp-panel-heading">
                        <div><span>01 / НАВИГАЦИЯ</span><strong>Игровые чаты</strong></div>
                        <span class="admin-rp-chat-count" data-rp-chat-count>—</span>
                    </div>
                    <label class="admin-rp-search-wrap"><span>НАЙТИ ЛОКАЦИЮ</span><input class="admin-rp-chat-search" type="search" placeholder="Локация, регион или дорога…"></label>
                    <div class="admin-rp-chat-list"></div>
                </aside>

                <section class="admin-rp-chat-view">
                    <div class="admin-rp-chat-view-head">
                        <div><span>02 / ЛЕНТА СОБЫТИЙ</span><h3 class="admin-rp-active-chat-title">Чат не выбран</h3></div>
                        <span class="admin-rp-live-mark"><i></i> RP-ЛЕНТА</span>
                    </div>
                    <div class="admin-rp-message-list"></div>
                </section>

                <aside class="admin-rp-tools">
                    <details class="admin-rp-tool admin-rp-composer-tool">
                        <summary class="admin-rp-tool-summary"><span class="admin-rp-tool-number">03</span><span><small>ПУБЛИКАЦИЯ</small><strong>Написать RP-пост</strong></span><i>⌄</i></summary>
                        <div class="admin-rp-tool-content">
                            <p>Выбери персонажа и чат. Пост появится в ленте от имени выбранного персонажа.</p>
                            <div class="admin-rp-character-picker">
                                <label class="admin-rp-character-search-label">НАЙТИ RP-ПЕРСОНАЖА<input class="admin-rp-character-search" type="search" autocomplete="off" placeholder="Начни вводить имя, расу или королевство…"></label>
                                <div class="admin-rp-character-selected" aria-live="polite"><span class="admin-rp-selected-empty">Персонаж не выбран</span></div>
                                <div class="admin-rp-character-results" aria-label="Результаты поиска"></div>
                                <select class="admin-rp-composer-character" aria-hidden="true" tabindex="-1"></select>
                            </div>
                            <label>Чат<select class="admin-rp-composer-chat"></select></label>
                            <textarea class="admin-rp-composer-input" rows="6" maxlength="10000" placeholder="Опиши действие, реплику или сцену…"></textarea>
                            <button type="button" class="admin-rp-composer-send">Опубликовать пост <span>↗</span></button>
                        </div>
                    </details>

                    <details class="admin-rp-tool admin-rp-portrait-tool">
                        <summary class="admin-rp-tool-summary"><span class="admin-rp-tool-number">04</span><span><small>ВИЗУАЛ</small><strong>Портреты персонажей</strong></span><i>⌄</i></summary>
                        <div class="admin-rp-tool-content">
                            <p>Поиск по персонажам и управление изображениями, используемыми в RP.</p>
                            <input class="admin-rp-portrait-search" type="search" placeholder="Имя, раса или королевство…">
                            <div class="admin-rp-portrait-library"></div>
                        </div>
                    </details>

                    <details class="admin-rp-tool admin-rp-actors-tool">
                        <summary class="admin-rp-tool-summary"><span class="admin-rp-tool-number">05</span><span><small>УПРАВЛЕНИЕ МИРОМ</small><strong>RP-персонажи</strong></span><i>⌄</i></summary>
                        <div class="admin-rp-tool-content">
                            <p>Персонажи, которыми управляет администрация.</p>
                            <div class="admin-rp-nrp-list"></div>
                            <details class="admin-rp-create-details">
                                <summary>＋ Создать RP-персонажа</summary>
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
                                    <button type="submit">Создать персонажа</button>
                                </form>
                            </details>
                        </div>
                    </details>
                </aside>
            </div>
        `;

        container.appendChild(root);
        if (typeof window.initAdminSectionCollapse === "function") window.initAdminSectionCollapse(container);

        root.querySelector(".admin-rp-portrait-search").addEventListener("input", event => { state.portraitFilter = event.target.value; renderPortraitLibrary(root); });
        root.querySelector(".admin-rp-chat-search").addEventListener("input", event => {
            state.filter = event.target.value;
            renderChatList(root);
        });
        root.querySelector(".admin-rp-refresh").addEventListener("click", () => refreshAdminRp(root));
        root.querySelector(".admin-rp-composer-send").addEventListener("click", () => submitNrpPost(root));
        root.querySelector(".admin-rp-character-search").addEventListener("input", () => renderComposerCharacterPicker(root));
        root.querySelector(".admin-rp-nrp-create").addEventListener("submit", event => {
            event.preventDefault();
            createRpCharacter(root);
        });

        await refreshAdminRp(root);
    }

    window.lorgusEditPortraitImage = editPortraitImage;
    window.lorgusSelectRpCharacter = async characterId => {
        window.lorgusPendingRpCharacterId = String(characterId);
        const root = document.querySelector(".admin-rp-control-room");
        if (!root) return false;
        await refreshAdminRp(root);
        const select = root.querySelector(".admin-rp-composer-character");
        if (!select || !Array.from(select.options).some(option => option.value === String(characterId))) return false;
        select.value = String(characterId);
        select.dispatchEvent(new Event("change", { bubbles: true }));
        root.querySelector(".admin-rp-composer-input")?.focus();
        root.scrollIntoView({ behavior: "smooth", block: "start" });
        window.lorgusPendingRpCharacterId = null;
        return true;
    };
    window.loadAdminRpManagement = loadAdminRpManagement;
})();