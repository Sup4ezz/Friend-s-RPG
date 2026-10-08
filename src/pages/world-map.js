/* LORGUS world map */
const LORGUS_MAP_MARKERS = [
    { id:"Атэрон", x:22, y:37, type:"kingdom", description:"Знания, древности, исследования и руины." },
    { id:"Каэлор", x:72, y:30, type:"kingdom", description:"Горы, кузницы, шахты и древнее мастерство." },
    { id:"Ксандр", x:79, y:61, type:"kingdom", description:"Торговля, банки, дороги и большие рынки." },
    { id:"Лирэн", x:31, y:70, type:"kingdom", description:"Леса, плодородные земли и древняя природа." },
    { id:"Морвейн", x:51, y:79, type:"kingdom", description:"Паломничество, память и туманные долины." },
    { id:"Святые Земли", x:52, y:49, type:"neutral", description:"Нейтральная территория для переговоров монархов и глав церквей." },
    { id:"Спорные Земли", x:62, y:63, type:"contested", description:"Независимые поселения и территории вне власти пяти королевств." }
];

const LORGUS_MAP_EDITOR_STORAGE_KEY = "lorgus-map-label-positions-v1";

function getLorgusSavedLabelPositions() {
    try {
        return JSON.parse(localStorage.getItem(LORGUS_MAP_EDITOR_STORAGE_KEY) || "{}") || {};
    } catch {
        return {};
    }
}

function saveLorgusLabelPosition(rectData) {
    try {
        const saved = getLorgusSavedLabelPositions();
        saved[rectData.id] = { x: rectData.x, y: rectData.y, w: rectData.w, h: rectData.h };
        localStorage.setItem(LORGUS_MAP_EDITOR_STORAGE_KEY, JSON.stringify(saved));
    } catch {}
}

function applyLorgusSavedLabelPositions() {
    const saved = getLorgusSavedLabelPositions();
    LORGUS_MAP_EDITOR_RECTS.forEach(rect => {
        const position = saved[rect.id];
        if (!position) return;
        if (Number.isFinite(position.x)) rect.x = position.x;
        if (Number.isFinite(position.y)) rect.y = position.y;
        if (Number.isFinite(position.w)) rect.w = position.w;
        if (Number.isFinite(position.h)) rect.h = position.h;
    });
}

const LORGUS_MAP_EDITOR_RECTS = [
    { id:"Атэрон", x:62.5, y:65.1, w:11.8, h:6.0, rotation:0 },
    { id:"Каэлор", x:62.0, y:72.7, w:11.9, h:6.3, rotation:0 },
    { id:"Ксандр", x:48.4, y:60.6, w:6.7, h:8.2, rotation:0 },
    { id:"Лирэн", x:25.4, y:57.0, w:17.2, h:8.9, rotation:0 },
    { id:"Морвейн", x:69.9, y:39.8, w:12.2, h:10.6, rotation:0 },
    { id:"Святые Земли", x:51.9, y:44.2, w:3.4, h:3.4, rotation:0 },
    { id:"Спорные Земли", x:54.6, y:28.5, w:6.1, h:5.3, rotation:0 }
];
function enableLorgusMapEditor() {
    const layer = document.getElementById("lorgus-map-marker-layer");
    const viewport = document.getElementById("lorgus-map-viewport");
    if (!layer || !viewport) return;

    layer.classList.toggle("editor-mode");
    const active = layer.classList.contains("editor-mode");
    const button = document.getElementById("lorgus-map-editor-toggle");
    if (button) button.textContent = active ? "✓ РЕДАКТОР ВКЛЮЧЁН" : "✎ РЕДАКТОР КАРТЫ";

    renderLorgusMapEditorRects(active);
}

