/* =========================================================
   LORGUS CLIENT ROUTER
   ---------------------------------------------------------
   Навигация между игровыми экранами без полной перезагрузки.
   Старые render-функции остаются источниками UI — роутер
   только управляет URL, history и переходами.
   ========================================================= */

(() => {
    const ROUTES = {
        "/overview": "renderLorgusOverview",
        "/world": "renderLorgusWorldMapCurrent",
        "/character": "renderLorgusCharacterHub",
        "/rp": "renderLorgusRpHub",
        "/people": "renderWorldCharacterTracker",
        "/mail": "renderMail",
        "/inventory": "renderLorgusInventory"
    };

    const ACTION_TO_ROUTE = Object.fromEntries(
        Object.entries(ROUTES).map(([path, fn]) => [
            fn + "()",
            path
        ])
    );

    let navigating = false;
    let bootTimer = null;

    function normalizePath(pathname = window.location.pathname) {
        const clean = pathname.replace(/\/+$/, "") || "/";
        return clean === "/" ? "/" : clean;
    }

    function routeForAction(action) {
        if (!action) return null;
        const normalized = action.replace(/\s/g, "");
        return ACTION_TO_ROUTE[normalized] || null;
    }

    function canRender() {
        return Boolean(
            window.activeCharacter &&
            document.getElementById("cabinet-content")
        );
    }

    function renderPath(path) {
        const fnName = ROUTES[path];
        if (!fnName || !canRender()) return false;

        const fn = window[fnName];
        if (typeof fn !== "function") {
            console.warn("LORGUS router: функция не найдена:", fnName);
            return false;
        }

        navigating = true;

        try {
            const result = fn();
            if (result && typeof result.catch === "function") {
                result.catch(error => {
                    console.error("LORGUS router navigation error:", error);
                });
            }
        } finally {
            window.setTimeout(() => {
                navigating = false;
            }, 0);
        }

        return true;
    }

    function navigate(path, options = {}) {
        if (!ROUTES[path]) return;

        const current = normalizePath();
        if (current !== path) {
            if (options.replace) {
                history.replaceState({ lorgusRoute: path }, "", path);
            } else {
                history.pushState({ lorgusRoute: path }, "", path);
            }
        }

        renderPath(path);
    }

    function interceptGlobalNavigation(event) {
        if (navigating) return;

        const button = event.target.closest?.("button, a");
        if (!button) return;

        const action = button.getAttribute("onclick");
        const path = routeForAction(action);

        if (!path) return;
        if (!window.activeCharacter) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        navigate(path);
    }

    function handlePopState() {
        const path = normalizePath();

        if (path === "/") return;

        if (!ROUTES[path]) {
            history.replaceState({ lorgusRoute: "/world" }, "", "/world");
            if (canRender()) renderPath("/world");
            return;
        }

        if (canRender()) {
            renderPath(path);
        }
    }

    function bootCurrentRoute() {
        const path = normalizePath();

        if (path === "/") return;
        if (!ROUTES[path]) {
            history.replaceState({ lorgusRoute: "/world" }, "", "/world");
            return;
        }

        if (canRender()) {
            renderPath(path);
            return;
        }

        if (bootTimer) return;

        let attempts = 0;
        bootTimer = window.setInterval(() => {
            attempts += 1;

            if (canRender()) {
                window.clearInterval(bootTimer);
                bootTimer = null;
                renderPath(path);
                return;
            }

            if (attempts >= 100) {
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
        bootCurrentRoute,
        handlePopState,
        get currentPath() {
            return normalizePath();
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bootCurrentRoute, {
            once: true
        });
    } else {
        bootCurrentRoute();
    }
})();
