/* LORGUS inventory UI */
function lorgusCurrencyLabel(code) {
    return lorgusCurrencies[code]?.name || code;
}

function formatLorgusCurrencyAmount(amount) {
    const copper = Math.max(0, Number(amount) || 0);
    const gold = Math.floor(copper / 10000);
    const silver = Math.floor((copper % 10000) / 100);
    const bronze = copper % 100;
    return [
        gold ? gold + " золот." : "",
        silver ? silver + " серебр." : "",
        bronze || (!gold && !silver) ? bronze + " медн." : ""
    ].filter(Boolean).join(" · ");
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
    return '<article class="lorgus-inventory-item ' + extraClass + (row.equipped_slot ? ' is-equipped' : '') + (isLootbox ? ' is-lootbox' : '') + '" draggable="true" data-inventory-id="' + escapeHtml(row.id) + '" style="--item-color:' + escapeHtml(item.color || "#b8a27a") + '">' +
        '<div class="lorgus-inventory-item-icon">' + escapeHtml(item.icon || (isLootbox ? "🎁" : "◆")) + '</div>' +
        '<div class="lorgus-inventory-item-info"><strong>' + escapeHtml(item.name || "Предмет") + '</strong><small>' + escapeHtml(inventoryRarityLabel(item.rarity)) + ' · ' + escapeHtml(inventoryTypeLabel(item)) + '</small>' + (equippedLabel ? '<em>НАДЕТО · ' + escapeHtml(equippedLabel) + '</em>' : '') + '</div>' +
        '<b class="lorgus-inventory-qty">' + escapeHtml(qty) + '</b>' +
        (isLootbox ? '<button type="button" class="lorgus-lootbox-open-button" data-open-lootbox="' + escapeHtml(row.id) + '">ОТКРЫТЬ</button>' : '') + '</article>';
}

async function loadCharacterInventory(characterId) {
    const { data, error } = await window.supabaseClient.from("character_inventory")
        .select("id, quantity, equipped_slot, acquired_at, source_note, items(*)")
        .eq("character_id", characterId).gt("quantity", 0).order("acquired_at", { ascending: true });
    if (error) console.error("Не удалось загрузить инвентарь:", error);
    return { data: data || [], error };
}

