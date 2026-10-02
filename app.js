import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

let supabase;
let authSwitching = false;

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
            data: { session }
        } = await supabase.auth.getSession();

        render(session);

        supabase.auth.onAuthStateChange((_event, newSession) => {
            render(newSession);
        });

    } catch (error) {
        console.error(error);

        document.getElementById("root").innerHTML = `
            <main class="error-screen">
                <div class="error-panel">
                    <div class="error-symbol">✦</div>

                    <h1>Ошибка соединения</h1>

                    <p>${escapeHtml(error.message)}</p>

                    <button
                        onclick="location.reload()"
                        class="gold-button"
                    >
                        Повторить
                    </button>
                </div>
            </main>
        `;
    }
}

function render(session) {
    if (session) {
        renderCabinet(session);
    } else {
        renderAuth();
    }
}

function renderAuth() {
    document.getElementById("root").innerHTML = `
        <main class="auth-page">

            <div class="background-glow"></div>

            <section class="auth-container">

                <div class="brand">

                    <div class="brand-symbol">✦</div>

                    <h1>ЛОРГУС</h1>

                    <div class="brand-line">
                        <span></span>
                        <i>СМЕЛЫЕ ИДЕИ НАЧИНАЮТСЯ С ПЕРВОГО ШАГА</i>
                        <span></span>
                    </div>

                </div>

                <div class="auth-panel">

                    <div class="auth-tabs">

                        <button
                            id="login-tab"
                            class="auth-tab active"
                            onclick="showLogin()"
                        >
                            Войти
                        </button>

                        <button
                            id="register-tab"
                            class="auth-tab"
                            onclick="showRegister()"
                        >
                            Регистрация
                        </button>

                    </div>

                    <div
                        id="auth-form"
                        class="auth-form-container"
                    ></div>

                </div>

                <p class="auth-footer">
                    Вход в мир предназначен только для участников игры.
                </p>

            </section>

        </main>
    `;

    showLogin(true);
}


function showLogin(initial = false) {
    if (authSwitching) {
        return;
    }

    if (initial) {
        setActiveTab("login");
        renderLoginForm();
        return;
    }

    switchAuthForm("login");
}


function showRegister() {
    if (authSwitching) {
        return;
    }

    switchAuthForm("register");
}


function switchAuthForm(type) {
    const form = document.getElementById("auth-form");

    if (!form) {
        return;
    }

    const currentType =
        form.dataset.formType || "login";

    if (currentType === type) {
        return;
    }

    authSwitching = true;

    setActiveTab(type);

    form.classList.add("auth-form-leaving");

    setTimeout(() => {

        if (type === "login") {
            renderLoginForm();
        } else {
            renderRegisterForm();
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
        }, 280);

    }, 180);
}


function renderLoginForm() {
    const form = document.getElementById("auth-form");

    form.dataset.formType = "login";

    form.innerHTML = `
        <div class="form-heading">

            <h2>Добро пожаловать</h2>

            <p>
                Войди, чтобы продолжить своё путешествие.
            </p>

        </div>

        <form onsubmit="login(event)">

            <label for="login-email">
                Email
            </label>

            <div class="input-wrapper">

                <span class="input-icon">✉</span>

                <input
                    id="login-email"
                    type="email"
                    placeholder="Введите email"
                    autocomplete="email"
                    required
                >

            </div>

            <label for="login-password">
                Пароль
            </label>

            <div class="input-wrapper">

                <span class="input-icon">◆</span>

                <input
                    id="login-password"
                    type="password"
                    placeholder="Введите пароль"
                    autocomplete="current-password"
                    required
                >

            </div>

            <div id="auth-message"></div>

            <button
                type="submit"
                class="gold-button main-button"
            >
                Войти в мир
            </button>

        </form>
    `;
}


