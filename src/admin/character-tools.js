function titleRarityLabel(rarity) {
    return ({common:"Обычный",uncommon:"Необычный",rare:"Редкий",epic:"Эпический",legendary:"Легендарный",mythic:"Мифический",unique:"Уникальный"})[rarity] || rarity || "";
}

function renderTitleBadge(title, className = "") {
    if (!title) return "";
    return "<span class=\"lorgus-title-badge " + className + "\" style=\"--title-color:" + window.escapeHtml(title.color || "#d6b66a") + "\"><span>" + window.escapeHtml(title.icon || "✦") + "</span>" + window.escapeHtml(title.name) + "</span>";
}

async function openTitlePicker() {
    const c = window.activeCharacter;
    if (!c) return;
    const { data: owned, error } = await window.supabaseClient.from("character_titles").select("title_id, awarded_at, titles(*)").eq("character_id", c.id).order("awarded_at", { ascending: true });
    if (error) { alert("Не удалось загрузить титулы:\\n\\n" + error.message); return; }
    const overlay = document.createElement("div");
    overlay.className = "lorgus-title-overlay";
    const panel = document.createElement("article");
    panel.className = "lorgus-title-panel";
    panel.innerHTML = "<button type=\"button\" class=\"lorgus-title-close\">×</button><span class=\"lorgus-command-kicker\">ЛОРГУС · ТИТУЛЫ</span><h2>Как тебя будут называть?</h2><p>Титул выдаётся администрацией. Здесь ты выбираешь только тот, который видят другие.</p>";
    const list = document.createElement("div"); list.className = "lorgus-title-list";
    if (!owned?.length) list.innerHTML = "<div class=\"lorgus-title-empty\">Титулов пока нет. Их выдаёт администрация.</div>";
    (owned || []).forEach(row => {
        const t = row.titles; if (!t) return;
        const b = document.createElement("button"); b.type = "button"; b.className = "lorgus-owned-title" + (String(t.id) === String(window.activeTitle?.id) ? " active" : ""); b.dataset.titleId = t.id; b.style.setProperty("--title-color", t.color || "#d6b66a");
        b.innerHTML = "<span class=\"lorgus-owned-title-icon\">" + window.escapeHtml(t.icon) + "</span><span><strong>" + window.escapeHtml(t.name) + "</strong><small>" + window.escapeHtml(t.category) + " · " + window.escapeHtml(titleRarityLabel(t.rarity)) + "</small></span>";
        b.addEventListener("click", async () => {
            const { error: setError } = await window.supabaseClient.rpc("set_active_character_title", { p_character_id: c.id, p_title_id: t.id });
            if (setError) { alert("Не удалось установить титул:\\n\\n" + setError.message); return; }
            window.activeTitle = t; overlay.remove(); window.renderLorgusCharacterHub();
        });
        list.appendChild(b);
    });
    panel.appendChild(list);
    if (owned?.length) {
        const clear = document.createElement("button"); clear.type = "button"; clear.className = "lorgus-title-clear"; clear.textContent = "Скрыть титул";
        clear.addEventListener("click", async () => {
            const { error: setError } = await window.supabaseClient.rpc("set_active_character_title", { p_character_id: c.id, p_title_id: null });
            if (setError) { alert("Не удалось снять титул:\\n\\n" + setError.message); return; }
            window.activeTitle = null; overlay.remove(); window.renderLorgusCharacterHub();
        }); panel.appendChild(clear);
    }
    const backdrop = document.createElement("div"); backdrop.className = "lorgus-title-backdrop"; overlay.append(backdrop, panel); document.body.appendChild(overlay);
    const close = () => overlay.remove(); panel.querySelector(".lorgus-title-close").addEventListener("click", close); backdrop.addEventListener("click", close);
}