function bindLorgusMapEditorInteraction(label, rectData, layer) {
    if (!label || !rectData || !layer) return;

    let drag = null;

    const start = (event, mode) => {
        if (!layer.classList.contains("editor-mode")) return;
        event.preventDefault();
        event.stopPropagation();

        const layerRect = layer.getBoundingClientRect();
        drag = {
            mode,
            startX: event.clientX,
            startY: event.clientY,
            x: rectData.x,
            y: rectData.y,
            w: rectData.w,
            h: rectData.h,
            layerW: layerRect.width,
            layerH: layerRect.height,
            moved: false
        };

        label.setPointerCapture?.(event.pointerId);
        label.classList.add("editing");
    };

    label.addEventListener("pointerdown", event => {
        if (event.target.closest(".lorgus-map-editor-handle")) return;
        start(event, "move");
    });

    const handle = document.createElement("span");
    handle.className = "lorgus-map-editor-handle";
    handle.title = "Изменить размер";
    label.appendChild(handle);

    handle.addEventListener("pointerdown", event => {
        start(event, "resize");
    });

    label.addEventListener("pointermove", event => {
        if (!drag) return;

        const dx = ((event.clientX - drag.startX) / drag.layerW) * 100;
        const dy = ((event.clientY - drag.startY) / drag.layerH) * 100;

        if (Math.abs(dx) + Math.abs(dy) > 0.15) drag.moved = true;

        if (drag.mode === "move") {
            rectData.x = Math.max(0, Math.min(100, drag.x + dx));
            rectData.y = Math.max(0, Math.min(100, drag.y + dy));
        } else {
            rectData.w = Math.max(1, Math.min(40, drag.w + dx));
            rectData.h = Math.max(1, Math.min(40, drag.h + dy));
        }

        label.style.left = rectData.x + "%";
        label.style.top = rectData.y + "%";
        label.style.width = rectData.w + "%";
        label.style.height = rectData.h + "%";
        fitLorgusMapLabel(label);
        updateLorgusMapEditorReadout(rectData);
    });

    const stop = event => {
        if (!drag) return;
        label.classList.remove("editing");
        label.dataset.moved = drag.moved ? "1" : "0";
        drag = null;
        if (event) {
            saveLorgusLabelPosition(rectData);
            updateLorgusMapEditorReadout(rectData);
        }
    };

    label.addEventListener("pointerup", stop);
    label.addEventListener("pointercancel", stop);

    label.addEventListener("click", event => {
        if (label.dataset.moved === "1") {
            event.preventDefault();
            event.stopPropagation();
            label.dataset.moved = "0";
        }
    });
}

function updateLorgusMapEditorReadout(rectData) {
    const readout = document.getElementById("lorgus-map-editor-readout");
    if (!readout || !rectData) return;

    readout.innerHTML =
        "<strong>" + window.escapeHtml(rectData.id) + "</strong>" +
        "<span>X " + rectData.x.toFixed(1) + " · Y " + rectData.y.toFixed(1) +
        " · W " + rectData.w.toFixed(1) + " · H " + rectData.h.toFixed(1) + "</span>";
}

function syncLorgusMapLabelLayer() {
    const world = document.getElementById("lorgus-map-world");
    const image = world?.querySelector(".lorgus-map-image");
    const layer = document.getElementById("lorgus-map-marker-layer");

    if (!world || !image || !layer || !image.complete) return;

    // Координаты подписей относятся именно к PNG, а не ко всему viewport.
    // Это важно, когда object-fit: contain оставляет поля по краям.
    layer.style.left = image.offsetLeft + "px";
    layer.style.top = image.offsetTop + "px";
    layer.style.width = image.offsetWidth + "px";
    layer.style.height = image.offsetHeight + "px";
}

function fitLorgusMapLabel(label) {
    if (!label) return;

    const maxWidth = Math.max(20, label.clientWidth - 10);
    const maxHeight = Math.max(14, label.clientHeight - 6);
    const textLength = Math.max(1, (label.textContent || "").trim().length);

    // Размер названия напрямую зависит от размеров рамки.
    // Ширина учитывается через длину текста, а не через scrollWidth,
    // чтобы браузерное переносы строк не ужимали шрифт до крошечного размера.
    const heightSize = maxHeight * 0.78;
    const widthSize = maxWidth / Math.max(3.8, textLength * 0.52);

    let size = Math.min(56, Math.max(12, heightSize, widthSize));
    label.style.fontSize = size + "px";

    // Только реальный выход за границы уменьшает размер.
    while (
        size > 12 &&
        (label.scrollWidth > label.clientWidth + 2 || label.scrollHeight > label.clientHeight + 2)
    ) {
        size -= 1;
        label.style.fontSize = size + "px";
    }
}

