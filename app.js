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
        <main class="auth-page lorgus-cinematic-auth">
            <canvas id="lorgus-scene" class="lorgus-scene" aria-hidden="true"></canvas>
            <div class="lorgus-vignette" aria-hidden="true"></div>
            <div class="background-glow"></div>

            <div class="lorgus-portal-mark" aria-hidden="true">
                <span class="portal-ring portal-ring-1"></span>
                <span class="portal-ring portal-ring-2"></span>
                <span class="portal-ring portal-ring-3"></span>
                <span class="portal-core">✦</span>
                <span class="portal-orbit portal-orbit-a"></span>
                <span class="portal-orbit portal-orbit-b"></span>
            </div>

            <div class="lorgus-side-notation lorgus-side-notation-left" aria-hidden="true">
                <span>LO / 001</span>
                <i></i>
                <span>THE LIVING WORLD</span>
            </div>

            <div class="lorgus-side-notation lorgus-side-notation-right" aria-hidden="true">
                <span>ВХОД В МИР</span>
                <i></i>
                <span>EST. UNKNOWN</span>
            </div>

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