async function renderLorgusInventory() {
    const container = document.getElementById("cabinet-content");
    const character = window.activeCharacter;
    if (!container || !character) return;
    container.className = "lorgus-inventory-page";
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
                        <div class="lorgus-inventory-grid" id="lorgus-inventory-grid">
                            <div class="lorgus-inventory-empty">Загрузка...</div>
                        </div>
                    </section>
                </section>
            </main>
        </div>
    `;
    const walletSection = document.createElement("section");
    walletSection.className = "lorgus-wallet-panel";
    walletSection.innerHTML = '<div class="lorgus-wallet-title"><div><span>ФИНАНСЫ</span><h2>Кошелёк</h2></div><small>Валюты пяти королевств · 1 золотая = 100 серебряных · 1 серебряная = 100 медных</small></div><div class="lorgus-wallet-grid" id="lorgus-wallet-grid"></div>';
    container.querySelector(".lorgus-inventory-main").appendChild(walletSection);
    const { data: currencyRows } = await loadCharacterCurrency(character.id);
    const walletGrid = document.getElementById("lorgus-wallet-grid");
    if (walletGrid) walletGrid.innerHTML = Object.entries(lorgusCurrencies).map(([code,c]) => {
        const row=(currencyRows||[]).find(x=>x.currency_code===code);
        return '<div class="lorgus-wallet-card"><span class="lorgus-wallet-icon">' + escapeHtml(c.icon) + '</span><div><strong>' + escapeHtml(c.name) + '</strong><small>' + escapeHtml(c.kingdom) + ' · 1 золотая = ' + escapeHtml(c.goldRate) + ' экв.</small></div><b>' + escapeHtml(formatLorgusCurrencyAmount(row?.amount || 0)) + '</b></div>';
    }).join("");
    const { data, error } = await loadCharacterInventory(character.id);
    const grid = document.getElementById("lorgus-inventory-grid");
    if (!grid) return;
    if (error) { grid.innerHTML = '<div class="lorgus-inventory-empty"><h2>Инвентарь недоступен</h2><p>' + escapeHtml(error.message) + '</p></div>'; return; }
    const rows = data || [];
    const backpackRows = rows.filter(row => !row.equipped_slot);
    document.getElementById("lorgus-inventory-count").textContent = backpackRows.length + " ячеек";
    grid.innerHTML = backpackRows.length ? backpackRows.map(row => inventoryItemMarkup(row)).join("") : '<div class="lorgus-inventory-empty"><h2>Рюкзак пуст</h2><p>Перетащи сюда предмет с персонажа, чтобы снять его.</p></div>';
    const renderEquipped = () => document.querySelectorAll(".lorgus-equipment-slot").forEach(slot => {
        const row = rows.find(r => r.equipped_slot === slot.dataset.equipmentSlot);
        const item = row?.items; const box = slot.querySelector(".lorgus-equipment-slot-item");
        box.innerHTML = row && item ? '<div class="lorgus-equipped-item" draggable="true" data-inventory-id="' + escapeHtml(row.id) + '" style="--item-color:' + escapeHtml(item.color || "#b8a27a") + '"><span>' + escapeHtml(item.icon || "◆") + '</span><strong>' + escapeHtml(item.name || "Предмет") + '</strong></div>' : "";
    });
    renderEquipped();
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
            <p class="lorgus-lootbox-subtitle">Печать трескается. Содержимое ещё не раскрыто.</p>
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
    const close = () => overlay.remove();
    overlay.querySelector(".lorgus-lootbox-close").addEventListener("click", close);
    overlay.querySelector(".lorgus-lootbox-backdrop").addEventListener("click", close);
    const revealButton = overlay.querySelector(".lorgus-lootbox-reveal");
    const status = overlay.querySelector(".lorgus-lootbox-status");
    const subtitle = overlay.querySelector(".lorgus-lootbox-subtitle");
    const chest = overlay.querySelector(".lorgus-lootbox-chest");
    const rewardBox = overlay.querySelector(".lorgus-lootbox-reward");
    let opened = false;

    revealButton.addEventListener("click", async () => {
        if (opened) { close(); await renderLorgusInventory(); return; }
        opened = true;
        revealButton.disabled = true;
        revealButton.textContent = "ПЕЧАТЬ РАЗРУШАЕТСЯ…";
        status.textContent = "СВЯЗЬ С СУДЬБОЙ";
        subtitle.textContent = "Сокровище выбирается. Не прерывай ритуал.";
        overlay.classList.add("is-opening");
        chest.classList.add("is-shaking");
        await new Promise(resolve => setTimeout(resolve, 2200));

        const { data, error } = await window.supabaseClient.rpc("open_character_lootbox", {
            p_inventory_id: inventoryId
        });
        chest.classList.remove("is-shaking");
        if (error || !data || data.error) {
            overlay.classList.remove("is-opening");
            status.textContent = "ПЕЧАТЬ НЕ ПОДДАЛАСЬ";
            subtitle.textContent = error?.message || data?.error || "Не удалось открыть лутбокс.";
            revealButton.disabled = false;
            revealButton.textContent = "ПОПРОБОВАТЬ СНОВА";
            opened = false;
            return;
        }

        const item = data.reward || data;
        chest.classList.add("is-open");
        overlay.classList.remove("is-opening");
        overlay.classList.add("has-reward");
        status.textContent = "НАГРАДА ПОЛУЧЕНА";
        subtitle.textContent = "Содержимое лутбокса добавлено в твой инвентарь.";
        rewardBox.hidden = false;
        rewardBox.style.setProperty("--reward-color", item.color || "#d7b56d");
        rewardBox.innerHTML = '<span class="lorgus-lootbox-reward-icon">' + escapeHtml(item.icon || "◆") + '</span><div><small>' + escapeHtml(inventoryRarityLabel(item.rarity)) + '</small><strong>' + escapeHtml(item.name || "Неизвестный предмет") + '</strong><p>' + escapeHtml(item.description || "Новая вещь теперь принадлежит тебе.") + '</p></div>';
        revealButton.disabled = false;
        revealButton.textContent = "ЗАБРАТЬ НАГРАДУ";
    });
};
