/* LORGUS inventory UI */
function lorgusCurrencyLabel(code) {
    return lorgusCurrencies[code]?.name || code;
}

function formatLorgusCurrencyAmount(amount) {
    return new Intl.NumberFormat("ru-RU").format(Math.max(0, Math.floor(Number(amount) || 0)));
}

function formatLorgusRewardCurrency(amount, code) {
    return formatLorgusCurrencyAmount(amount) + " · " + lorgusCurrencyLabel(code);
}

const inventorySlotLabels = {
    head: "Голова",
    chest: "Тело",
    hands: "Перчатки",
    legs: "Ноги",
    feet: "Ступни",
    main_hand: "Правая рука",
    off_hand: "Левая рука",
    accessory_chain: "Цепочка",
    accessory_ring: "Кольцо",
    accessory_bracelet: "Браслет"
};

const inventoryTypeLabels = {
    helmet: "Шлем", armor: "Броня", gloves: "Перчатки", pants: "Штаны", boots: "Обувь",
    sword: "Меч", spear: "Копьё", axe: "Топор", staff: "Посох", bow: "Лук", crossbow: "Арбалет",
    shield: "Щит", chain: "Цепочка", ring: "Кольцо", bracelet: "Браслет", potion: "Зелье",
    scroll: "Свиток", food: "Еда", quest_item: "Квестовый предмет", material: "Материал", lootbox: "Лутбокс", misc: "Прочее"
};
const inventoryTypeIcons = {
    helmet:"⛑", armor:"🛡", gloves:"🧤", pants:"♜", boots:"🥾", sword:"⚔", spear:"🔱", axe:"🪓",
    staff:"♖", bow:"🏹", crossbow:"⦿", shield:"🛡", chain:"⛓", ring:"◉", bracelet:"◌", potion:"⚗",
    scroll:"▤", food:"✦", quest_item:"◆", material:"◇", lootbox:"🎁", misc:"◆"
};

function inventoryRarityLabel(rarity) {
    return titleRarityLabel(rarity);
}

function inventoryTypeLabel(item) {
    return inventoryTypeLabels[item?.item_subtype] || inventoryTypeLabels[item?.item_type] || "Предмет";
}

function inventoryItemMarkup(row, extraClass = "") {
    const item = row.items || {};
    const qty = row.quantity > 1 ? "×" + row.quantity : "";
    const equippedLabel = row.equipped_slot ? inventorySlotLabels[row.equipped_slot] : "";
    const isLootbox = item.item_subtype === "lootbox" && !row.equipped_slot;
    return '<article class="lorgus-inventory-item ' + extraClass + (row.equipped_slot ? ' is-equipped' : '') + (isLootbox ? ' is-lootbox' : '') + '" draggable="true" data-inventory-id="' + escapeHtml(row.id) + '" data-item-name="' + escapeHtml(item.name || "Предмет").toLocaleLowerCase("ru-RU") + '" data-item-type="' + escapeHtml(item.item_subtype || item.item_type || "misc") + '" data-item-rarity="' + escapeHtml(item.rarity || "common") + '" data-acquired-at="' + escapeHtml(row.acquired_at || "") + '" style="--item-color:' + escapeHtml(item.color || "#b8a27a") + '">' +
        '<div class="lorgus-inventory-item-icon">' + escapeHtml(item.icon || (isLootbox ? "🎁" : "◆")) + '</div>' +
        '<div class="lorgus-inventory-item-info"><strong>' + escapeHtml(item.name || "Предмет") + '</strong><small>' + escapeHtml(inventoryRarityLabel(item.rarity)) + ' · ' + escapeHtml(inventoryTypeLabel(item)) + '</small>' + (equippedLabel ? '<em>НАДЕТО · ' + escapeHtml(equippedLabel) + '</em>' : '') + '</div>' +
        '<b class="lorgus-inventory-qty">' + escapeHtml(qty) + '</b>' +
        (isLootbox ? '<button type="button" class="lorgus-lootbox-open-button" data-open-lootbox="' + escapeHtml(row.id) + '">ОТКРЫТЬ</button>' : (!row.equipped_slot && item.equipment_slot ? '<button type="button" class="lorgus-inventory-action-button" data-equip-item="' + escapeHtml(row.id) + '" data-equip-slot="' + escapeHtml(item.equipment_slot) + '">НАДЕТЬ</button>' : '')) + '</article>';
}

async function loadCharacterInventory(characterId) {
    const { data, error } = await window.supabaseClient.from("character_inventory")
        .select("id, quantity, equipped_slot, acquired_at, source_note, items(*)")
        .eq("character_id", characterId).gt("quantity", 0).order("acquired_at", { ascending: true });
    if (error) console.error("Не удалось загрузить инвентарь:", error);
    return { data: data || [], error };
}

