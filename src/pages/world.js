window.LORGUS_PAGES = window.LORGUS_PAGES || {};

function ensureLorgusAtlasControls(sidebar) {
    if (!sidebar || sidebar.querySelector("#lorgus-map-region-search")) return;

    const panel = document.createElement("section");
    panel.className = "lorgus-map-atlas-fallback";
    panel.innerHTML = `
        <div class="lorgus-map-atlas-fallback-heading"><span>АТЛАС КРАЁВ</span><small>ПОИСК И ПУТЕШЕСТВИЕ</small></div>
        <label class="lorgus-map-region-search"><span>⌕</span><input id="lorgus-map-region-search" type="search" placeholder="Найти край…" autocomplete="off" aria-label="Поиск края"></label>
        <div class="lorgus-map-region-filters" aria-label="Тип территории">
            <button type="button" class="active" data-atlas-kind="all">Все</button>
            <button type="button" data-atlas-kind="kingdom">Королевства</button>
            <button type="button" data-atlas-kind="neutral">Независимые</button>
        </div>
        <div class="lorgus-map-region-list" id="lorgus-map-fallback-list">
            <button type="button" class="lorgus-map-region-button" data-region="Атэрон" data-atlas-kind="kingdom">Атэрон</button>
            <button type="button" class="lorgus-map-region-button" data-region="Каэлор" data-atlas-kind="kingdom">Каэлор</button>
            <button type="button" class="lorgus-map-region-button" data-region="Ксандр" data-atlas-kind="kingdom">Ксандр</button>
            <button type="button" class="lorgus-map-region-button" data-region="Лирэн" data-atlas-kind="kingdom">Лирэн</button>
            <button type="button" class="lorgus-map-region-button" data-region="Морвейн" data-atlas-kind="kingdom">Морвейн</button>
            <button type="button" class="lorgus-map-region-button" data-region="Святые Земли" data-atlas-kind="neutral">Святые Земли</button>
            <button type="button" class="lorgus-map-region-button" data-region="Спорные Земли" data-atlas-kind="neutral">Спорные Земли</button>
        </div>
        <div class="lorgus-map-region-no-results" hidden>Край не найден. Попробуй другое название.</div>
        <div class="lorgus-map-zoom-controls" aria-label="Масштаб карты"><span>МАСШТАБ</span><button type="button" data-atlas-zoom="in" aria-label="Приблизить карту">＋</button><button type="button" data-atlas-zoom="out" aria-label="Отдалить карту">−</button><button type="button" data-atlas-zoom="reset">Сбросить</button></div>
    `;

    const brand = sidebar.querySelector(".lorgus-map-brand");
    if (brand) brand.after(panel);
    else sidebar.prepend(panel);

    const search = panel.querySelector("#lorgus-map-region-search");
    const regionButtons = [...panel.querySelectorAll("[data-region]")];
    const filters = [...panel.querySelectorAll("[data-atlas-kind]")].filter(el => el.tagName === "BUTTON");
    let activeKind = "all";
    const applyFilter = () => {
        const query = (search.value || "").trim().toLocaleLowerCase("ru-RU");
        let count = 0;
        regionButtons.forEach(button => {
            const show = button.dataset.region.toLocaleLowerCase("ru-RU").includes(query) &&
                (activeKind === "all" || button.dataset.atlasKind === activeKind);
            button.hidden = !show;
            if (show) count++;
        });
        const empty = panel.querySelector(".lorgus-map-region-no-results");
        if (empty) empty.hidden = count > 0;
    };
    search.addEventListener("input", applyFilter);
    filters.forEach(button => button.addEventListener("click", () => {
        activeKind = button.dataset.atlasKind || "all";
        filters.forEach(item => item.classList.toggle("active", item === button));
        applyFilter();
    }));
    regionButtons.forEach(button => button.addEventListener("click", () => {
        if (typeof window.selectLorgusMapRegion === "function") window.selectLorgusMapRegion(button.dataset.region);
    }));
    panel.querySelector('[data-atlas-zoom="in"]').addEventListener("click", () => window.lorgusMapZoom?.(1.2));
    panel.querySelector('[data-atlas-zoom="out"]').addEventListener("click", () => window.lorgusMapZoom?.(0.833333));
    panel.querySelector('[data-atlas-zoom="reset"]').addEventListener("click", () => window.lorgusMapReset?.());
}

window.LORGUS_PAGES.world = {
    render() {
        window.renderLorgusWorldMapCurrent?.();
        const sidebar = document.querySelector(".lorgus-map-sidebar");
        if (!sidebar) return;

        // If an older renderer is still active, provide the atlas directly
        // instead of silently leaving the map without search/filter controls.
        ensureLorgusAtlasControls(sidebar);

        if (sidebar.querySelector("[data-lorgus-codex-link]")) return;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "character-secondary-button lorgus-map-side-button";
        button.dataset.lorgusCodexLink = "1";
        button.textContent = "Справочник мира";
        button.addEventListener("click", () => window.lorgusNavigate?.("/codex"));
        const reference = sidebar.querySelector('button[onclick*="renderWorldCharacterTracker"]');
        if (reference?.nextSibling) sidebar.insertBefore(button, reference.nextSibling);
        else sidebar.appendChild(button);
    }
};