function renderRegisterForm() {
    const form = document.getElementById("auth-form");

    form.dataset.formType = "register";

    form.innerHTML = `
        <div class="form-heading">

            <h2>Создать аккаунт</h2>

            <p>
                Начни своё путешествие в мире ЛОРГУС.
            </p>

        </div>

        <form onsubmit="register(event)">

            <label for="register-email">
                Email
            </label>

            <div class="input-wrapper">

                <span class="input-icon">✉</span>

                <input
                    id="register-email"
                    type="email"
                    placeholder="Введите email"
                    autocomplete="email"
                    required
                >

            </div>

            <label for="register-password">
                Пароль
            </label>

            <div class="input-wrapper">

                <span class="input-icon">◆</span>

                <input
                    id="register-password"
                    type="password"
                    placeholder="Минимум 6 символов"
                    autocomplete="new-password"
                    minlength="6"
                    required
                >

            </div>

            <label for="register-password-confirm">
                Повторите пароль
            </label>

            <div class="input-wrapper">

                <span class="input-icon">◆</span>

                <input
                    id="register-password-confirm"
                    type="password"
                    placeholder="Введите пароль ещё раз"
                    autocomplete="new-password"
                    minlength="6"
                    required
                >

            </div>

            <div id="auth-message"></div>

            <button
                type="submit"
                class="gold-button main-button"
            >
                Создать аккаунт
            </button>

        </form>
    `;
}


function setActiveTab(tab) {
    const loginTab = document.getElementById("login-tab");
    const registerTab = document.getElementById("register-tab");

    if (!loginTab || !registerTab) {
        return;
    }

    loginTab.classList.toggle(
        "active",
        tab === "login"
    );

    registerTab.classList.toggle(
        "active",
        tab === "register"
    );
}


async function login(event) {
    event.preventDefault();

    const email =
        document.getElementById("login-email").value.trim();

    const password =
        document.getElementById("login-password").value;

    setMessage("Выполняется вход...", "info");

    const { error } =
        await supabase.auth.signInWithPassword({
            email,
            password
        });

    if (error) {
        setMessage(error.message, "error");
    }
}


async function register(event) {
    event.preventDefault();

    const email =
        document.getElementById("register-email").value.trim();

    const password =
        document.getElementById("register-password").value;

    const confirmation =
        document.getElementById(
            "register-password-confirm"
        ).value;

    if (password !== confirmation) {
        setMessage(
            "Пароли не совпадают.",
            "error"
        );

        return;
    }

    setMessage(
        "Создаём аккаунт...",
        "info"
    );

    const { data, error } =
        await supabase.auth.signUp({
            email,
            password
        });

    if (error) {
        setMessage(
            error.message,
            "error"
        );

        return;
    }

    if (data.session) {
        return;
    }

    setMessage(
        "Аккаунт создан. Проверь email для подтверждения регистрации.",
        "success"
    );
}


async function logout() {
    await supabase.auth.signOut();
}


function renderCabinet(session) {
    const email =
        session.user.email || "Игрок";

    document.getElementById("root").innerHTML = `
        <main class="game-page">

            <header class="topbar">

                <div class="topbar-brand">

                    <div class="mini-symbol">
                        ✦
                    </div>

                    <span>
                        ЛОРГУС
                    </span>

                </div>

                <div class="player-area">

                    <span class="player-email">
                        ${escapeHtml(email)}
                    </span>

                    <button
                        class="logout-button"
                        onclick="logout()"
                    >
                        Выйти
                    </button>

                </div>

            </header>

            <section class="welcome-panel">

                <div class="welcome-symbol">
                    ✦
                </div>

                <h1>
                    Добро пожаловать в ЛОРГУС
                </h1>

                <p>
                    Твой аккаунт создан.
                    Следующим шагом станет создание персонажа.
                </p>

                <div class="ornament">

                    <span></span>

                    <i>
                        ЛОРГУС
                    </i>

                    <span></span>

                </div>

            </section>

        </main>
    `;
}


function setMessage(text, type) {
    const element =
        document.getElementById("auth-message");

    if (!element) {
        return;
    }

    element.className =
        `auth-message ${type}`;

    element.textContent = text;
}


function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


window.showLogin = showLogin;
window.showRegister = showRegister;
window.login = login;
window.register = register;
window.logout = logout;

initialize();
