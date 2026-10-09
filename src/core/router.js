/* =========================================================
   LORGUS CLIENT ROUTER
   Модульная SPA-навигация без полной перезагрузки.
   Старые render-функции используются как совместимый слой.
   ========================================================= */

(() => {
    const fallbackRoutes = {
        "/overview": { page: "overview", render: "renderLorgusOverview", title: "Обзор" },
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
    const ACTION_TO_ROUTE = Object.fromEntries(
        Object.entries(ROUTES).map(([path, route]) => [route.render + "()", path])
    );

    let navigating = false;
    let bootTimer = null;
    let lastRenderedPath = null;

    function normalizePath(pathname = window.location.pathname) {
        const clean = pathname.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";
        return clean === "/" ? "/" : clean;
    }

    function canRender() {
        return Boolean(window.activeCharacter && document.getElementById("cabinet-content"));
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
        if (!resolveRoute(path) || !canRender()) return false;
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
        if (!resolveRoute(path)) return false;

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
        const path = normalizePath();

        if (path === "/") return;

        if (!resolveRoute(path)) {
            navigate("/world", { replace: true });
            return;
        }

        if (canRender()) renderPath(path, true);
        else bootCurrentRoute();
    }

    function bootCurrentRoute() {
        const path = normalizePath();

        if (path === "/") return;

        if (!resolveRoute(path)) {
            window.history.replaceState({ lorgusRoute: "/world" }, "", "/world");
            return;
        }

        if (canRender()) {
            renderPath(path, true);
            return;
        }

        if (bootTimer) return;

        let attempts = 0;
        bootTimer = window.setInterval(() => {
            attempts += 1;

            if (canRender()) {
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

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bootCurrentRoute, { once: true });
    } else {
        bootCurrentRoute();
    }
})();