function renderLorgusMapEditorRects() {
    applyLorgusSavedLabelPositions();
    const layer = document.getElementById("lorgus-map-marker-layer");
    const image = document.querySelector("#lorgus-map-world .lorgus-map-image");
    if (!layer || !image) return;

    layer.querySelectorAll(".lorgus-map-editor-rect").forEach(el => el.remove());

    const render = () => {
        syncLorgusMapLabelLayer();

        LORGUS_MAP_EDITOR_RECTS.forEach(rectData => {
            const label = document.createElement("button");
            label.type = "button";
            label.className = "lorgus-map-editor-rect";
            label.dataset.region = rectData.id;
            label.textContent = rectData.id;

            label.style.left = rectData.x + "%";
            label.style.top = rectData.y + "%";
            label.style.width = rectData.w + "%";
            label.style.height = rectData.h + "%";
            label.style.transform = "translate(-50%,-50%)";

            label.onclick = event => {
                event.preventDefault();
                event.stopPropagation();

                if (typeof window.selectLorgusMapRegion === "function") {
                    window.selectLorgusMapRegion(rectData.id);
                }
            };

            layer.appendChild(label);

            if (layer.classList.contains("editor-mode")) {
                bindLorgusMapEditorInteraction(label, rectData, layer);
            }
        });

        requestAnimationFrame(() => {
            syncLorgusMapLabelLayer();
            layer.querySelectorAll(".lorgus-map-editor-rect").forEach(fitLorgusMapLabel);
        });
    };

    if (image.complete) {
        render();    } else {
        image.addEventListener("load", render, { once: true });
    }
    if (window.lorgusMapLabelResizeObserver) {
        window.lorgusMapLabelResizeObserver.disconnect();
    }

    const world = document.getElementById("lorgus-map-world");
    if (!world) return;

    window.lorgusMapLabelResizeObserver = new ResizeObserver(() => {
        syncLorgusMapLabelLayer();
        layer.querySelectorAll(".lorgus-map-editor-rect").forEach(fitLorgusMapLabel);
    });

    window.lorgusMapLabelResizeObserver.observe(image);
    window.lorgusMapLabelResizeObserver.observe(world);
}
function addLorgusMapEditorUI() {
    const controls = document.querySelector(".lorgus-map-controls");
    if (!controls || document.getElementById("lorgus-map-editor-toggle")) return;

    controls.innerHTML = "";

    const button = document.createElement("button");
    button.id = "lorgus-map-editor-toggle";
    button.type = "button";
    button.className = "lorgus-map-control lorgus-map-editor-toggle";
    button.textContent = "✎ РЕДАКТОР КАРТЫ";
    button.onclick = enableLorgusMapEditor;
    controls.appendChild(button);

    const readout = document.createElement("div");
    readout.id = "lorgus-map-editor-readout";
    readout.className = "lorgus-map-editor-readout";
    readout.innerHTML = "<strong>РЕДАКТОР ВЫКЛЮЧЕН</strong><span>Нажми кнопку, затем перетаскивай названия</span>";
    controls.appendChild(readout);
}

function renderLorgusMapMarkers() {
    const layer = document.getElementById("lorgus-map-marker-layer");
    if (!layer) return;

    layer.innerHTML = LORGUS_MAP_MARKERS.map(marker => `
        <button
            type="button"
            class="lorgus-map-marker ${marker.type}"
            style="left:${marker.x}%;top:${marker.y}%"
            data-region="${window.escapeHtml(marker.id)}"
            onclick="selectLorgusMapMarker('${window.escapeHtml(marker.id)}')"
            title="${window.escapeHtml(marker.id)}"
            aria-label="Открыть ${window.escapeHtml(marker.id)}"
        >
            <span class="lorgus-map-marker-pulse"></span>
            <span class="lorgus-map-marker-core"></span>
            <span class="lorgus-map-marker-label">${window.escapeHtml(marker.id)}</span>
        </button>
    `).join("");

    const presence = window.activeRpPresence;
    if (presence?.type === "location" && presence.location) {
        const current = layer.querySelector(`[data-region="${CSS.escape(presence.location)}"]`);
        current?.classList.add("current");
    }
}

