import {
    createClient
} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

let supabase;
let authSwitching = false;

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

        render(session);

        supabase.auth.onAuthStateChange(
            (_event, newSession) => render(newSession)
        );

    } catch (error) {
        console.error(error);

        document.getElementById("root").innerHTML = `
            <main class="error-screen">
                <div class="error-panel">
                    <div class="error-symbol">✦</div>
                    <h1>Ошибка соединения</h1>
                    <p>${escapeHtml(error.message)}</p>
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

function render(session) {
    if (session) {
        renderCabinet(session);
    } else {
        renderAuth();
    }
}

/* =========================================================
   АВТОРИЗАЦИЯ
   ========================================================= */

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
    if (authSwitching) return;

    if (initial) {
        setActiveTab("login");
        renderLoginForm();
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
        }, 300);

    }, 180);
}

/* =========================================================
   ФОРМА ВХОДА
   ========================================================= */

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

        <form onsubmit="register(event)">
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
    } = await supabase.auth.signInWithPassword({
        email: getAuthEmail(username),
        password
    });

    if (error) {
        setMessage("Неверный логин или пароль.", "error");
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
    } = await supabase.auth.signUp({
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

async function renderCabinet(session) {
    const username =
        session.user.user_metadata?.username ||
        "Игрок";

    document.getElementById("root").innerHTML = `
        <main class="game-page">
            <header class="topbar">
                <div class="topbar-brand">
                    <div class="mini-symbol">✦</div>
                    <span>ЛОРГУС</span>
                </div>

                <div class="player-area">
                    <span class="player-email">
                        ${escapeHtml(username)}
                    </span>

                    <button
                        class="logout-button"
                        onclick="logout()"
                    >
                        Выйти
                    </button>
                </div>
            </header>

            <section
                id="cabinet-content"
                class="welcome-panel"
            >
                <div class="welcome-symbol">✦</div>
                <h1>ЛОРГУС</h1>
                <p>Загружаем твоё путешествие...</p>
            </section>
        </main>
    `;

    await loadPlayerState(session);
}

/* =========================================================
   СОСТОЯНИЕ ИГРОКА
   ========================================================= */

async function loadPlayerState(session) {
    const container =
        document.getElementById("cabinet-content");

    if (!container) return;

    const {
        data: isAdmin,
        error: adminError
    } = await supabase.rpc("is_admin");

    if (adminError) {
        console.error(
            "Ошибка проверки администратора:",
            adminError
        );
    } else if (isAdmin) {
        await loadAdminPanel(container);
        return;
    }

    const {
        data: applications,
        error: applicationsError
    } = await supabase
        .from("character_applications")
        .select("*")
        .eq("player_id", session.user.id)
        .order("id", {
            ascending: false
        });

    if (applicationsError) {
        console.error(applicationsError);
        showCharacterError(
            container,
            applicationsError.message
        );
        return;
    }

    const pendingApplication =
        applications.find(
            application =>
                application.status === "pending"
        );

    if (pendingApplication) {
        renderPendingApplication(
            container,
            pendingApplication
        );
        return;
    }

    const approvedApplication =
        applications.find(
            application =>
                application.status === "approved" &&
                application.character_id
        );

    if (approvedApplication) {
        await loadCharacter(
            container,
            approvedApplication.character_id
        );
        return;
    }

    renderCharacterApplicationForm(container);
}

/* =========================================================
   ФОРМА СОЗДАНИЯ ПЕРСОНАЖА
   ========================================================= */

function renderCharacterApplicationForm(container) {
    container.className = "character-application";

    container.innerHTML = `
        <div class="character-header">
            <div class="welcome-symbol">✦</div>
            <h1>Создание персонажа</h1>
            <p>Заполни анкету персонажа.</p>
        </div>

        <form
            id="character-application-form"
            onsubmit="submitCharacterApplication(event)"
        >
            <div class="character-grid">

                <div class="character-field">
                    <label for="character-name">
                        Имя персонажа
                    </label>
                    <input
                        id="character-name"
                        type="text"
                        required
                    >
                </div>

                <div class="character-field">
                    <label for="character-race">Раса</label>
                    <input
                        id="character-race"
                        type="text"
                        required
                    >
                </div>

                <div class="character-field">
                    <label for="character-age">Возраст</label>
                    <input
                        id="character-age"
                        type="number"
                        min="1"
                        max="1000"
                        required
                    >
                </div>

                <div class="character-field">
                    <label for="character-homeland">Родина</label>
                    <input
                        id="character-homeland"
                        type="text"
                        required
                    >
                </div>

                <div class="character-field full">
                    <label for="character-personality">
                        Характер
                    </label>
                    <textarea
                        id="character-personality"
                        required
                    ></textarea>
                </div>

                <div class="character-field full">
                    <label for="character-backstory">
                        Предыстория
                    </label>
                    <textarea
                        id="character-backstory"
                        required
                    ></textarea>
                </div>

                <div class="character-field full">
                    <label for="character-skills">
                        Особые навыки
                    </label>
                    <textarea
                        id="character-skills"
                        required
                    ></textarea>
                </div>

                <div class="character-field">
                    <label for="character-weapon">
                        Предпочитаемое оружие
                    </label>
                    <input
                        id="character-weapon"
                        type="text"
                    >
                    <div class="character-hint">
                        Поле необязательное.
                    </div>
                </div>

                <div class="character-field">
                    <label for="character-occupation">
                        Род занятий
                    </label>
                    <input
                        id="character-occupation"
                        type="text"
                        required
                    >
                </div>

                <div class="character-field full">
                    <label for="character-photo">
                        Изображение персонажа
                    </label>
                    <input
                        id="character-photo"
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    >
                    <div class="character-hint">
                        JPG, PNG или WEBP. Максимальный размер — 5 МБ.
                    </div>
                </div>

            </div>

            <div
                id="character-message"
                class="character-message"
            ></div>

            <button
                type="submit"
                class="gold-button character-submit"
            >
                Отправить заявку
            </button>
        </form>
    `;
}

/* =========================================================
   ОТПРАВКА ЗАЯВКИ
   ========================================================= */

async function submitCharacterApplication(event) {
    event.preventDefault();

    const {
        data: {
            user
        }
    } = await supabase.auth.getUser();

    if (!user) {
        setCharacterMessage(
            "Необходимо войти в аккаунт.",
            "error"
        );
        return;
    }

    const name =
        document.getElementById("character-name").value.trim();

    const race =
        document.getElementById("character-race").value.trim();

    const age =
        Number(document.getElementById("character-age").value);

    const homeland =
        document.getElementById("character-homeland").value.trim();

    const personality =
        document.getElementById("character-personality").value.trim();

    const backstory =
        document.getElementById("character-backstory").value.trim();

    const specialSkills =
        document.getElementById("character-skills").value.trim();

    const preferredWeapon =
        document.getElementById("character-weapon").value.trim();

    const occupation =
        document.getElementById("character-occupation").value.trim();

    const photoInput =
        document.getElementById("character-photo");

    if (
        !name ||
        !race ||
        !age ||
        !homeland ||
        !personality ||
        !backstory ||
        !specialSkills ||
        !occupation
    ) {
        setCharacterMessage(
            "Заполни все обязательные поля.",
            "error"
        );
        return;
    }

    const submitButton =
        document.querySelector(".character-submit");

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Отправка...";
    }

    setCharacterMessage(
        "Создаём заявку...",
        "info"
    );

    const applicationId =
        crypto.randomUUID();

    let photoPath = null;

    if (
        photoInput &&
        photoInput.files &&
        photoInput.files.length > 0
    ) {
        const photo = photoInput.files[0];

        if (photo.size > 5 * 1024 * 1024) {
            setCharacterMessage(
                "Изображение не должно превышать 5 МБ.",
                "error"
            );

            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = "Отправить заявку";
            }

            return;
        }

        const extension =
            getFileExtension(photo.name);

        photoPath =
            `${user.id}/${applicationId}/photo.${extension}`;

        const {
            error: uploadError
        } = await supabase.storage
            .from("character-applications")
            .upload(
                photoPath,
                photo,
                {
                    contentType: photo.type,
                    upsert: false
                }
            );

        if (uploadError) {
            console.error(uploadError);

            setCharacterMessage(
                "Не удалось загрузить изображение: " +
                uploadError.message,
                "error"
            );

            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = "Отправить заявку";
            }

            return;
        }
    }

    const {
        error: applicationError
    } = await supabase
        .from("character_applications")
        .insert({
            id: applicationId,
            player_id: user.id,
            name,
            race,
            age,
            homeland,
            personality,
            backstory,
            special_skills: specialSkills,
            preferred_weapon:
                preferredWeapon || null,
            occupation,
            photo_path: photoPath,
            status: "pending",
            character_id: null
        });

    if (applicationError) {
        console.error(applicationError);

        setCharacterMessage(
            "Не удалось создать заявку: " +
            applicationError.message,
            "error"
        );

        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = "Отправить заявку";
        }

        return;
    }

    await loadPlayerState({
        user
    });
}

/* =========================================================
   АДМИНКА
   ========================================================= */

async function loadAdminPanel(container) {
    const {
        data: applications,
        error
    } = await supabase
        .from("character_applications")
        .select("*")
        .order("id", {
            ascending: false
        });

    if (error) {
        console.error(
            "Ошибка загрузки заявок:",
            error
        );

        container.className = "welcome-panel";

        container.innerHTML = `
            <div class="welcome-symbol">!</div>
            <h1>Ошибка загрузки</h1>
            <p>${escapeHtml(error.message)}</p>
        `;

        return;
    }

    renderAdminApplications(
        container,
        applications || []
    );
}

/* =========================================================
   ОТОБРАЖЕНИЕ ЗАЯВОК В АДМИНКЕ
   ========================================================= */

async function renderAdminApplications(
    container,
    applications
) {
    container.className = "admin-panel";

    const pending =
        applications.filter(
            application =>
                application.status === "pending"
        );

    const approved =
        applications.filter(
            application =>
                application.status === "approved"
        );

    const rejected =
        applications.filter(
            application =>
                application.status === "rejected"
        );

    window.adminApplications = applications;

    for (const application of applications) {
        if (!application.photo_path) {
            application.photo_url = null;
            continue;
        }

        const {
            data,
            error
        } = await supabase.storage
            .from("character-applications")
            .createSignedUrl(
                application.photo_path,
                60 * 60
            );

        if (error) {
            console.error(
                "Ошибка получения фотографии:",
                error
            );

            application.photo_url = null;
        } else {
            application.photo_url =
                data?.signedUrl || null;
        }
    }

    container.innerHTML = `
        <div class="character-header">
            <div class="welcome-symbol">✦</div>

            <h1>
                Администрация ЛОРГУСА
            </h1>

            <p>
                Управление заявками персонажей.
            </p>
        </div>

        <div class="admin-stats">
            <div class="admin-stat">
                <span class="admin-stat-value">
                    ${pending.length}
                </span>
                <span class="admin-stat-label">
                    Ожидают решения
                </span>
            </div>

            <div class="admin-stat">
                <span class="admin-stat-value">
                    ${approved.length}
                </span>
                <span class="admin-stat-label">
                    Одобрено
                </span>
            </div>

            <div class="admin-stat">
                <span class="admin-stat-value">
                    ${rejected.length}
                </span>
                <span class="admin-stat-label">
                    Отклонено
                </span>
            </div>
        </div>

        <div class="admin-applications">
            ${
                pending.length === 0
                    ? `
                        <div class="admin-empty">
                            <div class="welcome-symbol">✓</div>
                            <h2>Новых заявок нет</h2>
                            <p>Все заявки обработаны.</p>
                        </div>
                    `
                    : pending.map(
                        application =>
                            renderAdminApplication(
                                application
                            )
                    ).join("")
            }
        </div>
    `;

    bindAdminButtons(container);
}

/* =========================================================
   ОДНА ЗАЯВКА
   ========================================================= */

function renderAdminApplication(application) {
    return `
        <article
            class="admin-application"
            data-application-id="${application.id}"
        >
            <div class="admin-application-main">
                <h3>
                    ${escapeHtml(application.name)}
                </h3>

                <div class="admin-application-info">
                    <span>
                        <strong>Раса:</strong>
                        ${escapeHtml(application.race)}
                    </span>

                    <span>
                        <strong>Возраст:</strong>
                        ${application.age} лет
                    </span>

                    <span>
                        <strong>Родина:</strong>
                        ${escapeHtml(application.homeland)}
                    </span>

                    <span>
                        <strong>Род занятий:</strong>
                        ${escapeHtml(application.occupation)}
                    </span>

                    <span>
                        <strong>Оружие:</strong>
                        ${
                            application.preferred_weapon
                                ? escapeHtml(
                                    application.preferred_weapon
                                )
                                : "Не указано"
                        }
                    </span>

                    <span>
                        <strong>Характер:</strong>
                        ${escapeHtml(application.personality)}
                    </span>

                    <span>
                        <strong>Предыстория:</strong>
                        ${escapeHtml(application.backstory)}
                    </span>

                    <span>
                        <strong>Особые навыки:</strong>
                        ${escapeHtml(application.special_skills)}
                    </span>

                    <span>
                        <strong>Изображение персонажа:</strong>

                        ${
                            application.photo_url
                                ? `
                                    <img
                                        class="admin-application-photo"
                                        src="${escapeHtml(application.photo_url)}"
                                        alt="Изображение персонажа"
                                    >
                                `
                                : "Не загружено."
                        }
                    </span>
                </div>
            </div>

            <div class="admin-application-actions">
                <button
                    class="gold-button admin-edit-button"
                    data-application-id="${application.id}"
                >
                    Редактировать
                </button>

                <button
                    class="gold-button admin-approve-button"
                    data-application-id="${application.id}"
                >
                    Одобрить
                </button>

                <button
                    class="admin-reject-button"
                    data-application-id="${application.id}"
                >
                    Отклонить
                </button>
            </div>
        </article>
    `;
}

/* =========================================================
   КНОПКИ АДМИНКИ
   ========================================================= */

function bindAdminButtons(container) {
    container
        .querySelectorAll(".admin-edit-button")
        .forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    const application =
                        findApplicationById(
                            button.dataset.applicationId
                        );

                    if (!application) return;

                    renderAdminEditForm(
                        button.closest(".admin-application"),
                        application
                    );
                }
            );
        });

    container
        .querySelectorAll(".admin-approve-button")
        .forEach(button => {
            button.addEventListener(
                "click",
                async () => {
                    const applicationId =
                        button.dataset.applicationId;

                    const confirmed =
                        confirm(
                            "Одобрить эту заявку и создать персонажа?"
                        );

                    if (!confirmed) return;

                    button.disabled = true;
                    button.textContent = "Одобрение...";

                    const {
                        error
                    } = await supabase.rpc(
                        "approve_character_application",
                        {
                            application_id:
                                applicationId
                        }
                    );

                    if (error) {
                        console.error(error);

                        alert(
                            "Не удалось одобрить заявку:\n\n" +
                            error.message
                        );

                        button.disabled = false;
                        button.textContent = "Одобрить";
                        return;
                    }

                    await loadAdminPanel(container);
                }
            );
        });

    container
        .querySelectorAll(".admin-reject-button")
        .forEach(button => {
            button.addEventListener(
                "click",
                async () => {
                    const applicationId =
                        button.dataset.applicationId;

                    const confirmed =
                        confirm(
                            "Отклонить эту заявку?"
                        );

                    if (!confirmed) return;

                    button.disabled = true;
                    button.textContent = "Отклонение...";

                    const {
                        error
                    } = await supabase.rpc(
                        "reject_character_application",
                        {
                            application_id:
                                applicationId
                        }
                    );

                    if (error) {
                        console.error(error);

                        alert(
                            "Не удалось отклонить заявку:\n\n" +
                            error.message
                        );

                        button.disabled = false;
                        button.textContent = "Отклонить";
                        return;
                    }

                    await loadAdminPanel(container);
                }
            );
        });
}

/* =========================================================
   ПОИСК ЗАЯВКИ
   ========================================================= */

function findApplicationById(id) {
    const article =
        document.querySelector(
            `.admin-application[data-application-id="${id}"]`
        );

    if (!article) return null;

    return window.adminApplications?.find(
        application =>
            application.id === id
    ) || null;
}

/* =========================================================
   РЕДАКТИРОВАНИЕ ЗАЯВКИ
   ========================================================= */

function renderAdminEditForm(
    article,
    application
) {
    article.innerHTML = `
        <div class="admin-application-main">
            <h3>
                Редактирование:
                ${escapeHtml(application.name)}
            </h3>

            <div class="character-grid">

                <div class="character-field">
                    <label>Имя</label>
                    <input
                        id="edit-name-${application.id}"
                        value="${escapeHtml(application.name)}"
                        type="text"
                    >
                </div>

                <div class="character-field">
                    <label>Раса</label>
                    <input
                        id="edit-race-${application.id}"
                        value="${escapeHtml(application.race)}"
                        type="text"
                    >
                </div>

                <div class="character-field">
                    <label>Возраст</label>
                    <input
                        id="edit-age-${application.id}"
                        value="${application.age}"
                        type="number"
                        min="1"
                        max="1000"
                    >
                </div>

                <div class="character-field">
                    <label>Родина</label>
                    <input
                        id="edit-homeland-${application.id}"
                        value="${escapeHtml(application.homeland)}"
                        type="text"
                    >
                </div>

                <div class="character-field">
                    <label>Род занятий</label>
                    <input
                        id="edit-occupation-${application.id}"
                        value="${escapeHtml(application.occupation)}"
                        type="text"
                    >
                </div>

                <div class="character-field">
                    <label>Оружие</label>
                    <input
                        id="edit-weapon-${application.id}"
                        value="${escapeHtml(application.preferred_weapon || "")}"
                        type="text"
                    >
                </div>

                <div class="character-field full">
                    <label>Характер</label>
                    <textarea
                        id="edit-personality-${application.id}"
                    >${escapeHtml(application.personality)}</textarea>
                </div>

                <div class="character-field full">
                    <label>Предыстория</label>
                    <textarea
                        id="edit-backstory-${application.id}"
                    >${escapeHtml(application.backstory)}</textarea>
                </div>

                <div class="character-field full">
                    <label>Особые навыки</label>
                    <textarea
                        id="edit-skills-${application.id}"
                    >${escapeHtml(application.special_skills)}</textarea>
                </div>

                <div class="character-field full">
                    <label>Изображение персонажа</label>
                    <input
                        id="edit-photo-${application.id}"
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    >

                    ${
                        application.photo_url
                            ? `
                                <img
                                    class="admin-application-photo"
                                    src="${escapeHtml(application.photo_url)}"
                                    alt="Текущее изображение"
                                >
                            `
                            : `
                                <div class="character-hint">
                                    Изображение не загружено.
                                </div>
                            `
                    }
                </div>

            </div>
        </div>

        <div class="admin-application-actions">
            <button
                class="gold-button admin-save-button"
                data-application-id="${application.id}"
            >
                Сохранить
            </button>

            <button
                class="admin-cancel-button"
                data-application-id="${application.id}"
            >
                Отмена
            </button>
        </div>
    `;

    article
        .querySelector(".admin-save-button")
        .addEventListener(
            "click",
            () => saveAdminApplication(
                article,
                application
            )
        );

    article
        .querySelector(".admin-cancel-button")
        .addEventListener(
            "click",
            () => {
                article.outerHTML =
                    renderAdminApplication(
                        application
                    );

                bindAdminButtons(
                    article.parentElement
                );
            }
        );
}

/* =========================================================
   СОХРАНЕНИЕ РЕДАКТИРОВАНИЯ
   ========================================================= */

async function saveAdminApplication(
    article,
    application
) {
    const id = application.id;

    const name =
        document.getElementById(
            `edit-name-${id}`
        ).value.trim();

    const race =
        document.getElementById(
            `edit-race-${id}`
        ).value.trim();

    const age =
        Number(
            document.getElementById(
                `edit-age-${id}`
            ).value
        );

    const homeland =
        document.getElementById(
            `edit-homeland-${id}`
        ).value.trim();

    const occupation =
        document.getElementById(
            `edit-occupation-${id}`
        ).value.trim();

    const preferredWeapon =
        document.getElementById(
            `edit-weapon-${id}`
        ).value.trim();

    const personality =
        document.getElementById(
            `edit-personality-${id}`
        ).value.trim();

    const backstory =
        document.getElementById(
            `edit-backstory-${id}`
        ).value.trim();

    const specialSkills =
        document.getElementById(
            `edit-skills-${id}`
        ).value.trim();

    const photoInput =
        document.getElementById(
            `edit-photo-${id}`
        );

    if (
        !name ||
        !race ||
        !age ||
        !homeland ||
        !occupation ||
        !personality ||
        !backstory ||
        !specialSkills
    ) {
        alert(
            "Заполни все обязательные поля."
        );
        return;
    }

    const saveButton =
        article.querySelector(
            ".admin-save-button"
        );

    saveButton.disabled = true;
    saveButton.textContent = "Сохранение...";

    let photoPath =
        application.photo_path;

    if (
        photoInput &&
        photoInput.files &&
        photoInput.files.length > 0
    ) {
        const photo =
            photoInput.files[0];

        if (photo.size > 5 * 1024 * 1024) {
            alert(
                "Изображение не должно превышать 5 МБ."
            );

            saveButton.disabled = false;
            saveButton.textContent = "Сохранить";

            return;
        }

        const extension =
            getFileExtension(photo.name);

        photoPath =
            `${application.player_id}/${application.id}/photo.${extension}`;

        const {
            error: uploadError
        } = await supabase.storage
            .from("character-applications")
            .upload(
                photoPath,
                photo,
                {
                    contentType: photo.type,
                    upsert: true
                }
            );

        if (uploadError) {
            console.error(uploadError);

            alert(
                "Не удалось загрузить новое изображение:\n\n" +
                uploadError.message
            );

            saveButton.disabled = false;
            saveButton.textContent = "Сохранить";

            return;
        }
    }

    const {
        error
    } = await supabase
        .from("character_applications")
        .update({
            name,
            race,
            age,
            homeland,
            occupation,
            preferred_weapon:
                preferredWeapon || null,
            personality,
            backstory,
            special_skills:
                specialSkills,
            photo_path:
                photoPath
        })
        .eq(
            "id",
            application.id
        );

    if (error) {
        console.error(error);

        alert(
            "Не удалось сохранить изменения:\n\n" +
            error.message
        );

        saveButton.disabled = false;
        saveButton.textContent = "Сохранить";

        return;
    }

    const parent =
        article.parentElement;

    await loadAdminPanel(parent.closest(".admin-panel"));
}

/* =========================================================
   ЗАЯВКА НА РАССМОТРЕНИИ
   ========================================================= */

function renderPendingApplication(
    container,
    application
) {
    container.className = "admin-panel";

    container.innerHTML = `
        <div class="character-header">
            <div class="welcome-symbol">✦</div>

            <h1>
                ${escapeHtml(application.name)}
            </h1>

            <p>
                Твоя заявка находится на рассмотрении.
            </p>
        </div>

        <article class="admin-application">
            <div class="admin-application-main">
                <div class="admin-application-info">

                    <span>
                        <strong>Раса:</strong>
                        ${escapeHtml(application.race)}
                    </span>

                    <span>
                        <strong>Возраст:</strong>
                        ${application.age} лет
                    </span>

                    <span>
                        <strong>Родина:</strong>
                        ${escapeHtml(application.homeland)}
                    </span>

                    <span>
                        <strong>Род занятий:</strong>
                        ${escapeHtml(application.occupation)}
                    </span>

                    <span>
                        <strong>Оружие:</strong>
                        ${
                            application.preferred_weapon
                                ? escapeHtml(
                                    application.preferred_weapon
                                )
                                : "Не указано"
                        }
                    </span>

                    <span>
                        <strong>Характер:</strong>
                        ${escapeHtml(application.personality)}
                    </span>

                    <span>
                        <strong>Предыстория:</strong>
                        ${escapeHtml(application.backstory)}
                    </span>

                    <span>
                        <strong>Особые навыки:</strong>
                        ${escapeHtml(application.special_skills)}
                    </span>

                    <span>
                        <strong>Изображение персонажа:</strong>
                        ${
                            application.photo_path
                                ? "Изображение загружено."
                                : "Не загружено."
                        }
                    </span>

                </div>
            </div>

            <div class="admin-application-actions">
                <span>
                    Заявка ожидает решения администрации.
                </span>
            </div>
        </article>
    `;
}

/* =========================================================
   ЗАГРУЗКА ПЕРСОНАЖА
   ========================================================= */

async function loadCharacter(
    container,
    characterId
) {
    const {
        data: character,
        error
    } = await supabase
        .from("characters")
        .select("*")
        .eq("id", characterId)
        .single();

    if (error) {
        console.error(error);

        showCharacterError(
            container,
            error.message
        );

        return;
    }

    renderCharacter(
        container,
        character
    );
}

/* =========================================================
   ОТОБРАЖЕНИЕ ПЕРСОНАЖА
   ========================================================= */

function renderCharacter(
    container,
    character
) {
    container.className = "welcome-panel";

    container.innerHTML = `
        <div class="welcome-symbol">✦</div>

        <h1>
            ${escapeHtml(character.name)}
        </h1>

        <p>
            Твой персонаж принят в мир ЛОРГУС.
        </p>

        <div class="ornament">
            <span></span>
            <i>
                ${escapeHtml(
                    character.race ||
                    "Персонаж"
                )}
            </i>
            <span></span>
        </div>

        <p>
            ${escapeHtml(
                character.occupation ||
                ""
            )}
        </p>
    `;
}

/* =========================================================
   ОШИБКА ПЕРСОНАЖА
   ========================================================= */

function showCharacterError(
    container,
    message
) {
    container.className = "welcome-panel";

    container.innerHTML = `
        <div class="welcome-symbol">!</div>

        <h1>
            Не удалось загрузить персонажа
        </h1>

        <p>
            ${escapeHtml(message)}
        </p>
    `;
}

/* =========================================================
   СООБЩЕНИЯ ЗАЯВКИ
   ========================================================= */

function setCharacterMessage(
    text,
    type
) {
    const element =
        document.getElementById(
            "character-message"
        );

    if (!element) return;

    element.className =
        `character-message ${type}`;

    element.textContent = text;
}

/* =========================================================
   ВЫХОД
   ========================================================= */

async function logout() {
    await supabase.auth.signOut();
}

/* =========================================================
   СООБЩЕНИЯ АВТОРИЗАЦИИ
   ========================================================= */

function setMessage(
    text,
    type
) {
    const element =
        document.getElementById(
            "auth-message"
        );

    if (!element) return;

    element.className =
        `auth-message ${type}`;

    element.textContent = text;
}

/* =========================================================
   РАСШИРЕНИЕ ФАЙЛА
   ========================================================= */

function getFileExtension(
    filename
) {
    const parts =
        filename.split(".");

    if (parts.length < 2) {
        return "jpg";
    }

    const extension =
        parts.pop().toLowerCase();

    if (
        extension === "jpeg" ||
        extension === "jpg"
    ) {
        return "jpg";
    }

    if (extension === "png") {
        return "png";
    }

    if (extension === "webp") {
        return "webp";
    }

    return "jpg";
}

/* =========================================================
   ЭКРАНИРОВАНИЕ HTML
   ========================================================= */

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

/* =========================================================
   GLOBAL
   ========================================================= */

window.showLogin = showLogin;
window.showRegister = showRegister;
window.login = login;
window.register = register;
window.logout = logout;
window.submitCharacterApplication =
    submitCharacterApplication;

/* =========================================================
   ЗАПУСК
   ========================================================= */

initialize();
