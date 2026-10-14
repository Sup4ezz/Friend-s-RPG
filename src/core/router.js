/* =========================================================
   LORGUS CLIENT ROUTER
   Модульная SPA-навигация без полной перезагрузки.
   Старые render-функции используются как совместимый слой.
   ========================================================= */

(() => {
    const fallbackRoutes = {
        "/world": { page: "world", render: "renderLorgusWorldMapCurrent", title: "Мир" },
        "/codex": { page: "codex", render: "renderLorgusCodex", title: "Лорбук" },
        "/character": { page: "character", render: "renderLorgusCharacterHub", title: "Персонаж" },
        "/rp": { page: "rp", render: "renderLorgusRpHub", title: "Ролевая" },
        "/people": { page: "people", render: "renderWorldCharacterTracker", title: "Люди" },
        "/mail": { page: "mail", render: "renderMail", title: "Письма" },
        "/inventory": { page: "inventory", render: "renderLorgusInventory", title: "Инвентарь" }
    };

    const ROUTES = window.LORGUS_ROUTES || fallbackRoutes;
    const PAGES = window.LORGUS_PAGES || {};
    const ACTION_TO_ROUTE = {
        "renderLorgusWorldMapCurrent()": "/map",
        "renderLorgusCodex()": "/lorblook",
        "renderLorgusCharacterHub()": "/character",
        "renderLorgusRpHub()": "/rp",
        "renderWorldCharacterTracker()": "/people",
        "renderMail()": "/mail",
        "renderLorgusInventory()": "/inventory"
    };

    const LEGACY_PATHS = {
        "/overview": "/main-page",
        "/world": "/map",
        "/codex": "/lorblook"
    };

    function canonicalPath(path) {
        const clean = normalizePath(path);
        return LEGACY_PATHS[clean] || clean;
    }

    function applyCanonicalPath(path) {
        const canonical = canonicalPath(path);
        if (normalizePath(path) !== canonical) {
            window.history.replaceState({ lorgusRoute: canonical }, "", canonical);
        }
        return canonical;
    }

    let navigating = false;
    let bootTimer = null;
    let lastRenderedPath = null;

    function normalizePath(pathname = window.location.pathname) {
        const clean = pathname.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";
        return clean === "/" ? "/" : clean;
    }

    function canRender(path = normalizePath()) {
        const hasContainer = Boolean(document.getElementById("cabinet-content"));
        if (!hasContainer) return false;
        if (path === "/ankets") return true;
        if (path === "/admin") return Boolean(window.lorgusIsAdmin);
        return Boolean(window.activeCharacter);
    }

    function parseRpChatPath(path) {
        const match = String(path || "").match(/^\/rp\/chat\/([^/]+)\/([^/]+)$/);
        if (!match) return null;
        try {
            return {
                region: decodeURIComponent(match[1]),
                location: decodeURIComponent(match[2])
            };
        } catch (error) {
            console.warn("LORGUS router: invalid RP chat path:", path, error);
            return null;
        }
    }

    function buildRpChatPath(region, location) {
        return "/rp/chat/" + encodeURIComponent(region) + "/" + encodeURIComponent(location);
    }

    function parseRpRoadPath(path) {
        const match = String(path || "").match(/^\/rp\/road\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)$/);
        if (!match) return null;
        try {
            return {
                fromRegion: decodeURIComponent(match[1]),
                fromLocation: decodeURIComponent(match[2]),
                toRegion: decodeURIComponent(match[3]),
                toLocation: decodeURIComponent(match[4])
            };
        } catch (error) {
            console.warn("LORGUS router: invalid RP road path:", path, error);
            return null;
        }
    }

    function buildRpRoadPath(presence) {
        return "/rp/road/" +
            encodeURIComponent(presence.fromRegion) + "/" +
            encodeURIComponent(presence.fromLocation) + "/" +
            encodeURIComponent(presence.toRegion) + "/" +
            encodeURIComponent(presence.toLocation);
    }

    function resolveRoute(path) {
        if (ROUTES[path]) return ROUTES[path];
        if (parseRpChatPath(path)) {
            return {
                page: "rp-chat",
                render: "renderLocationChats",
                title: "RP-чат"
            };
        }
        if (parseRpRoadPath(path)) {
            return {
                page: "rp-road",
                render: "renderRoadChat",
                title: "RP-дорога"
            };
        }
        return null;
    }

    function resolvePage(path) {
        const route = resolveRoute(path);
        if (!route) return null;

        if (route.page === "applications") {
            return {
                render() {
                    const container = document.getElementById("cabinet-content");
                    if (!container) return;
                    if (window.lorgusIsAdmin) return window.loadAdminPanel?.(container);
                    return window.renderCharacterApplicationForm?.(container);
                }
            };
        }

        if (route.page === "admin") {
            return {
                render() {
                    const container = document.getElementById("cabinet-content");
                    if (!container || !window.lorgusIsAdmin) return;
                    return window.loadAdminPanel?.(container);
                }
            };
        }

        if (route.page === "rp-chat") {
            const chat = parseRpChatPath(path);
            return {
                render() {
                    return window.renderLocationChats?.(
                        chat.location,
                        chat.region,
                        true,
                        true
                    );
                }
            };
        }

        if (route.page === "rp-road") {
            const road = parseRpRoadPath(path);
            return {
                async render() {
                    const presence = await window.getRpPresence?.();
                    if (presence?.type === "road") {
                        const canonicalRoadPath = buildRpRoadPath(presence);
                        if (normalizePath() !== canonicalRoadPath) {
                            return navigate(canonicalRoadPath, { replace: true });
                        }
                        return window.renderRoadChat?.(presence, true);
                    }
                    if (presence?.type === "location") {
                        return navigate(buildRpChatPath(presence.region, presence.location), { replace: true });
                    }
                    return navigate("/rp", { replace: true });
                }
            };
        }

        const page = PAGES[route.page];
        if (page && typeof page.render === "function") return page;
        const legacy = window[route.render];
        return typeof legacy === "function" ? { render: legacy } : null;
    }

    function renderPath(path, force = false) {
        path = applyCanonicalPath(path);
        if (path === "/lorblook" && window.activeCharacter?.origin_type === "reincarnated") {
            window.history.replaceState({ lorgusRoute: "/map" }, "", "/map");
            lastRenderedPath = null;
            return renderPath("/map", true);
        }
        if (!resolveRoute(path) || !canRender(path)) return false;
        if (!force && lastRenderedPath === path) return true;

        const page = resolvePage(path);
        if (!page) {
            console.warn("LORGUS router: page not found:", path);
            return false;
        }

        navigating = true;
        lastRenderedPath = path;

        try {
            const result = page.render();
            if (result && typeof result.catch === "function") {
                result.catch(error => console.error("LORGUS router navigation error:", error));
            }
        } catch (error) {
            console.error("LORGUS router render error:", error);
            lastRenderedPath = null;
            return false;
        } finally {
            window.setTimeout(() => { navigating = false; }, 0);
        }

        return true;
    }

    function navigate(path, options = {}) {
        path = canonicalPath(path);
        if (!resolveRoute(path)) return false;
        if (path === "/lorblook" && window.activeCharacter?.origin_type === "reincarnated") {
            path = "/map";
            options = { ...options, replace: true };
        }

        const current = normalizePath();
        if (current !== path) {
            const method = options.replace ? "replaceState" : "pushState";
            window.history[method]({ lorgusRoute: path }, "", path);
        }

        return renderPath(path, true);
    }

    function routeForAction(action) {
        if (!action) return null;
        return ACTION_TO_ROUTE[action.replace(/\s/g, "")] || null;
    }

    function interceptGlobalNavigation(event) {
        if (navigating) return;

        const button = event.target.closest?.("button, a");
        if (!button) return;

        const path = button.getAttribute("data-route") ||
            routeForAction(button.getAttribute("onclick"));

        if (!path || !window.activeCharacter) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        navigate(path);
    }

    function handlePopState() {
        if (sessionStorage.getItem("lorgus_character_creation_mode") === "1") {
            if (window.location.pathname !== "/") window.history.replaceState({}, "", "/");
            if (bootTimer) { window.clearInterval(bootTimer); bootTimer = null; }
            return;
        }
        const path = applyCanonicalPath(normalizePath());

        if (path === "/") return;

        if (!resolveRoute(path)) {
            navigate("/world", { replace: true });
            return;
        }

        if (canRender()) renderPath(path, true);
        else bootCurrentRoute();
    }

    function bootCurrentRoute() {
        // Пока игрок заполняет анкету, никакой сохранённый SPA-маршрут
        // (включая уже запущенный таймер /rp) не должен перехватывать экран.
        if (sessionStorage.getItem("lorgus_character_creation_mode") === "1") {
            if (bootTimer) {
                window.clearInterval(bootTimer);
                bootTimer = null;
            }
            if (window.location.pathname !== "/") window.history.replaceState({}, "", "/");
            return;
        }

        let path = applyCanonicalPath(normalizePath());

        if (path === "/") return;

        if (!resolveRoute(path)) {
            window.history.replaceState({ lorgusRoute: "/world" }, "", "/world");
            path = "/world";
        }

        if (canRender(path)) {
            renderPath(path, true);
            return;
        }

        if (bootTimer) return;

        let attempts = 0;
        bootTimer = window.setInterval(() => {
            attempts += 1;

            // Режим создания мог включиться уже после старта таймера.
            if (sessionStorage.getItem("lorgus_character_creation_mode") === "1") {
                window.clearInterval(bootTimer);
                bootTimer = null;
                if (window.location.pathname !== "/") window.history.replaceState({}, "", "/");
                return;
            }

            if (canRender(path)) {
                window.clearInterval(bootTimer);
                bootTimer = null;
                renderPath(path, true);
                return;
            }

            if (attempts >= 150) {
                window.clearInterval(bootTimer);
                bootTimer = null;
            }
        }, 100);
    }

    document.addEventListener("click", interceptGlobalNavigation, true);
    window.addEventListener("popstate", handlePopState);

    window.lorgusNavigate = navigate;
    window.lorgusRouter = {
        navigate,
        renderPath,
        bootCurrentRoute,
        handlePopState,
        buildRpChatPath,
        parseRpChatPath,
        get currentPath() { return normalizePath(); },
        get routes() { return ROUTES; }
    };

    window.lorgusNavigateChat = (region, location, options = {}) => {
        const path = buildRpChatPath(region, location);
        return navigate(path, options);
    };

    window.lorgusNavigateRoadChat = (presence, options = {}) => {
        if (!presence || presence.type !== "road") return false;
        return navigate(buildRpRoadPath(presence), options);
    };


    // Универсальная кнопка «Назад» на игровых экранах.
    // Поддерживает SPA-маршруты и не отправляет игрока за пределы приложения.
    const BACK_TARGETS = {
        "/world": "/character",
        "/codex": "/world",
        "/character": "/world",
        "/rp": "/world",
        "/people": "/character",
        "/mail": "/character",
        "/inventory": "/character"
    };

    function ensureLorgusBackButton() {
        const host = document.getElementById("cabinet-content");
        if (!host || !window.activeCharacter) { document.getElementById("lorgus-global-back")?.remove(); return; }
        let button = document.getElementById("lorgus-global-back");
        if (button && button.parentNode) return;
        button = document.createElement("button");
        button.id = "lorgus-global-back";
        button.type = "button";
        button.className = "lorgus-global-back";
        button.setAttribute("aria-label", "Назад");
        button.innerHTML = '<span aria-hidden="true">←</span><b>НАЗАД</b>';
        button.addEventListener("click", () => {
            const current = normalizePath();
            let target = BACK_TARGETS[current];
            if (/^\/rp\/(chat|road)\//.test(current)) target = "/rp";
            if (!target) target = "/world";
            navigate(target);
        });
        document.body.appendChild(button);
    }

    function watchLorgusBackButton() {
        if (!document.getElementById("lorgus-back-button-style")) {
            const style = document.createElement("style");
            style.id = "lorgus-back-button-style";
            style.textContent = `
                .lorgus-global-back {
                    position: fixed; top: max(14px, env(safe-area-inset-top)); left: 14px;
                    z-index: 1200; display: inline-flex; align-items: center; justify-content: center;
                    gap: 8px; min-height: 38px; padding: 8px 13px;
                    border: 1px solid rgba(215,182,109,.38); border-radius: 2px;
                    background: rgba(10,8,6,.92); color: #e5d2a4;
                    font: 600 10px/1 Georgia, serif; letter-spacing: .12em;
                    box-shadow: 0 5px 20px rgba(0,0,0,.24); cursor: pointer;
                    -webkit-tap-highlight-color: transparent;
                }
                .lorgus-global-back span { font: 20px/12px Georgia,serif; color: #d7b66d; }
                .lorgus-global-back:active { background: rgba(72,53,24,.96); }
                @media(max-width:720px) {
                    .lorgus-global-back { top: max(10px, env(safe-area-inset-top)); left: 10px; min-height: 36px; padding: 7px 10px; }
                    .lorgus-global-back b { font-size: 9px; }
                }
            `;
            document.head.appendChild(style);
        }
        ensureLorgusBackButton();
        const root = document.getElementById("root") || document.body;
        if (!window.lorgusBackButtonObserver && root) {
            window.lorgusBackButtonObserver = new MutationObserver(() => ensureLorgusBackButton());
            window.lorgusBackButtonObserver.observe(root, { childList: true, subtree: true });
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", watchLorgusBackButton);
    } else {
        watchLorgusBackButton();
    }
    window.addEventListener("popstate", () => ensureLorgusBackButton());


    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bootCurrentRoute, { once: true });
    } else {
        bootCurrentRoute();
    }
})();
