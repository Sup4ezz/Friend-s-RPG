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

    const approvedApplications = applications.filter(
        application =>
            application.status === "approved" &&
            application.character_id
    );

    const pendingApplication =
        applications.find(
            application =>
                application.status === "pending"
        );

    if (approvedApplications.length > 0) {
        await renderCharacterSelection(
            container,
            approvedApplications,
            pendingApplication
        );
        return;
    }

    if (pendingApplication) {
        renderPendingApplication(
            container,
            pendingApplication
        );
        return;
    }

    renderCharacterApplicationForm(container);
}

/* =========================================================
   ВЫБОР ПЕРСОНАЖА
   ========================================================= */

async function renderCharacterSelection(container, applications, pendingApplication = null) {
    container.className = "character-selection";
    container.innerHTML = "";

    const header = document.createElement("div");
    header.className = "character-header";
    header.innerHTML = `
        <div class="character-selection-eyebrow">ЛОРГУС · ВАШИ ИСТОРИИ</div>
        <div class="character-selection-title-row">
            <span class="character-selection-ornament">✦</span>
            <div>
                <h1>Кто продолжит историю?</h1>
                <p>Выбери персонажа и войди в мир его глазами.</p>
            </div>
        </div>
        <div class="character-selection-rule"><span></span><i>АКТИВНЫЕ ПЕРСОНАЖИ</i><span></span></div>
    `;
    container.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "character-selection-grid";
    container.appendChild(grid);

    for (const application of applications) {
        const result = await supabase.from("characters").select("*").eq("id", application.character_id).single();
        if (result.error || !result.data) continue;

        const character = result.data;
        const status = String(character.status || "ACTIVE").toUpperCase();
        const card = document.createElement("article");
        card.className = "character-card";

        const avatar = document.createElement("div");
        avatar.className = "character-card-avatar";

        if (application.photo_path) {
            const { data: photoData, error: photoError } = await supabase
                .storage
                .from("character-applications")
                .createSignedUrl(application.photo_path, 60 * 60);

            if (!photoError && photoData?.signedUrl) {
                avatar.innerHTML = "";
                const image = document.createElement("img");
                image.src = photoData.signedUrl;
                image.alt = character.name || "Персонаж";
                image.className = "character-card-photo";
                avatar.appendChild(image);
            } else {
                avatar.classList.add("character-card-placeholder");
                avatar.textContent = "✦";
            }
        } else {
            avatar.classList.add("character-card-placeholder");
            avatar.textContent = "✦";
        }

        card.appendChild(avatar);

        const body = document.createElement("div");
        body.className = "character-card-body";

        if (status === "DEAD") {
            const statusNode = document.createElement("div");
            statusNode.className = "character-card-status dead";
            statusNode.textContent = "Погиб";
            body.appendChild(statusNode);
        }

        const name = document.createElement("h2");
        name.textContent = character.name || "Без имени";
        body.appendChild(name);

        const race = document.createElement("p");
        race.textContent = character.race || "Раса не указана";
        body.appendChild(race);

        if (status === "ACTIVE" || !character.status) {
            const button = document.createElement("button");
            button.className = "gold-button character-select-button";
            button.textContent = "Играть";
            button.addEventListener("click", () => selectCharacter(container, character.id));
            body.appendChild(button);
        } else {
            const disabled = document.createElement("div");
            disabled.className = "character-card-disabled-label";
            disabled.textContent = "Персонаж недоступен";
            body.appendChild(disabled);
        }

        card.appendChild(body);
        grid.appendChild(card);
    }

    if (pendingApplication) {
        const reviewPanel = document.createElement("div");
        reviewPanel.className = "character-review-pending-panel";
        reviewPanel.innerHTML = `
            <h2>Есть заявка на проверке</h2>
            <p>У тебя есть ещё одна анкета, ожидающая решения администрации.</p>
            ${pendingApplication.review_notes ? `
                <div class="character-review-notes">
                    <h3>Правки от администрации</h3>
                    <p>${escapeHtml(pendingApplication.review_notes)}</p>
                </div>
            ` : ""}
        `;

        const reviewButton = document.createElement("button");
        reviewButton.className = "gold-button";
        reviewButton.textContent = pendingApplication.review_notes
            ? "Исправить анкету"
            : "Открыть заявку";
        reviewButton.addEventListener("click", () => {
            renderPendingApplication(container, pendingApplication);
        });
        reviewPanel.appendChild(reviewButton);
        container.appendChild(reviewPanel);
    }

    if (applications.length + (pendingApplication ? 1 : 0) < 3) {
        const createButton = document.createElement("button");
        createButton.className = "gold-button character-create-button";
        createButton.textContent = "Создать нового персонажа";
        createButton.addEventListener("click", () => renderCharacterApplicationForm(container));
        container.appendChild(createButton);
    }
}

