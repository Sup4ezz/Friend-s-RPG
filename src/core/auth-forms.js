/* LORGUS authentication forms and actions */
function renderLoginForm() {
    const form = document.getElementById("auth-form");

    form.dataset.formType = "login";

    form.innerHTML = `
        <div class="form-heading">
            <h2>Добро пожаловать</h2>
            <p>Войди, чтобы продолжить своё путешествие.</p>
        </div>

        <form onsubmit="login(event)">
            <label for="login-username">Логин</label>

            <div class="input-wrapper">
                <span class="input-icon">✦</span>
                <input
                    id="login-username"
                    type="text"
                    placeholder="Введите логин"
                    autocomplete="username"
                    minlength="3"
                    maxlength="32"
                    required
                >
            </div>

            <label for="login-password">Пароль</label>

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

/* =========================================================
   ФОРМА РЕГИСТРАЦИИ
   ========================================================= */

function renderRegisterForm() {
    const form = document.getElementById("auth-form");

    form.dataset.formType = "register";

    form.innerHTML = `
        <div class="form-heading">
            <h2>Создать аккаунт</h2>
            <p>Начни своё путешествие в мире ЛОРГУС.</p>
        </div>

        <form class="register-auth-form" onsubmit="register(event)">
            <label for="register-username">Логин</label>

            <div class="input-wrapper">
                <span class="input-icon">✦</span>
                <input
                    id="register-username"
                    type="text"
                    placeholder="Придумай логин"
                    autocomplete="username"
                    minlength="3"
                    maxlength="32"
                    required
                >
            </div>

            <label for="register-password">Пароль</label>

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

/* =========================================================
   ВКЛАДКИ
   ========================================================= */

function setActiveTab(tab) {
    const loginTab = document.getElementById("login-tab");
    const registerTab = document.getElementById("register-tab");

    if (!loginTab || !registerTab) return;

    loginTab.classList.toggle("active", tab === "login");
    registerTab.classList.toggle("active", tab === "register");
}

/* =========================================================
   ЛОГИН → ТЕХНИЧЕСКИЙ EMAIL
   ========================================================= */

function encodeUsername(username) {
    return btoa(encodeURIComponent(username))
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .replaceAll("=", "");
}

function getAuthEmail(username) {
    return `u_${encodeUsername(username)}@auth.lorgus.local`;
}

/* =========================================================
   ВХОД
   ========================================================= */

async function login(event) {
    event.preventDefault();

    const username = document
        .getElementById("login-username")
        .value
        .trim();

    const password = document
        .getElementById("login-password")
        .value;

    if (!username) {
        setMessage("Введи логин.", "error");
        return;
    }

    setMessage("Выполняется вход...", "info");

    const {
        error
    } = await window.supabaseClient.auth.signInWithPassword({
        email: getAuthEmail(username),
        password
    });

    if (error) {
        setMessage("Неверный логин или пароль.", "error");
        if (typeof window.lorgusAuthErrorSound === "function") {
            window.lorgusAuthErrorSound();
        }
    }

}

/* =========================================================
   РЕГИСТРАЦИЯ
   ========================================================= */

async function register(event) {
    event.preventDefault();

    const username = document
        .getElementById("register-username")
        .value
        .trim();

    const password = document
        .getElementById("register-password")
        .value;

    const confirmation = document
        .getElementById("register-password-confirm")
        .value;

    if (username.length < 3 || username.length > 32) {
        setMessage(
            "Логин должен содержать от 3 до 32 символов.",
            "error"
        );
        return;
    }

    if (password !== confirmation) {
        setMessage("Пароли не совпадают.", "error");
        return;
    }

    setMessage("Создаём аккаунт...", "info");

    const {
        data,
        error
    } = await window.supabaseClient.auth.signUp({
        email: getAuthEmail(username),
        password,
        options: {
            data: {
                username
            }
        }
    });

    if (error) {
        console.error(error);

        if (
            error.message.includes("already registered") ||
            error.message.includes("already been registered")
        ) {
            setMessage("Этот логин уже занят.", "error");
        } else {
            setMessage(error.message, "error");
        }

        return;
    }

    if (data.session) return;

    setMessage(
        "Аккаунт создан. Теперь можно войти.",
        "success"
    );
}

/* =========================================================
   КАБИНЕТ
   ========================================================= */

/* =========================================================
   ТИТУЛЫ ПЕРСОНАЖЕЙ
   ========================================================= */

window.renderLoginForm = renderLoginForm;
window.renderRegisterForm = renderRegisterForm;
window.setActiveTab = setActiveTab;
window.encodeUsername = encodeUsername;
window.getAuthEmail = getAuthEmail;
window.login = login;
window.register = register;