async function renderLorgusInventory() {
    const pageRoot = document.getElementById("cabinet-content");
    const character = window.activeCharacter;
    if (!pageRoot || !character) return;
    const characterMain = pageRoot.querySelector(".lorgus-character-main");
    const inlineMode = Boolean(characterMain && window.location.pathname.replace(/\/+$/, "") === "/character");
    let container = pageRoot;
    if (inlineMode) {
        characterMain.querySelector(".lorgus-inventory-main")?.remove();
        container = document.createElement("div");
        container.className = "lorgus-inventory-page lorgus-inventory-inline-staging";
        container.style.cssText = "position:absolute;left:-100000px;top:0;width:min(1500px,100vw);";
        pageRoot.appendChild(container);
    }
    container.className = inlineMode ? "lorgus-inventory-page lorgus-inventory-inline-staging" : "lorgus-inventory-page";
    container.innerHTML = `
        <div class="lorgus-inventory-shell">
            <aside class="lorgus-inventory-sidebar">
                <div class="lorgus-inventory-brand">
                    <span>✦</span>
                    <strong>LORGUS</strong>
                    <small>АРХИВ СНАРЯЖЕНИЯ</small>
                </div>

                <div class="lorgus-inventory-character">
                    <div class="lorgus-inventory-character-mark">✦</div>
                    <div>
                        <span>ПЕРСОНАЖ</span>
                        <strong>${window.escapeHtml(character.name || "Персонаж")}</strong>
                        <small>ЛИЧНЫЙ ИНВЕНТАРЬ</small>
                    </div>
                </div>

                <nav class="lorgus-inventory-nav">
                    <button class="active" type="button"><span>◈</span> Снаряжение</button>
                    <button type="button" onclick="window.lorgusSubpageTransition?.('left', window.renderLorgusWorldMapCurrent)"><span>⌂</span> Карта мира</button>
                </nav>

                <div class="lorgus-inventory-sidebar-note">
                    <span>ПОРЯДОК ВЕЩЕЙ</span>
                    <p>Перетаскивай предметы между рюкзаком и подходящими ячейками снаряжения.</p>
                </div>

                <button type="button" class="lorgus-inventory-back" onclick="window.lorgusSubpageTransition?.('left', window.renderLorgusWorldMapCurrent)">
                    <span>←</span> ВЕРНУТЬСЯ НА КАРТУ
                </button>
            </aside>

            <main class="lorgus-inventory-main">
                <header class="lorgus-inventory-header">
                    <div>
                        <span class="lorgus-inventory-kicker">ЛИЧНЫЙ АРСЕНАЛ</span>
                        <h1>Инвентарь</h1>
                        <p>Снаряжение, вещи и имущество <strong>${window.escapeHtml(character.name || "Персонаж")}</strong></p>
                    </div>
                    <div class="lorgus-inventory-header-meta">
                        <span><i></i> АРСЕНАЛ АКТИВЕН</span>
                        <button type="button" onclick="window.logout?.()">ВЫЙТИ</button>
                    </div>
                </header>

                <section class="lorgus-inventory-workspace">
                    <section class="lorgus-equipment-stage">
                        <div class="lorgus-inventory-panel-head">
                            <div><span>СНАРЯЖЕНИЕ</span><h2>Экипировка</h2></div>
                            <b>10 СЛОТОВ</b>
                        </div>
                        <div class="lorgus-equipment-character">
                            <div class="lorgus-equipment-aura"></div>
                            <div class="lorgus-human-body" aria-hidden="true">
                                <div class="lorgus-human-head"></div>
                                <div class="lorgus-human-neck"></div>
                                <div class="lorgus-human-torso"></div>
                                <div class="lorgus-human-arm lorgus-human-arm-left"></div>
                                <div class="lorgus-human-arm lorgus-human-arm-right"></div>
                                <div class="lorgus-human-hand lorgus-human-hand-left"></div>
                                <div class="lorgus-human-hand lorgus-human-hand-right"></div>
                                <div class="lorgus-human-leg lorgus-human-leg-left"></div>
                                <div class="lorgus-human-leg lorgus-human-leg-right"></div>
                            </div>
                            <div class="lorgus-equipment-name">${window.escapeHtml(character.name || "Персонаж")}</div>
                            <div class="lorgus-equipment-slots">
                                ${Object.entries(inventorySlotLabels).map(([slot,label]) => '<div class="lorgus-equipment-slot lorgus-equipment-slot-' + slot + '" data-equipment-slot="' + slot + '" title="' + label + '"><span>' + escapeHtml(label) + '</span><div class="lorgus-equipment-slot-item"></div></div>').join("")}
                            </div>
                        </div>
                    </section>

                    <section class="lorgus-inventory-grid-wrap">
                        <div class="lorgus-inventory-panel-head">
                            <div><span>ХРАНИЛИЩЕ</span><h2>Рюкзак</h2></div>
                            <b id="lorgus-inventory-count">—</b>
                        </div>
                        <div class="lorgus-inventory-tools"><label class="lorgus-inventory-search"><span>⌕</span><input id="lorgus-inventory-search" type="search" placeholder="Найти предмет…" autocomplete="off" aria-label="Поиск предметов в рюкзаке"></label><select id="lorgus-inventory-type" aria-label="Фильтр по типу"><option value="">Все типы</option>${Object.entries(inventoryTypeLabels).map(([value,label]) => '<option value="' + escapeHtml(value) + '">' + escapeHtml(label) + '</option>').join("")}</select><select id="lorgus-inventory-rarity" aria-label="Фильтр по редкости"><option value="">Любая редкость</option><option value="common">Обычная</option><option value="uncommon">Необычная</option><option value="rare">Редкая</option><option value="epic">Эпическая</option><option value="legendary">Легендарная</option><option value="mythic">Мифическая</option><option value="unique">Уникальная</option></select><select id="lorgus-inventory-sort" aria-label="Сортировка предметов"><option value="default">По получению</option><option value="name">По названию</option><option value="rarity">По редкости</option><option value="quantity">По количеству</option></select></div>\n                        <div class="lorgus-inventory-grid" id="lorgus-inventory-grid">
                            <div class="lorgus-inventory-empty">Загрузка...</div>
                        </div>
                    </section>
                </section>
            </main>
        </div>
    `;
    const walletSection = document.createElement("section");
    walletSection.className = "lorgus-wallet-panel";
    walletSection.innerHTML = '<div class="lorgus-wallet-title"><div><span>ФИНАНСЫ</span><h2>Кошелёк</h2></div><small>Баланс в местной валюте и пересчёт в условных единицах</small></div><div class="lorgus-wallet-grid" id="lorgus-wallet-grid"></div>';
    container.querySelector(".lorgus-inventory-main").appendChild(walletSection);
    const { data: currencyRows } = await loadCharacterCurrency(character.id);
    const walletGrid = document.getElementById("lorgus-wallet-grid");
    if (walletGrid) walletGrid.innerHTML = Object.entries(lorgusCurrencies).map(([code,c]) => {
        const row=(currencyRows||[]).find(x=>x.currency_code===code);
        const amount = Math.max(0, Number(row?.amount) || 0);
        const equivalent = amount * (Number.parseFloat(String(c.goldRate).replace(",", ".")) || 0);
        return '<div class="lorgus-wallet-card"><span class="lorgus-wallet-icon">' + escapeHtml(c.icon) + '</span><div><strong>' + escapeHtml(c.name) + '</strong><small>' + escapeHtml(c.kingdom) + ' · Эквивалент: ' + new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(equivalent) + ' экв.</small></div><b>' + escapeHtml(formatLorgusCurrencyAmount(amount)) + '</b></div>';
    }).join("");
    const specialRewardsSection = document.createElement("section");
    specialRewardsSection.className = "lorgus-character-special-rewards";
    specialRewardsSection.innerHTML = '<div class="lorgus-wallet-title"><div><span>НАСЛЕДИЕ</span><h2>Особые награды</h2></div><small>Привилегии и редкие сюрпризы</small></div><div class="lorgus-character-special-rewards-list"><p>Загружаем награды…</p></div>';
    container.querySelector(".lorgus-inventory-main").appendChild(specialRewardsSection);
    const specialRewardsList = specialRewardsSection.querySelector(".lorgus-character-special-rewards-list");
    const { data: specialRewards, error: specialRewardsError } = await window.supabaseClient
        .from("character_special_rewards")
        .select("id,reward_type,name,description,rarity,awarded_at")
        .eq("character_id", character.id)
        .order("awarded_at", { ascending: false });
    const specialRarityColors = {common:"#b8a27a",uncommon:"#76b85f",rare:"#5f9fe8",epic:"#a875e8",legendary:"#e0a14a",mythic:"#e45bc7",unique:"#f3e7b0"};
    if (specialRewardsError) {
        specialRewardsList.innerHTML = '<p>Не удалось загрузить особые награды.</p>';
    } else {
        specialRewardsList.innerHTML = (specialRewards || []).length ? specialRewards.map(reward =>
            '<article class="lorgus-character-special-reward" style="--reward-color:' + (specialRarityColors[reward.rarity] || "#b8a27a") + '">' +
                '<span>' + (reward.reward_type === "privilege" ? "♛" : "✦") + '</span><div><strong>' + escapeHtml(reward.name || "Особая награда") + '</strong><small>' + (reward.reward_type === "privilege" ? "ПРИВИЛЕГИЯ" : "ОСОБАЯ НАГРАДА") + ' · ' + escapeHtml(reward.rarity || "common") + '</small><p>' + escapeHtml(reward.description || "") + '</p></div>' +
            '</article>'
        ).join("") : '<p>Пока нет особых наград. Возможно, следующая печать хранит твою судьбу.</p>';
    }

    const { data, error } = await loadCharacterInventory(character.id);
    const grid = document.getElementById("lorgus-inventory-grid");
    if (!grid) return;
    if (error) { grid.innerHTML = '<div class="lorgus-inventory-empty"><h2>Инвентарь недоступен</h2><p>' + escapeHtml(error.message) + '</p></div>'; return; }
    const rows = data || [];
    const backpackRows = rows.filter(row => !row.equipped_slot);
    const backpackItemCount = backpackRows.reduce((total, row) => total + Math.max(0, Number(row.quantity) || 0), 0);
    document.getElementById("lorgus-inventory-count").textContent = backpackItemCount + (backpackItemCount % 10 === 1 && backpackItemCount % 100 !== 11 ? " предмет" : backpackItemCount % 10 >= 2 && backpackItemCount % 10 <= 4 && (backpackItemCount % 100 < 12 || backpackItemCount % 100 > 14) ? " предмета" : " предметов");
    grid.innerHTML = backpackRows.length ? backpackRows.map(row => inventoryItemMarkup(row)).join("") : '<div class="lorgus-inventory-empty"><h2>Рюкзак пуст</h2><p>Здесь будут храниться твои вещи. Надетые предметы отображаются в ячейках экипировки.</p></div>';
    const renderEquipped = () => document.querySelectorAll(".lorgus-equipment-slot").forEach(slot => {
        const row = rows.find(r => r.equipped_slot === slot.dataset.equipmentSlot);
        const item = row?.items; const box = slot.querySelector(".lorgus-equipment-slot-item");
        box.innerHTML = row && item ? '<div class="lorgus-equipped-item" draggable="true" data-inventory-id="' + escapeHtml(row.id) + '" style="--item-color:' + escapeHtml(item.color || "#b8a27a") + '"><span>' + escapeHtml(item.icon || "◆") + '</span><strong>' + escapeHtml(item.name || "Предмет") + '</strong><button type="button" class="lorgus-equipped-item-remove" data-unequip-item="' + escapeHtml(row.id) + '" aria-label="Снять ' + escapeHtml(item.name || "предмет") + '" title="Снять предмет">×</button></div>' : "";
    });
    renderEquipped();

    // Кнопки действий — альтернатива перетаскиванию, особенно удобная на телефоне.
    // Используем те же серверные RPC, что и drag-and-drop, чтобы правила экипировки не расходились.
    const runInventoryAction = async (button, action) => {
        if (!button || button.disabled) return;
        const inventoryId = button.dataset.equipItem || button.dataset.unequipItem;
        const row = rows.find(item => String(item.id) === String(inventoryId));
        if (!row) return;
        button.disabled = true;
        button.setAttribute("aria-busy", "true");
        const result = action === "equip"
            ? await window.supabaseClient.rpc("equip_character_item", { p_inventory_id: inventoryId, p_slot: button.dataset.equipSlot || row.items?.equipment_slot })
            : await window.supabaseClient.rpc("unequip_character_item", { p_inventory_id: inventoryId });
        if (result.error) {
            console.error(action === "equip" ? "Не удалось надеть предмет:" : "Не удалось снять предмет:", result.error);
            button.disabled = false;
            button.removeAttribute("aria-busy");
            button.title = result.error.message || "Не удалось выполнить действие";
            return;
        }
        await renderLorgusInventory();
    };
    container.querySelectorAll("[data-equip-item]").forEach(button => button.addEventListener("click", event => {
        event.preventDefault(); event.stopPropagation(); runInventoryAction(button, "equip");
    }));
    container.querySelectorAll("[data-unequip-item]").forEach(button => button.addEventListener("click", event => {
        event.preventDefault(); event.stopPropagation(); runInventoryAction(button, "unequip");
    }));

    const getDraggedInventoryId = event => {
        const fromState = window.lorgusDraggedInventoryId;
        if (fromState) return fromState;
        const transfer = event?.dataTransfer;
        if (!transfer) return "";
        return transfer.getData("application/x-lorgus-inventory-id") || transfer.getData("text/plain") || "";
    };

    const clearDragFeedback = () => {
        grid.classList.remove("is-valid-unequip-drop");
        document.querySelectorAll(".lorgus-equipment-slot").forEach(slot => {
            slot.classList.remove("is-valid-drop", "is-invalid-drop");
        });
    };

    const setupDrag = card => {
        card.setAttribute("draggable", "true");
        // Не даём браузеру превращать внутренний текст/элементы в отдельный
        // "перетаскиваемый объект". Перетаскивается только сама карточка.
        card.querySelectorAll("*").forEach(child => child.setAttribute("draggable", "false"));

        card.addEventListener("dragstart", e => {
            e.stopPropagation();
            const id = card.dataset.inventoryId;

            if (!id || !e.dataTransfer) {
                e.preventDefault();
                return;
            }

            window.lorgusDraggedInventoryId = id;

            e.dataTransfer.clearData();
            e.dataTransfer.setData("application/x-lorgus-inventory-id", id);
            e.dataTransfer.setData("text/plain", id);
            e.dataTransfer.effectAllowed = "move";

            const ghost = document.createElement("div");
            ghost.className = "lorgus-drag-ghost lorgus-drag-ghost-item";
            ghost.innerHTML =
                '<span class="lorgus-drag-ghost-icon">' + escapeHtml(card.querySelector(".lorgus-inventory-item-icon")?.textContent || "◆") + '</span>' +
                '<span class="lorgus-drag-ghost-name">' + escapeHtml(card.querySelector(".lorgus-inventory-item-info strong")?.textContent || "Предмет") + '</span>';
            document.body.appendChild(ghost);
            e.dataTransfer.setDragImage(ghost, 24, 24);
            requestAnimationFrame(() => ghost.remove());

            card.classList.add("is-dragging");
        });

        card.addEventListener("dragend", () => {
            card.classList.remove("is-dragging");
            window.lorgusDraggedInventoryId = null;
        });
    };

    grid.querySelectorAll(".lorgus-inventory-item").forEach(setupDrag);

    // Поиск, фильтры и сортировка работают поверх тех же карточек: состояние
    // перетаскивания и операции с предметами не теряются при смене фильтра.
    const searchInput = document.getElementById("lorgus-inventory-search");
    const typeFilter = document.getElementById("lorgus-inventory-type");
    const rarityFilter = document.getElementById("lorgus-inventory-rarity");
    const sortSelect = document.getElementById("lorgus-inventory-sort");
    const rarityOrder = {common:0,uncommon:1,rare:2,epic:3,legendary:4,mythic:5,unique:6};
    const applyInventoryTools = () => {
        const query = (searchInput?.value || "").trim().toLocaleLowerCase("ru-RU");
        const type = typeFilter?.value || "";
        const rarity = rarityFilter?.value || "";
        const cards = [...grid.querySelectorAll(".lorgus-inventory-item")];
        cards.forEach(card => {
            const visible = (!query || (card.dataset.itemName || "").includes(query)) &&
                (!type || card.dataset.itemType === type) &&
                (!rarity || card.dataset.itemRarity === rarity);
            card.hidden = !visible;
        });
        const visibleCards = cards.filter(card => !card.hidden);
        const sort = sortSelect?.value || "default";
        visibleCards.sort((a,b) => {
            if (sort === "name") return (a.dataset.itemName || "").localeCompare(b.dataset.itemName || "", "ru");
            if (sort === "rarity") return (rarityOrder[b.dataset.itemRarity] ?? 0) - (rarityOrder[a.dataset.itemRarity] ?? 0);
            if (sort === "quantity") return (Number(rows.find(r => r.id === b.dataset.inventoryId)?.quantity) || 0) - (Number(rows.find(r => r.id === a.dataset.inventoryId)?.quantity) || 0);
            return (a.dataset.acquiredAt || "").localeCompare(b.dataset.acquiredAt || "");
        });
        visibleCards.forEach(card => grid.appendChild(card));
        cards.filter(card => card.hidden).forEach(card => grid.appendChild(card));
        const visibleCount = visibleCards.reduce((sum, card) => sum + Math.max(0, Number(rows.find(r => r.id === card.dataset.inventoryId)?.quantity) || 0), 0);
        const countNode = document.getElementById("lorgus-inventory-count");
        if (countNode) countNode.textContent = visibleCount + (visibleCount % 10 === 1 && visibleCount % 100 !== 11 ? " предмет" : visibleCount % 10 >= 2 && visibleCount % 10 <= 4 && (visibleCount % 100 < 12 || visibleCount % 100 > 14) ? " предмета" : " предметов");
        let empty = grid.querySelector(".lorgus-inventory-filter-empty");
        if (!visibleCards.length && cards.length) {
            if (!empty) { empty = document.createElement("div"); empty.className = "lorgus-inventory-empty lorgus-inventory-filter-empty"; empty.innerHTML = "<h2>Ничего не найдено</h2><p>Измени запрос или сбрось фильтры.</p>"; grid.appendChild(empty); }
            empty.hidden = false;
        } else if (empty) empty.hidden = true;
    };
    [searchInput,typeFilter,rarityFilter,sortSelect].forEach(control => {
        control?.addEventListener(control === searchInput ? "input" : "change", applyInventoryTools);
    });
    document.querySelectorAll(".lorgus-equipped-item").forEach(setupDrag);

    grid.querySelectorAll("[data-open-lootbox]").forEach(button => {
        button.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            window.openLorgusLootbox?.(button.dataset.openLootbox);
        });
    });

    // Снятие экипировки: тот же предмет переносится из ячейки персонажа обратно в рюкзак.
    // Никакого клонирования и создания новой записи.
    grid.addEventListener("dragover", e => {
        // Если тащим над уже существующим предметом в рюкзаке,
        // это НЕ зона снятия экипировки. Не даём событию всплыть
        // до общего drop-zone рюкзака.
        if (e.target.closest(".lorgus-inventory-item")) {
            grid.classList.remove("is-valid-unequip-drop");
            if (e.dataTransfer) e.dataTransfer.dropEffect = "none";
            return;
        }

        const inventoryId = getDraggedInventoryId(e);
        const row = rows.find(r => r.id === inventoryId);

        if (!row?.equipped_slot) return;

        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
        grid.classList.add("is-valid-unequip-drop");
    });

    grid.addEventListener("dragleave", e => {
        if (!grid.contains(e.relatedTarget)) {
            grid.classList.remove("is-valid-unequip-drop");
        }
    });

    grid.addEventListener("drop", async e => {
        // Нельзя снять предмет, бросив его поверх другой вещи в рюкзаке.
        // Снятие работает только при броске на свободную поверхность рюкзака.
        if (e.target.closest(".lorgus-inventory-item")) {
            grid.classList.remove("is-valid-unequip-drop");
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        const inventoryId = getDraggedInventoryId(e);
        const row = rows.find(r => r.id === inventoryId);
        grid.classList.remove("is-valid-unequip-drop");

        if (!row?.equipped_slot) {
            window.lorgusDraggedInventoryId = null;
            return;
        }

        const { error } = await window.supabaseClient.rpc("unequip_character_item", {
            p_inventory_id: inventoryId
        });

        window.lorgusDraggedInventoryId = null;

        if (error) {
            console.error("Не удалось снять предмет:", error);
            grid.classList.add("is-invalid-drop");
            window.setTimeout(() => grid.classList.remove("is-invalid-drop"), 520);
            return;
        }

        await renderLorgusInventory();
    });

    document.querySelectorAll(".lorgus-equipment-slot").forEach(slot => {
        slot.addEventListener("dragover", e => {
            e.preventDefault();
            const inventoryId = getDraggedInventoryId(e);
            const row = rows.find(r => r.id === inventoryId);
            const item = row?.items;
            const valid = !!item?.equipment_slot && item.equipment_slot === slot.dataset.equipmentSlot && !row?.equipped_slot;
            slot.classList.toggle("is-valid-drop", valid);
            if (e.dataTransfer) e.dataTransfer.dropEffect = valid ? "move" : "none";
        });
        slot.addEventListener("dragleave", () => slot.classList.remove("is-valid-drop"));
        slot.addEventListener("drop", async e => {
            e.preventDefault();
            e.stopPropagation();

            const inventoryId = getDraggedInventoryId(e);
            const row = rows.find(r => r.id === inventoryId);
            const item = row?.items;
            const targetSlot = slot.dataset.equipmentSlot;
            slot.classList.remove("is-valid-drop");

            if (!inventoryId || !row || !item?.equipment_slot || item.equipment_slot !== targetSlot || row.equipped_slot) {
                rejectDrop(slot);
                window.lorgusDraggedInventoryId = null;
                return;
            }

            const { error } = await window.supabaseClient.rpc("equip_character_item", {
                p_inventory_id: inventoryId,
                p_slot: targetSlot
            });

            window.lorgusDraggedInventoryId = null;

            if (error) {
                rejectDrop(slot);
                console.error("Не удалось экипировать предмет:", error);
                return;
            }

            await renderLorgusInventory();
        });
    });

    document.addEventListener("dragend", clearDragFeedback, { once: true });

    if (inlineMode) {
        const inlineInventory = container.querySelector(".lorgus-inventory-main");
        if (inlineInventory) {
            inlineInventory.classList.add("lorgus-character-inline-equipment");
            inlineInventory.querySelector(".lorgus-inventory-header-meta")?.remove();
            const inlineView = document.createElement("div");
            inlineView.className = "lorgus-inventory-page lorgus-inventory-inline-view";
            inlineView.appendChild(inlineInventory);
            characterMain.querySelector(".lorgus-inventory-inline-view")?.remove();
            characterMain.appendChild(inlineView);
        }
        container.remove();
    }
}