async function selectCharacter(container, characterId) {
    const result = await supabase.from("characters").select("*").eq("id", characterId).single();
    if (result.error || !result.data) {
        showCharacterError(container, result.error ? result.error.message : "Персонаж не найден.");
        return;
    }

    const character = result.data;
    const status = String(character.status || "ACTIVE").toUpperCase();
    if (status !== "ACTIVE") {
        showCharacterError(container, "Этот персонаж сейчас недоступен для игры.");
        return;
    }

    window.activeCharacterId = character.id;
    window.activeCharacter = character;
    sessionStorage.setItem("lorgus_active_character_id", character.id);
    renderCharacter(container, character);
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
            <p>Перед анкетой ознакомься с расами и местами мира Лоргуса.</p>
        </div>

        <section class="character-lore-guide">
            <div class="character-lore-guide-intro">
                <h2>Сначала — выбери, кем и откуда будет твой персонаж</h2>
                <p>
                    Лоргус — мир для свободного RP. Здесь нет классов и уровней.
                    В анкете важно понимать происхождение персонажа, его культуру,
                    окружение и место, откуда он пришёл.
                </p>
            </div>

            <div class="character-lore-section">
                <h3>Расы</h3>
                <div class="character-lore-cards">
                    <article class="character-lore-card">
                        <h4>Люди</h4>
                        <p>
                            Наиболее распространены в Ксандре и Морвейне.
                            Люди также живут в других королевствах и могут
                            свободно встречаться по всему Лоргусу.
                        </p>
                    </article>
                    <article class="character-lore-card">
                        <h4>Эльфы</h4>
                        <p>
                            Особенно распространены в Атэроне и Лирэне.
                            Лесные эльфы Лирэна связаны с древними лесами,
                            природой и магией.
                        </p>
                    </article>
                    <article class="character-lore-card">
                        <h4>Дварфы</h4>
                        <p>
                            Основной народ Каэлора — дварфы, известные
                            кузнечным ремеслом, шахтами и мастерством.
                            Другие народы также могут жить в Каэлоре.
                        </p>
                    </article>
                    <article class="character-lore-card">
                        <h4>Другие народы</h4>
                        <p>
                            В Спорных Землях встречаются различные народы
                            и существа. Такие персонажи требуют соответствующего
                            происхождения и обоснования в анкете.
                        </p>
                    </article>
                </div>
            </div>

            <div class="character-lore-section">
                <h3>Основные места</h3>
                <div class="character-lore-location-list">
                    <button type="button" class="character-lore-location" data-location="Примум">
                        <strong>Примум</strong><span>Атэрон · столица · знания и древности</span>
                    </button>
                    <button type="button" class="character-lore-location" data-location="Хелион">
                        <strong>Хелион</strong><span>Каэлор · столица · кузницы и торговля металлом</span>
                    </button>
                    <button type="button" class="character-lore-location" data-location="Древнее Пламя">
                        <strong>Древнее Пламя</strong><span>Каэлор · священное место Вечного Пламени</span>
                    </button>
                    <button type="button" class="character-lore-location" data-location="Арджент">
                        <strong>Арджент</strong><span>Ксандр · столица · торговля и финансы</span>
                    </button>
                    <button type="button" class="character-lore-location" data-location="Аврора">
                        <strong>Аврора</strong><span>Лирэн · столица · лесные эльфы и плодородие</span>
                    </button>
                    <button type="button" class="character-lore-location" data-location="Фин">
                        <strong>Фин</strong><span>Морвейн · столица · память, паломничество и Последний Путь</span>
                    </button>
                    <button type="button" class="character-lore-location" data-location="Святые Земли">
                        <strong>Святые Земли</strong><span>нейтральная территория · дипломатия пяти королевств</span>
                    </button>
                    <button type="button" class="character-lore-location" data-location="Спорные Земли">
                        <strong>Спорные Земли</strong><span>вне власти пяти королевств · независимые поселения</span>
                    </button>
                </div>
                <p class="character-lore-note">
                    Локация — это не «класс» персонажа. Она помогает понять,
                    где он вырос, какую культуру знает и почему оказался в мире RP.
                </p>
            </div>
        </section>

        <form
            id="character-application-form"
            onsubmit="submitCharacterApplication(event)"
        >
            <div class="character-grid">

                <div class="character-field">
                    <label for="character-name">Имя персонажа</label>
                    <input id="character-name" type="text" required>
                </div>

                <div class="character-field">
                    <label for="character-race">Раса</label>
                    <input
                        id="character-race"
                        type="text"
                        list="character-races"
                        placeholder="Например: человек, эльф, дварф"
                        required
                    >
                    <datalist id="character-races">
                        <option value="Человек"></option>
                        <option value="Эльф"></option>
                        <option value="Лесной эльф"></option>
                        <option value="Дварф"></option>
                    </datalist>
                </div>

                <div class="character-field">
                    <label for="character-age">Возраст</label>
                    <input id="character-age" type="number" min="1" max="1000" required>
                </div>

                <div class="character-field">
                    <label for="character-homeland">Родина</label>
                    <input
                        id="character-homeland"
                        type="text"
                        list="character-homelands"
                        placeholder="Выбери место из списка или укажи другое"
                        required
                    >
                    <datalist id="character-homelands">
                        <option value="Примум"></option>
                        <option value="Хелион"></option>
                        <option value="Арджент"></option>
                        <option value="Аврора"></option>
                        <option value="Фин"></option>
                        <option value="Святые Земли"></option>
                        <option value="Спорные Земли"></option>
                    </datalist>
                </div>

                <div class="character-field full">
                    <label for="character-personality">Характер</label>
                    <textarea id="character-personality" required></textarea>
                </div>

                <div class="character-field full">
                    <label for="character-backstory">Предыстория</label>
                    <textarea id="character-backstory" required></textarea>
                </div>

                <div class="character-field full">
                    <label for="character-skills">Особые навыки</label>
                    <textarea id="character-skills" required></textarea>
                </div>

                <div class="character-field">
                    <label for="character-weapon">Предпочитаемое оружие</label>
                    <input id="character-weapon" type="text">
                    <div class="character-hint">Поле необязательное.</div>
                </div>

                <div class="character-field">
                    <label for="character-occupation">Род занятий</label>
                    <input id="character-occupation" type="text" required>
                </div>

                <div class="character-field full">
                    <label for="character-photo">Изображение персонажа</label>
                    <input id="character-photo" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp">
                    <div class="character-hint">JPG, PNG или WEBP. Максимальный размер — 5 МБ.</div>
                </div>
            </div>

            <div id="character-message" class="character-message"></div>

            <button type="submit" class="gold-button character-submit">
                Отправить заявку
            </button>
        </form>
    `;

    container.querySelectorAll(".character-lore-location").forEach(button => {
        button.addEventListener("click", () => {
            const homeland = container.querySelector("#character-homeland");
            if (!homeland) return;
            homeland.value = button.dataset.location || "";
            homeland.focus();
            homeland.scrollIntoView({ behavior: "smooth", block: "center" });
        });
    });
}

/* =========================================================
   ОТПРАВКА ЗАЯВКИ/* =========================================================
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

    const { data: existingApplications, error: countError } = await supabase
        .from("character_applications")
        .select("id,status")
        .eq("player_id", user.id);

    if (countError) {
        setCharacterMessage("Не удалось проверить количество персонажей: " + countError.message, "error");
        return;
    }

    const characterCount = (existingApplications || []).filter(
        application => application.status !== "rejected"
    ).length;

    if (characterCount >= 3) {
        setCharacterMessage("Можно иметь не более 3 персонажей.", "error");
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
                    class="gold-button admin-revision-button"
                    data-application-id="${application.id}"
                >
                    Выписать правки
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
    container.querySelectorAll(".admin-approve-button").forEach(button => {
        button.addEventListener("click", async () => {
            const applicationId = button.dataset.applicationId;
            if (!confirm("Одобрить эту заявку и создать персонажа?")) return;
            button.disabled = true;
            button.textContent = "Одобрение...";
            const { error } = await supabase.rpc("approve_character_application", { application_id: applicationId });
            if (error) {
                console.error(error);
                alert("Не удалось одобрить заявку:\n\n" + error.message);
                button.disabled = false;
                button.textContent = "Одобрить";
                return;
            }
            await loadAdminPanel(container);
        });
    });

    container.querySelectorAll(".admin-revision-button").forEach(button => {
        button.addEventListener("click", async () => {
            const applicationId = button.dataset.applicationId;
            const notes = prompt("Укажи, что игроку необходимо исправить:", "");
            if (notes === null) return;
            const cleanNotes = notes.trim();
            if (!cleanNotes) {
                alert("Укажи хотя бы одну правку.");
                return;
            }
            button.disabled = true;
            button.textContent = "Сохранение...";
            const { error } = await supabase
                .from("character_applications")
                .update({ review_notes: cleanNotes, status: "pending" })
                .eq("id", applicationId);
            if (error) {
                console.error(error);
                alert("Не удалось отправить правки игроку:\n\n" + error.message);
                button.disabled = false;
                button.textContent = "Выписать правки";
                return;
            }
            await loadAdminPanel(container);
        });
    });

    container.querySelectorAll(".admin-reject-button").forEach(button => {
        button.addEventListener("click", async () => {
            const applicationId = button.dataset.applicationId;
            const reason = prompt("Укажи причину отклонения:", "");
            if (reason === null) return;
            const cleanReason = reason.trim();
            if (!cleanReason) {
                alert("Укажи причину отклонения.");
                return;
            }
            button.disabled = true;
            button.textContent = "Отклонение...";
            const { error } = await supabase.rpc("reject_character_application", { application_id: applicationId });
            if (error) {
                console.error(error);
                alert("Не удалось отклонить заявку:\n\n" + error.message);
                button.disabled = false;
                button.textContent = "Отклонить";
                return;
            }
            await loadAdminPanel(container);
        });
    });
}

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

function renderPendingApplication(container, application) {
    container.className = "character-application";
    const reviewNotes = application.review_notes
        ? `<div class="character-review-notes"><h3>Правки от администрации</h3><p>${escapeHtml(application.review_notes)}</p></div>`
        : "";

    container.innerHTML = `
        <div class="character-header">
            <div class="welcome-symbol">✦</div>
            <h1>${escapeHtml(application.name)}</h1>
            <p>Твоя анкета находится на рассмотрении.</p>
        </div>
        ${reviewNotes}
        <form id="character-application-form" onsubmit="updateCharacterApplication(event, '${application.id}')">
            <div class="character-grid">
                <div class="character-field"><label>Имя персонажа</label><input id="character-name" type="text" value="${escapeHtml(application.name)}" required></div>
                <div class="character-field"><label>Раса</label><input id="character-race" type="text" value="${escapeHtml(application.race)}" required></div>
                <div class="character-field"><label>Возраст</label><input id="character-age" type="number" min="1" max="1000" value="${application.age}" required></div>
                <div class="character-field"><label>Родина</label><input id="character-homeland" type="text" value="${escapeHtml(application.homeland)}" required></div>
                <div class="character-field full"><label>Характер</label><textarea id="character-personality" required>${escapeHtml(application.personality)}</textarea></div>
                <div class="character-field full"><label>Предыстория</label><textarea id="character-backstory" required>${escapeHtml(application.backstory)}</textarea></div>
                <div class="character-field full"><label>Особые навыки</label><textarea id="character-skills" required>${escapeHtml(application.special_skills)}</textarea></div>
                <div class="character-field"><label>Предпочитаемое оружие</label><input id="character-weapon" type="text" value="${escapeHtml(application.preferred_weapon || "")}"></div>
                <div class="character-field"><label>Род занятий</label><input id="character-occupation" type="text" value="${escapeHtml(application.occupation)}" required></div>
            </div>
            <div id="character-message" class="character-message"></div>
            <button type="submit" class="gold-button character-submit">Сохранить исправления и отправить на проверку</button>
        </form>
    `;
}

async function updateCharacterApplication(event, applicationId) {
    event.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        setCharacterMessage("Необходимо войти в аккаунт.", "error");
        return;
    }

    const values = {
        name: document.getElementById("character-name").value.trim(),
        race: document.getElementById("character-race").value.trim(),
        age: Number(document.getElementById("character-age").value),
        homeland: document.getElementById("character-homeland").value.trim(),
        personality: document.getElementById("character-personality").value.trim(),
        backstory: document.getElementById("character-backstory").value.trim(),
        special_skills: document.getElementById("character-skills").value.trim(),
        preferred_weapon: document.getElementById("character-weapon").value.trim() || null,
        occupation: document.getElementById("character-occupation").value.trim(),
        review_notes: null,
        status: "pending"
    };

    if (!values.name || !values.race || !values.age || !values.homeland || !values.personality || !values.backstory || !values.special_skills || !values.occupation) {
        setCharacterMessage("Заполни все обязательные поля.", "error");
        return;
    }

    const button = document.querySelector(".character-submit");
    if (button) {
        button.disabled = true;
        button.textContent = "Сохранение...";
    }

    const { error } = await supabase
        .from("character_applications")
        .update(values)
        .eq("id", applicationId)
        .eq("player_id", user.id)
        .eq("status", "pending");

    if (error) {
        console.error(error);
        setCharacterMessage("Не удалось сохранить исправления: " + error.message, "error");
        if (button) {
            button.disabled = false;
            button.textContent = "Сохранить исправления и отправить на проверку";
        }
        return;
    }

    await loadPlayerState({ user });
}

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
    container.className = "lorgus-world-page";

    const name = escapeHtml(character.name || "Без имени");
    const race = escapeHtml(character.race || "Раса не указана");
    const homeland = escapeHtml(character.homeland || "Родина не указана");

    container.innerHTML = `
        <div class="lorgus-world-shell">
            <aside class="lorgus-world-sidebar">
                <div class="lorgus-world-sidebar-symbol">✦</div>
                <div class="lorgus-world-sidebar-label">ПЕРСОНАЖ</div>
                <div class="lorgus-world-sidebar-name">${name}</div>
                <div class="lorgus-world-sidebar-meta">${race}</div>
                <div class="lorgus-world-sidebar-meta">${homeland}</div>

                <button class="gold-button lorgus-world-sidebar-button" type="button" onclick="openActiveCharacterProfile()">
                    Профиль
                </button>
                <button class="character-secondary-button lorgus-world-sidebar-button" type="button" onclick="switchCharacter()">
                    Сменить персонажа
                </button>
            </aside>

            <main class="lorgus-world-browser">
                <header class="lorgus-world-header">
                    <span class="lorgus-world-kicker">МИР ЛОРГУСА</span>
                    <h1>Мир</h1>
                    <p>Выбери край, в который хочешь войти. Здесь начинается навигация по миру и его RP-сценам.</p>
                </header>

                <section class="lorgus-world-section">
                    <div class="lorgus-world-section-title">КОРОЛЕВСТВА</div>
                    <div class="lorgus-region-grid">
                        <button class="lorgus-region-card" type="button" onclick="renderKingdomLocations('Атэрон')">
                            <span class="lorgus-region-card-symbol">✦</span>
                            <strong>Атэрон</strong>
                            <small>Королевство Нечто</small>
                            <p>Знания, древности, исследования и руины.</p>
                        </button>

                        <button class="lorgus-region-card" type="button" onclick="renderKingdomLocations('Каэлор')">
                            <span class="lorgus-region-card-symbol">◆</span>
                            <strong>Каэлор</strong>
                            <small>Королевство Вечного Пламени</small>
                            <p>Горы, кузницы, шахты и древнее мастерство.</p>
                        </button>

                        <button class="lorgus-region-card" type="button" onclick="renderKingdomLocations('Ксандр')">
                            <span class="lorgus-region-card-symbol">◇</span>
                            <strong>Ксандр</strong>
                            <small>Королевство Воздаяния</small>
                            <p>Торговля, банки, дороги и большие рынки.</p>
                        </button>

                        <button class="lorgus-region-card" type="button" onclick="renderKingdomLocations('Лирэн')">
                            <span class="lorgus-region-card-symbol">❖</span>
                            <strong>Лирэн</strong>
                            <small>Королевство Плодородия</small>
                            <p>Леса, плодородные земли и древняя природа.</p>
                        </button>

                        <button class="lorgus-region-card" type="button" onclick="renderKingdomLocations('Морвейн')">
                            <span class="lorgus-region-card-symbol">†</span>
                            <strong>Морвейн</strong>
                            <small>Королевство Последнего Пути</small>
                            <p>Паломничество, память, туманные долины и Фин.</p>
                        </button>
                    </div>
                </section>

                <section class="lorgus-world-section">
                    <div class="lorgus-world-section-title">НЕЗАВИСИМЫЕ ЗЕМЛИ</div>
                    <div class="lorgus-region-grid lorgus-region-grid-small">
                        <button class="lorgus-region-card" type="button" onclick="renderKingdomLocations('Святые Земли')">
                            <span class="lorgus-region-card-symbol">✧</span>
                            <strong>Святые Земли</strong>
                            <small>Нейтральная территория</small>
                            <p>Место переговоров монархов и глав церквей.</p>
                        </button>

                        <button class="lorgus-region-card" type="button" onclick="renderKingdomLocations('Спорные Земли')">
                            <span class="lorgus-region-card-symbol">◇</span>
                            <strong>Спорные Земли</strong>
                            <small>Вне власти пяти королевств</small>
                            <p>Независимые поселения и земли без единого хозяина.</p>
                        </button>

                        <div class="lorgus-region-card lorgus-region-card-closed">
                            <span class="lorgus-region-card-symbol">✕</span>
                            <strong>Геена</strong>
                            <small>Континент закрыт для игроков</small>
                            <p>Эта территория пока недоступна для посещения и происхождения персонажей.</p>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    `;
}

const LORGUS_LOCATIONS = {
    "Атэрон": {
        subtitle: "Королевство Нечто",
        description: "Земля знаний, исследований, древних руин и реликвий.",
        locations: [
            ["Примум", "Столица Атэрона", "Центр образования, исследований и древних знаний."]
        ]
    },
    "Каэлор": {
        subtitle: "Королевство Вечного Пламени",
        description: "Горное королевство дварфов, кузниц, шахт и торговых путей.",
        locations: [
            ["Хелион", "Столица Каэлора", "Дворец, кузницы, рынки и учреждения королевства."],
            ["Древнее Пламя", "Священное место", "Священное место Вечного Пламени."]
        ]
    },
    "Ксандр": {
        subtitle: "Королевство Воздаяния",
        description: "Торговое и финансовое сердце континента.",
        locations: [
            ["Арджент", "Столица Ксандра", "Великий рынок, королевский двор и финансовые дома."],
            ["Меридиан", "Город Ксандра", "Один из известных городов королевства."],
            ["Валькрофт", "Город Ксандра", "Город на торговых путях."],
            ["Солмир", "Город Ксандра", "Город торгового королевства."]
        ]
    },
    "Лирэн": {
        subtitle: "Королевство Плодородия",
        description: "Леса, плодородные земли и владения лесных эльфов.",
        locations: [
            ["Аврора", "Столица Лирэна", "Город, построенный внутри огромного древнего дерева."],
            ["Элвэйн", "Город Лирэна", "Один из городов лесного королевства."],
            ["Таллирион", "Город Лирэна", "Город среди лесов и плодородных земель."],
            ["Эстерваль", "Город Лирэна", "Город западного королевства."]
        ]
    },
    "Морвейн": {
        subtitle: "Королевство Последнего Пути",
        description: "Холодная земля паломничества, памяти и Последнего Пути.",
        locations: [
            ["Фин", "Столица Морвейна", "Дворец, храмы, архивы и главные паломнические учреждения."]
        ]
    },
    "Святые Земли": {
        subtitle: "Нейтральная территория",
        description: "Земли, где встречаются представители пяти королевств и церквей.",
        locations: []
    },
    "Спорные Земли": {
        subtitle: "Независимые территории",
        description: "Земли вне власти пяти королевств.",
        locations: []
    }
};

function renderKingdomLocations(regionName) {
    const container = document.getElementById("cabinet-content");
    const region = LORGUS_LOCATIONS[regionName];
    if (!container || !region) return;

    container.className = "lorgus-world-page";
    const character = window.activeCharacter;
    const name = escapeHtml(character?.name || "Без имени");

    const locationCards = region.locations.length
        ? region.locations.map(([title, subtitle, description]) => `
            <button class="lorgus-location-card" type="button" onclick="renderLocationChats('${escapeHtml(title)}', '${escapeHtml(regionName)}')">
                <span class="lorgus-location-card-mark">✦</span>
                <strong>${escapeHtml(title)}</strong>
                <small>${escapeHtml(subtitle)}</small>
                <p>${escapeHtml(description)}</p>
            </button>
        `).join("")
        : `
            <div class="lorgus-empty-location">
                <span>✦</span>
                <h2>Локации ещё не добавлены</h2>
                <p>Здесь появятся конкретные места и RP-сцены, когда они будут определены в мире ЛОРГУС.</p>
            </div>
        `;

    container.innerHTML = `
        <div class="lorgus-world-shell">
            <aside class="lorgus-world-sidebar">
                <div class="lorgus-world-sidebar-symbol">✦</div>
                <div class="lorgus-world-sidebar-label">ПЕРСОНАЖ</div>
                <div class="lorgus-world-sidebar-name">${name}</div>
                <button class="character-secondary-button lorgus-world-sidebar-button" type="button" onclick="renderCharacter(document.getElementById('cabinet-content'), window.activeCharacter)">
                    ← Вернуться к миру
                </button>
            </aside>

            <main class="lorgus-world-browser">
                <header class="lorgus-world-header">
                    <span class="lorgus-world-kicker">РЕГИОН</span>
                    <h1>${escapeHtml(regionName)}</h1>
                    <p>${escapeHtml(region.description)}</p>
                </header>

                <section class="lorgus-world-section">
                    <div class="lorgus-world-section-title">${escapeHtml(region.subtitle)}</div>
                    <div class="lorgus-location-grid">
                        ${locationCards}
                    </div>
                </section>
            </main>
        </div>
    `;
}

function renderLocationChats(locationName, regionName) {
    const container = document.getElementById("cabinet-content");
    if (!container) return;

    container.className = "lorgus-rp-page";
    const character = window.activeCharacter;
    const name = escapeHtml(character?.name || "Без имени");
    const location = escapeHtml(locationName);
    const region = escapeHtml(regionName);

    container.innerHTML = `
        <div class="lorgus-rp-shell">
            <aside class="lorgus-rp-sidebar">
                <button class="lorgus-rp-back" type="button" onclick="renderKingdomLocations('${region}')">← К локациям</button>

                <div class="lorgus-rp-place-mark">✦</div>
                <span class="lorgus-rp-overline">ЛОКАЦИЯ</span>
                <h1>${location}</h1>
                <p class="lorgus-rp-region">${region}</p>

                <div class="lorgus-rp-divider"></div>

                <div class="lorgus-rp-sidebar-label">УЧАСТНИКИ</div>
                <div class="lorgus-rp-participants">
                    <div class="lorgus-rp-participant active">
                        <span class="lorgus-rp-avatar">✦</span>
                        <div><strong>${name}</strong><small>Вы</small></div>
                    </div>
                    <div class="lorgus-rp-participant-empty">Другие игроки появятся здесь</div>
                </div>

                <div class="lorgus-rp-sidebar-note">
                    <span>✧</span>
                    <p>Ролите свободно. Пишите действия, речь и мысли своего персонажа.</p>
                </div>
            </aside>

            <main class="lorgus-rp-main">
                <header class="lorgus-rp-header">
                    <div>
                        <span class="lorgus-rp-overline">RP · ${region}</span>
                        <h2>${location}</h2>
                    </div>
                    <div class="lorgus-rp-status"><i></i> ЖИВАЯ СЦЕНА</div>
                </header>

                <section class="lorgus-rp-feed" id="lorgus-rp-feed">
                    <div class="lorgus-rp-empty">
                        <div class="lorgus-rp-symbol">✦</div>
                        <span class="lorgus-rp-stage-kicker">НАЧАЛО ИСТОРИИ</span>
                        <h3>Сцена ещё не началась.</h3>
                        <p>Первое сообщение создаст начало истории. Здесь игроки будут отвечать друг другу, отмечать участников и продолжать общий сюжет.</p>
                    </div>
                </section>

                <section class="lorgus-rp-composer">
                    <div class="lorgus-rp-composer-top">
                        <span>РОЛЬ: <strong>${name}</strong></span>
                        <span>Можно отметить: <b>@персонаж</b></span>
                    </div>
                    <textarea id="lorgus-rp-input" placeholder="Опиши действие, реплику или мысль персонажа..." rows="4"></textarea>
                    <div class="lorgus-rp-composer-bottom">
                        <button class="lorgus-rp-mention" type="button" disabled>@ Отметить участника</button>
                        <button class="gold-button lorgus-rp-send" type="button" onclick="sendLocalRpMessage()">Отправить</button>
                    </div>
                </section>

                <footer class="lorgus-rp-footer">
                    <span>ЛОРГУС</span>
                    <span>История создаётся действиями игроков.</span>
                </footer>
            </main>
        </div>
    `;
}

function sendLocalRpMessage() {
    const input = document.getElementById("lorgus-rp-input");
    const feed = document.getElementById("lorgus-rp-feed");
    const character = window.activeCharacter;
    if (!input || !feed || !character) return;

    const text = input.value.trim();
    if (!text) return;

    const empty = feed.querySelector(".lorgus-rp-empty");
    if (empty) empty.remove();

    const message = document.createElement("article");
    message.className = "lorgus-rp-message";
    message.innerHTML = `
        <div class="lorgus-rp-message-avatar">✦</div>
        <div class="lorgus-rp-message-body">
            <div class="lorgus-rp-message-meta">
                <strong>${escapeHtml(character.name || "Без имени")}</strong>
                <span>сейчас</span>
            </div>
            <p>${escapeHtml(text)}</p>
        </div>
    `;
    feed.appendChild(message);
    input.value = "";
    feed.scrollTop = feed.scrollHeight;
}


/* =========================================================
   ПРОФИЛЬ И СМЕНА ПЕРСОНАЖА
   ========================================================= */

function openActiveCharacterProfile() {
    const character = window.activeCharacter;

    if (!character) {
        showCharacterError(
            document.getElementById("cabinet-content"),
            "Активный персонаж не выбран."
        );
        return;
    }

    const container = document.getElementById("cabinet-content");
    if (!container) return;

    container.className = "character-profile-page";

    container.innerHTML = `
        <div class="character-profile-header">
            <div class="welcome-symbol">✦</div>
            <h1>${escapeHtml(character.name || "Без имени")}</h1>
            <p>${escapeHtml(character.race || "Раса не указана")}</p>
        </div>

        <div class="character-profile-grid">
            <div class="character-profile-field">
                <span>Возраст</span>
                <strong>${escapeHtml(character.age ?? "Не указан")}</strong>
            </div>
            <div class="character-profile-field">
                <span>Родина</span>
                <strong>${escapeHtml(character.homeland || "Не указана")}</strong>
            </div>
            <div class="character-profile-field">
                <span>Род занятий</span>
                <strong>${escapeHtml(character.occupation || "Не указан")}</strong>
            </div>
            <div class="character-profile-field">
                <span>Состояние</span>
                <strong>Готов к игре</strong>
            </div>
            <div class="character-profile-field full">
                <span>Характер</span>
                <p>${escapeHtml(character.personality || "Не указан")}</p>
            </div>
            <div class="character-profile-field full">
                <span>Предыстория</span>
                <p>${escapeHtml(character.backstory || "Не указана")}</p>
            </div>
            <div class="character-profile-field full">
                <span>Особые навыки</span>
                <p>${escapeHtml(character.special_skills || "Не указаны")}</p>
            </div>
        </div>

        <div class="character-game-actions">
            <button class="gold-button" type="button" onclick="returnToGame()">
                Вернуться к игре
            </button>
            <button class="character-secondary-button" type="button" onclick="switchCharacter()">
                Сменить персонажа
            </button>
        </div>
    `;
}

async function switchCharacter() {
    const container = document.getElementById("cabinet-content");
    if (!container) return;

    sessionStorage.removeItem("lorgus_active_character_id");
    window.activeCharacterId = null;
    window.activeCharacter = null;

    await loadPlayerState({
        user: (await supabase.auth.getUser()).data.user
    });
}

function returnToGame() {
    const container = document.getElementById("cabinet-content");
    if (!container || !window.activeCharacter) return;
    renderCharacter(container, window.activeCharacter);
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
window.updateCharacterApplication =
    updateCharacterApplication;
window.openActiveCharacterProfile = openActiveCharacterProfile;
window.switchCharacter = switchCharacter;
window.returnToGame = returnToGame;
window.renderCharacter = renderCharacter;
window.renderKingdomLocations = renderKingdomLocations;
window.renderLocationChats = renderLocationChats;


/* =========================================================
   ЗАПУСК
   ========================================================= */

initialize();