async function openAdminCharacterTitles(application, container) {
    const characterId = application.character_id; if (!characterId) return;
    const { data: titles, error: titlesError } = await window.supabaseClient
        .from("titles")
        .select("*")
        .order("category")
        .order("name");

    if (titlesError) {
        console.error("Ошибка загрузки титулов:", titlesError);
        alert("Не удалось загрузить список титулов:\n\n" + titlesError.message);
        return;
    }

    const { data: owned, error: ownedError } = await window.supabaseClient
        .from("character_titles")
        .select("title_id, awarded_at, titles(*)")
        .eq("character_id", characterId)
        .order("awarded_at", { ascending: true });

    if (ownedError) {
        console.error("Ошибка загрузки выданных титулов:", ownedError);
    }
    const overlay = document.createElement("div"); overlay.className = "lorgus-title-overlay";
    const panel = document.createElement("article"); panel.className = "lorgus-title-panel lorgus-admin-title-panel";
    panel.innerHTML = "<button type=\"button\" class=\"lorgus-title-close\">×</button><span class=\"lorgus-command-kicker\">АДМИНИСТРАЦИЯ · ТИТУЛЫ</span><h2>" + window.escapeHtml(application.name || "Персонаж") + "</h2><p>Выдача и отзыв титулов. Игрок не может создавать или выдавать их себе.</p>";
    const select = document.createElement("select"); select.className = "lorgus-title-select"; select.innerHTML = "<option value=\"\">Выбери титул...</option>" + (titles || []).map(t => "<option value=\"" + window.escapeHtml(t.id) + "\">" + window.escapeHtml(t.icon) + " " + window.escapeHtml(t.name) + " · " + window.escapeHtml(titleRarityLabel(t.rarity)) + "</option>").join("");
    const grant = document.createElement("button"); grant.type = "button"; grant.className = "lorgus-title-grant"; grant.textContent = "✦ Выдать титул";
    const ownedBox = document.createElement("div"); ownedBox.className = "lorgus-title-owned-list";
    (owned || []).forEach(row => { const t=row.titles; if(!t)return; const item=document.createElement("div"); item.className="lorgus-admin-owned-title"; item.style.setProperty("--title-color",t.color||"#d6b66a"); item.innerHTML="<span>"+window.escapeHtml(t.icon)+"</span><strong>"+window.escapeHtml(t.name)+"</strong><small>"+window.escapeHtml(t.rarity)+"</small>"; const revoke=document.createElement("button"); revoke.type="button"; revoke.textContent="Забрать"; revoke.addEventListener("click",async()=>{const {error}=await window.supabaseClient.rpc("admin_revoke_character_title",{p_character_id:characterId,p_title_id:row.title_id});if(error){alert("Не удалось забрать титул:\\n\\n"+error.message);return;} overlay.remove(); openAdminCharacterTitles(application,container);}); item.appendChild(revoke); ownedBox.appendChild(item); });
    if (!owned?.length) ownedBox.innerHTML = "<div class=\"lorgus-title-empty\">У персонажа пока нет титулов.</div>";
    panel.append(select, grant, ownedBox); overlay.append(document.createElement("div"), panel); overlay.firstChild.className="lorgus-title-backdrop"; document.body.appendChild(overlay);
    const close=()=>overlay.remove(); panel.querySelector(".lorgus-title-close").addEventListener("click",close); overlay.firstChild.addEventListener("click",close);
    grant.addEventListener("click",async()=>{if(!select.value)return;const {error}=await window.supabaseClient.rpc("admin_award_character_title",{p_character_id:characterId,p_title_id:select.value});if(error){alert("Не удалось выдать титул:\\n\\n"+error.message);return;}overlay.remove();openAdminCharacterTitles(application,container);});
}

async function loadCharacterAbilities(characterId) {
    if (!characterId) return [];
    const { data, error } = await window.supabaseClient.from("character_abilities").select("ability_id, acquired_at, source_note, abilities(*)").eq("character_id", characterId).order("acquired_at", { ascending: true });
    if (error) { console.error("Не удалось загрузить способности:", error); return []; }
    return (data || []).map(row => ({ ...(row.abilities || {}), acquired_at: row.acquired_at, source_note: row.source_note })).filter(row => row.id);
}

function abilityRarityLabel(rarity) { return titleRarityLabel(rarity); }

function renderAbilityList(abilities) {
    if (!abilities?.length) return '<div class="lorgus-ability-empty">Способностей, подтверждённых администрацией, пока нет.</div>';
    return abilities.map(a => '<article class="lorgus-ability-card" style="--ability-color:' + window.escapeHtml(a.color || "#d6b36a") + '"><div class="lorgus-ability-icon">' + window.escapeHtml(a.icon || "✦") + '</div><div class="lorgus-ability-body"><div class="lorgus-ability-top"><strong>' + window.escapeHtml(a.name) + '</strong><span>' + window.escapeHtml(abilityRarityLabel(a.rarity)) + '</span></div><small>' + window.escapeHtml(a.category || "special") + '</small><p>' + window.escapeHtml(a.description || "Описание отсутствует.") + '</p></div></article>').join("");
}