/* Shared inventory helpers used by the RP runtime. */
window.inventoryRarityLabel = inventoryRarityLabel;
window.inventoryTypeLabel = inventoryTypeLabel;
window.lorgusCurrencyLabel = lorgusCurrencyLabel;
window.loadCharacterInventory = loadCharacterInventory;


/* LORGUS lootbox opening scene */
window.openLorgusLootbox = async function(inventoryId) {
    if (!inventoryId || !window.activeCharacter || !window.supabaseClient) return;
    if (document.querySelector(".lorgus-lootbox-overlay")) return;

    const overlay = document.createElement("div");
    overlay.className = "lorgus-lootbox-overlay";
    overlay.innerHTML = `
        <div class="lorgus-lootbox-backdrop"></div>
        <section class="lorgus-lootbox-scene" role="dialog" aria-modal="true" aria-label="Открытие лутбокса">
            <button class="lorgus-lootbox-close" type="button" aria-label="Закрыть">×</button>
            <div class="lorgus-lootbox-overline">ПЕЧАТЬ ХРАНИТЕЛЯ · LORGUS</div>
            <h2 class="lorgus-lootbox-title">Судьба внутри</h2>
            <p class="lorgus-lootbox-subtitle">Перед открытием изучи возможные награды и шансы их получения.</p>
            <section class="lorgus-lootbox-contents"><header><span>СОДЕРЖИМОЕ</span><strong>ШАНС ВЫПАДЕНИЯ</strong></header><div class="lorgus-lootbox-contents-list"><p>Сверяем печать…</p></div></section>
            <div class="lorgus-lootbox-portal">
                <div class="lorgus-lootbox-rune-ring"></div>
                <div class="lorgus-lootbox-rays"></div>
                <div class="lorgus-lootbox-chest" aria-hidden="true"><span class="lorgus-lootbox-chest-glow"></span><span class="lorgus-lootbox-chest-lid"></span><span class="lorgus-lootbox-chest-body">✦</span><span class="lorgus-lootbox-lock">◆</span></div>
                <div class="lorgus-lootbox-sparks"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
            </div>
            <div class="lorgus-lootbox-reward" hidden></div>
            <div class="lorgus-lootbox-status">ОЖИДАНИЕ РАСКРЫТИЯ</div>
            <button class="lorgus-lootbox-reveal" type="button">РАСКРЫТЬ ПЕЧАТЬ</button>
        </section>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("is-visible"));
    const close = () => { if (overlay.classList.contains("is-spinning")) return; overlay.remove(); document.querySelectorAll("style[data-lorgus-lootbox-style]").forEach(node => node.remove()); };
    overlay.querySelector(".lorgus-lootbox-close").addEventListener("click", close);
    overlay.querySelector(".lorgus-lootbox-backdrop").addEventListener("click", close);
    const revealButton = overlay.querySelector(".lorgus-lootbox-reveal");
    const status = overlay.querySelector(".lorgus-lootbox-status");
    const subtitle = overlay.querySelector(".lorgus-lootbox-subtitle");
    const chest = overlay.querySelector(".lorgus-lootbox-chest");
    const rewardBox = overlay.querySelector(".lorgus-lootbox-reward");
    const contentsList = overlay.querySelector(".lorgus-lootbox-contents-list");
    const contentsSection = overlay.querySelector(".lorgus-lootbox-contents");
    const roulette = document.createElement("section");
    roulette.className = "lorgus-lootbox-roulette";
    roulette.hidden = true;
    roulette.innerHTML = '<div class="lorgus-lootbox-roulette-label">ПЕЧАТЬ ВЫБИРАЕТ НАГРАДУ</div><div class="lorgus-lootbox-reel-window"><div class="lorgus-lootbox-reel-track"></div><i class="lorgus-lootbox-reel-pointer"></i></div><div class="lorgus-lootbox-reel-caption">Слушай, как замедляется печать…</div>';
    // Рулетка находится рядом с сундуком, а не внизу списка содержимого.
    // Во время вращения освобождаем сцену под саму ленту.
    const portal = overlay.querySelector(".lorgus-lootbox-portal");
    subtitle.insertAdjacentElement("afterend", roulette);
    const reelWindow = roulette.querySelector(".lorgus-lootbox-reel-window");
    const reelTrack = roulette.querySelector(".lorgus-lootbox-reel-track");
    const reelStyle = document.createElement("style");
    reelStyle.dataset.lorgusLootboxStyle = "true";
    reelStyle.textContent = ".lorgus-lootbox-roulette{width:100%;margin:18px 0 8px;position:relative;z-index:2}.lorgus-lootbox-roulette[hidden]{display:none}.lorgus-lootbox-roulette-label,.lorgus-lootbox-reel-caption{text-align:center;color:#b9a77e;font-size:10px;letter-spacing:.18em;text-transform:uppercase}.lorgus-lootbox-reel-window{position:relative;overflow:hidden;width:100%;height:158px;margin:12px 0;border:1px solid rgba(200,166,93,.45);background:linear-gradient(180deg,rgba(4,5,8,.98),rgba(20,17,12,.98));box-shadow:inset 0 0 28px #000,0 0 25px rgba(190,139,52,.12)}.lorgus-lootbox-reel-track{height:100%;display:flex;align-items:stretch;gap:8px;will-change:transform}.lorgus-lootbox-reel-card{box-sizing:border-box;flex:0 0 132px;width:132px;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;padding:10px 7px;border:1px solid var(--reward-color,#b8a27a);background:linear-gradient(155deg,rgba(35,31,23,.98),rgba(9,10,12,.98) 72%);box-shadow:inset 0 0 20px rgba(190,139,52,.12);text-align:center}.lorgus-lootbox-reel-card-icon{display:grid;place-items:center;width:48px;height:48px;border:1px solid var(--reward-color,#b8a27a);border-radius:50%;color:var(--reward-color,#b8a27a);font-size:28px;text-shadow:0 0 15px var(--reward-color,#b8a27a);background:rgba(0,0,0,.35)}.lorgus-lootbox-reel-card strong{width:100%;font-size:11px;line-height:1.25;color:#f0e7d2;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.lorgus-lootbox-reel-card small{font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:var(--reward-color,#b8a27a)}.lorgus-lootbox-reel-pointer{position:absolute;z-index:4;top:0;bottom:0;left:50%;width:3px;transform:translateX(-50%);background:#f6d98b;box-shadow:0 0 7px #ffe9a8,0 0 18px #d99b38;pointer-events:none}.lorgus-lootbox-reel-pointer:before,.lorgus-lootbox-reel-pointer:after{content:'';position:absolute;left:50%;transform:translateX(-50%);border-left:8px solid transparent;border-right:8px solid transparent}.lorgus-lootbox-reel-pointer:before{top:0;border-top:11px solid #f6d98b}.lorgus-lootbox-reel-pointer:after{bottom:0;border-bottom:11px solid #f6d98b}.lorgus-lootbox-overlay.is-spinning .lorgus-lootbox-reel-pointer{animation:lorgusLootboxPointer 150ms ease-in-out infinite alternate}.lorgus-lootbox-overlay.has-reward .lorgus-lootbox-reel-card.is-winner{box-shadow:inset 0 0 28px var(--reward-color),0 0 24px var(--reward-color)}@keyframes lorgusLootboxPointer{from{filter:brightness(.8)}to{filter:brightness(1.8)}}@media(max-width:620px){.lorgus-lootbox-reel-window{height:138px}.lorgus-lootbox-reel-card{flex-basis:112px;width:112px}.lorgus-lootbox-reel-card-icon{width:40px;height:40px;font-size:23px}}";
    document.head.appendChild(reelStyle);
    let lootboxAudio = null;
    let lastReelTick = -1;
    const playLootboxTone = (frequency, duration, type = "sine", volume = .03, delay = 0) => {
        try {
            const AudioCtor = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtor) return;
            if (!lootboxAudio) lootboxAudio = new AudioCtor();
            if (lootboxAudio.state === "suspended") lootboxAudio.resume();
            const osc = lootboxAudio.createOscillator(), gain = lootboxAudio.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(frequency, lootboxAudio.currentTime + delay);
            gain.gain.setValueAtTime(.0001, lootboxAudio.currentTime + delay);
            gain.gain.exponentialRampToValueAtTime(volume, lootboxAudio.currentTime + delay + .008);
            gain.gain.exponentialRampToValueAtTime(.0001, lootboxAudio.currentTime + delay + duration);
            osc.connect(gain); gain.connect(lootboxAudio.destination);
            osc.start(lootboxAudio.currentTime + delay); osc.stop(lootboxAudio.currentTime + delay + duration + .02);
        } catch (_) {}
    };
    const spinLootboxRoulette = async winner => {
        const pool = Array.isArray(contents) ? contents : [];
        const matching = pool.find(entry => entry.id != null && winner.id != null && String(entry.id) === String(winner.id)) || pool.find(entry => entry.reward_type === winner.reward_type && String(entry.name || "") === String(winner.name || "") && (entry.reward_type !== "currency" || (entry.currency_code === winner.currency_code && Number(entry.amount) === Number(winner.amount))));
        const winningCard = matching || winner;
        const colors = {common:"#b8a27a",uncommon:"#76b85f",rare:"#5f9fe8",epic:"#a875e8",legendary:"#e0a14a",mythic:"#e45bc7",unique:"#f3e7b0"};
        const rarity = {common:"ОБЫЧНАЯ",uncommon:"НЕОБЫЧНАЯ",rare:"РЕДКАЯ",epic:"ЭПИЧЕСКАЯ",legendary:"ЛЕГЕНДАРНАЯ",mythic:"МИФИЧЕСКАЯ",unique:"УНИКАЛЬНАЯ"};
        const total = 60, target = 50;
        const poolWithoutWinner = pool.filter(entry => entry !== matching);
        const decoys = poolWithoutWinner.length ? poolWithoutWinner : pool;
        const cards = Array.from({length:total}, (_, index) => index === target ? winningCard : decoys[Math.floor(Math.random() * decoys.length)]);
        reelTrack.innerHTML = cards.map(entry => '<article class="lorgus-lootbox-reel-card" style="--reward-color:' + escapeHtml(entry.color || colors[entry.rarity] || "#b8a27a") + ';"><span class="lorgus-lootbox-reel-card-icon">' + escapeHtml(entry.icon || "✦") + '</span><strong>' + escapeHtml(entry.name || "Таинственная награда") + '</strong><small>' + escapeHtml(entry.reward_type === "currency" ? formatLorgusRewardCurrency(entry.amount, entry.currency_code) : (rarity[entry.rarity] || entry.rarity || "НАГРАДА")) + '</small></article>').join("");
        const card = reelTrack.children[target];
        // Сначала показываем ленту: измерения скрытого элемента дают нулевые размеры,
        // из-за чего предыдущая версия фактически не могла прокрутить карточки.
        roulette.hidden = false;
        contentsSection.hidden = true;
        if (portal) portal.hidden = true;
        reelTrack.style.transform = "translateX(0px)";
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const viewportWidth = reelWindow.getBoundingClientRect().width;
        const trackRect = reelTrack.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        // Центруем именно карточку фактически выданной сервером награды.
        // Расчёт по реальным координатам DOM не зависит от ширины карточек/зазоров.
        const cardCenter = cardRect.left - trackRect.left + cardRect.width / 2;
        const endX = Math.round(viewportWidth / 2 - cardCenter);
        overlay.classList.add("is-spinning");
        playLootboxTone(95,.5,"sawtooth",.035); playLootboxTone(190,.38,"triangle",.025,.04); playLootboxTone(380,.25,"sine",.018,.12);
        lastReelTick = -1;
        const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const duration = reducedMotion ? 1500 : 12000;
        const started = performance.now();
        const animation = reelTrack.animate([{transform:"translateX(0px)"},{transform:"translateX(" + endX + "px)"}],{duration,easing:"cubic-bezier(.08,.68,.12,1)",fill:"forwards"});
        let raf;
        const tick = now => {
            const progress = Math.min(1,(now-started)/duration), eased = 1-Math.pow(1-progress,4);
            const position = -endX*eased;
            const cardStep = cardRect.width + (parseFloat(getComputedStyle(reelTrack).gap) || 8);
            const index = Math.floor((position + viewportWidth/2)/cardStep);
            if (index > lastReelTick) { for (let i=0;i<Math.min(3,index-lastReelTick);i++) { playLootboxTone(720,.035,"square",.018); playLootboxTone(1120,.025,"sine",.009,.005); } lastReelTick=index; }
            if (progress < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        await animation.finished.catch(() => {});
        cancelAnimationFrame(raf);
        animation.cancel();
        reelTrack.style.transform = "translateX(" + endX + "px)";
        overlay.classList.remove("is-spinning"); overlay.classList.add("has-reward");
        if (portal) portal.hidden = false;
        card.classList.add("is-winner");
        const base = ({common:330,uncommon:392,rare:494,epic:587,legendary:659,mythic:784,unique:988})[winner.rarity] || 440;
        playLootboxTone(base,.6,"sine",.055); playLootboxTone(base*1.5,.8,"triangle",.035,.09); playLootboxTone(base*2,1,"sine",.022,.18);
        if (["legendary","mythic","unique"].includes(winner.rarity)) { playLootboxTone(base*.5,.9,"sawtooth",.02,.04); playLootboxTone(base*2.5,1.1,"sine",.028,.25); }
    };
    const rarityLabels = {common:"Обычная",uncommon:"Необычная",rare:"Редкая",epic:"Эпическая",legendary:"Легендарная",mythic:"Мифическая",unique:"Уникальная"};
    const rewardTypeLabels = {title:"Титул",privilege:"Привилегия",currency:"Деньги",special:"Особая награда"};
    const { data: contents, error: contentsError } = await window.supabaseClient.rpc("get_lootbox_contents", { p_inventory_id: inventoryId });
    if (contentsError) {
        contentsList.innerHTML = '<p class="lorgus-lootbox-contents-error">Не удалось загрузить список наград. ' + escapeHtml(contentsError.message) + '</p>';
        revealButton.disabled = true;
    } else if (!Array.isArray(contents) || !contents.length) {
        contentsList.innerHTML = '<p>В этой коробке пока не запечатано ни одной награды.</p>';
        revealButton.disabled = true;
    } else {
        contentsList.innerHTML = contents.map(item =>
            '<article class="lorgus-lootbox-content-row" style="--reward-color:' + escapeHtml(item.color || "#d7b56d") + '">' +
                '<span class="lorgus-lootbox-content-icon">' + escapeHtml(item.icon || "✦") + '</span>' +
                '<span class="lorgus-lootbox-content-info"><strong>' + escapeHtml(item.name || "Таинственная награда") + '</strong><small>' + escapeHtml(rewardTypeLabels[item.reward_type] || "Награда") + ' · ' + escapeHtml(rarityLabels[item.rarity] || item.rarity || "—") + '</small><em>' + escapeHtml((item.description || (item.reward_type === "currency" ? "Деньги для кошелька." : "")) + (item.reward_type === "currency" ? " Сумма: " + formatLorgusRewardCurrency(item.amount, item.currency_code) + "." : "")) + '</em></span>' +
                '<strong class="lorgus-lootbox-content-chance">' + Number(item.chance || 0).toLocaleString("ru-RU",{maximumFractionDigits:4}) + '%</strong>' +
            '</article>'
        ).join("");
    }
    let opened = false;

    revealButton.addEventListener("click", async () => {
        if (opened) { close(); await renderLorgusInventory(); return; }
        opened = true;
        revealButton.disabled = true;
        revealButton.textContent = "ПЕЧАТЬ РАЗРУШАЕТСЯ…";
        status.textContent = "СВЯЗЬ С СУДЬБОЙ";
        subtitle.textContent = "Сокровище выбирается. Не прерывай ритуал.";
        overlay.classList.add("is-opening", "is-spinning");
        playLootboxTone(110,.16,"triangle",.03);
        chest.classList.add("is-shaking");
        await new Promise(resolve => setTimeout(resolve, 450));

        const { data, error } = await window.supabaseClient.rpc("open_character_lootbox", {
            p_inventory_id: inventoryId
        });
        chest.classList.remove("is-shaking");
        if (error || !data || data.error) {
            overlay.classList.remove("is-opening", "is-spinning");
            status.textContent = "ПЕЧАТЬ НЕ ПОДДАЛАСЬ";
            subtitle.textContent = error?.message || data?.error || "Не удалось открыть лутбокс.";
            revealButton.disabled = false;
            revealButton.textContent = "ПОПРОБОВАТЬ СНОВА";
            opened = false;
            return;
        }

        const item = data.reward || data;
        await spinLootboxRoulette(item);
        chest.classList.add("is-open");
        overlay.classList.remove("is-opening");
        overlay.classList.add("has-reward");
        status.textContent = "НАГРАДА ПОЛУЧЕНА";
        subtitle.textContent = item.reward_type === "currency" ? "Деньги зачислены в кошелёк." : item.reward_type === "title" ? "Титул добавлен в коллекцию персонажа." : item.reward_type === "privilege" ? "Привилегия записана в награды персонажа." : "Особая награда теперь принадлежит тебе.";
        contentsSection.hidden = true;
        rewardBox.hidden = false;
        rewardBox.style.setProperty("--reward-color", item.color || "#d7b56d");
        const rewardDescription = item.reward_type === "currency"
            ? (item.description || "").replace(/\s*Получено:.*$/i, "").trim() + " Зачислено: " + formatLorgusRewardCurrency(item.amount, item.currency_code) + "."
            : item.description || (item.reward_type === "title" ? "Новый титул доступен в карточке персонажа." : "Награда записана в историю персонажа.");
        rewardBox.innerHTML = '<span class="lorgus-lootbox-reward-icon">' + escapeHtml(item.icon || "✦") + '</span><div><small>' + escapeHtml(inventoryRarityLabel(item.rarity)) + ' · ' + escapeHtml(rewardTypeLabels[item.reward_type] || "Награда") + '</small><strong>' + escapeHtml(item.name || "Неизвестная награда") + '</strong><p>' + escapeHtml(rewardDescription) + '</p></div>';
        revealButton.disabled = false;
        revealButton.textContent = "ЗАБРАТЬ НАГРАДУ";
    });
};
