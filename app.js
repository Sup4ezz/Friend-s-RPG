import {
    createClient
} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

let supabase;
let authSwitching = false;
window.lorgusPortalEntering = false;
window.lorgusPortalDepartureAligning = false;
window.lorgusPortalEnterStartedAt = 0;
window.lorgusPortalOverlay = null;
window.supabaseClient = null;

/* Mobile emergency recovery: reveal the actual scene if startup/transition gets stuck. */
if (window.matchMedia("(max-width: 900px)").matches) {
    window.setTimeout(() => {
        const path = window.location.pathname.replace(/\/+$/, "") || "/";
        if (path !== "/map" && path !== "/world") return;

        document.querySelectorAll(
            ".lorgus-portal-transition, .lorgus-eye-transition, .lorgus-region-transition-veil, .lorgus-transition-screen, .lorgus-scene-transition-overlay, .lorgus-transition-overlay"
        ).forEach(node => node.remove());

        document.documentElement.classList.remove("lorgus-transition-active", "lorgus-scene-transitioning");
        document.body?.classList.remove("lorgus-transition-active", "lorgus-scene-transitioning");
        delete document.documentElement.dataset.lorgusTransition;
        window.lorgusPortalEntering = false;
        window.lorgusPortalDepartureAligning = false;
        window.lorgusMainMenuNavigating = false;

        const root = document.getElementById("root");
        const cabinet = root?.querySelector(".game-page");
        const content = cabinet?.querySelector("#cabinet-content");
        [root, cabinet, content].forEach(node => {
            if (!node) return;
            node.style.setProperty("opacity", "1", "important");
            node.style.setProperty("visibility", "visible", "important");
            node.style.setProperty("display", "block", "important");
            node.style.setProperty("pointer-events", "auto", "important");
        });

        if (window.activeCharacter && !content?.querySelector(".lorgus-map-page")) {
            window.lorgusRouter?.bootCurrentRoute?.();
            window.setTimeout(() => {
                const host = document.getElementById("cabinet-content");
                if (host?.querySelector(".lorgus-map-page")) return;
                if (!host) return;
                host.innerHTML = '<main style="min-height:100dvh;display:grid;place-content:center;padding:24px;background:#100e0b;color:#eadfc8;font:16px/1.6 Georgia,serif;text-align:center"><h1 style="color:#d7b66d">Карта не открылась</h1><p>Загрузка остановилась до отрисовки мира.</p><button onclick="location.reload()" style="padding:14px 20px;background:#d7b66d;color:#17110a;border:0;font-weight:700">Перезагрузить LORGUS</button></main>';
            }, 4000);
        }
    }, 8000);
}

/* =========================================================
   ИНИЦИАЛИЗАЦИЯ
   ========================================================= */

async function initialize() {
    try {
        const response = await fetch("/api/config");

        if (!response.ok) {
            throw new Error("Не удалось получить конфигурацию Supabase.");
        }

        const config = await response.json();

        if (!config.supabaseUrl || !config.supabasePublishableKey) {
            throw new Error("Конфигурация Supabase отсутствует.");
        }

        supabase = createClient(
            config.supabaseUrl,
            config.supabasePublishableKey
        );

        window.supabaseClient = supabase;

        const {
            data: {
                session
            }
        } = await supabase.auth.getSession();

        window.render(session);

        supabase.auth.onAuthStateChange(
            (_event, newSession) => window.render(newSession)
        );

    } catch (error) {
        console.error(error);

        document.getElementById("root").innerHTML = `
            <main class="error-screen">
                <div class="error-panel">
                    <div class="error-symbol">✦</div>
                    <h1>Ошибка соединения</h1>
                    <p>${window.escapeHtml(error.message)}</p>
                    <button onclick="location.reload()" class="gold-button">
                        Повторить
                    </button>
                </div>
            </main>
        `;
    }
}

/* =========================================================
   ОСНОВНОЙ РЕНДЕР
   ========================================================= */

function showLogin(initial = false) {
    if (authSwitching) return;

    if (initial) {
        window.setActiveTab("login");
        window.renderLoginForm();
        return;
    }

    switchAuthForm("login");
}

function showRegister() {
    if (authSwitching) return;
    switchAuthForm("register");
}

function switchAuthForm(type) {
    const form = document.getElementById("auth-form");

    if (!form) return;

    const currentType = form.dataset.formType || "login";

    if (currentType === type) return;

    authSwitching = true;
    window.setActiveTab(type);

    form.classList.add("auth-form-leaving");

    setTimeout(() => {
        if (type === "login") {
            window.renderLoginForm();
        } else {
            window.renderRegisterForm();
        }

        form.classList.remove("auth-form-leaving");
        form.classList.add("auth-form-entering");

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                form.classList.remove("auth-form-entering");
            });
        });

        setTimeout(() => {
            authSwitching = false;
        }, 300);

    }, 180);
}

/* =========================================================
   ФОРМА ВХОДА
   ========================================================= */



window.showLogin = showLogin;
window.showRegister = showRegister;
window.switchAuthForm = switchAuthForm;
initialize();