function selectLorgusMapMarker(region) {
    selectLorgusMapRegion(region);
    const marker = document.querySelector(`.lorgus-map-marker[data-region="${CSS.escape(region)}"]`);
    document.querySelectorAll(".lorgus-map-marker").forEach(item => item.classList.remove("selected"));
    marker?.classList.add("selected");
}

function handleLorgusMapSurfaceClick(event) {
    if (event.target.closest(".lorgus-map-marker")) return;
    const viewport = document.getElementById("lorgus-map-viewport");
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    const x = Math.round(((event.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((event.clientY - rect.top) / rect.height) * 100);
    const hint = document.getElementById("lorgus-map-surface-hint");
    if (hint) {
        hint.textContent = `ТОЧКА КАРТЫ · ${Math.max(0,Math.min(100,x))}% / ${Math.max(0,Math.min(100,y))}%`;
        hint.classList.add("visible");
        clearTimeout(window.lorgusMapHintTimer);
        window.lorgusMapHintTimer = setTimeout(() => hint.classList.remove("visible"), 1800);
    }
}

function renderLorgusWorldMap(container, character) {
    if (!container || !character) return;

    container.className = "lorgus-map-page";

    const name = window.escapeHtml(character.name || "Без имени");
    const race = window.escapeHtml(character.race || "Раса не указана");
    const homeland = window.escapeHtml(character.homeland || "Родина не указана");

    const presence = window.activeRpPresence;
    const currentLocation =
        presence?.type === "location"
            ? presence.location
            : presence?.type === "road"
                ? "В пути"
                : "Местоположение ещё не определено";

    container.innerHTML = `
        <nav class="lorgus-mainmenu-nav" aria-label="Навигация">
            <button type="button" class="lorgus-mainmenu-arrow top" onclick="window.renderLorgusCharacterHub?.()" aria-label="Персонаж"><span>▲</span><b>ПЕРСОНАЖ</b></button>
            <button type="button" class="lorgus-mainmenu-arrow bottom" onclick="window.renderMail?.()" aria-label="Письма"><span>▼</span><b>ПИСЬМА</b></button>
            <button type="button" class="lorgus-mainmenu-arrow left" onclick="window.renderLorgusRpHub?.()" aria-label="Ролевая"><span>◀</span><b>РОЛЕВАЯ</b></button>
            <button type="button" class="lorgus-mainmenu-arrow right" onclick="window.renderLorgusInventory?.()" aria-label="Инвентарь"><span>▶</span><b>ИНВЕНТАРЬ</b></button>
        </nav>
        <div class="lorgus-map-shell">
            <aside class="lorgus-map-sidebar">
                <div class="lorgus-map-brand">
                    <span class="lorgus-map-brand-mark">✦</span>
                    <span>ЛОРГУС</span>
                </div>

                <div class="lorgus-map-character">
                    <span class="lorgus-map-kicker">ПУТЬ ПЕРСОНАЖА</span>
                    <h1>${name}</h1>
                    <p>${race} · ${homeland}</p>
                    <div class="lorgus-character-seal" aria-hidden="true"><span>✦</span></div>
                </div>

                <div class="lorgus-map-location-status">
                    <span>ТЕКУЩЕЕ МЕСТОПОЛОЖЕНИЕ</span>
                    <strong>${window.escapeHtml(currentLocation)}</strong>
                    <small>Положение персонажа в мире</small>
                </div>
                <div class="lorgus-map-world-stats">
                    <div><strong>07</strong><span>КРАЁВ</span></div>
                    <div><strong>01</strong><span>ЗАКРЫТ</span></div>
                    <div><strong>∞</strong><span>ПУТЕЙ</span></div>
                </div>

                <div class="lorgus-map-divider"></div>

                <button class="gold-button lorgus-map-side-button" type="button" onclick="window.openActiveCharacterProfile()">Профиль</button>
                <button class="character-secondary-button lorgus-map-side-button" type="button" onclick="renderWorldCharacterTracker()">Люди мира</button>
                <button class="character-secondary-button lorgus-map-side-button" type="button" onclick="renderMail()">Письма</button>
                <button class="character-secondary-button lorgus-map-side-button" type="button" onclick="switchCharacter()">Сменить персонажа</button>
            </aside>

            <main class="lorgus-map-main">
                <header class="lorgus-map-header">
                    <div>
                        <span class="lorgus-map-kicker">МИР ЛОРГУСА · КАРТА</span>
                        <h2>Лоргус</h2>
                    </div>
                    <div class="lorgus-map-header-actions">
                        <div class="lorgus-map-header-status">
                            <span class="lorgus-map-status-dot"></span>
                            <span>МИР АКТИВЕН</span>
                        </div>
                    </div>
                </header>

                <section class="lorgus-map-stage">
                    <div class="lorgus-map-frame">
                        <div class="lorgus-map-image-wrap" id="lorgus-map-viewport" >
                            <div class="lorgus-map-atmosphere" aria-hidden="true"><i></i><i></i><i></i></div>
                            <div class="lorgus-map-world" id="lorgus-map-world">
                                <img class="lorgus-map-image" src="/assets/world/nerovland-map.png" alt="Карта Лоргуса" draggable="false">
                                <div class="lorgus-map-marker-layer" id="lorgus-map-marker-layer" aria-label="Обозначения карты"></div>
                            </div>
                            <div class="lorgus-mainmenu-fog" aria-hidden="true"></div>
                            <div class="lorgus-map-surface-hint" id="lorgus-map-surface-hint">ТОЧКА КАРТЫ</div>
                            <div class="lorgus-map-overlay">
                                <div class="lorgus-map-corner-mark top-left">L · 001</div>
                                <div class="lorgus-map-corner-mark top-right">CARTA MUNDI</div>
                                <div class="lorgus-map-corner-mark bottom-left">ЛОРГУС / WORLD</div>
                                <div class="lorgus-map-corner-mark bottom-right">07 REGIONS</div>
                                <div class="lorgus-map-compass" aria-hidden="true"><span>N</span><i></i></div>
                                <div class="lorgus-map-scale"><span></span><small>МИР</small></div>
                            </div>
                        </div>

                        <div class="lorgus-map-controls" aria-label="Управление картой">

                        </div>

                        <div class="lorgus-map-hint">
                            <span>КАРТА МИРА</span>
                            <small>Статичная карта · территории выбираются нажатием</small>
                        </div>
                    </div>

                    <aside class="lorgus-map-inspector">
                        <span class="lorgus-map-kicker">ВЫБРАННЫЙ КРАЙ</span>
                        <div class="lorgus-map-selection-symbol"><span>◇</span><i></i></div>
                        <h3 id="lorgus-map-selection-title">Атэрон</h3>
                        <p id="lorgus-map-selection-text">Знания, древности, исследования и руины.</p>
                        <div class="lorgus-map-inspector-meta">
                            <span>СТАТУС</span><strong>ОТКРЫТ ДЛЯ ИССЛЕДОВАНИЯ</strong>
                        </div>

                        <button id="lorgus-map-enter-button" class="gold-button lorgus-map-enter-button" type="button" onclick="window.renderKingdomLocations('Атэрон')">Открыть край</button>

                        <div class="lorgus-map-regions">
                            <span class="lorgus-map-regions-title">РЕГИОНЫ</span>
                            <button class="lorgus-map-region-button active" data-region="Атэрон" type="button" onclick="selectLorgusMapRegion('Атэрон')"><i></i><span>Атэрон</span></button>
                            <button class="lorgus-map-region-button" data-region="Каэлор" type="button" onclick="selectLorgusMapRegion('Каэлор')"><i></i><span>Каэлор</span></button>
                            <button class="lorgus-map-region-button" data-region="Ксандр" type="button" onclick="selectLorgusMapRegion('Ксандр')"><i></i><span>Ксандр</span></button>
                            <button class="lorgus-map-region-button" data-region="Лирэн" type="button" onclick="selectLorgusMapRegion('Лирэн')"><i></i><span>Лирэн</span></button>
                            <button class="lorgus-map-region-button" data-region="Морвейн" type="button" onclick="selectLorgusMapRegion('Морвейн')"><i></i><span>Морвейн</span></button>
                            <button class="lorgus-map-region-button" data-region="Святые Земли" type="button" onclick="selectLorgusMapRegion('Святые Земли')"><i></i><span>Святые Земли</span></button>
                            <button class="lorgus-map-region-button" data-region="Спорные Земли" type="button" onclick="selectLorgusMapRegion('Спорные Земли')"><i></i><span>Спорные Земли</span></button>
                        </div>

                        <div class="lorgus-map-closed">
                            <span>ЗАКРЫТАЯ ТЕРРИТОРИЯ</span>
                            <strong>Геена</strong>
                            <p>Континент закрыт для игроков. Посещение и происхождение персонажа здесь недоступны.</p>
                        </div>
                    </aside>
                </section>
            </main>
        </div>
    `;

    selectLorgusMapRegion("Атэрон");
    initializeLorgusMapViewport();
    renderLorgusMapEditorRects(false);
    addLorgusMapEditorUI();
    if (new URLSearchParams(window.location.search).get("mapedit") === "1") {
        container.classList.add("lorgus-map-editor-active");
        const layer = document.getElementById("lorgus-map-marker-layer");
        layer?.classList.add("editor-mode");
        renderLorgusMapEditorRects();
        showLorgusMapEditorMode(container);
    }
    initializeLorgusMainMenuLight();
}

function showLorgusMapEditorMode(container) {
    if (!container || document.getElementById("lorgus-map-editor-mode-hint")) return;
    const hint = document.createElement("div");
    hint.id = "lorgus-map-editor-mode-hint";
    hint.innerHTML = "<strong>РЕЖИМ РАЗМЕТКИ</strong><span>Перетаскивай названия. Позиция сохраняется автоматически.</span><button type=\"button\">ГОТОВО</button>";
    hint.querySelector("button").onclick = () => {
        const url = new URL(window.location.href);
        url.searchParams.delete("mapedit");
        window.history.replaceState({}, "", url.pathname + url.search + url.hash);
        hint.remove();
        container.classList.remove("lorgus-map-editor-active");
        document.getElementById("lorgus-map-marker-layer")?.classList.remove("editor-mode");
        renderLorgusMapEditorRects();
    };
    container.appendChild(hint);
}

function initializeLorgusMainMenuLight() {
    const viewport = document.getElementById("lorgus-map-viewport");
    if (!viewport) return;

    if (window.lorgusMainMenuLightCleanup) window.lorgusMainMenuLightCleanup();

    const move = event => {
        const rect = viewport.getBoundingClientRect();
        const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
        const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
        viewport.style.setProperty("--lorgus-mx", x + "px");
        viewport.style.setProperty("--lorgus-my", y + "px");
        viewport.classList.add("cursor-lit");
    };

    const leave = () => viewport.classList.remove("cursor-lit");

    viewport.addEventListener("pointermove", move);
    viewport.addEventListener("pointerleave", leave);

    window.lorgusMainMenuLightCleanup = () => {
        viewport.removeEventListener("pointermove", move);
        viewport.removeEventListener("pointerleave", leave);
    };
}

let lorgusMapScale = 1;
let lorgusMapOffsetX = 0;
let lorgusMapOffsetY = 0;
let lorgusMapViewportCleanup = null;

function initializeLorgusMapViewport() {
    if (lorgusMapViewportCleanup) {
        lorgusMapViewportCleanup();
        lorgusMapViewportCleanup = null;
    }

    lorgusMapScale = 1;
    lorgusMapOffsetX = 0;
    lorgusMapOffsetY = 0;

    const world = document.getElementById("lorgus-map-world");
    if (world) {
        world.style.transform = "translate3d(0,0,0) scale(1)";
    }

    syncLorgusMapLabelLayer();
    requestAnimationFrame(syncLorgusMapLabelLayer);
}

function lorgusMapZoom(factor) {
    lorgusMapScale = Math.min(3.2, Math.max(.8, lorgusMapScale * factor));
    const world = document.querySelector(".lorgus-map-world");
    if (world) {
        world.style.transform = `translate3d(${lorgusMapOffsetX}px,${lorgusMapOffsetY}px,0) scale(${lorgusMapScale})`;
    }
}

function lorgusMapReset() {
    lorgusMapScale = 1;
    lorgusMapOffsetX = 0;
    lorgusMapOffsetY = 0;
    const world = document.querySelector(".lorgus-map-world");
    if (world) world.style.transform = "translate3d(0,0,0) scale(1)";
}

/* Последняя декларация заменяет старый экран выбора королевств. */
