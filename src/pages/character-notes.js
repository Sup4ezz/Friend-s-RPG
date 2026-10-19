/* LORGUS freeform character canvas — private board per character. */
window.renderLorgusCharacterCanvas = async function (characterId) {
    const panel = document.querySelector(".lorgus-notes-panel");
    const viewport = panel?.querySelector(".lorgus-canvas-viewport");
    const db = window.supabaseClient;
    if (!panel || !viewport || !db || !characterId) return;

    const toolbar = panel.querySelector(".lorgus-canvas-toolbar");
    const status = panel.querySelector(".lorgus-canvas-status");
    const world = panel.querySelector(".lorgus-canvas-world");
    const svg = panel.querySelector(".lorgus-canvas-links");
    // The character sheet must remain usable even if a stale/partial DOM is present.
    // Canvas helpers dereference these nodes, so bail out before any async work if missing.
    if (!toolbar || !world || !svg) {
        console.warn("LORGUS canvas: required board elements are missing; skipping canvas render.");
        if (status) { status.textContent = "Доска временно недоступна. Обнови страницу."; status.dataset.kind = "error"; }
        return;
    }
    const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
    const id = () => (window.crypto?.randomUUID?.() || ("b" + Date.now().toString(36) + Math.random().toString(36).slice(2)));
    let user;
    let board = { version: 1, blocks: [], connections: [] };
    let tx = 80, ty = 55, zoom = 1;
    let dirty = false, saveTimer = null, saving = false, revision = 0, connectFrom = null, connectMode = false;
    let pan = null, drag = null;

    const setStatus = (text, kind = "") => {
        if (status) { status.textContent = text; status.dataset.kind = kind; }
    };
    try {
        const auth = await db.auth.getUser();
        user = auth.data?.user;
        if (auth.error || !user) throw auth.error || new Error("Не выполнен вход");
    } catch (error) {
        setStatus("Войди в аккаунт, чтобы открыть доску", "error");
        return;
    }

    setStatus("Загружаем доску…");
    const { data, error } = await db.from("character_canvases")
        .select("board").eq("character_id", characterId).eq("player_id", user.id).maybeSingle();
    if (error) {
        console.error("LORGUS canvas load:", error);
        setStatus("Не удалось загрузить доску", "error");
        return;
    }
    if (data?.board && typeof data.board === "object") {
        board = {
            version: 1,
            blocks: Array.isArray(data.board.blocks) ? data.board.blocks : [],
            connections: Array.isArray(data.board.connections) ? data.board.connections : []
        };
        if (data.board.viewport) {
            tx = Number(data.board.viewport.tx ?? tx);
            ty = Number(data.board.viewport.ty ?? ty);
            zoom = Math.min(1.8, Math.max(.35, Number(data.board.viewport.zoom ?? 1)));
        }
    }

    const queueSave = () => {
        dirty = true;
        revision++;
        setStatus("Есть несохранённые изменения…", "pending");
        clearTimeout(saveTimer);
        saveTimer = setTimeout(save, 700);
    };
    async function save() {
        clearTimeout(saveTimer);
        if (saving || !dirty) return;
        saving = true;
        const savedRevision = revision;
        setStatus("Сохраняем…", "pending");
        const payload = { ...board, viewport: { tx, ty, zoom } };
        const { error: saveError } = await db.from("character_canvases").upsert({
            player_id: user.id, character_id: characterId, board: payload, updated_at: new Date().toISOString()
        }, { onConflict: "player_id,character_id" });
        saving = false;
        if (saveError) {
            console.error("LORGUS canvas save:", saveError);
            setStatus("Не удалось сохранить. Проверь доступ к персонажу.", "error");
            return;
        }
        dirty = revision !== savedRevision;
        if (dirty) { setStatus("Сохраняем последние изменения…", "pending"); saveTimer = setTimeout(save, 200); }
        else setStatus("Сохранено", "ok");
    }

    const findBlock = blockId => board.blocks.find(block => block.id === blockId);
    const blockCenter = block => ({ x: Number(block.x || 0) + Number(block.width || 260) / 2, y: Number(block.y || 0) + Number(block.height || 170) / 2 });
    function drawLinks() {
        svg.replaceChildren();
        const ns = "http://www.w3.org/2000/svg";
        const defs = document.createElementNS(ns, "defs");
        const marker = document.createElementNS(ns, "marker");
        marker.setAttribute("id", "lorgus-canvas-arrow");
        marker.setAttribute("viewBox", "0 0 10 10");
        marker.setAttribute("refX", "9"); marker.setAttribute("refY", "5");
        marker.setAttribute("markerWidth", "7"); marker.setAttribute("markerHeight", "7");
        marker.setAttribute("orient", "auto-start-reverse");
        const arrow = document.createElementNS(ns, "path");
        arrow.setAttribute("d", "M 0 0 L 10 5 L 0 10 z"); arrow.setAttribute("fill", "#c6a56b");
        marker.append(arrow); defs.append(marker); svg.append(defs);
        board.connections.forEach(link => {
            const a = findBlock(link.from), b = findBlock(link.to);
            if (!a || !b) return;
            const p1 = blockCenter(a), p2 = blockCenter(b);
            const line = document.createElementNS(ns, "path");
            const mid = (p1.x + p2.x) / 2;
            line.setAttribute("d", `M ${p1.x} ${p1.y} C ${mid} ${p1.y}, ${mid} ${p2.y}, ${p2.x} ${p2.y}`);
            line.setAttribute("class", "lorgus-canvas-connection");
            line.setAttribute("marker-end", "url(#lorgus-canvas-arrow)");
            line.setAttribute("tabindex", "0");
            line.setAttribute("role", "button");
            line.setAttribute("aria-label", "Удалить связь");
            line.addEventListener("click", event => {
                event.stopPropagation();
                if (confirm("Удалить эту связь?")) {
                    board.connections = board.connections.filter(item => item.id !== link.id);
                    drawLinks(); queueSave();
                }
            });
            svg.append(line);
            if (link.label) {
                const text = document.createElementNS(ns, "text");
                text.setAttribute("x", String((p1.x + p2.x) / 2));
                text.setAttribute("y", String((p1.y + p2.y) / 2 - 8));
                text.setAttribute("class", "lorgus-canvas-link-label");
                text.setAttribute("text-anchor", "middle");
                text.textContent = link.label;
                svg.append(text);
            }
        });
    }
    function applyTransform() {
        world.style.transform = `translate(${tx}px, ${ty}px) scale(${zoom})`;
        const zoomLabel = panel.querySelector("[data-canvas-zoom]");
        if (zoomLabel) zoomLabel.textContent = Math.round(zoom * 100) + "%";
    }
    function makeBlock(type, x, y) {
        const presets = {
            text: { title: "Новая запись", content: "", width: 270, height: 190 },
            list: { title: "Список зацепок", content: "Первая зацепка\nВторая зацепка", width: 290, height: 220 },
            card: { title: "Новая карточка", content: "Тип: персонаж / место / событие\nПодробности…", width: 300, height: 210 }
        };
        const p = presets[type] || presets.text;
        const block = { id: id(), type, title: p.title, content: p.content, x, y, width: p.width, height: p.height };
        board.blocks.push(block);
        renderBlocks();
        queueSave();
    }
    function renderBlocks() {
        world.querySelectorAll(".lorgus-canvas-block").forEach(el => el.remove());
        const emptyHint = world.querySelector(".lorgus-canvas-empty-hint");
        if (emptyHint) emptyHint.hidden = board.blocks.length > 0;
        board.blocks.forEach(block => {
            const article = document.createElement("article");
            article.className = "lorgus-canvas-block lorgus-canvas-block-" + (["text", "list", "card"].includes(block.type) ? block.type : "text");
            article.dataset.blockId = block.id;
            article.style.left = (Number(block.x) || 0) + "px";
            article.style.top = (Number(block.y) || 0) + "px";
            article.style.width = Math.max(220, Number(block.width) || 270) + "px";
            article.style.minHeight = Math.max(150, Number(block.height) || 190) + "px";
            const typeLabel = block.type === "list" ? "СПИСОК" : block.type === "card" ? "КАРТОЧКА" : "ЗАПИСЬ";
            article.innerHTML = `
                <div class="lorgus-canvas-block-head" data-drag-handle>
                    <span>${typeLabel}</span>
                    <button type="button" class="lorgus-canvas-delete" title="Удалить блок" aria-label="Удалить блок">×</button>
                </div>
                <input class="lorgus-canvas-block-title" aria-label="Заголовок блока" maxlength="160" value="${esc(block.title)}">
                <textarea class="lorgus-canvas-block-content" aria-label="Содержимое блока" spellcheck="true">${esc(block.content)}</textarea>
                <div class="lorgus-canvas-block-foot"><span>ПЕРЕТАЩИ, ЧТОБЫ ПЕРЕМЕСТИТЬ</span><span class="lorgus-canvas-resize" aria-hidden="true">◢</span></div>`;
            const title = article.querySelector(".lorgus-canvas-block-title");
            const content = article.querySelector(".lorgus-canvas-block-content");
            title.addEventListener("input", () => { block.title = title.value; queueSave(); });
            content.addEventListener("input", () => { block.content = content.value; queueSave(); });
            article.querySelector(".lorgus-canvas-delete").addEventListener("click", () => {
                board.blocks = board.blocks.filter(item => item.id !== block.id);
                board.connections = board.connections.filter(link => link.from !== block.id && link.to !== block.id);
                renderBlocks(); drawLinks(); queueSave();
            });
            if (typeof ResizeObserver !== "undefined") {
                let lastWidth = Math.max(220, Number(block.width) || 270);
                let lastHeight = Math.max(150, Number(block.height) || 190);
                const observer = new ResizeObserver(entries => {
                    const rect = entries[0]?.contentRect;
                    if (!rect || rect.width < 220 || rect.height < 150) return;
                    if (Math.abs(rect.width - lastWidth) < 2 && Math.abs(rect.height - lastHeight) < 2) return;
                    lastWidth = Math.round(rect.width); lastHeight = Math.round(rect.height);
                    block.width = lastWidth; block.height = lastHeight;
                    drawLinks(); queueSave();
                });
                observer.observe(article);
            }
            article.addEventListener("pointerdown", event => {
                if (connectMode) {
                    if (event.target.closest("input,textarea,button")) return;
                    event.stopPropagation();
                    if (!connectFrom) {
                        connectFrom = block.id;
                        article.classList.add("lorgus-canvas-link-source");
                        setStatus("Теперь выбери блок, к которому провести связь", "pending");
                    } else if (connectFrom === block.id) {
                        connectFrom = null;
                        article.classList.remove("lorgus-canvas-link-source");
                        setStatus("Связь отменена");
                    } else {
                        const label = prompt("Подпись связи (можно оставить пустой):", "");
                        board.connections.push({ id: id(), from: connectFrom, to: block.id, label: String(label || "").trim().slice(0, 100) });
                        connectFrom = null; connectMode = false;
                        toolbar.querySelector("[data-canvas-connect]")?.classList.remove("is-active");
                        world.querySelectorAll(".lorgus-canvas-link-source").forEach(el => el.classList.remove("lorgus-canvas-link-source"));
                        drawLinks(); queueSave(); setStatus("Связь создана", "ok");
                    }
                    return;
                }
                if (!event.target.closest("[data-drag-handle]") || event.target.closest("button")) return;
                event.preventDefault();
                event.stopPropagation();
                drag = { id: block.id, startX: event.clientX, startY: event.clientY, x: Number(block.x) || 0, y: Number(block.y) || 0, pointerId: event.pointerId };
                article.setPointerCapture?.(event.pointerId);
                article.classList.add("is-dragging");
            });
            article.addEventListener("pointermove", event => {
                if (!drag || drag.id !== block.id || drag.pointerId !== event.pointerId) return;
                block.x = Math.round(drag.x + (event.clientX - drag.startX) / zoom);
                block.y = Math.round(drag.y + (event.clientY - drag.startY) / zoom);
                article.style.left = block.x + "px"; article.style.top = block.y + "px";
                drawLinks();
            });
            const stopDrag = event => {
                if (drag?.id === block.id && drag.pointerId === event.pointerId) {
                    drag = null; article.classList.remove("is-dragging"); queueSave();
                }
            };
            article.addEventListener("pointerup", stopDrag);
            article.addEventListener("pointercancel", stopDrag);
            world.append(article);
        });
        drawLinks();
    }

    toolbar.querySelectorAll("[data-canvas-add]").forEach(button => button.addEventListener("click", () => {
        const rect = viewport.getBoundingClientRect();
        const x = Math.round((rect.width / 2 - tx) / zoom - 130);
        const y = Math.round((rect.height / 2 - ty) / zoom - 90);
        makeBlock(button.dataset.canvasAdd, Math.max(20, x + (Math.random() * 80 - 40)), Math.max(20, y + (Math.random() * 80 - 40)));
    }));
    toolbar.querySelector("[data-canvas-connect]")?.addEventListener("click", event => {
        connectMode = !connectMode; connectFrom = null;
        event.currentTarget.classList.toggle("is-active", connectMode);
        world.querySelectorAll(".lorgus-canvas-link-source").forEach(el => el.classList.remove("lorgus-canvas-link-source"));
        setStatus(connectMode ? "Выбери первый блок для связи" : "Режим связи выключен", connectMode ? "pending" : "");
    });
    toolbar.querySelector("[data-canvas-save]")?.addEventListener("click", save);
    toolbar.querySelector("[data-canvas-zoom-in]")?.addEventListener("click", () => { zoom = Math.min(1.8, zoom + .1); applyTransform(); queueSave(); });
    toolbar.querySelector("[data-canvas-zoom-out]")?.addEventListener("click", () => { zoom = Math.max(.35, zoom - .1); applyTransform(); queueSave(); });
    toolbar.querySelector("[data-canvas-fit]")?.addEventListener("click", () => {
        if (!board.blocks.length) { tx = 80; ty = 55; zoom = 1; }
        else {
            const minX = Math.min(...board.blocks.map(b => Number(b.x) || 0));
            const minY = Math.min(...board.blocks.map(b => Number(b.y) || 0));
            const maxX = Math.max(...board.blocks.map(b => (Number(b.x) || 0) + (Number(b.width) || 270)));
            const maxY = Math.max(...board.blocks.map(b => (Number(b.y) || 0) + (Number(b.height) || 190)));
            zoom = Math.max(.35, Math.min(1.2, Math.min((viewport.clientWidth - 100) / (maxX - minX + 100), (viewport.clientHeight - 100) / (maxY - minY + 100))));
            tx = (viewport.clientWidth - (minX + maxX) * zoom) / 2;
            ty = (viewport.clientHeight - (minY + maxY) * zoom) / 2;
        }
        applyTransform(); queueSave();
    });
    viewport.addEventListener("pointerdown", event => {
        if (event.target.closest(".lorgus-canvas-block") || event.target.closest("button")) return;
        if (connectMode) return;
        pan = { x: event.clientX, y: event.clientY, tx, ty, pointerId: event.pointerId };
        viewport.classList.add("is-panning");
        viewport.setPointerCapture?.(event.pointerId);
    });
    viewport.addEventListener("pointermove", event => {
        if (!pan || pan.pointerId !== event.pointerId) return;
        tx = pan.tx + event.clientX - pan.x;
        ty = pan.ty + event.clientY - pan.y;
        applyTransform();
    });
    const stopPan = event => {
        if (pan?.pointerId === event.pointerId) { pan = null; viewport.classList.remove("is-panning"); queueSave(); }
    };
    viewport.addEventListener("pointerup", stopPan);
    viewport.addEventListener("pointercancel", stopPan);
    viewport.addEventListener("wheel", event => {
        event.preventDefault();
        const rect = viewport.getBoundingClientRect();
        const px = event.clientX - rect.left, py = event.clientY - rect.top;
        const old = zoom;
        zoom = Math.max(.35, Math.min(1.8, zoom * (event.deltaY < 0 ? 1.08 : .92)));
        tx = px - (px - tx) * (zoom / old);
        ty = py - (py - ty) * (zoom / old);
        applyTransform(); queueSave();
    }, { passive: false });

    renderBlocks();
    applyTransform();
    setStatus(board.blocks.length ? "Доска загружена" : "Доска пуста — добавь первый блок", "ok");
};