async function openAdminCharacterAbilities(application, container) {
    const characterId = application.character_id;
    if (!characterId) return;
    const { data: abilities, error: abilitiesError } = await window.supabaseClient.from("abilities").select("*").order("category").order("name");
    const { data: owned, error: ownedError } = await window.supabaseClient.from("character_abilities").select("ability_id, acquired_at, source_note, abilities(*)").eq("character_id", characterId).order("acquired_at", { ascending: true });
    if (abilitiesError) { alert("Не удалось загрузить список способностей:\n\n" + abilitiesError.message); return; }
    if (ownedError) console.error("Не удалось загрузить выданные способности:", ownedError);
    const overlay = document.createElement("div"); overlay.className = "lorgus-ability-overlay";
    const panel = document.createElement("article"); panel.className = "lorgus-ability-panel";
    panel.innerHTML = '<button type="button" class="lorgus-ability-close">×</button><span class="lorgus-command-kicker">АДМИНИСТРАЦИЯ · СПОСОБНОСТИ</span><h2>' + window.escapeHtml(application.name || "Персонаж") + '</h2><p>Только администрация определяет, какими подтверждёнными способностями владеет персонаж.</p><div class="lorgus-ability-grant-grid"><select class="lorgus-ability-select"><option value="">Выбери способность...</option></select><input class="lorgus-ability-note" type="text" maxlength="500" placeholder="Основание / событие / откуда получена"><button type="button" class="lorgus-ability-grant">✦ Выдать способность</button></div><div class="lorgus-ability-owned"></div><div class="lorgus-ability-history"></div><div class="lorgus-ability-create"><span>НОВАЯ СПОСОБНОСТЬ</span><div class="lorgus-ability-create-grid"><input class="ability-new-name" placeholder="Название"><input class="ability-new-icon" placeholder="Иконка" value="✦"><select class="ability-new-category"><option value="combat">Бой</option><option value="magic">Магия</option><option value="craft">Ремесло</option><option value="social">Социальное</option><option value="survival">Выживание</option><option value="special">Особое</option></select><select class="ability-new-rarity"><option value="common">Обычный</option><option value="uncommon">Необычный</option><option value="rare">Редкий</option><option value="epic">Эпический</option><option value="legendary">Легендарный</option><option value="mythic">Мифический</option><option value="unique">Уникальный</option></select><input class="ability-new-color" type="text" value="#d6b36a" placeholder="#d6b36a"><textarea class="ability-new-description" placeholder="Что умеет персонаж?"></textarea></div><button type="button" class="lorgus-ability-create-button">Создать способность</button></div>';
    const select = panel.querySelector(".lorgus-ability-select");
    (abilities || []).forEach(a => { const option=document.createElement("option"); option.value=a.id; option.textContent=(a.icon || "✦") + " " + a.name + " · " + abilityRarityLabel(a.rarity); select.appendChild(option); });
    const ownedBox = panel.querySelector(".lorgus-ability-owned");
    const historyBox = panel.querySelector(".lorgus-ability-history");

    const renderHistory = rows => {
        if (!rows?.length) {
            historyBox.innerHTML = '<div class="lorgus-ability-empty">История изменений способностей пока пуста.</div>';
            return;
        }
        historyBox.innerHTML = '<div class="lorgus-ability-history-title">ЛЕТОПИСЬ СПОСОБНОСТЕЙ</div>' + rows.map(row => {
            const a = row.abilities;
            const label = row.action === "granted" ? "Получена" : "Отозвана";
            const when = row.created_at ? new Date(row.created_at).toLocaleString("ru-RU", { dateStyle:"medium", timeStyle:"short" }) : "—";
            return '<div class="lorgus-ability-history-entry ' + window.escapeHtml(row.action) + '"><span class="lorgus-ability-history-icon">' + (row.action === "granted" ? "✦" : "×") + '</span><div><strong>' + window.escapeHtml(label) + ': ' + window.escapeHtml(a?.name || "Способность") + '</strong><small>' + window.escapeHtml(when) + (row.source_note ? " · " + window.escapeHtml(row.source_note) : "") + '</small></div></div>';
        }).join("");
    };

    const loadHistory = async () => {
        const { data, error } = await window.supabaseClient
            .from("character_ability_history")
            .select("action, source_note, created_at, abilities(name, icon, color)")
            .eq("character_id", characterId)
            .order("created_at", { ascending: false });
        if (error) {
            console.error("Не удалось загрузить историю способностей:", error);
            historyBox.innerHTML = '<div class="lorgus-ability-empty">История изменений временно недоступна.</div>';
            return;
        }
        renderHistory(data || []);
    };

    const refreshOwned = async () => {
        const { data: fresh, error } = await window.supabaseClient
            .from("character_abilities")
            .select("ability_id, acquired_at, source_note, abilities(*)")
            .eq("character_id", characterId)
            .order("acquired_at", { ascending: true });
        if (error) {
            console.error("Не удалось обновить способности:", error);
            return;
        }
        renderOwned(fresh || []);
        await loadHistory();
    };

    const renderOwned = rows => {
        if (!rows?.length) { ownedBox.innerHTML = '<div class="lorgus-ability-empty">У персонажа пока нет подтверждённых способностей.</div>'; return; }
        ownedBox.innerHTML = rows.map(row => { const a=row.abilities; if(!a)return ""; return '<div class="lorgus-admin-owned-ability" style="--ability-color:' + window.escapeHtml(a.color || "#d6b36a") + '"><span>' + window.escapeHtml(a.icon) + '</span><div><strong>' + window.escapeHtml(a.name) + '</strong><small>' + window.escapeHtml(abilityRarityLabel(a.rarity)) + (row.source_note ? " · " + window.escapeHtml(row.source_note) : "") + '</small></div><button type="button" data-ability-id="' + window.escapeHtml(row.ability_id) + '">Забрать</button></div>'; }).join("");
        ownedBox.querySelectorAll("button").forEach(button => button.addEventListener("click", async () => {
            const note = prompt("Причина отзыва способности:", ""); if (note === null) return;
            const { error } = await window.supabaseClient.rpc("admin_revoke_character_ability", { p_character_id: characterId, p_ability_id: button.dataset.abilityId, p_source_note: note.trim() });
            if (error) { alert("Не удалось забрать способность:\n\n" + error.message); return; }
            await refreshOwned();
        }));
    };
    renderOwned(owned || []);
    const historyBackdrop = document.createElement("div");
    historyBackdrop.className = "lorgus-ability-history-divider";
    panel.querySelector(".lorgus-ability-owned").after(historyBackdrop);
    await loadHistory();
    panel.querySelector(".lorgus-ability-grant").addEventListener("click", async () => {
        if (!select.value) return; const note=panel.querySelector(".lorgus-ability-note").value.trim();
        const { error } = await window.supabaseClient.rpc("admin_award_character_ability", { p_character_id: characterId, p_ability_id: select.value, p_source_note: note });
        if (error) { alert("Не удалось выдать способность:\n\n" + error.message); return; }
        select.value=""; panel.querySelector(".lorgus-ability-note").value="";
        await refreshOwned();
    });
    panel.querySelector(".lorgus-ability-create-button").addEventListener("click", async () => {
        const name=panel.querySelector(".ability-new-name").value.trim(), description=panel.querySelector(".ability-new-description").value.trim();
        if (!name || !description) { alert("Укажи название и описание способности."); return; }
        const { data, error } = await window.supabaseClient.rpc("admin_create_ability", { p_name:name, p_category:panel.querySelector(".ability-new-category").value, p_rarity:panel.querySelector(".ability-new-rarity").value, p_icon:panel.querySelector(".ability-new-icon").value.trim() || "✦", p_color:panel.querySelector(".ability-new-color").value.trim() || "#d6b36a", p_description:description });
        if (error) { alert("Не удалось создать способность:\n\n" + error.message); return; }
        const option=document.createElement("option"); option.value=data.id; option.textContent=(data.icon || "✦") + " " + data.name + " · " + abilityRarityLabel(data.rarity); select.appendChild(option); select.value=data.id;
    });
    const backdrop=document.createElement("div"); backdrop.className="lorgus-ability-backdrop"; overlay.append(backdrop,panel); document.body.appendChild(overlay);
    const close=()=>overlay.remove(); panel.querySelector(".lorgus-ability-close").addEventListener("click",close); backdrop.addEventListener("click",close);
}

async 
window.titleRarityLabel = titleRarityLabel;
window.renderTitleBadge = renderTitleBadge;
window.openTitlePicker = openTitlePicker;
window.openAdminCharacterTitles = openAdminCharacterTitles;
window.loadCharacterAbilities = loadCharacterAbilities;
window.abilityRarityLabel = abilityRarityLabel;
window.renderAbilityList = renderAbilityList;
window.openAdminCharacterAbilities = openAdminCharacterAbilities;
