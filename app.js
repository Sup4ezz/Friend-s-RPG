import {
    createClient
} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js";

let supabase;
let authSwitching = false;
let lorgusPortalEntering = false;
let lorgusPortalDepartureAligning = false;
let lorgusPortalEnterStartedAt = 0;
let lorgusPortalOverlay = null;

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

function createPortalTransitionOverlay() {
    const old = document.querySelector(".lorgus-portal-transition");
    if (old) old.remove();

    const overlay = document.createElement("div");
    overlay.className = "lorgus-portal-transition";
    overlay.innerHTML = `
        <div class="lorgus-portal-transition-veil"></div>
        <div class="lorgus-portal-transition-core"></div>
        <div class="lorgus-portal-transition-ring"></div>
    `;
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
        overlay.classList.add("active");
    });

    lorgusPortalOverlay = overlay;
    return overlay;
}

function finishPortalTransition() {
    if (!lorgusPortalOverlay) return;

    lorgusPortalOverlay.classList.add("release");
    window.setTimeout(() => {
        if (lorgusPortalOverlay) {
            lorgusPortalOverlay.remove();
            lorgusPortalOverlay = null;
        }
    }, 850);
}

function createLorgusEyeTransition() {
    const overlay = document.createElement("div");
    overlay.className = "lorgus-eye-transition";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
        <svg class="lorgus-eye-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
                <linearGradient id="lorgus-lid-top" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stop-color="#080605"/>
                    <stop offset="0.8" stop-color="#19120e"/>
                    <stop offset="1" stop-color="#090706"/>
                </linearGradient>
                <linearGradient id="lorgus-lid-bottom" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0" stop-color="#080605"/>
                    <stop offset="0.8" stop-color="#19120e"/>
                    <stop offset="1" stop-color="#090706"/>
                </linearGradient>
                <filter id="lorgus-lid-shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="0.65"/>
                </filter>
            </defs>

            <!-- Верхнее веко. В закрытом состоянии его край доходит до самой середины. -->
            <g class="lorgus-lid-group lorgus-lid-group-top">
                <path class="lorgus-lid-shadow"
                      d="M-10 0H110V58C87 54 68 51 50 50C32 51 13 54-10 58Z"
                      fill="#000" opacity=".75" filter="url(#lorgus-lid-shadow)"/>
                <path class="lorgus-lid-surface"
                      d="M-10 0H110V56C87 52 68 50 50 49.8C32 50 13 52-10 56Z"
                      fill="url(#lorgus-lid-top)"/>
                <path class="lorgus-lid-edge"
                      d="M-2 55C17 50 34 49.8 50 49.8C66 49.8 83 50 102 55"
                      fill="none" stroke="#020201" stroke-width="1.15" stroke-linecap="round"/>
            </g>

            <!-- Нижнее веко. В закрытом состоянии его край приходит в ту же точку. -->
            <g class="lorgus-lid-group lorgus-lid-group-bottom">
                <path class="lorgus-lid-shadow"
                      d="M-10 100H110V42C87 46 68 49 50 50C32 49 13 46-10 42Z"
                      fill="#000" opacity=".75" filter="url(#lorgus-lid-shadow)"/>
                <path class="lorgus-lid-surface"
                      d="M-10 100H110V44C87 48 68 50 50 50.2C32 50 13 48-10 44Z"
                      fill="url(#lorgus-lid-bottom)"/>
                <path class="lorgus-lid-edge"
                      d="M-2 45C17 50 34 50.2 50 50.2C66 50.2 83 50 102 45"
                      fill="none" stroke="#020201" stroke-width="1.15" stroke-linecap="round"/>
            </g>
        </svg>
    `;

    overlay.style.cssText = [
        "position:fixed",
        "inset:0",
        "z-index:2147483647",
        "pointer-events:none",
        "overflow:hidden",
        "background:#020201"
    ].join(";");

    const style = document.createElement("style");
    style.textContent = `
        .lorgus-eye-transition{isolation:isolate;}
        .lorgus-eye-svg{
            position:absolute;
            inset:0;
            width:100%;
            height:100%;
            display:block;
            overflow:hidden;
        }
        .lorgus-lid-group{
            transform-box:fill-box;
            transform-origin:center;
            will-change:transform;
            transition:transform 1180ms cubic-bezier(.7,0,.2,1);
        }
        .lorgus-lid-group-top{transform:translateY(-58%);}
        .lorgus-lid-group-bottom{transform:translateY(58%);}

        .lorgus-eye-transition.closed .lorgus-lid-group-top,
        .lorgus-eye-transition.closed .lorgus-lid-group-bottom{
            transform:translateY(0);
        }

        .lorgus-eye-transition.open .lorgus-lid-group-top{
            transform:translateY(-58%);
        }
        .lorgus-eye-transition.open .lorgus-lid-group-bottom{
            transform:translateY(58%);
        }
    `;
    overlay.appendChild(style);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => overlay.classList.add("closed"));
    return overlay;
}
function render(session) {
    if (session) {
        const authScene = document.querySelector(".lorgus-cinematic-auth");

        if (authScene && !lorgusPortalEntering && !lorgusPortalDepartureAligning) {
            // UI уходит и камера начинает полёт из ЕЁ текущего положения.
            // Никакого отдельного transition-screen между сценами нет.
            lorgusPortalDepartureAligning = false;
            authScene.classList.add("portal-departure");

            // Сначала даём интерфейсу заметно раствориться. Камера всё это время
            // остаётся в исходной позиции — это один непрерывный кадр, а не склейка.
            window.setTimeout(() => {
                if (!document.querySelector(".lorgus-cinematic-auth")) return;

                lorgusPortalEntering = true;
                lorgusPortalEnterStartedAt = performance.now();

                // Когда портал подходит вплотную, мы не показываем "экран перехода".
                // Игрок видит закрывающиеся веки: это буквально взгляд персонажа.
                let eyeTransition = null;
                window.setTimeout(async () => {
                    if (!lorgusPortalEntering) return;

                    eyeTransition = createLorgusEyeTransition();

                    // Пока веки сомкнуты, кабинет спокойно готовится под ними.
                    await renderCabinet(session, true, true);

                    lorgusPortalEntering = false;

                    if (lorgusSceneCleanup) {
                        const cleanup = lorgusSceneCleanup;
                        lorgusSceneCleanup = null;
                        cleanup();
                    }

                    // Открываем глаза уже на новой локации.
                    eyeTransition.classList.remove("closed");
                    eyeTransition.classList.add("open");

                    window.setTimeout(() => eyeTransition.remove(), 620);
                }, 760);
            }, 620);

            return;
        }

        renderCabinet(session);
    } else {
        lorgusPortalEntering = false;
        lorgusPortalDepartureAligning = false;
        if (lorgusPortalOverlay) {
            lorgusPortalOverlay.remove();
            lorgusPortalOverlay = null;
        }
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
            <canvas id="lorgus-webgl" class="lorgus-webgl" aria-hidden="true"></canvas>
            <div class="lorgus-vignette" aria-hidden="true"></div>

            <div class="lorgus-fantasy-stage" aria-hidden="true">
                <div class="void-sky"></div>
                <div class="world-rift"></div>
                <div class="rift-glow"></div>
                <div class="rift-shard shard-a"></div>
                <div class="rift-shard shard-b"></div>
                <div class="rift-shard shard-c"></div>
                <div class="rift-shard shard-d"></div>
                <div class="colossus colossus-a"></div>
                <div class="colossus colossus-b"></div>
                <div class="ancient-gate">
                    <div class="gate-crown"></div>
                    <div class="gate-pillar gate-pillar-left"></div>
                    <div class="gate-pillar gate-pillar-right"></div>
                    <div class="gate-fire"></div>
                </div>
                <div class="ground-mist mist-one"></div>
                <div class="ground-mist mist-two"></div>
                <div class="ember-field"></div>
            </div>

            <header class="lorgus-auth-header">
                <span>ЛОРГУС</span>
                <span>Мир жив</span>
                <span>Путь открыт</span>
            </header>

            <div class="lorgus-auth-title" aria-hidden="true">
                <span class="title-ghos            authScene.classList.add("portal-departure");
t">ЛОРГУС</span>
                <span class="title-main">ЛОРГУС</span>
                <span class="title-sub">ЗА ПРЕДЕЛАМИ КАРТЫ</span>
            </div>

            <div class="lorgus-auth-whisper whisper-left" aria-hidden="true">
                <span>Там, где кончаются дороги</span>
                <i></i>
                <span>начинаются земли ЛОРГУСА</span>
            </div>

            <div class="lorgus-auth-whisper whisper-right" aria-hidden="true">
                <span>Старые врата ещё помнят</span>
                <i></i>
                <span>имя каждого пришедшего</span>
            </div>

            <section class="auth-container">
                <div class="auth-panel">
                    <div class="auth-panel-kicker">
                        <span>ВОРОТА ЛОРГУСА</span>
                        <i></i>
                        <span>ВХОД ПУТЕШЕСТВЕННИКА</span>
                    </div>

                    <div class="auth-tabs">
                        <button id="login-tab" class="auth-tab active" onclick="showLogin()">Войти</button>
                        <button id="register-tab" class="auth-tab" onclick="showRegister()">Начать путь</button>
                    </div>

                    <div id="auth-form" class="auth-form-container"></div>
                </div>
            </section>

            <footer class="lorgus-auth-footer">
                <span>✦ ЛОРГУС</span>
                <span>Там, где заканчивается карта, начинается история.</span>
                <span>Путь ждёт</span>
            </footer>
        </main>
    `;

    showLogin(true);
    initializeLorgusScene();
    initializeLorgusWebGL();
    initializeLorgusAudio();
}

let lorgusAudioCleanup = null;

function initializeLorgusAudio() {
    if (lorgusAudioCleanup) lorgusAudioCleanup();
    const root = document.querySelector(".lorgus-cinematic-auth");
    if (!root) return;

    let audioContext = null;    const style = document.createElement("style");
    style.textContent = `
        .lorgus-audio-control{position:fixed;left:28px;bottom:28px;z-index:30;display:flex;align-items:center;gap:10px;padding:7px 10px;border:1px solid rgba(220,185,101,.22);background:rgba(8,7,5,.62);backdrop-filter:blur(8px);box-shadow:0 8px 24px rgba(0,0,0,.25)}
        .lorgus-audio-button{width:28px;height:28px;border:0;background:transparent;color:#dfc27a;font-size:16px;cursor:pointer}
        .lorgus-audio-slider{width:92px;accent-color:#c99b4e;cursor:pointer}
        .lorgus-audio-control:hover{border-color:rgba(220,185,101,.45)}
        @media(max-width:720px){.lorgus-audio-control{left:14px;bottom:14px}.lorgus-audio-slider{width:72px}}
    `;
    root.appendChild(style);

    const volumeControl = document.createElement("div");
    volumeControl.className = "lorgus-audio-control";
    volumeControl.innerHTML = `
        <button type="button" class="lorgus-audio-button" aria-label="Включить или выключить звук" aria-pressed="false">♫</button>
        <input class="lorgus-audio-slider" type="range" min="0" max="100" value="55" aria-label="Громкость">
    `;
    root.appendChild(volumeControl);

    const volumeButton = volumeControl.querySelector(".lorgus-audio-button");
    const volumeSlider = volumeControl.querySelector(".lorgus-audio-slider");

    let master = null;
    let musicGain = null;
    let started = false;
    let musicTimer = null;
    let volume = 0.55;
    let muted = false;
    const listeners = [];

    const on = (target, event, handler, options) => {
        target.addEventListener(event, handler, options);
        listeners.push(() => target.removeEventListener(event, handler, options));
    };

    const ensureAudio = () => {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            master = audioContext.createGain();
            master.gain.value = volume * 0.29;
            master.connect(audioContext.destination);

            musicGain = audioContext.createGain();
            musicGain.gain.value = 0.0001;
            musicGain.connect(master);
        }
        if (audioContext.state === "suspended") audioContext.resume();
        if (!started) startMusic();
    };

    const applyVolume = () => {
        if (!master) return;
        const target = muted ? 0 : volume * 0.29;
        master.gain.setTargetAtTime(target, audioContext.currentTime, 0.035);
        volumeButton.textContent = muted ? "♩" : "♫";
        volumeButton.setAttribute("aria-pressed", String(muted));
    };

    const tone = (frequency, duration, volume, type = "sine", glide = 0) => {
        if (!audioContext || !master) return;
        const now = audioContext.currentTime;
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, now);
        if (glide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, frequency + glide), now + duration);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        osc.connect(gain);
        gain.connect(master);
        osc.start(now);
        osc.stop(now + duration + 0.03);
    };

    const hover = () => {
        ensureAudio();
        tone(880, 0.075, 0.026, "sine", 55);
    };

    const authError = () => {
        try {
            ensureAudio();
            tone(155, 0.12, 0.09, "sawtooth", -22);
            window.setTimeout(() => tone(116, 0.18, 0.075, "triangle", -18), 90);
            window.setTimeout(() => tone(82, 0.24, 0.055, "sine", -12), 190);
        } catch (error) {}
    };
    window.lorgusAuthErrorSound = authError;

    const click = () => {
        ensureAudio();
        tone(220, 0.16, 0.055, "triangle", 32);
        window.setTimeout(() => tone(440, 0.22, 0.035, "sine", 18), 35);
    };

    const startMusic = () => {
        if (started || !audioContext || !musicGain) return;
        started = true;
        const now = audioContext.currentTime;
        musicGain.gain.cancelScheduledValues(now);
        musicGain.gain.setValueAtTime(0.0001, now);
        musicGain.gain.exponentialRampToValueAtTime(0.32, now + 2.8);

        const roots = [55, 65.41, 49, 58.27];
        const melody = [220, 246.94, 293.66, 246.94, 196, 220, 261.63, 220];
        let step = 0;

        const playMusicBar = () => {
            if (!audioContext || !musicGain) return;
            const t = audioContext.currentTime;
            const rootFreq = roots[step % roots.length];

            [rootFreq, rootFreq * 1.498, rootFreq * 2].forEach((freq, index) => {
                const osc = audioContext.createOscillator();
                const gain = audioContext.createGain();
                osc.type = index === 0 ? "triangle" : "sine";
                osc.frequency.setValueAtTime(freq, t);
                gain.gain.setValueAtTime(0.0001, t);
                gain.gain.exponentialRampToValueAtTime(index === 0 ? 0.16 : 0.07, t + 0.55);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + 5.0);
                osc.connect(gain);
                gain.connect(musicGain);
                osc.start(t);
                osc.stop(t + 5.2);
            });

            const note = audioContext.createOscillator();
            const noteGain = audioContext.createGain();
            note.type = "sine";
            note.frequency.setValueAtTime(melody[step % melody.length], t + 0.35);
            noteGain.gain.setValueAtTime(0.0001, t);
            noteGain.gain.exponentialRampToValueAtTime(0.075, t + 0.42);
            noteGain.gain.exponentialRampToValueAtTime(0.0001, t + 1.7);
            note.connect(noteGain);
            noteGain.connect(musicGain);
            note.start(t + 0.35);
            note.stop(t + 1.75);

            step++;
        };

        playMusicBar();
        musicTimer = window.setInterval(playMusicBar, 2600);
    };

    const activate = () => {
        try { ensureAudio(); } catch (error) { console.warn("LORGUS audio unavailable:", error); }
    };

    on(volumeSlider, "input", event => {
        volume = Number(event.target.value) / 100;
        muted = volume <= 0;
        try { ensureAudio(); applyVolume(); } catch (error) {}
    });
    on(volumeButton, "click", event => {
        event.stopPropagation();
        muted = !muted;
        try { ensureAudio(); applyVolume(); } catch (error) {}
    });

    on(root, "pointerdown", activate, { passive: true });
    on(root, "mouseover", event => {
        if (event.target.closest("button")) hover();
    });
    on(root, "click", event => {
        if (event.target.closest("button")) click();
    });

    lorgusAudioCleanup = () => {
        listeners.forEach(remove => remove());
        if (musicTimer) window.clearInterval(musicTimer);
        if (audioContext) audioContext.close().catch(() => {});
        if (window.lorgusAuthErrorSound === authError) delete window.lorgusAuthErrorSound;
        lorgusAudioCleanup = null;
    };
}

let lorgusSceneCleanup = null;

function initializeLorgusScene() {
    if (lorgusSceneCleanup) {
        lorgusSceneCleanup();
        lorgusSceneCleanup = null;
    }

    const canvas = document.getElementById("lorgus-scene");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let raf = 0;
    let last = performance.now();
    let particles = [];
    let pointerX = 0.5;
    let pointerY = 0.5;
    let targetX = 0.5;
    let targetY = 0.5;

    const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + "px";
        canvas.style.height = height + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const count = Math.min(130, Math.max(45, Math.floor(width * height / 18000)));
        particles = Array.from({ length: count }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            r: Math.random() * 1.5 + 0.25,
            a: Math.random() * 0.45 + 0.08,
            speed: Math.random() * 5 + 2,
            drift: (Math.random() - 0.5) * 3,
            phase: Math.random() * Math.PI * 2
        }));
    };

    const onPointerMove = event => {
        targetX = event.clientX / Math.max(width, 1);
        targetY = event.clientY / Math.max(height, 1);
    };

    const frame = now => {
        const dt = Math.min((now - last) / 1000, 0.04);
        last = now;

        pointerX += (targetX - pointerX) * Math.min(1, dt * 3);
        pointerY += (targetY - pointerY) * Math.min(1, dt * 3);

        ctx.clearRect(0, 0, width, height);

        const glowX = width * (0.28 + pointerX * 0.08);
        const glowY = height * (0.32 + pointerY * 0.06);
        const glow = ctx.createRadialGradient(
            glowX, glowY, 0,
            glowX, glowY, Math.max(width, height) * 0.62
        );
        glow.addColorStop(0, "rgba(190,145,55,.075)");
        glow.addColorStop(.38, "rgba(120,90,35,.028)");
        glow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);

        for (const p of particles) {
            p.y -= p.speed * dt;
            p.x += (p.drift + Math.sin(now * .00035 + p.phase)) * dt;

            if (p.y < -10) {
                p.y = height + 10;
                p.x = Math.random() * width;
            }
            if (p.x < -10) p.x = width + 10;
            if (p.x > width + 10) p.x = -10;

            const parallax = (pointerX - .5) * 12;
            const px = p.x + parallax;
            const alpha = p.a * (.72 + Math.sin(now * .001 + p.phase) * .28);

            ctx.beginPath();
            ctx.arc(px, p.y + (pointerY - .5) * 7, p.r, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(218,184,104," + Math.max(.02, alpha) + ")";
            ctx.fill();
        }

        raf = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    raf = requestAnimationFrame(frame);

    lorgusSceneCleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        window.removeEventListener("pointermove", onPointerMove);
    };
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
    } = await supabase.auth.signInWithPassword({
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

/* =========================================================
   ТИТУЛЫ ПЕРСОНАЖЕЙ
   ========================================================= */

async function loadCharacterTitle(characterId) {
    if (!characterId) return null;
    const { data: character, error } = await supabase.from("characters").select("active_title_id").eq("id", characterId).single();
    if (error || !character?.active_title_id) return null;
    const { data: title } = await supabase.from("titles").select("*").eq("id", character.active_title_id).single();
    return title || null;
}

function titleRarityLabel(rarity) {
    return ({common:"Обычный",uncommon:"Необычный",rare:"Редкий",epic:"Эпический",legendary:"Легендарный",mythic:"Мифический",unique:"Уникальный"})[rarity] || rarity || "";
}

function renderTitleBadge(title, className = "") {
    if (!title) return "";
    return "<span class=\"lorgus-title-badge " + className + "\" style=\"--title-color:" + escapeHtml(title.color || "#d6b66a") + "\"><span>" + escapeHtml(title.icon || "✦") + "</span>" + escapeHtml(title.name) + "</span>";
}

async function openTitlePicker() {
    const c = window.activeCharacter;
    if (!c) return;
    const { data: owned, error } = await supabase.from("character_titles").select("title_id, awarded_at, titles(*)").eq("character_id", c.id).order("awarded_at", { ascending: true });
    if (error) { alert("Не удалось загрузить титулы:\\n\\n" + error.message); return; }
    const overlay = document.createElement("div");
    overlay.className = "lorgus-title-overlay";
    const panel = document.createElement("article");
    panel.className = "lorgus-title-panel";
    panel.innerHTML = "<button type=\"button\" class=\"lorgus-title-close\">×</button><span class=\"lorgus-command-kicker\">ЛОРГУС · ТИТУЛЫ</span><h2>Как тебя будут называть?</h2><p>Титул выдаётся администрацией. Здесь ты выбираешь только тот, который видят другие.</p>";
    const list = document.createElement("div"); list.className = "lorgus-title-list";
    if (!owned?.length) list.innerHTML = "<div class=\"lorgus-title-empty\">Титулов пока нет. Их выдаёт администрация.</div>";
    (owned || []).forEach(row => {
        const t = row.titles; if (!t) return;
        const b = document.createElement("button"); b.type = "button"; b.className = "lorgus-owned-title" + (String(t.id) === String(window.activeTitle?.id) ? " active" : ""); b.dataset.titleId = t.id; b.style.setProperty("--title-color", t.color || "#d6b66a");
        b.innerHTML = "<span class=\"lorgus-owned-title-icon\">" + escapeHtml(t.icon) + "</span><span><strong>" + escapeHtml(t.name) + "</strong><small>" + escapeHtml(t.category) + " · " + escapeHtml(titleRarityLabel(t.rarity)) + "</small></span>";
        b.addEventListener("click", async () => {
            const { error: setError } = await supabase.rpc("set_active_character_title", { p_character_id: c.id, p_title_id: t.id });
            if (setError) { alert("Не удалось установить титул:\\n\\n" + setError.message); return; }
            window.activeTitle = t; overlay.remove(); renderLorgusCharacterHub();
        });
        list.appendChild(b);
    });
    panel.appendChild(list);
    if (owned?.length) {
        const clear = document.createElement("button"); clear.type = "button"; clear.className = "lorgus-title-clear"; clear.textContent = "Скрыть титул";
        clear.addEventListener("click", async () => {
            const { error: setError } = await supabase.rpc("set_active_character_title", { p_character_id: c.id, p_title_id: null });
            if (setError) { alert("Не удалось снять титул:\\n\\n" + setError.message); return; }
            window.activeTitle = null; overlay.remove(); renderLorgusCharacterHub();
        }); panel.appendChild(clear);
    }
    const backdrop = document.createElement("div"); backdrop.className = "lorgus-title-backdrop"; overlay.append(backdrop, panel); document.body.appendChild(overlay);
    const close = () => overlay.remove(); panel.querySelector(".lorgus-title-close").addEventListener("click", close); backdrop.addEventListener("click", close);
}

async function openAdminCharacterTitles(application, container) {
    const characterId = application.character_id; if (!characterId) return;
    const { data: titles, error: titlesError } = await supabase
        .from("titles")
        .select("*")
        .order("category")
        .order("name");

    if (titlesError) {
        console.error("Ошибка загрузки титулов:", titlesError);
        alert("Не удалось загрузить список титулов:\n\n" + titlesError.message);
        return;
    }

    const { data: owned, error: ownedError } = await supabase
        .from("character_titles")
        .select("title_id, awarded_at, titles(*)")
        .eq("character_id", characterId)
        .order("awarded_at", { ascending: true });

    if (ownedError) {
        console.error("Ошибка загрузки выданных титулов:", ownedError);
    }
    const overlay = document.createElement("div"); overlay.className = "lorgus-title-overlay";
    const panel = document.createElement("article"); panel.className = "lorgus-title-panel lorgus-admin-title-panel";
    panel.innerHTML = "<button type=\"button\" class=\"lorgus-title-close\">×</button><span class=\"lorgus-command-kicker\">АДМИНИСТРАЦИЯ · ТИТУЛЫ</span><h2>" + escapeHtml(application.name || "Персонаж") + "</h2><p>Выдача и отзыв титулов. Игрок не может создавать или выдавать их себе.</p>";
    const select = document.createElement("select"); select.className = "lorgus-title-select"; select.innerHTML = "<option value=\"\">Выбери титул...</option>" + (titles || []).map(t => "<option value=\"" + escapeHtml(t.id) + "\">" + escapeHtml(t.icon) + " " + escapeHtml(t.name) + " · " + escapeHtml(titleRarityLabel(t.rarity)) + "</option>").join("");
    const grant = document.createElement("button"); grant.type = "button"; grant.className = "lorgus-title-grant"; grant.textContent = "✦ Выдать титул";
    const ownedBox = document.createElement("div"); ownedBox.className = "lorgus-title-owned-list";
    (owned || []).forEach(row => { const t=row.titles; if(!t)return; const item=document.createElement("div"); item.className="lorgus-admin-owned-title"; item.style.setProperty("--title-color",t.color||"#d6b66a"); item.innerHTML="<span>"+escapeHtml(t.icon)+"</span><strong>"+escapeHtml(t.name)+"</strong><small>"+escapeHtml(t.rarity)+"</small>"; const revoke=document.createElement("button"); revoke.type="button"; revoke.textContent="Забрать"; revoke.addEventListener("click",async()=>{const {error}=await supabase.rpc("admin_revoke_character_title",{p_character_id:characterId,p_title_id:row.title_id});if(error){alert("Не удалось забрать титул:\\n\\n"+error.message);return;} overlay.remove(); openAdminCharacterTitles(application,container);}); item.appendChild(revoke); ownedBox.appendChild(item); });
    if (!owned?.length) ownedBox.innerHTML = "<div class=\"lorgus-title-empty\">У персонажа пока нет титулов.</div>";
    panel.append(select, grant, ownedBox); overlay.append(document.createElement("div"), panel); overlay.firstChild.className="lorgus-title-backdrop"; document.body.appendChild(overlay);
    const close=()=>overlay.remove(); panel.querySelector(".lorgus-title-close").addEventListener("click",close); overlay.firstChild.addEventListener("click",close);
    grant.addEventListener("click",async()=>{if(!select.value)return;const {error}=await supabase.rpc("admin_award_character_title",{p_character_id:characterId,p_title_id:select.value});if(error){alert("Не удалось выдать титул:\\n\\n"+error.message);return;}overlay.remove();openAdminCharacterTitles(application,container);});
}

async function loadCharacterAbilities(characterId) {
    if (!characterId) return [];
    const { data, error } = await supabase.from("character_abilities").select("ability_id, acquired_at, source_note, abilities(*)").eq("character_id", characterId).order("acquired_at", { ascending: true });
    if (error) { console.error("Не удалось загрузить способности:", error); return []; }
    return (data || []).map(row => ({ ...(row.abilities || {}), acquired_at: row.acquired_at, source_note: row.source_note })).filter(row => row.id);
}

function abilityRarityLabel(rarity) { return titleRarityLabel(rarity); }

function renderAbilityList(abilities) {
    if (!abilities?.length) return '<div class="lorgus-ability-empty">Способностей, подтверждённых администрацией, пока нет.</div>';
    return abilities.map(a => '<article class="lorgus-ability-card" style="--ability-color:' + escapeHtml(a.color || "#d6b36a") + '"><div class="lorgus-ability-icon">' + escapeHtml(a.icon || "✦") + '</div><div class="lorgus-ability-body"><div class="lorgus-ability-top"><strong>' + escapeHtml(a.name) + '</strong><span>' + escapeHtml(abilityRarityLabel(a.rarity)) + '</span></div><small>' + escapeHtml(a.category || "special") + '</small><p>' + escapeHtml(a.description || "Описание отсутствует.") + '</p></div></article>').join("");
}

async function openAdminCharacterAbilities(application, container) {
    const characterId = application.character_id;
    if (!characterId) return;
    const { data: abilities, error: abilitiesError } = await supabase.from("abilities").select("*").order("category").order("name");
    const { data: owned, error: ownedError } = await supabase.from("character_abilities").select("ability_id, acquired_at, source_note, abilities(*)").eq("character_id", characterId).order("acquired_at", { ascending: true });
    if (abilitiesError) { alert("Не удалось загрузить список способностей:\n\n" + abilitiesError.message); return; }
    if (ownedError) console.error("Не удалось загрузить выданные способности:", ownedError);
    const overlay = document.createElement("div"); overlay.className = "lorgus-ability-overlay";
    const panel = document.createElement("article"); panel.className = "lorgus-ability-panel";
    panel.innerHTML = '<button type="button" class="lorgus-ability-close">×</button><span class="lorgus-command-kicker">АДМИНИСТРАЦИЯ · СПОСОБНОСТИ</span><h2>' + escapeHtml(application.name || "Персонаж") + '</h2><p>Только администрация определяет, какими подтверждёнными способностями владеет персонаж.</p><div class="lorgus-ability-grant-grid"><select class="lorgus-ability-select"><option value="">Выбери способность...</option></select><input class="lorgus-ability-note" type="text" maxlength="500" placeholder="Основание / событие / откуда получена"><button type="button" class="lorgus-ability-grant">✦ Выдать способность</button></div><div class="lorgus-ability-owned"></div><div class="lorgus-ability-history"></div><div class="lorgus-ability-create"><span>НОВАЯ СПОСОБНОСТЬ</span><div class="lorgus-ability-create-grid"><input class="ability-new-name" placeholder="Название"><input class="ability-new-icon" placeholder="Иконка" value="✦"><select class="ability-new-category"><option value="combat">Бой</option><option value="magic">Магия</option><option value="craft">Ремесло</option><option value="social">Социальное</option><option value="survival">Выживание</option><option value="special">Особое</option></select><select class="ability-new-rarity"><option value="common">Обычный</option><option value="uncommon">Необычный</option><option value="rare">Редкий</option><option value="epic">Эпический</option><option value="legendary">Легендарный</option><option value="mythic">Мифический</option><option value="unique">Уникальный</option></select><input class="ability-new-color" type="text" value="#d6b36a" placeholder="#d6b36a"><textarea class="ability-new-description" placeholder="Что умеет персонаж?"></textarea></div><button type="button" class="lorgus-ability-create-button">Создать способность</button></div>';
    const select = panel.querySelector(".lorgus-ability-select");
    (abilities || []).forEach(a => { const option=document.createElement("option"); option.value=a.id; option.textContent=(a.icon || "✦") + " " + a.name + " · " + abilityRarityLabel(a.rarity); select.appendChild(option); });
    const ownedBox = panel.querySelector(".lorgus-ability-owned");
    const historyBox = panel.querySelector(".lorgus-ability-history");

    const renderHistory = rows => {
        if (!rows?.length) {
            historyBox.innerHTML = '<div class="lorgus-ability-empty">История изменений способностей пока пуста.</div>';
            return;
        }
        historyBox.innerHTML = '<div class="lorgus-ability-history-title">ЛЕТОПИСЬ СПОСОБНОСТЕЙ</div>' + rows.map(row => {
            const a = row.abilities;
            const label = row.action === "granted" ? "Получена" : "Отозвана";
            const when = row.created_at ? new Date(row.created_at).toLocaleString("ru-RU", { dateStyle:"medium", timeStyle:"short" }) : "—";
            return '<div class="lorgus-ability-history-entry ' + escapeHtml(row.action) + '"><span class="lorgus-ability-history-icon">' + (row.action === "granted" ? "✦" : "×") + '</span><div><strong>' + escapeHtml(label) + ': ' + escapeHtml(a?.name || "Способность") + '</strong><small>' + escapeHtml(when) + (row.source_note ? " · " + escapeHtml(row.source_note) : "") + '</small></div></div>';
        }).join("");
    };

    const loadHistory = async () => {
        const { data, error } = await supabase
            .from("character_ability_history")
            .select("action, source_note, created_at, abilities(name, icon, color)")
            .eq("character_id", characterId)
            .order("created_at", { ascending: false });
        if (error) {
            console.error("Не удалось загрузить историю способностей:", error);
            historyBox.innerHTML = '<div class="lorgus-ability-empty">История изменений временно недоступна.</div>';
            return;
        }
        renderHistory(data || []);
    };

    const refreshOwned = async () => {
        const { data: fresh, error } = await supabase
            .from("character_abilities")
            .select("ability_id, acquired_at, source_note, abilities(*)")
            .eq("character_id", characterId)
            .order("acquired_at", { ascending: true });
        if (error) {
            console.error("Не удалось обновить способности:", error);
            return;
        }
        renderOwned(fresh || []);
        await loadHistory();
    };

    const renderOwned = rows => {
        if (!rows?.length) { ownedBox.innerHTML = '<div class="lorgus-ability-empty">У персонажа пока нет подтверждённых способностей.</div>'; return; }
        ownedBox.innerHTML = rows.map(row => { const a=row.abilities; if(!a)return ""; return '<div class="lorgus-admin-owned-ability" style="--ability-color:' + escapeHtml(a.color || "#d6b36a") + '"><span>' + escapeHtml(a.icon) + '</span><div><strong>' + escapeHtml(a.name) + '</strong><small>' + escapeHtml(abilityRarityLabel(a.rarity)) + (row.source_note ? " · " + escapeHtml(row.source_note) : "") + '</small></div><button type="button" data-ability-id="' + escapeHtml(row.ability_id) + '">Забрать</button></div>'; }).join("");
        ownedBox.querySelectorAll("button").forEach(button => button.addEventListener("click", async () => {
            const note = prompt("Причина отзыва способности:", ""); if (note === null) return;
            const { error } = await supabase.rpc("admin_revoke_character_ability", { p_character_id: characterId, p_ability_id: button.dataset.abilityId, p_source_note: note.trim() });
            if (error) { alert("Не удалось забрать способность:\n\n" + error.message); return; }
            await refreshOwned();
        }));
    };
    renderOwned(owned || []);
    const historyBackdrop = document.createElement("div");
    historyBackdrop.className = "lorgus-ability-history-divider";
    panel.querySelector(".lorgus-ability-owned").after(historyBackdrop);
    await loadHistory();
    panel.querySelector(".lorgus-ability-grant").addEventListener("click", async () => {
        if (!select.value) return; const note=panel.querySelector(".lorgus-ability-note").value.trim();
        const { error } = await supabase.rpc("admin_award_character_ability", { p_character_id: characterId, p_ability_id: select.value, p_source_note: note });
        if (error) { alert("Не удалось выдать способность:\n\n" + error.message); return; }
        select.value=""; panel.querySelector(".lorgus-ability-note").value="";
        await refreshOwned();
    });
    panel.querySelector(".lorgus-ability-create-button").addEventListener("click", async () => {
        const name=panel.querySelector(".ability-new-name").value.trim(), description=panel.querySelector(".ability-new-description").value.trim();
        if (!name || !description) { alert("Укажи название и описание способности."); return; }
        const { data, error } = await supabase.rpc("admin_create_ability", { p_name:name, p_category:panel.querySelector(".ability-new-category").value, p_rarity:panel.querySelector(".ability-new-rarity").value, p_icon:panel.querySelector(".ability-new-icon").value.trim() || "✦", p_color:panel.querySelector(".ability-new-color").value.trim() || "#d6b36a", p_description:description });
        if (error) { alert("Не удалось создать способность:\n\n" + error.message); return; }
        const option=document.createElement("option"); option.value=data.id; option.textContent=(data.icon || "✦") + " " + data.name + " · " + abilityRarityLabel(data.rarity); select.appendChild(option); select.value=data.id;
    });
    const backdrop=document.createElement("div"); backdrop.className="lorgus-ability-backdrop"; overlay.append(backdrop,panel); document.body.appendChild(overlay);
    const close=()=>overlay.remove(); panel.querySelector(".lorgus-ability-close").addEventListener("click",close); backdrop.addEventListener("click",close);
}

async function renderCabinet(session, preserveCurrentScene = false, forceCharacterSelection = false) {
    const username =
        session.user.user_metadata?.username ||
        "Игрок";

    window.lorgusUsername = username;
    window.lorgusCurrentUsername = username;
    window.lorgusCurrentUserId = session.user.id;

    const root = document.getElementById("root");
    if (!root) return;

    const previousScene = preserveCurrentScene
        ? root.firstElementChild
        : null;

    const cabinet = document.createElement("main");
    cabinet.className = "game-page lorgus-cabinet-entering";
    if (preserveCurrentScene) {
        cabinet.classList.add("preparing");
    }
    cabinet.style.opacity = "0";
    cabinet.style.pointerEvents = "none";
    cabinet.innerHTML = `
        <section id="cabinet-content"></section>
    `;

    if (preserveCurrentScene) {
        // Кабинет готовится поверх текущего кадра, но пока полностью прозрачен.
        // Поэтому ожидание Supabase никогда не превращается в чёрный промежуточный экран.
        cabinet.style.position = "fixed";
        cabinet.style.inset = "0";
        cabinet.style.zIndex = "20";
        root.appendChild(cabinet);
    } else {
        root.innerHTML = "";
        root.appendChild(cabinet);
    }

    await loadPlayerState(session, forceCharacterSelection);

    /*
        Если приложение было открыто напрямую по SPA-маршруту,
        после восстановления персонажа отдаём управление router.js.
        Существующий рендер состояния остаётся fallback-ом для "/".
    */
    if (
        window.activeCharacter &&
        window.lorgusRouter &&
        window.lorgusRouter.currentPath !== "/"
    ) {
        window.lorgusRouter.bootCurrentRoute();
    }

    if (previousScene && previousScene.parentNode === root) {
        previousScene.remove();
    }

    cabinet.style.opacity = "";
    cabinet.style.pointerEvents = "";
    cabinet.style.position = "";
    cabinet.style.inset = "";
    cabinet.style.zIndex = "";

    cabinet.classList.remove("preparing");
    requestAnimationFrame(() => cabinet.classList.add("ready"));

    return cabinet;
}

/* =========================================================
   СОСТОЯНИЕ ИГРОКА
   ========================================================= */

async function loadPlayerState(session, forceCharacterSelection = false) {
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

    /*
        Восстанавливаем выбранного персонажа после перезагрузки.
        sessionStorage хранит только ID, поэтому самого персонажа
        и его RP-присутствие нужно заново загрузить из Supabase.
        Одновременно проверяем, что этот персонаж действительно
        относится к одобренной заявке текущего пользователя.
    */
    const savedCharacterId =
        sessionStorage.getItem("lorgus_active_character_id") ||
        localStorage.getItem("lorgus_active_character_id");

    if (!forceCharacterSelection && savedCharacterId) {
        const savedApplication = approvedApplications.find(
            application =>
                String(application.character_id) === String(savedCharacterId)
        );

        if (savedApplication) {
            const characterResult = await supabase
                .from("characters")
                .select("*")
                .eq("id", savedCharacterId)
                .single();

            const savedCharacter = characterResult.data;
            const savedCharacterStatus =
                String(savedCharacter?.status || "ACTIVE").toUpperCase();

            if (
                !characterResult.error &&
                savedCharacter &&
                savedCharacterStatus === "ACTIVE"
            ) {
                window.activeCharacterId = savedCharacter.id;
                window.activeCharacter = savedCharacter;
                window.activeTitle = await loadCharacterTitle(savedCharacter.id);

                sessionStorage.setItem(
                    "lorgus_active_character_id",
                    savedCharacter.id
                );
                localStorage.setItem(
                    "lorgus_active_character_id",
                    savedCharacter.id
                );

                await initializeRpPresence(savedCharacter);

                /*
                    Если игрок обновил страницу прямо внутри RP,
                    восстанавливаем не только персонажа, но и
                    последнее RP-пространство.
                */
                const restoredPresence = window.activeRpPresence;

                if (restoredPresence?.type === "location") {
                    await renderLocationChats(
                        restoredPresence.location,
                        restoredPresence.region,
                        true
                    );
                } else if (restoredPresence?.type === "road") {
                    renderRoadChat(restoredPresence);
                } else {
                    renderCharacter(container, savedCharacter);
                }

                return;
            }

            console.error(
                "Не удалось восстановить выбранного персонажа:",
                characterResult.error || "персонаж недоступен"
            );
        }

        sessionStorage.removeItem("lorgus_active_character_id");
        localStorage.removeItem("lorgus_active_character_id");
    }

    window.activeCharacterId = null;
    window.activeCharacter = null;
    window.activeTitle = null;

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
    if (lorgusAudioCleanup) { lorgusAudioCleanup(); lorgusAudioCleanup = null; }
    initializeLorgusCharacterSelectionAudio();

    container.className = "character-selection";
    container.innerHTML = `
        <div class="character-selection-backdrop" aria-hidden="true">
            <div class="character-selection-glow glow-one"></div>
            <div class="character-selection-glow glow-two"></div>
            <div class="character-selection-stars"></div>
        </div>

        <button type="button" class="lorgus-screen-logout" onclick="logout()">ВЫХОД</button>

        <header class="character-selection-header">
            <div class="character-selection-brand">
                <span class="character-selection-mark">✦</span>
                <span>ЛОРГУС</span>
            </div>
            <div class="character-selection-kicker">ЛИЧНЫЕ ИСТОРИИ · ВЫБОР ПУТИ</div>
            <h1>Кто продолжит историю?</h1>
            <p>Каждая жизнь уже оставила след в мире. Выбери ту, которой хочешь дать следующий шаг.</p>
            <div class="character-selection-divider"><i></i><span>ВАШИ ПЕРСОНАЖИ</span><i></i></div>
        </header>

        <section class="character-selection-stage">
            <div class="character-selection-grid"></div>
        </section>

        <div class="character-selection-footer">
            <span>МИР ПРОДОЛЖАЕТСЯ · ТВОЯ ИСТОРИЯ ЖДЁТ</span>
        </div>
    `;

    const grid = container.querySelector(".character-selection-grid");

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
                const image = document.createElement("img");
                image.src = photoData.signedUrl;
                image.alt = character.name || "Персонаж";
                image.className = "character-card-photo";
                avatar.appendChild(image);
            } else {
                avatar.classList.add("character-card-placeholder");
                avatar.innerHTML = "<span>✦</span>";
            }
        } else {
            avatar.classList.add("character-card-placeholder");
            avatar.innerHTML = "<span>✦</span>";
        }

        card.appendChild(avatar);

        const body = document.createElement("div");
        body.className = "character-card-body";

        const statusNode = document.createElement("div");
        statusNode.className = "character-card-status" + (status === "DEAD" ? " dead" : "");
        statusNode.innerHTML = status === "DEAD"
            ? "<span></span> ИСТОРИЯ ЗАВЕРШЕНА"
            : "<span></span> ИСТОРИЯ ПРОДОЛЖАЕТСЯ";
        body.appendChild(statusNode);

        const name = document.createElement("h2");
        name.textContent = character.name || "Без имени";
        body.appendChild(name);

        const race = document.createElement("p");
        race.textContent = character.race || "Раса не указана";
        body.appendChild(race);

        const homeland = document.createElement("small");
        homeland.textContent = character.homeland || "Происхождение не указано";
        body.appendChild(homeland);

        if (status === "ACTIVE" || !character.status) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "character-select-button";
            button.innerHTML = "<span>ВОЙТИ В ИСТОРИЮ</span><b>→</b>";
            button.addEventListener("click", () => selectCharacter(container, character.id));
            body.appendChild(button);
        } else {
            const disabled = document.createElement("div");
            disabled.className = "character-card-disabled-label";
            disabled.textContent = "ИСТОРИЯ НЕДОСТУПНА";
            body.appendChild(disabled);
        }

        card.appendChild(body);
        grid.appendChild(card);
    }

    if (pendingApplication) {
        const reviewPanel = document.createElement("article");
        reviewPanel.className = "character-review-pending-panel";
        reviewPanel.innerHTML = `
            <div class="review-panel-mark">✦</div>
            <div>
                <span>НОВАЯ ИСТОРИЯ</span>
                <h2>Есть заявка на проверке</h2>
                <p>Ещё одна история ждёт решения администрации.</p>
                ${pendingApplication.review_notes ? `<div class="character-review-notes"><strong>Правки</strong><p>${escapeHtml(pendingApplication.review_notes)}</p></div>` : ""}
            </div>
        `;

        const reviewButton = document.createElement("button");
        reviewButton.type = "button";
        reviewButton.className = "character-create-button";
        reviewButton.textContent = pendingApplication.review_notes ? "ИСПРАВИТЬ АНКЕТУ" : "ОТКРЫТЬ ЗАЯВКУ";
        reviewButton.addEventListener("click", () => { if (window.lorgusCharacterAudioCleanup) window.lorgusCharacterAudioCleanup(); renderPendingApplication(container, pendingApplication); });
        reviewPanel.appendChild(reviewButton);
        grid.appendChild(reviewPanel);
    }

    if (applications.length + (pendingApplication ? 1 : 0) < 3) {
        const createButton = document.createElement("button");
        createButton.type = "button";
        createButton.className = "character-create-button character-create-card";
        createButton.innerHTML = "<span class=\"create-plus\">+</span><span><b>НОВАЯ ИСТОРИЯ</b><small>Создать ещё одного персонажа</small></span>";
        createButton.onclick = () => renderCharacterApplicationForm(container);
        grid.appendChild(createButton);
    }
}

function initializeLorgusCharacterSelectionAudio() {
    if (window.lorgusCharacterAudioCleanup) window.lorgusCharacterAudioCleanup();

    const root = document.querySelector(".character-selection");
    if (!root) return;

    let ctx = null;
    let master = null;
    let musicGain = null;
    let timer = null;
    let started = false;
    let muted = false;
    let volume = 0.48;
    const listeners = [];

    const on = (target, event, handler, options) => {
        target.addEventListener(event, handler, options);
        listeners.push(() => target.removeEventListener(event, handler, options));
    };

    const ensure = () => {
        if (!ctx) {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
            master = ctx.createGain();
            master.gain.value = volume * 0.22;
            master.connect(ctx.destination);
            musicGain = ctx.createGain();
            musicGain.gain.value = 0.0001;
            musicGain.connect(master);
        }
        if (ctx.state === "suspended") ctx.resume();
        if (!started) start();
    };

    const tone = (freq, duration, gainValue, type = "sine") => {
        if (!ctx || !master) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        osc.connect(gain);
        gain.connect(master);
        osc.start(now);
        osc.stop(now + duration + 0.03);
    };

    const start = () => {
        if (started || !ctx || !musicGain) return;
        started = true;
        const progression = [
            [73.42, 110, 146.83],
            [65.41, 98, 130.81],
            [61.74, 92.5, 123.47],
            [55, 82.41, 110]
        ];
        let step = 0;
        const bar = () => {
            if (!ctx || !musicGain) return;
            const now = ctx.currentTime;
            const chord = progression[step % progression.length];

            chord.forEach((freq, index) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = index === 0 ? "triangle" : "sine";
                osc.frequency.setValueAtTime(freq, now);
                gain.gain.setValueAtTime(0.0001, now);
                gain.gain.exponentialRampToValueAtTime(index === 0 ? 0.075 : 0.034, now + 0.8);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 6.2);
                osc.connect(gain);
                gain.connect(musicGain);
                osc.start(now);
                osc.stop(now + 6.4);
            });

            const notes = [293.66, 329.63, 392, 329.63, 246.94, 293.66];
            [0, 1, 2].forEach((n, index) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "sine";
                osc.frequency.setValueAtTime(notes[(step + n) % notes.length], now + 0.7 + index * 0.75);
                gain.gain.setValueAtTime(0.0001, now);
                gain.gain.exponentialRampToValueAtTime(0.028, now + 0.9 + index * 0.75);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.0 + index * 0.75);
                osc.connect(gain);
                gain.connect(musicGain);
                osc.start(now + 0.7 + index * 0.75);
                osc.stop(now + 2.1 + index * 0.75);
            });

            step++;
        };

        musicGain.gain.setValueAtTime(0.0001, ctx.currentTime);
        musicGain.gain.exponentialRampToValueAtTime(0.24, ctx.currentTime + 2.5);
        bar();
        timer = window.setInterval(bar, 5200);
    };

    const control = document.createElement("div");
    control.className = "character-selection-audio";
    control.innerHTML = `<button type="button" aria-label="Музыка">♫</button><span>МУЗЫКА</span>`;
    root.appendChild(control);

    const button = control.querySelector("button");
    on(root, "pointerdown", () => { try { ensure(); } catch (error) {} }, { once: true });
    on(button, "click", event => {
        event.stopPropagation();
        muted = !muted;
        try {
            ensure();
            master.gain.setTargetAtTime(muted ? 0 : volume * 0.22, ctx.currentTime, 0.06);
            button.textContent = muted ? "♩" : "♫";
        } catch (error) {}
    });

    window.lorgusCharacterAudioCleanup = () => {
        listeners.forEach(remove => remove());
        if (timer) clearInterval(timer);
        if (ctx) ctx.close().catch(() => {});
        window.lorgusCharacterAudioCleanup = null;
    };

    try { ensure(); } catch (error) {}
}

async function selectCharacter(container, characterId) {
    if (window.lorgusCharacterAudioCleanup) window.lorgusCharacterAudioCleanup();
    const result = await supabase.from("characters").select("*").eq("id", characterId).single();
    if (result.error || !result.data) {
        showCharacterError(container, result.error ? result.error.message : "Персонаж не найден.");
        return;
    }

    const character = result.data;
    const status = String(character.status || "ACTIVE").toUpperCase();
    window.activeTitle = await loadCharacterTitle(character.id);
    if (status !== "ACTIVE") {
        showCharacterError(container, "Этот персонаж сейчас недоступен для игры.");
        return;
    }

    window.activeCharacterId = character.id;
    window.activeCharacter = character;
    sessionStorage.setItem("lorgus_active_character_id", character.id);
    localStorage.setItem("lorgus_active_character_id", character.id);
    await initializeRpPresence(character);
    renderCharacter(container, character);
}

/* =========================================================
   ФОРМА СОЗДАНИЯ ПЕРСОНАЖА
   ========================================================= */

function initializeLorgusCharacterCreationAudio() {
    if (window.lorgusCharacterCreationAudioCleanup) window.lorgusCharacterCreationAudioCleanup();
    const root = document.querySelector(".character-application");
    if (!root) return;
    let ctx=null, master=null, musicGain=null, timer=null, started=false, muted=false, volume=.48;
    const listeners=[];
    const on=(t,e,h,o)=>{t.addEventListener(e,h,o);listeners.push(()=>t.removeEventListener(e,h,o));};
    const ensure=()=>{
        if(!ctx){ctx=new(window.AudioContext||window.webkitAudioContext)();master=ctx.createGain();master.gain.value=volume*.22;master.connect(ctx.destination);musicGain=ctx.createGain();musicGain.gain.value=.0001;musicGain.connect(master);}
        if(ctx.state==="suspended")ctx.resume(); if(!started)start();
    };
    const start=()=>{
        if(started||!ctx||!musicGain)return; started=true;
        const progression=[[55,82.41,110],[49,73.42,98],[46.25,69.3,92.5],[51.91,77.78,103.83]];
        let step=0;
        const bar=()=>{
            if(!ctx||!musicGain)return; const now=ctx.currentTime,ch=progression[step++%progression.length];
            ch.forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type=i?"sine":"triangle";o.frequency.value=f;g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(i?.035:.07,now+.9);g.gain.exponentialRampToValueAtTime(.0001,now+6.5);o.connect(g);g.connect(musicGain);o.start(now);o.stop(now+6.7);});
            [220,261.63,293.66,246.94].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain(),t=now+1+i*1.05;o.type="sine";o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.022,t+.35);g.gain.exponentialRampToValueAtTime(.0001,t+1.6);o.connect(g);g.connect(musicGain);o.start(t);o.stop(t+1.7);});
        };
        musicGain.gain.setValueAtTime(.0001,ctx.currentTime);musicGain.gain.exponentialRampToValueAtTime(.24,ctx.currentTime+2.8);bar();timer=setInterval(bar,5600);
    };
    const control=document.createElement("div");control.className="character-creation-audio";control.innerHTML='<button type="button" aria-label="Музыка">♫</button><span>МУЗЫКА</span>';root.appendChild(control);
    const btn=control.querySelector("button"); on(root,"pointerdown",()=>{try{ensure();}catch(e){}},{once:true});
    on(btn,"click",e=>{e.stopPropagation();try{ensure();muted=!muted;master.gain.setTargetAtTime(muted?0:volume*.22,ctx.currentTime,.06);btn.textContent=muted?"♩":"♫";}catch(e){}});
    window.lorgusCharacterCreationAudioCleanup=()=>{listeners.forEach(f=>f());if(timer)clearInterval(timer);if(ctx)ctx.close().catch(()=>{});window.lorgusCharacterCreationAudioCleanup=null;};
    try{ensure();}catch(e){}
}

function renderCharacterApplicationForm(container) {
    // Новый аккаунт без персонажей получает полностью самостоятельный экран.
    // Не переиспользуем старый #cabinet-content из game-page: после await
    // renderCabinet() продолжает выполняться, поэтому чистый root здесь надёжнее.
    const root = document.getElementById("root");
    if (!root) return;

    container = document.createElement("main");
    container.id = "cabinet-content";
    container.className = "character-application";
    container.style.display = "block";
    container.style.visibility = "visible";
    container.style.opacity = "1";
    container.style.pointerEvents = "auto";
    container.style.position = "relative";
    container.style.zIndex = "1";

    root.replaceChildren(container);
    container.innerHTML = `
        <div class="character-creation-scene" style="display:block;visibility:visible;opacity:1;">
            <div class="character-creation-atmosphere" aria-hidden="true">
                <div class="creation-void"></div>
                <div class="creation-rift"><i></i><b></b></div>
                <div class="creation-rift-core"></div>
                <div class="creation-horizon"></div>
                <div class="creation-stars"></div>
                <div class="creation-dust"></div>
                <div class="creation-arch arch-left"></div>
                <div class="creation-arch arch-right"></div>
            </div>
            <header class="character-creation-topbar">
                <div><strong>✦ ЛОРГУС</strong><span>СОЗДАНИЕ ПЕРСОНАЖА</span></div>
                <button type="button" class="lorgus-screen-logout" onclick="logout()">ВЫХОД</button>
            </header>

            <main class="character-creation-main">
                <section class="character-creation-intro">
                    <span>НОВАЯ ИСТОРИЯ</span>
                    <h1>Кто войдёт<br>в этот мир?</h1>
                    <p>Не создавай анкету. Создай человека, эльфа, дварфа — того, чья жизнь уже началась до первого шага.</p>
                    <div class="character-creation-line"><i></i><b>ТВОЙ ПУТЬ НАЧИНАЕТСЯ ЗДЕСЬ</b><i></i></div>
                </section>

                <form id="character-application-form" class="character-creation-form" onsubmit="submitCharacterApplication(event)">
                    <section class="character-creation-panel identity-panel">
                        <div class="creation-panel-heading"><span>01</span><div><small>ЛИЧНОСТЬ</small><h2>Кто ты?</h2></div></div>
                        <div class="creation-fields">
                            <label><span>Имя персонажа</span><input id="character-name" type="text" required placeholder="Имя"></label>
                            <label><span>Раса</span><input id="character-race" type="text" list="character-races" placeholder="Человек, эльф, дварф..." required></label>
                            <label><span>Возраст</span><input id="character-age" type="number" min="1" max="1000" required placeholder="Возраст"></label>
                            <label><span>Род занятий</span><input id="character-occupation" type="text" required placeholder="Чем ты занимаешься?"></label>
                        </div>
                        <datalist id="character-races">
                            <option value="Человек"></option><option value="Эльф"></option><option value="Лесной эльф"></option><option value="Дварф"></option>
                        </datalist>
                    </section>

                    <section class="character-creation-panel origin-panel">
                        <div class="creation-panel-heading"><span>02</span><div><small>ПРОИСХОЖДЕНИЕ</small><h2>Откуда ты?</h2></div></div>
                        <div class="creation-origin-picker">
                            <div class="creation-origin-kingdoms">
                                <button type="button" class="origin-kingdom active" data-kingdom="Атэрон"><b>АТЭРОН</b><small>ЗЕМЛИ ЗНАНИЙ</small></button>
                                <button type="button" class="origin-kingdom" data-kingdom="Каэлор"><b>КАЭЛОР</b><small>ВЕЧНОЕ ПЛАМЯ</small></button>
                                <button type="button" class="origin-kingdom" data-kingdom="Ксандр"><b>КСАНДР</b><small>ВОЗДАЯНИЕ</small></button>
                                <button type="button" class="origin-kingdom" data-kingdom="Лирэн"><b>ЛИРЭН</b><small>ПЛОДОРОДИЕ</small></button>
                                <button type="button" class="origin-kingdom" data-kingdom="Морвейн"><b>МОРВЕЙН</b><small>ПОСЛЕДНИЙ ПУТЬ</small></button>
                            </div>
                            <div class="creation-origin-location-wrap">
                                <div class="creation-origin-location-head"><span id="origin-kingdom-label">АТЭРОН</span><small>ВЫБЕРИ МЕСТО РОЖДЕНИЯ</small></div>
                                <div id="creation-origin-locations" class="creation-origin-locations"></div>
                            </div>
                            <label class="creation-wide-field"><span>Родина</span><input id="character-homeland" type="text" list="character-homelands" placeholder="Выбери место выше" required readonly></label>
                        </div>
                        <datalist id="character-homelands">
                            <option value="Примум"></option><option value="Хелион"></option><option value="Арджент"></option><option value="Аврора"></option><option value="Фин"></option><option value="Святые Земли"></option><option value="Спорные Земли"></option>
                        </datalist>
                    </section>

                    <section class="character-creation-panel story-panel">
                        <div class="creation-panel-heading"><span>03</span><div><small>ИСТОРИЯ</small><h2>Что сделало тебя тобой?</h2></div></div>
                        <label class="creation-wide-field"><span>Характер</span><textarea id="character-personality" required placeholder="Как ты думаешь, говоришь и поступаешь?"></textarea></label>
                        <label class="creation-wide-field"><span>Предыстория</span><textarea id="character-backstory" required placeholder="Что произошло до того, как твоя история началась?"></textarea></label>
                        <div class="creation-fields">
                            <label><span>Особые навыки</span><textarea id="character-skills" required placeholder="Что ты умеешь?"></textarea></label>
                            <label><span>Предпочитаемое оружие <em>необязательно</em></span><input id="character-weapon" type="text" placeholder="Если есть"></label>
                        </div>
                    </section>

                    <section class="character-creation-panel portrait-panel">
                        <div class="creation-panel-heading"><span>04</span><div><small>ОБРАЗ</small><h2>Как тебя запомнят?</h2></div></div>
                        <div class="portrait-crop-editor">
                            <div class="portrait-crop-stage" id="portrait-crop-stage">
                                <canvas id="portrait-crop-canvas" width="520" height="520"></canvas>
                                <div class="portrait-crop-ring"></div>
                                <div class="portrait-crop-empty" id="portrait-crop-empty">ЗАГРУЗИ<br>ОБРАЗ</div>
                            </div>
                            <div class="portrait-crop-controls">
                                <label class="creation-upload">
                                    <span>Выбери изображение</span>
                                    <input id="character-photo" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp">
                                    <small>JPG, PNG или WEBP · до 5 МБ</small>
                                </label>
                                <label class="portrait-zoom">
                                    <span>МАСШТАБ</span>
                                    <input id="portrait-zoom" type="range" min="1" max="3" step="0.01" value="1">
                                </label>
                                <small class="portrait-crop-hint">Перетащи изображение внутри круга. Масштабируй так, чтобы персонаж оказался ровно в рамке. Этот круг станет портретом персонажа в игре.</small>
                            </div>
                        </div>
                    </section>

                    <div id="character-message" class="character-message"></div>
                    <button type="submit" class="character-creation-submit"><span>ОТПРАВИТЬ ЗАЯВКУ</span><b>→</b></button>
                </form>
            </main>
        </div>
    `;

    initializeCharacterPortraitCrop();

    // Локальный черновик анкеты. Он переживает повторный рендер кабинета,
    // переключение вкладок и возврат к странице. Файл изображения намеренно
    // не сохраняем: браузер не позволяет безопасно восстановить input[type=file].
    const draftKey = `lorgus_character_application_draft_${window.lorgusCurrentUserId || "guest"}`;
    const characterForm = container.querySelector("#character-application-form");

    if (characterForm) {
        const saveDraft = () => {
            try {
                const draft = {};
                characterForm.querySelectorAll("input, textarea, select").forEach(field => {
                    if (!field.id || field.type === "file") return;
                    draft[field.id] = field.value;
                });
                localStorage.setItem(draftKey, JSON.stringify(draft));
            } catch (error) {
                console.warn("Не удалось сохранить черновик анкеты:", error);
            }
        };

        const restoreDraft = () => {
            try {
                const raw = localStorage.getItem(draftKey);
                if (!raw) return;
                const draft = JSON.parse(raw);
                characterForm.querySelectorAll("input, textarea, select").forEach(field => {
                    if (!field.id || field.type === "file") return;
                    if (Object.prototype.hasOwnProperty.call(draft, field.id)) {
                        field.value = draft[field.id] ?? "";
                    }
                });
            } catch (error) {
                console.warn("Не удалось восстановить черновик анкеты:", error);
            }
        };

        characterForm.addEventListener("input", saveDraft);
        characterForm.addEventListener("change", saveDraft);
        window.addEventListener("pagehide", saveDraft, { once: true });
        window.addEventListener("beforeunload", saveDraft, { once: true });
        restoreDraft();

        window.clearLorgusCharacterDraft = () => {
            localStorage.removeItem(draftKey);
        };
    }

    const originData = {
        "Атэрон": {
            races: "Преимущественно эльфы",
            faith: "Церковь Нечто",
            character: "Учёность, исследования, археология и поиск истины",
            land: "Горы, глубокие долины, реки и древние руины",
            life: "Здесь собирают древние тексты, исследуют руины и хранят реликвии.",
            choose: "Подойдёт персонажу, связанному со знаниями, магией, исследованиями, учёбой или древними тайнами.",
            locations: [["Примум","СТОЛИЦА · ЦЕНТР ЗНАНИЙ","Первый город мира по местной легенде. Центр учёности, археологии и древних знаний."]]
        },
        "Каэлор": {
            races: "Преимущественно дварфы",
            faith: "Церковь Вечного Пламени",
            character: "Труд, мастерство, дисциплина и создание вещей на века",
            land: "Горы, ущелья, шахты, подземные районы и вулканические области",
            life: "Королевство шахт, кузниц и ремесленных домов. Металл здесь — основа государства.",
            choose: "Подойдёт персонажу из кузнечного, воинского, инженерного, горного или ремесленного мира.",
            locations: [
                ["Хелион","СТОЛИЦА · ГОРОД ДВАРФОВ","Построен вокруг древнего вулканического района. Здесь находятся дворец Дома Фалькрейн, крупнейшие кузнечные дома и главные учреждения Каэлора."],
                ["Древнее Пламя","СВЯЩЕННОЕ МЕСТО","Одна из главных святынь Каэлора, расположенная рядом с Хелионом. Это не город, а место религиозного значения."]
            ]
        },
        "Ксандр": {
            races: "Преимущественно люди",
            faith: "Церковь Воздаяния",
            character: "Торговля, деньги, договоры, репутация и влияние",
            land: "Равнины, речные долины, холмы, дороги и южное побережье",
            life: "Крупнейший торговый и финансовый центр материка. Здесь живут торговцы, банкиры, дворяне, наёмники и путешественники.",
            choose: "Подойдёт персонажу, который вырос среди торговли, наёмников, ремесла, финансов, путешествий или городской политики.",
            locations: [
                ["Арджент","СТОЛИЦА · ФИНАНСОВЫЙ ЦЕНТР","Через город проходят торговцы, банкиры, представители дворянских домов, купцы, наёмники и путешественники."],
                ["Меридиан","ГОРОД КСАНДРА","Один из известных городов королевства."],
                ["Валькрофт","ГОРОД НА ТОРГОВЫХ ПУТЯХ","Город, связанный с сухопутными торговыми маршрутами."],
                ["Солмир","ТОРГОВЫЙ ГОРОД","Город торгового королевства."]
            ]
        },
        "Лирэн": {
            races: "Преимущественно лесные эльфы",
            faith: "Церковь Плодородия",
            character: "Природа, урожай, леса, магия и древние эльфийские традиции",
            land: "Огромные леса, плодородные равнины, реки и древние природные массивы",
            life: "Главный источник продовольствия материка. Здесь живут земледельцы, лесничие, ремесленники и древние эльфийские роды.",
            choose: "Подойдёт персонажу, связанному с природой, магией, охотой, земледелием, лесом или эльфийской культурой.",
            locations: [
                ["Аврора","СТОЛИЦА · ГОРОД ВНУТРИ ДЕРЕВА","Город находится внутри огромного древнего дерева и существует вместе с лесом, а не просто стоит среди него."],
                ["Элвэйн","ГОРОД ЛИРЭНА","Один из городов лесного королевства."],
                ["Таллирион","ГОРОД ЛИРЭНА","Город среди лесов и плодородных земель."],
                ["Эстерваль","ГОРОД ЗАПАДНОГО ЛИРЭНА","Город западной части королевства."]
            ]
        },
        "Морвейн": {
            races: "Люди",
            faith: "Церковь Последнего Пути",
            character: "Память, история, паломничество и уважение к умершим",
            land: "Холодные равнины, холмы, леса, туманные долины и северные побережья",
            life: "Страна храмов, некрополей и священных дорог. Основной поток богатства приносит паломничество.",
            choose: "Подойдёт персонажу из холодного края, связанного с храмами, историей, летописями, дорогами или паломниками.",
            locations: [["Фин","СТОЛИЦА · ПОЛИТИЧЕСКИЙ И РЕЛИГИОЗНЫЙ ЦЕНТР","Холодная столица с дворцом, храмами, архивами и главными паломническими учреждениями."]]
        },
        "Святые Земли": {
            races: "Разные народы пяти королевств",
            faith: "Место встреч пяти церквей",
            character: "Дипломатия, переговоры и жизнь вне прямой власти королей",
            land: "Нейтральная территория между королевствами",
            life: "Здесь проходят переговоры между пятью королевствами и пятью церквями. Земли не принадлежат одному государству.",
            choose: "Выбирай, если персонаж родился или вырос в нейтральной среде, среди дипломатов, паломников, торговцев или представителей разных стран.",
            locations: [["Святые Земли","НЕЙТРАЛЬНАЯ ТЕРРИТОРИЯ","Дипломатический центр Лоргуса. Не принадлежат ни одному из пяти государств."]]
        },
        "Спорные Земли": {
            races: "Разные народы",
            faith: "Нет единой власти пяти церквей",
            character: "Независимость, местные общины и жизнь вне королевских законов",
            land: "Территории вне контроля пяти королевств",
            life: "Множество местных поселений и владений живут по собственным правилам и не признают власть пяти королей.",
            choose: "Подойдёт персонажу, который вырос вдали от государственной системы: в поселении, общине, владении или среди вольных людей.",
            locations: [["Спорные Земли","НЕЗАВИСИМЫЕ ТЕРРИТОРИИ","Пространство вне власти пяти королевств. Здесь нет единого государства и одной столицы."]]
        }
    };

    const renderOrigins = kingdom => {
        const list = container.querySelector("#creation-origin-locations");
        const label = container.querySelector("#origin-kingdom-label");
        if (!list || !label) return;
        const data = originData[kingdom];
        if (!data) return;
        label.textContent = kingdom.toUpperCase();
        const picker = container.querySelector(".creation-origin-picker");
        let context = picker.querySelector(".origin-context");
        if (!context) {
            context = document.createElement("div");
            context.className = "origin-context";
            picker.insertBefore(context, picker.querySelector(".creation-origin-location-wrap"));
        }
        context.innerHTML = `
            <div class="origin-context-main">
                <div class="origin-context-title"><small>ЧТО ЭТО ЗА МЕСТО?</small><h3>${kingdom}</h3><p>${data.choose}</p></div>
                <div class="origin-context-facts">
                    <div><small>НАРОДЫ</small><b>${data.races}</b></div>
                    <div><small>ВЕРА</small><b>${data.faith}</b></div>
                    <div><small>СРЕДА</small><b>${data.land}</b></div>
                </div>
            </div>
            <div class="origin-context-life"><small>КАК ТАМ ЖИВУТ</small><span>${data.life}</span></div>
        `;
        list.innerHTML = data.locations.map(([name, type, description], index) => `
            <button type="button" class="origin-location" data-location="${name}">
                <i>${String(index + 1).padStart(2, "0")}</i>
                <span><b>${name}</b><small>${type}</small><em>${description}</em></span>
                <strong>→</strong>
            </button>
        `).join("");
        list.querySelectorAll(".origin-location").forEach(button => {
            button.addEventListener("click", () => {
                const homeland = container.querySelector("#character-homeland");
                if (!homeland) return;
                list.querySelectorAll(".origin-location").forEach(item => item.classList.remove("active"));
                button.classList.add("active");
                homeland.value = button.dataset.location || "";
            });
        });
    };

    container.querySelectorAll(".origin-kingdom").forEach(button => {
        button.addEventListener("click", () => {
            container.querySelectorAll(".origin-kingdom").forEach(item => item.classList.remove("active"));
            button.classList.add("active");
            renderOrigins(button.dataset.kingdom);
        });
    });

    renderOrigins("Атэрон");
}

function initializeCharacterPortraitCrop() {
    const input = document.getElementById("character-photo");
    const canvas = document.getElementById("portrait-crop-canvas");
    const stage = document.getElementById("portrait-crop-stage");
    const empty = document.getElementById("portrait-crop-empty");
    const zoomInput = document.getElementById("portrait-zoom");
    if (!input || !canvas || !stage || !zoomInput) return;

    window.characterPortraitBlob = null;
    const ctx = canvas.getContext("2d");
    const state = { image: null, zoom: 1, x: 0, y: 0, dragging: false, sx: 0, sy: 0, ox: 0, oy: 0 };

    const draw = () => {
        const size = canvas.width;
        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = "#050403";
        ctx.fillRect(0, 0, size, size);
        if (!state.image) return;

        const image = state.image;
        const base = Math.max(size / image.naturalWidth, size / image.naturalHeight);
        const scale = base * state.zoom;
        const w = image.naturalWidth * scale;
        const h = image.naturalHeight * scale;
        const x = (size - w) / 2 + state.x;
        const y = (size - h) / 2 + state.y;

        ctx.save();
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 7, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(image, x, y, w, h);
        ctx.restore();

        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 7, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(222,190,116,.72)";
        ctx.lineWidth = 3;
        ctx.stroke();
    };

    const clamp = () => {
        if (!state.image) return;
        const size = canvas.width;
        const base = Math.max(size / state.image.naturalWidth, size / state.image.naturalHeight);
        const scale = base * state.zoom;
        const w = state.image.naturalWidth * scale;
        const h = state.image.naturalHeight * scale;
        const maxX = Math.max(0, (w - size) / 2 + 80);
        const maxY = Math.max(0, (h - size) / 2 + 80);
        state.x = Math.max(-maxX, Math.min(maxX, state.x));
        state.y = Math.max(-maxY, Math.min(maxY, state.y));
    };

    const exportCrop = () => new Promise(resolve => {
        const output = document.createElement("canvas");
        output.width = 800;
        output.height = 800;
        const octx = output.getContext("2d");

        if (!octx) {
            resolve(null);
            return;
        }

        octx.save();
        octx.beginPath();
        octx.arc(400, 400, 392, 0, Math.PI * 2);
        octx.clip();
        octx.fillStyle = "#050403";
        octx.fillRect(0, 0, 800, 800);
        octx.drawImage(canvas, 0, 0, 800, 800);
        octx.restore();

        let settled = false;
        const finish = blob => {
            if (settled) return;
            settled = true;
            resolve(blob ? new File([blob], "portrait.jpg", { type: "image/jpeg" }) : null);
        };

        try {
            output.toBlob(finish, "image/jpeg", 0.92);
            window.setTimeout(() => finish(null), 4000);
        } catch (error) {
            console.error("Не удалось подготовить портрет:", error);
            finish(null);
        }
    });

    const loadFile = file => {
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            setCharacterMessage("Изображение не должно превышать 5 МБ.", "error");
            input.value = "";
            return;
        }
        const url = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
            URL.revokeObjectURL(url);
            state.image = image;
            state.zoom = 1;
            state.x = 0;
            state.y = 0;
            zoomInput.value = "1";
            if (empty) empty.style.display = "none";
            stage.classList.add("has-image");
            draw();
        };
        image.onerror = () => {
            URL.revokeObjectURL(url);
            setCharacterMessage("Не удалось открыть изображение.", "error");
        };
        image.src = url;
    };

    input.addEventListener("change", () => loadFile(input.files?.[0]));
    zoomInput.addEventListener("input", () => {
        state.zoom = Number(zoomInput.value);
        clamp();
        draw();
    });

    stage.addEventListener("pointerdown", event => {
        if (!state.image) return;
        state.dragging = true;
        stage.setPointerCapture(event.pointerId);
        state.sx = event.clientX;
        state.sy = event.clientY;
        state.ox = state.x;
        state.oy = state.y;
    });
    stage.addEventListener("pointermove", event => {
        if (!state.dragging) return;
        const rect = stage.getBoundingClientRect();
        const factor = canvas.width / rect.width;
        state.x = state.ox + (event.clientX - state.sx) * factor;
        state.y = state.oy + (event.clientY - state.sy) * factor;
        clamp();
        draw();
    });
    const stop = () => { state.dragging = false; };
    stage.addEventListener("pointerup", stop);
    stage.addEventListener("pointercancel", stop);
    stage.addEventListener("pointerleave", stop);

    window.characterPortraitPrepare = async () => {
        if (!state.image) return null;
        draw();
        return await exportCrop();
    };
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
        document.querySelector(".character-creation-submit");

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Отправка...";
    }

    setCharacterMessage(
        "Готовим анкету...",
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
        setCharacterMessage(
            "Подготавливаем портрет...",
            "info"
        );

        const originalPhoto = photoInput.files[0];
        const croppedPhoto = window.characterPortraitPrepare
            ? await window.characterPortraitPrepare()
            : null;
        const photo = croppedPhoto || originalPhoto;

        if (!photo || !photo.size) {
            setCharacterMessage(
                "Не удалось подготовить портрет. Выбери изображение ещё раз.",
                "error"
            );

            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = "Отправить заявку";
            }

            return;
        }

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
            getFileExtension(photo.name || "portrait.jpg");

        photoPath =
            `${user.id}/${applicationId}/photo.${extension}`;

        setCharacterMessage(
            "Загружаем портрет...",
            "info"
        );

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

    setCharacterMessage(
        "Отправляем анкету администрации...",
        "info"
    );

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

    if (typeof window.clearLorgusCharacterDraft === "function") {
        window.clearLorgusCharacterDraft();
    }

    const pendingApplication = {
        id: applicationId,
        player_id: user.id,
        name,
        race,
        age,
        homeland,
        personality,
        backstory,
        special_skills: specialSkills,
        preferred_weapon: preferredWeapon || null,
        occupation,
        photo_path: photoPath,
        status: "pending",
        character_id: null,
        review_notes: null
    };

    // Не заставляем игрока ждать повторной загрузки всего кабинета.
    // Показываем уже созданную заявку сразу, а актуальное состояние
    // подтягиваем в фоне.
    renderPendingApplication(
        document.getElementById("cabinet-content"),
        pendingApplication
    );

    void loadPlayerState({
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

async function renderAdminApplications(container, applications) {
    container.className = "admin-panel";

    window.adminApplications = applications;

    for (const application of applications) {
        if (!application.photo_path) {
            application.photo_url = null;
            continue;
        }

        const { data, error } = await supabase.storage
            .from("character-applications")
            .createSignedUrl(application.photo_path, 60 * 60);

        application.photo_url = error ? null : (data?.signedUrl || null);
    }

    const pending = applications.filter(a => a.status === "pending");
    const approved = applications.filter(a => a.status === "approved");
    const rejected = applications.filter(a => a.status === "rejected");

    container.innerHTML = `
        <div class="admin-dashboard-head">
            <div>
                <div class="admin-kicker">✦ ЛОРГУС · ПАНЕЛЬ УПРАВЛЕНИЯ</div>
                <h1>Администрация</h1>
                <p>Заявки, персонажи и модерация мира.</p>
            </div>
            <div class="admin-head-actions">
                <button type="button" class="admin-tool-button" id="admin-refresh-button">↻ Обновить</button>
                <button type="button" class="logout-button admin-logout-button" onclick="logout()">Выйти</button>
            </div>
        </div>

        <div class="admin-stats">
            <button class="admin-stat admin-filter-stat active" data-admin-filter="pending">
                <span class="admin-stat-value">${pending.length}</span><span class="admin-stat-label">На рассмотрении</span>
            </button>
            <button class="admin-stat admin-filter-stat" data-admin-filter="approved">
                <span class="admin-stat-value">${approved.length}</span><span class="admin-stat-label">Одобрено</span>
            </button>
            <button class="admin-stat admin-filter-stat" data-admin-filter="rejected">
                <span class="admin-stat-value">${rejected.length}</span><span class="admin-stat-label">Отклонено</span>
            </button>
            <button class="admin-stat admin-filter-stat" data-admin-filter="all">
                <span class="admin-stat-value">${applications.length}</span><span class="admin-stat-label">Все заявки</span>
            </button>
        </div>

        <div class="admin-toolbar">
            <input id="admin-search" type="search" placeholder="Поиск по имени, расе, родине или занятию...">
            <select id="admin-status-filter">
                <option value="pending">На рассмотрении</option>
                <option value="approved">Одобрено</option>
                <option value="rejected">Отклонено</option>
                <option value="all">Все статусы</option>
            </select>
        </div>

        <section class="admin-section">
            <div class="admin-section-heading">
                <div><h2>Заявки персонажей</h2><p id="admin-results-count"></p></div>
            </div>
            <div id="admin-application-list" class="admin-applications"></div>
        </section>

        <section class="admin-section admin-character-management">
            <div class="admin-section-heading">
                <div><h2>Персонажи мира</h2><p>Активные персонажи, созданные после одобрения заявок.</p></div>
            </div>
            <div class="admin-applications">
                ${approved.length ? approved.map(renderAdminCharacterManagement).join("") : '<div class="admin-empty"><h2>Персонажей нет</h2><p>Список пуст.</p></div>'}
            </div>
        </section>
        <section class="admin-section admin-item-use-management">
            <div class="admin-section-heading">
                <div><h2>Использование предметов</h2><p>Журнал предметов, использованных в RP-постах. Здесь можно отменить некорректное использование вместе с постом.</p></div>
            </div>
            <div id="admin-item-use-log" class="admin-item-use-log"><div class="admin-empty"><h2>Загрузка журнала...</h2></div></div>
        </section>
    `;

    const list = container.querySelector("#admin-application-list");
    const search = container.querySelector("#admin-search");
    const status = container.querySelector("#admin-status-filter");
    const count = container.querySelector("#admin-results-count");

    const renderList = () => {
        const query = search.value.trim().toLowerCase();
        const filter = status.value;
        const filtered = applications.filter(a => {
            const haystack = [
                a.name, a.race, a.homeland, a.occupation,
                a.personality, a.backstory, a.special_skills
            ].filter(Boolean).join(" ").toLowerCase();
            return (filter === "all" || a.status === filter) && (!query || haystack.includes(query));
        });

        count.textContent = `Показано: ${filtered.length} из ${applications.length}`;
        list.innerHTML = filtered.length
            ? filtered.map(renderAdminApplication).join("")
            : '<div class="admin-empty"><h2>Ничего не найдено</h2><p>Измени поиск или фильтр.</p></div>';

        bindAdminButtons(container);
    };

    container.querySelectorAll(".admin-filter-stat").forEach(button => {
        button.addEventListener("click", () => {
            container.querySelectorAll(".admin-filter-stat").forEach(b => b.classList.remove("active"));
            button.classList.add("active");
            status.value = button.dataset.adminFilter;
            renderList();
        });
    });

    search.addEventListener("input", renderList);
    status.addEventListener("change", () => {
        container.querySelectorAll(".admin-filter-stat").forEach(b =>
            b.classList.toggle("active", b.dataset.adminFilter === status.value)
        );
        renderList();
    });

    container.querySelector("#admin-refresh-button").addEventListener("click", async event => {
        const button = event.currentTarget;
        button.disabled = true;
        button.textContent = "↻ Обновление...";
        await loadAdminPanel(container);
    });

    renderList();
    loadAdminItemUseLog(container);
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
function renderAdminCharacterManagement(application) {
    const fields = [
        ["Раса", application.race],
        ["Возраст", application.age ? `${application.age} лет` : null],
        ["Родина", application.homeland],
        ["Род занятий", application.occupation],
        ["Оружие", application.preferred_weapon],
        ["Характер", application.personality],
        ["Предыстория", application.backstory],
        ["Особые навыки", application.special_skills]
    ].filter(([, value]) => value);

    return `
        <article class="admin-hero-character" data-character-id="${application.character_id || ""}">
            <div class="admin-hero-character-portrait">
                ${application.photo_url
                    ? `<img src="${escapeHtml(application.photo_url)}" alt="">`
                    : '<div class="admin-character-sigil">✦</div>'}
            </div>
            <div class="admin-hero-character-body">
                <div class="admin-character-heading">
                    <div>
                        <span class="admin-character-rank">ЖИТЕЛЬ ЛОРГУСА · ЗАПИСЬ В ЛЕТОПИСИ #${escapeHtml(String(application.id))}</span>
                        <h3>${escapeHtml(application.name || "Без имени")}</h3>
                        <p>${escapeHtml(application.race || "Раса не указана")} · ${escapeHtml(application.homeland || "Родина не указана")}</p>
                    </div>
                    <span class="admin-character-status">ОДОБРЕН</span>
                </div>
                <div class="admin-character-facts">
                    ${fields.slice(0,5).map(([label,value]) => `<div><small>${label}</small><strong>${escapeHtml(String(value))}</strong></div>`).join("")}
                </div>
                <div class="admin-character-lore">
                    <div><small>ХАРАКТЕР</small><p>${escapeHtml(application.personality || "—")}</p></div>
                    <div><small>ПРЕДЫСТОРИЯ</small><p>${escapeHtml(application.backstory || "—")}</p></div>
                    <div><small>ОСОБЫЕ НАВЫКИ</small><p>${escapeHtml(application.special_skills || "—")}</p></div>
                </div>
                <div class="admin-character-actions">
                    <button class="admin-character-details-button" type="button" data-character-detail-id="${application.id}">Открыть полную запись</button>
                    <button class="admin-character-details-button admin-character-titles-button" type="button" data-character-title-id="${application.id}">Титулы</button>
                    <button class="admin-character-details-button admin-character-abilities-button" type="button" data-character-ability-id="${application.id}">Способности</button><button class="admin-character-details-button admin-character-inventory-button" type="button" data-character-inventory-id="${application.id}">Инвентарь</button>
                    <button class="admin-reject-button admin-delete-character-button" data-character-id="${application.character_id || ""}" data-character-name="${escapeHtml(application.name || "персонажа")}">Удалить персонажа</button>
                </div>
            </div>
        </article>
    `;
}

async function openAdminCharacterRecord(application, container) {
    const existing = container.querySelector(".admin-character-record-overlay");
    if (existing) existing.remove();
    const esc = value => escapeHtml(value ?? "—");
    const date = value => value ? new Date(value).toLocaleString("ru-RU", { dateStyle:"medium", timeStyle:"short" }) : "—";

    const overlay = document.createElement("div");
    overlay.className = "admin-character-record-overlay";
    overlay.innerHTML = `
        <div class="admin-character-record-backdrop"></div>
        <article class="admin-character-record">
            <button class="admin-character-record-close" type="button">×</button>
            <div class="admin-character-record-top">
                <div class="admin-character-record-portrait">${application.photo_url ? `<img src="${esc(application.photo_url)}" alt="">` : "<span>✦</span>"}</div>
                <div>
                    <span class="admin-character-record-kicker">ЛЕТОПИСЬ ЛОРГУСА · ПОЛНАЯ ЗАПИСЬ #${esc(application.id)}</span>
                    <h2>${esc(application.name)}</h2>
                    <p>${esc(application.race)} · ${esc(application.homeland)}</p>
                    <span class="admin-character-record-status">ОДОБРЕН · ЖИТЕЛЬ МИРА</span>
                </div>
            </div>
            <div class="admin-character-record-facts">
                <div><small>ВОЗРАСТ</small><strong>${esc(application.age ? application.age + " лет" : null)}</strong></div>
                <div><small>РОД ЗАНЯТИЙ</small><strong>${esc(application.occupation)}</strong></div>
                <div><small>ОРУЖИЕ</small><strong>${esc(application.preferred_weapon)}</strong></div>
                <div><small>CHARACTER ID</small><strong>${esc(application.character_id)}</strong></div>
            </div>
            <div class="admin-character-record-story">
                <section><small>ХАРАКТЕР</small><p>${esc(application.personality)}</p></section>
                <section><small>ПРЕДЫСТОРИЯ</small><p>${esc(application.backstory)}</p></section>
                <section><small>ОСОБЫЕ НАВЫКИ</small><p>${esc(application.special_skills)}</p></section>
            </div>
            <div class="admin-character-record-footer">
                <span>СОЗДАНА: <b>${date(application.created_at)}</b></span>
                <span>ОБНОВЛЕНА: <b>${date(application.updated_at)}</b></span>
                <span>ОДОБРЕНА: <b>${date(application.approved_at)}</b></span>
            </div>
            ${application.review_notes ? `<div class="admin-character-record-notes"><small>ЗАПИСКА ХРАНИТЕЛЯ</small><p>${esc(application.review_notes)}</p></div>` : ""}
            <div class="admin-character-record-controls">
                <button class="admin-character-edit-button" type="button">✦ Внести изменения в персонажа</button>
            </div>
            <div class="admin-character-history"><small>ЛЕТОПИСЬ ИЗМЕНЕНИЙ</small><div class="admin-character-history-list">Загрузка истории...</div></div>
        </article>`;
    container.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("open"));

    const close = () => { overlay.classList.remove("open"); setTimeout(() => overlay.remove(), 180); };
    overlay.querySelector(".admin-character-record-close").addEventListener("click", close);
    overlay.querySelector(".admin-character-record-backdrop").addEventListener("click", close);

    const historyBox = overlay.querySelector(".admin-character-history-list");
    const { data: history } = await supabase.from("character_application_history")
        .select("action,created_at,admin_id,before_data,after_data")
        .eq("application_id", application.id)
        .order("created_at", { ascending:false });
    if (historyBox) {
        historyBox.innerHTML = (history || []).map(item => `
            <div class="admin-history-entry">
                <strong>${esc(({created:"Создана",updated:"Изменена",approved:"Одобрена",rejected:"Отклонена",revision_requested:"Запрошены правки"})[item.action] || item.action)}</strong>
                <span>${date(item.created_at)}</span>
            </div>`).join("") || "История пока пуста.";
    }

    overlay.querySelector(".admin-character-edit-button").addEventListener("click", () => {
        const body = overlay.querySelector(".admin-character-record");
        const form = document.createElement("form");
        form.className = "admin-character-edit-form";
        form.innerHTML = `
            <div class="admin-edit-grid">
                <label>Имя<input name="name" value="${esc(application.name)}"></label>
                <label>Возраст<input name="age" type="number" value="${esc(application.age)}"></label>
                <label>Раса<input name="race" value="${esc(application.race)}"></label>
                <label>Родина<input name="homeland" value="${esc(application.homeland)}"></label>
                <label>Занятие<input name="occupation" value="${esc(application.occupation)}"></label>
                <label>Оружие<input name="preferred_weapon" value="${esc(application.preferred_weapon)}"></label>
            </div>
            <label>Характер<textarea name="personality">${esc(application.personality)}</textarea></label>
            <label>Предыстория<textarea name="backstory">${esc(application.backstory)}</textarea></label>
            <label>Особые навыки<textarea name="special_skills">${esc(application.special_skills)}</textarea></label>
            <div class="admin-character-edit-actions">
                <button type="submit">Сохранить изменения</button>
                <button type="button" class="cancel">Отмена</button>
            </div>`;
        body.querySelector(".admin-character-edit-form")?.remove();
        body.appendChild(form);
        form.scrollIntoView({ behavior:"smooth", block:"end" });
        form.querySelector(".cancel").addEventListener("click", () => form.remove());
        form.addEventListener("submit", async event => {
            event.preventDefault();
            const patch = Object.fromEntries(new FormData(form).entries());
            patch.age = Number(patch.age);
            const save = form.querySelector("button[type=submit]");
            save.disabled = true; save.textContent = "Сохранение...";
            const { data, error } = await supabase.rpc("admin_update_character_application", {
                p_application_id: application.id,
                p_patch: patch
            });
            if (error) {
                alert("Не удалось сохранить изменения:\\n\\n" + error.message);
                save.disabled = false; save.textContent = "Сохранить изменения";
                return;
            }
            Object.assign(application, data);
            form.remove();
            overlay.remove();
            openAdminCharacterRecord(application, container);
        });
    });
}

function bindAdminButtons(container) {
    container.querySelectorAll(".admin-character-details-button").forEach(button => {
        if (button.dataset.bound) return;
        button.dataset.bound = "1";
        button.addEventListener("click", event => {
            event.stopPropagation();
            const application = (window.adminApplications || []).find(a => String(a.id) === String(button.dataset.characterDetailId));
            if (application) openAdminCharacterRecord(application, container);
        });
    });

    container.querySelectorAll(".admin-character-titles-button").forEach(button => {
        button.addEventListener("click", event => {
            event.stopPropagation();
            const application = (window.adminApplications || []).find(a => String(a.id) === String(button.dataset.characterTitleId));
            if (application) openAdminCharacterTitles(application, container);
        });
    });

    container.querySelectorAll(".admin-character-abilities-button").forEach(button => {
        button.addEventListener("click", event => {
            event.stopPropagation();
            const application = (window.adminApplications || []).find(a => String(a.id) === String(button.dataset.characterAbilityId));
            if (application) openAdminCharacterAbilities(application, container);
        });
    });
    container.querySelectorAll(".admin-character-inventory-button").forEach(button => {
        button.addEventListener("click", event => {
            event.stopPropagation();
            const application = (window.adminApplications || []).find(a => String(a.id) === String(button.dataset.characterInventoryId));
            if (application) openAdminCharacterInventory(application, container);
        });
    });

    container.querySelectorAll(".admin-delete-character-button").forEach(button => {
        button.addEventListener("click", async () => {
            const characterId = button.dataset.characterId;
            const characterName = button.dataset.characterName || "этого персонажа";

            if (!characterId) {
                alert("У персонажа отсутствует ID.");
                return;
            }

            if (!confirm(`Удалить персонажа «${characterName}»?\\n\\nБудут удалены его RP-присутствие, RP-сообщения и заявка. Отменить действие нельзя.`)) {
                return;
            }

            button.disabled = true;
            button.textContent = "Удаление...";

            const { error } = await supabase.rpc("admin_delete_character", {
                p_character_id: characterId
            });

            if (error) {
                console.error(error);
                alert("Не удалось удалить персонажа:\\n\\n" + error.message);
                button.disabled = false;
                button.textContent = "Удалить персонажа";
                return;
            }

            await loadAdminPanel(container);
        });
    });

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

    return window.adminApplications?.find(        application =>
            application.id === id
    ) || null;
}

/* =========================================================   РЕДАКТИРОВАНИЕ ЗАЯВКИ
   ========================================================= */

function renderPendingApplication(container, application) {
    container.className = "character-application";
    const reviewNotes = application.review_notes
        ? `<div class="character-review-notes"><h3>Правки от администрации</h3><p>${escapeHtml(application.review_notes)}</p></div>`
        : "";

    container.innerHTML = `
        <button type="button" class="lorgus-screen-logout" onclick="logout()">ВЫХОД</button>
        <div class="character-creation-shell character-edit-shell">
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
            </div>
        </div>
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
   ОТОБРАЖЕНИЕ ПЕРСОНАЖА — LEGACY
   ========================================================= */

function renderCharacterLegacy(
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
                <div class="lorgus-world-sidebar-symbol lorgus-world-symbol lorgus-world-symbol-character" aria-hidden="true"></div>
                <div class="lorgus-world-sidebar-label">ПЕРСОНАЖ</div>
                <div class="lorgus-world-sidebar-name">${name}</div>
                <div class="lorgus-world-sidebar-meta">${race}</div>
                <div class="lorgus-world-sidebar-meta">${homeland}</div>

                <button class="gold-button lorgus-world-sidebar-button" type="button" onclick="openActiveCharacterProfile()">
                    Профиль
                </button>
                <button class="character-secondary-button lorgus-world-sidebar-button" type="button" onclick="renderWorldCharacterTracker()">
                    Люди мира
                </button>
                <button class="character-secondary-button lorgus-world-sidebar-button" type="button" onclick="renderMail()">
                    Письма
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
                            <span class="lorgus-region-card-symbol lorgus-region-glyph lorgus-region-glyph-aetheron" aria-hidden="true"></span>
                            <strong>Атэрон</strong>
                            <small>Королевство Нечто</small>
                            <p>Знания, древности, исследования и руины.</p>
                        </button>

                        <button class="lorgus-region-card" type="button" onclick="renderKingdomLocations('Каэлор')">
                            <span class="lorgus-region-card-symbol lorgus-region-glyph lorgus-region-glyph-kaelor" aria-hidden="true"></span>
                            <strong>Каэлор</strong>
                            <small>Королевство Вечного Пламени</small>
                            <p>Горы, кузницы, шахты и древнее мастерство.</p>
                        </button>

                        <button class="lorgus-region-card" type="button" onclick="renderKingdomLocations('Ксандр')">
                            <span class="lorgus-region-card-symbol lorgus-region-glyph lorgus-region-glyph-xandr" aria-hidden="true"></span>
                            <strong>Ксандр</strong>
                            <small>Королевство Воздаяния</small>
                            <p>Торговля, банки, дороги и большие рынки.</p>
                        </button>

                        <button class="lorgus-region-card" type="button" onclick="renderKingdomLocations('Лирэн')">
                            <span class="lorgus-region-card-symbol lorgus-region-glyph lorgus-region-glyph-lyren" aria-hidden="true"></span>
                            <strong>Лирэн</strong>
                            <small>Королевство Плодородия</small>
                            <p>Леса, плодородные земли и древняя природа.</p>
                        </button>

                        <button class="lorgus-region-card" type="button" onclick="renderKingdomLocations('Морвейн')">
                            <span class="lorgus-region-card-symbol lorgus-region-glyph lorgus-region-glyph-morvein" aria-hidden="true"></span>
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
                            <span class="lorgus-region-card-symbol lorgus-region-glyph lorgus-region-glyph-holy" aria-hidden="true"></span>
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
                            <span class="lorgus-region-card-symbol lorgus-region-glyph lorgus-region-glyph-disputed" aria-hidden="true"></span>
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

async function renderWorldCharacterTracker() {
    const container = document.getElementById("cabinet-content");
    if (!container) return;

    container.className = "lorgus-world-page";
    container.innerHTML = `
        <div class="lorgus-world-shell">
            <aside class="lorgus-world-sidebar">
                <div class="lorgus-world-sidebar-symbol">✦</div>
                <div class="lorgus-world-sidebar-label">ЛОРГУС</div>
                <div class="lorgus-world-sidebar-name">Люди мира</div>
                <p class="lorgus-world-sidebar-meta">Актуальное публичное местоположение персонажей.</p>
                <button class="character-secondary-button lorgus-world-sidebar-button" type="button" onclick="returnToGame()">
                    ← Вернуться к миру
                </button>
            </aside>
            <main class="lorgus-world-browser">
                <header class="lorgus-world-header">
                    <span class="lorgus-world-kicker">ОТСЛЕЖИВАНИЕ</span>
                    <h1>Люди мира</h1>
                    <p>Персонажи, которые не скрывают своё местоположение.</p>
                </header>
                <section class="lorgus-world-section">
                    <div class="lorgus-world-section-title">ТЕКУЩЕЕ ПОЛОЖЕНИЕ</div>
                    <div id="lorgus-character-tracker" class="lorgus-location-grid">
                        <div class="lorgus-empty-location"><span>✦</span><h2>Загрузка...</h2></div>
                    </div>
                </section>
            </main>
        </div>
    `;

    const tracker = document.getElementById("lorgus-character-tracker");
    const { data, error } = await supabase
        .from("rp_presence")
        .select("character_id, presence_type, region, location, from_region, from_location, to_region, to_location, updated_at, characters(name, race)")
        .eq("visibility", "public")
        .order("updated_at", { ascending: false });

    if (error) {
        tracker.innerHTML = `<div class="lorgus-empty-location"><span>!</span><h2>Не удалось загрузить людей мира</h2><p>${escapeHtml(error.message)}</p></div>`;
        return;
    }

    if (!data?.length) {
        tracker.innerHTML = `<div class="lorgus-empty-location"><span>✦</span><h2>Пока никого нет</h2><p>Когда персонажи войдут в мир, они появятся здесь.</p></div>`;
        return;
    }

    const trackerIds = [...new Set(data.map(row => row.character_id).filter(Boolean))];
    const { data: trackerCharacters } = await supabase.from("characters").select("id, active_title_id").in("id", trackerIds);
    const trackerTitleIds = [...new Set((trackerCharacters || []).map(row => row.active_title_id).filter(Boolean))];
    const { data: trackerTitles } = trackerTitleIds.length ? await supabase.from("titles").select("*").in("id", trackerTitleIds) : { data: [] };
    const trackerTitleMap = Object.fromEntries((trackerTitles || []).map(t => [String(t.id), t]));
    const trackerActiveMap = Object.fromEntries((trackerCharacters || []).map(row => [String(row.id), trackerTitleMap[String(row.active_title_id)] || null]));

    tracker.innerHTML = data.map(row => {
        const character = row.characters || {};
        const isSelf = row.character_id === window.activeCharacterId;

        let place;
        let status;

        if (row.presence_type === "road") {
            place = `${escapeHtml(row.from_location)} → ${escapeHtml(row.to_location)}`;
            status = `В пути · ${escapeHtml(row.from_region)} → ${escapeHtml(row.to_region)}`;
        } else {
            place = escapeHtml(row.location || "Неизвестно");
            status = escapeHtml(row.region || "Неизвестный край");
        }

        return `
            <article class="lorgus-location-card" style="cursor:default">
                <span class="lorgus-location-card-mark">${row.presence_type === "road" ? "→" : "✦"}</span>
                <strong>${escapeHtml(character.name || "Без имени")}${isSelf ? " · Вы" : ""}${renderTitleBadge(trackerActiveMap[String(row.character_id)], "lorgus-public-title")}</strong>
                <small>${escapeHtml(character.race || "Персонаж")}</small>
                <p>${place}<br><span>${status}</span></p>
            </article>
        `;
    }).join("");
}

function renderKingdomLocations(regionName) {
    const container = document.getElementById("cabinet-content");
    const region = LORGUS_LOCATIONS[regionName];
    if (!container || !region) return;

    container.className = "lorgus-world-page";
    const character = window.activeCharacter;
    const name = escapeHtml(character?.name || "Без имени");

    const currentPresence = window.activeRpPresence;
    const hasPresence = Boolean(currentPresence);
    const locationCards = region.locations.length
        ? region.locations.map(([title, subtitle, description]) => {
            const isCurrent =
                currentPresence?.type === "location" &&
                currentPresence.location === title &&
                currentPresence.region === regionName;

            const isOnRoad = currentPresence?.type === "road";

            return `
                <button class="lorgus-location-card ${isCurrent ? "current" : (hasPresence ? "locked" : "")}" type="button"
                    onclick="enterLocationRp('${escapeHtml(title)}', '${escapeHtml(regionName)}')">
                    <span class="lorgus-location-card-mark" aria-hidden="true">
                        <span class="lorgus-location-card-glyph ${isCurrent ? "is-current" : (hasPresence ? "is-closed" : "")}"></span>
                    </span>
                    <strong>${escapeHtml(title)}</strong>
                    <small>${escapeHtml(subtitle)}</small>
                    <p>${escapeHtml(description)}</p>
                    <span class="lorgus-location-card-access">
                        ${isCurrent ? "Вы здесь · открыть RP-чат" : (isOnRoad ? "Персонаж в пути · чат закрыт" : (!hasPresence ? "Открыть RP-чат · первое сообщение закрепит место" : "Не здесь · перейти через дорогу"))}
                    </span>
                </button>
            `;
        }).join("")
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

async function getRpPresence() {
    const characterId = window.activeCharacterId;
    if (!characterId || !supabase) return null;

    const { data, error } = await supabase
        .from("rp_presence")
        .select("*")
        .eq("character_id", characterId)
        .maybeSingle();

    if (error) {
        console.error("Не удалось получить RP-присутствие:", error);
        return null;
    }

    const presence = data ? mapServerPresence(data) : null;
    window.activeRpPresence = presence;
    return presence;
}

function mapServerPresence(row) {
    if (!row) return null;

    if (row.presence_type === "road") {
        return {
            type: "road",
            fromLocation: row.from_location,
            fromRegion: row.from_region,
            toLocation: row.to_location,
            toRegion: row.to_region,
            startedAt: row.started_at,
            visibility: row.visibility
        };
    }

    return {
        type: "location",
        location: row.location,
        region: row.region,
        enteredAt: row.entered_at,
        visibility: row.visibility
    };
}

async function saveRpPresence(presence) {
    if (!window.activeCharacterId || !supabase) return null;

    const { data, error } = await supabase.rpc("set_lorgus_rp_presence", {
        p_character_id: window.activeCharacterId,
        p_presence_type: presence.type,
        p_region: presence.type === "location" ? presence.region : null,
        p_location: presence.type === "location" ? presence.location : null,
        p_from_region: presence.type === "road" ? presence.fromRegion : null,
        p_from_location: presence.type === "road" ? presence.fromLocation : null,
        p_to_region: presence.type === "road" ? presence.toRegion : null,
        p_to_location: presence.type === "road" ? presence.toLocation : null,
        p_visibility: presence.visibility || "public"
    });

    if (error) {
        console.error("Не удалось сохранить RP-присутствие:", error);
        throw error;
    }

    const row = Array.isArray(data) ? data[0] : data;
    const mapped = mapServerPresence(row);
    window.activeRpPresence = mapped;
    return mapped;
}

async function initializeRpPresence(character) {
    if (!character?.id) return;
    window.activeCharacterId = character.id;

    // No automatic placement. The character becomes physically fixed only
    // after the first RP location post.
    if (window.rpPresenceChannel) {
        await supabase.removeChannel(window.rpPresenceChannel);
    }

    window.rpPresenceChannel = supabase
        .channel("lorgus-rp-presence")
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "rp_presence"
            },
            async () => {
                window.activeRpPresence = await getRpPresence();
                await renderLocationParticipantsIfVisible();
            }
        )
        .subscribe();

    await getRpPresence();
}

async function renderLocationParticipantsIfVisible() {
    const presence = window.activeRpPresence;
    if (!presence || presence.type !== "location") return;

    const box = document.getElementById("lorgus-rp-participants");
    if (!box) return;

    await renderLocationParticipants(
        presence.location,
        presence.region
    );
}

async function clearRpPresence() {
    if (!window.activeCharacterId || !supabase) return;

    const { error } = await supabase.rpc("clear_lorgus_rp_presence", {
        p_character_id: window.activeCharacterId
    });

    if (error) console.error("Не удалось очистить RP-присутствие:", error);
    window.activeRpPresence = null;
}

const LORGUS_ROUTES = [
    ["Каэлор", "Атэрон", "land"],
    ["Атэрон", "Морвейн", "land"],
    ["Атэрон", "Ксандр", "land"],
    ["Ксандр", "Святые Земли", "land"],
    ["Ксандр", "Морвейн", "land"],
    ["Святые Земли", "Спорные Земли", "land"],
    ["Святые Земли", "Лирэн", "land"],
    ["Лирэн", "Ксандр", "sea"],
    ["Ксандр", "Каэлор", "sea"],
    ["Морвейн", "Спорные Земли", "sea"]
];

function getRouteBetweenRegions(fromRegion, toRegion) {
    return LORGUS_ROUTES.find(([from, to]) =>
        (from === fromRegion && to === toRegion) ||
        (from === toRegion && to === fromRegion)
    ) || null;
}

async function getAvailableTravelDestinations(regionName, locationName) {
    const destinations = [];

    for (const [region, data] of Object.entries(LORGUS_LOCATIONS)) {
        if (region === regionName) continue;

        const route = getRouteBetweenRegions(regionName, region);
        if (!route) continue;

        for (const [location] of data.locations || []) {
            destinations.push({
                region,
                location,
                travelType: route[2]
            });
        }
    }

    return destinations;
}

async function enterLocationRp(locationName, regionName) {
    const presence = await getRpPresence();

    if (presence?.type === "road") {
        renderRoadChat(presence);
        return;
    }

    if (presence?.type === "location" &&
        presence.location === locationName &&
        presence.region === regionName) {
        await renderLocationChats(locationName, regionName, true);
        return;
    }

    if (presence?.type === "road") {
        await renderRoadChat(presence);
        return;
    }

    if (presence?.type === "location") {
        renderTravelScreen(presence.location, presence.region, locationName, regionName);
        return;
    }

    // До первого RP-поста физического местоположения нет.
    // Любую локацию можно открыть и читать; первое сообщение
    // атомарно закрепит персонажа именно здесь через RPC.
    await renderLocationChats(locationName, regionName, false);
}

async function startTravel(fromLocation, fromRegion, toLocation, toRegion) {
    const presence = await getRpPresence();

    if (presence?.type === "road") {
        renderRoadChat(presence);
        return;
    }

    if (presence?.type === "location" &&
        (presence.location !== fromLocation || presence.region !== fromRegion)) {
        renderTravelScreen(presence.location, presence.region, toLocation, toRegion);
        return;
    }

    const route = getRouteBetweenRegions(fromRegion, toRegion);
    const destinationExists = LORGUS_LOCATIONS[toRegion]?.locations
        ?.some(([location]) => location === toLocation);

    if (!route || !destinationExists) {
        alert("Прямого канонического маршрута сюда нет.");
        return;
    }

    const road = await saveRpPresence({
        type: "road",
        fromLocation,
        fromRegion,
        toLocation,
        toRegion,
        visibility: "public"
    });

    if (road) renderRoadChat(road);
}

async function arriveAtDestination() {
    const presence = await getRpPresence();
    if (!presence || presence.type !== "road") return;

    const destination = await saveRpPresence({
        type: "location",
        location: presence.toLocation,
        region: presence.toRegion,
        enteredAt: new Date().toISOString(),
        visibility: presence.visibility || "public"
    });

    if (destination) {
        renderLocationChats(
            destination.location,
            destination.region,
            true
        );
    }
}

function renderTravelScreen(fromLocation, fromRegion, toLocation, toRegion) {
    const container = document.getElementById("cabinet-content");
    if (!container) return;

    const destinations = getAvailableTravelDestinations(fromRegion, fromLocation);
    const requested = destinations.find(item =>
        item.location === toLocation && item.region === toRegion
    );

    const choices = requested
        ? [requested, ...destinations.filter(item =>
            item.location !== requested.location || item.region !== requested.region
        )]
        : destinations;

    container.className = "lorgus-road-page";
    container.innerHTML = `
        <div class="lorgus-road-shell">
            <header class="lorgus-road-header">
                <span class="lorgus-rp-overline">ПЕРЕМЕЩЕНИЕ</span>
                <h1>Путь начинается не в чате.</h1>
                <p>
                    ${escapeHtml(fromLocation)}, ${escapeHtml(fromRegion)}
                    · выбери место, куда направляется персонаж.
                </p>
            </header>

            <section class="lorgus-road-panel">
                <div class="lorgus-road-current">
                    <span>СЕЙЧАС</span>
                    <strong>${escapeHtml(fromLocation)}</strong>
                    <small>${escapeHtml(fromRegion)}</small>
                </div>
                <div class="lorgus-road-arrow">→</div>
                <div class="lorgus-road-current">
                    <span>НАЗНАЧЕНИЕ</span>
                    <strong>${escapeHtml(toLocation)}</strong>
                    <small>${escapeHtml(toRegion)}</small>
                </div>
            </section>

            <section class="lorgus-road-destinations">
                <div class="lorgus-world-section-title">ДОСТУПНЫЕ НАПРАВЛЕНИЯ</div>
                <div class="lorgus-road-destination-grid">
                    ${choices.slice(0, 12).map(item => `
                        <button class="lorgus-road-destination ${item.location === toLocation && item.region === toRegion ? "selected" : ""}" type="button"
                            onclick="startTravel('${escapeHtml(fromLocation)}','${escapeHtml(fromRegion)}','${escapeHtml(item.location)}','${escapeHtml(item.region)}')">
                            <strong>${escapeHtml(item.location)}</strong>
                            <small>${escapeHtml(item.region)}</small>
                        </button>
                    `).join("")}
                </div>
            </section>

            <div class="lorgus-road-actions">
                <button class="character-secondary-button" type="button"
                    onclick="renderKingdomLocations('${escapeHtml(fromRegion)}')">
                    ← Остаться здесь
                </button>
                <button class="gold-button" type="button"
                    onclick="startTravel('${escapeHtml(fromLocation)}','${escapeHtml(fromRegion)}','${escapeHtml(toLocation)}','${escapeHtml(toRegion)}')">
                    Выйти на дорогу
                </button>
            </div>
        </div>
    `;
}

async function renderRoadChat(presence) {
    window.activeRpChatSpace = presence;
    const container = document.getElementById("cabinet-content");
    if (!container) return;

    const character = window.activeCharacter;
    const name = escapeHtml(character?.name || "Без имени");

    container.className = "lorgus-road-page";
    container.innerHTML = `
        <div class="lorgus-rp-shell lorgus-road-chat-shell">
            <aside class="lorgus-rp-sidebar">
                <button class="lorgus-rp-back" type="button" onclick="renderRoadChat(window.activeRpPresence)">↻ Обновить путь</button>
                <div class="lorgus-rp-place-mark">→</div>
                <span class="lorgus-rp-overline">ДОРОГА</span>
                <h1>${escapeHtml(presence.fromLocation)} → ${escapeHtml(presence.toLocation)}</h1>
                <p class="lorgus-rp-region">${escapeHtml(presence.fromRegion)} → ${escapeHtml(presence.toRegion)}</p>
                <div class="lorgus-rp-divider"></div>
                <div class="lorgus-rp-sidebar-label">ВАШЕ ПРИСУТСТВИЕ</div>
                <div class="lorgus-rp-road-lock">
                    Пока персонаж в пути, он не может писать в чатах исходной или конечной локации.
                </div>
                <div class="lorgus-rp-sidebar-note">
                    <span>✧</span>
                    <p>Дорога — самостоятельное RP-пространство. Здесь можно встретить других путников.</p>
                </div>
            </aside>

            <main class="lorgus-rp-main">
                <header class="lorgus-rp-header">
                    <div>
                        <span class="lorgus-rp-overline">RP · ДОРОГА</span>
                        <h2>${escapeHtml(presence.fromLocation)} → ${escapeHtml(presence.toLocation)}</h2>
                    </div>
                    <div class="lorgus-rp-status"><i></i> ПУТЬ</div>
                </header>

                <section class="lorgus-rp-feed" id="lorgus-rp-feed">
                    <div class="lorgus-rp-empty">
                        <div class="lorgus-rp-symbol">→</div>
                        <span class="lorgus-rp-stage-kicker">ДОРОЖНЫЙ ЧАТ</span>
                        <h3>Персонаж находится в пути.</h3>
                        <p>Пока ты здесь, другие RP-чаты для этого персонажа закрыты.</p>
                    </div>
                </section>

                <section class="lorgus-rp-composer">
                    <div class="lorgus-rp-composer-top">
                        <span>РОЛЬ: <strong>${name}</strong></span>
                        <span>ПРОСТРАНСТВО: <b>ДОРОГА</b></span>
                    </div>
                    <textarea id="lorgus-rp-input" placeholder="Опиши дорогу, встречу или действие персонажа..." rows="4"></textarea>
                    <div class="lorgus-rp-composer-bottom">
                        <div class="lorgus-rp-actions">
                            <button class="lorgus-rp-use-item" type="button" onclick="openRpItemPicker()">Использовать предмет</button>
                            <button class="lorgus-rp-use-item lorgus-rp-transfer-item" type="button" onclick="openRpTransferPicker()">Передать предмет</button>
                            <button class="lorgus-rp-use-item lorgus-rp-transfer-currency" type="button" onclick="openRpCurrencyTransferPicker()">Передать валюту</button>
                        </div>
                        <span id="lorgus-rp-item-selection" class="lorgus-rp-item-selection"></span>
                        <button class="gold-button lorgus-rp-send" type="button" onclick="sendLocalRpMessage()">Отправить</button>
                    </div>
                </section>

                <div class="lorgus-road-arrival">
                    <button class="gold-button" type="button" onclick="arriveAtDestination()">
                        Прибыть в ${escapeHtml(presence.toLocation)}
                    </button>
                </div>
            </main>
        </div>
    `;
    const currentPresence = await getRpPresence();
    await loadRpMessages(currentPresence);
    await subscribeToRpMessages(currentPresence);

}

function renderFloodChat() {
    const container = document.getElementById("cabinet-content");
    if (!container) return;

    const character = window.activeCharacter;
    const name = escapeHtml(character?.name || "Без имени");

    container.className = "lorgus-flood-page";
    container.innerHTML = `
        <div class="lorgus-flood-shell">
            <header class="lorgus-flood-header">
                <div>
                    <span class="lorgus-rp-overline">ОБЩИЙ КАНАЛ</span>
                    <h1>Флуд</h1>
                    <p>Свободное общение игроков. Флуд не считается RP-присутствием.</p>
                </div>
                <button class="character-secondary-button" type="button" onclick="returnToGame()">← К миру</button>
            </header>

            <section class="lorgus-flood-feed" id="lorgus-flood-feed">
                <div class="lorgus-rp-empty">
                    <div class="lorgus-rp-symbol">✧</div>
                    <span class="lorgus-rp-stage-kicker">ФЛУД</span>
                    <h3>Общий разговор ещё пуст.</h3>
                    <p>Здесь можно общаться вне роли, не покидая своё текущее RP-пространство.</p>
                </div>
            </section>

            <section class="lorgus-rp-composer">
                <div class="lorgus-rp-composer-top">
                    <span>АККАУНТ: <strong>${name}</strong></span>
                    <span>НЕ ВЛИЯЕТ НА ПЕРЕМЕЩЕНИЕ</span>
                </div>
                <textarea id="lorgus-flood-input" placeholder="Напиши сообщение во флуд..." rows="3"></textarea>
                <div class="lorgus-rp-composer-bottom">
                    <span class="lorgus-rp-mention">Флуд доступен независимо от RP-присутствия.</span>
                    <button class="gold-button lorgus-rp-send" type="button" onclick="sendLocalFloodMessage()">Отправить</button>
                </div>
            </section>
        </div>
    `;
}

function renderLocationEntryLock(locationName, regionName) {
    const container = document.getElementById("cabinet-content");
    if (!container) return;

    container.className = "lorgus-world-page";
    container.innerHTML = `
        <div class="lorgus-world-shell">
            <aside class="lorgus-world-sidebar">
                <div class="lorgus-world-sidebar-symbol">🔒</div>
                <div class="lorgus-world-sidebar-label">RP-ЧАТ ЗАКРЫТ</div>
                <div class="lorgus-world-sidebar-name">${escapeHtml(locationName)}</div>
                <p class="lorgus-world-sidebar-meta">${escapeHtml(regionName)}</p>
                <button class="character-secondary-button lorgus-world-sidebar-button" type="button"
                    onclick="renderKingdomLocations('${escapeHtml(regionName)}')">
                    ← К локациям
                </button>
            </aside>

            <main class="lorgus-world-browser">
                <header class="lorgus-world-header">
                    <span class="lorgus-world-kicker">ФИЗИЧЕСКОЕ ПРИСУТСТВИЕ</span>
                    <h1>${escapeHtml(locationName)}</h1>
                    <p>Персонаж не находится здесь. Читать и писать в этом RP-чате нельзя.</p>
                </header>

                <section class="lorgus-world-section">
                    <div class="lorgus-empty-location">
                        <span>🔒</span>
                        <h2>Чат недоступен</h2>
                        <p>Чтобы попасть сюда, персонаж должен физически прибыть в эту локацию через систему перемещения.</p>
                    </div>
                </section>
            </main>
        </div>
    `;
}

async function renderLocationParticipants(locationName, regionName) {
    const box = document.getElementById("lorgus-rp-participants");
    if (!box) return;

    const { data, error } = await supabase
        .from("rp_presence")
        .select("character_id, presence_type, location, region, visibility, characters(name, race)")
        .eq("visibility", "public")
        .eq("presence_type", "location")
        .eq("region", regionName)
        .eq("location", locationName);

    if (error) {
        console.error("Не удалось загрузить участников:", error);
        return;
    }

    const participants = data || [];
    const countNode = document.getElementById("lorgus-rp-online-count");
    if (countNode) countNode.textContent = String(participants.length || 1);

    if (!participants.length) {
        box.innerHTML = '<div class="lorgus-messenger-empty-participants">Сцена пока пуста</div>';
        return;
    }

    const participantIds = [...new Set(participants.map(row => row.character_id).filter(Boolean))];
    const { data: participantCharacters } = participantIds.length
        ? await supabase.from("characters").select("id, active_title_id").in("id", participantIds)
        : { data: [] };
    const participantTitleIds = [...new Set((participantCharacters || []).map(row => row.active_title_id).filter(Boolean))];
    const { data: participantTitles } = participantTitleIds.length
        ? await supabase.from("titles").select("*").in("id", participantTitleIds)
        : { data: [] };
    const participantTitleMap = Object.fromEntries((participantTitles || []).map(t => [String(t.id), t]));
    const participantActiveMap = Object.fromEntries((participantCharacters || []).map(row => [String(row.id), participantTitleMap[String(row.active_title_id)] || null]));
    const photos = await Promise.all(participantIds.map(id => getRpCharacterPhoto(id)));
    const photoMap = Object.fromEntries(participantIds.map((id, index) => [String(id), photos[index]]));

    box.innerHTML = participants.map(row => {
        const character = row.characters || {};
        const id = String(row.character_id);
        const isCurrent = id === String(window.activeCharacterId);
        const photo = photoMap[id];
        return `
            <div class="lorgus-messenger-participant ${isCurrent ? "active" : ""}">
                <div class="lorgus-messenger-avatar">
                    ${photo ? `<img src="${escapeHtml(photo)}" alt="">` : "<span>✦</span>"}
                    <i></i>
                </div>
                <div class="lorgus-messenger-participant-info">
                    <strong>${escapeHtml(character.name || "Без имени")}</strong>
                    <small>${isCurrent ? "Вы · сейчас здесь" : escapeHtml(character.race || "Персонаж")}</small>
                </div>
                ${renderTitleBadge(participantActiveMap[id], "lorgus-public-title")}
            </div>
        `;
    }).join("");
}

function sendLocalFloodMessage() {
    const input = document.getElementById("lorgus-flood-input");
    const feed = document.getElementById("lorgus-flood-feed");
    const character = window.activeCharacter;
    if (!input || !feed || !character) return;

    const text = input.value.trim();
    if (!text) return;

    const presence = getRpPresence();
    if (!presence || (presence.type !== "location" && presence.type !== "road")) {
        alert("Персонаж не находится ни в одном RP-пространстве.");
        return;
    }

    const empty = feed.querySelector(".lorgus-rp-empty");
    if (empty) empty.remove();

    const message = document.createElement("article");
    message.className = "lorgus-rp-message";
    message.innerHTML = `
        <div class="lorgus-rp-message-avatar">✧</div>
        <div class="lorgus-rp-message-body">
            <div class="lorgus-rp-message-meta">
                <strong>${escapeHtml(character.name || "Без имени")}</strong>
                <span>флуд · сейчас</span>
            </div>
            <p>${escapeHtml(text)}</p>
        </div>
    `;
    feed.appendChild(message);
    input.value = "";
    feed.scrollTop = feed.scrollHeight;
}

async function getRpCharacterPhoto(characterId) {
    if (!characterId) return null;
    window.rpCharacterPhotoCache = window.rpCharacterPhotoCache || {};
    const key = String(characterId);
    if (Object.prototype.hasOwnProperty.call(window.rpCharacterPhotoCache, key)) {
        return window.rpCharacterPhotoCache[key];
    }

    const { data, error } = await supabase
        .from("character_applications")
        .select("photo_path")
        .eq("character_id", characterId)
        .eq("status", "approved")
        .limit(1)
        .maybeSingle();

    if (error || !data?.photo_path) {
        window.rpCharacterPhotoCache[key] = null;
        return null;
    }

    const { data: photoData, error: photoError } = await supabase
        .storage
        .from("character-applications")
        .createSignedUrl(data.photo_path, 60 * 60);

    const url = !photoError ? (photoData?.signedUrl || null) : null;
    window.rpCharacterPhotoCache[key] = url;
    return url;
}

async function renderLocationChats(locationName, regionName, alreadyPresent = false) {
    const container = document.getElementById("cabinet-content");
    if (!container) return;

    const presence = await getRpPresence();
    const hasPresence = Boolean(presence);

    if (presence) {
        if (presence.type === "road") {
            await renderRoadChat(presence);
            return;
        }

        if (presence.type !== "location" || presence.location !== locationName || presence.region !== regionName) {
            renderTravelScreen(presence.location, presence.region, locationName, regionName);
            return;
        }
    }

    window.activeRpChatSpace = {
        type: "location",
        location: locationName,
        region: regionName,
        visibility: "public"
    };

    const character = window.activeCharacter;
    const name = escapeHtml(character?.name || "Без имени");
    const location = escapeHtml(locationName);
    const region = escapeHtml(regionName);
    const myPhoto = await getRpCharacterPhoto(window.activeCharacterId);

    container.className = "lorgus-rp-page";
    container.innerHTML = `
        <div class="lorgus-messenger-shell">
            <aside class="lorgus-messenger-sidebar">
                <div class="lorgus-messenger-sidebar-head">
                    <button class="lorgus-messenger-back" type="button" onclick="renderKingdomLocations('${region}')">‹ Мир</button>
                    <div class="lorgus-messenger-search">⌕ <span>Поиск в LORGUS</span></div>
                </div>

                <div class="lorgus-messenger-chat-card active">
                    <div class="lorgus-messenger-chat-photo scene-photo"><span>✦</span></div>
                    <div class="lorgus-messenger-chat-info">
                        <strong>${location}</strong>
                        <small>${region}</small>
                        <em>Живая RP-сцена</em>
                    </div>
                </div>

                <div class="lorgus-messenger-section-title">В СЦЕНЕ</div>
                <div class="lorgus-messenger-participants" id="lorgus-rp-participants">
                    <div class="lorgus-messenger-loading">Загрузка участников…</div>
                </div>

                <div class="lorgus-messenger-my-card">
                    <div class="lorgus-messenger-avatar large">
                        ${myPhoto ? `<img src="${escapeHtml(myPhoto)}" alt="">` : '<span>✦</span>'}
                        <i></i>
                    </div>
                    <div>
                        <small>ТЫ ИГРАЕШЬ ЗА</small>
                        <strong>${name}</strong>
                    </div>
                </div>
            </aside>

            <main class="lorgus-messenger-main">
                <header class="lorgus-messenger-header">
                    <div class="lorgus-messenger-header-photo scene-photo"><span>✦</span></div>
                    <div class="lorgus-messenger-header-info">
                        <h1>${location}</h1>
                        <p><span class="online-dot"></span> ${region} · <b id="lorgus-rp-online-count">1</b> участник</p>
                    </div>
                    <div class="lorgus-messenger-header-actions">
                        <button type="button" title="Участники" onclick="document.querySelector('.lorgus-messenger-sidebar')?.classList.toggle('mobile-open')">☷</button>
                        <button type="button" title="Обновить" onclick="renderLocationChats('${locationName.replace(/'/g, "\\'")}','${regionName.replace(/'/g, "\\'")}',true)">↻</button>
                    </div>
                </header>

                <section class="lorgus-messenger-feed" id="lorgus-rp-feed">
                    <div class="lorgus-messenger-start">
                        <div class="lorgus-messenger-start-mark">✦</div>
                        <strong>Ты вошёл в ${location}</strong>
                        <span>${region} · RP-пространство</span>
                        <p>Здесь начинается история. Пиши действия, реплики и мысли своего персонажа — остальные увидят их в реальном времени.</p>
                    </div>
                </section>

                <section class="lorgus-messenger-composer">
                    <div class="lorgus-messenger-composer-tools">
                        <button type="button" onclick="openRpItemPicker()" title="Предмет">＋</button>
                        <button type="button" onclick="openRpTransferPicker()" title="Передать предмет">◈</button>
                        <button type="button" onclick="openRpCurrencyTransferPicker()" title="Передать валюту">₿</button>
                    </div>
                    <div class="lorgus-messenger-input-wrap">
                        <textarea id="lorgus-rp-input" placeholder="Сообщение от имени ${name}…" rows="1"></textarea>
                        <span id="lorgus-rp-item-selection" class="lorgus-messenger-item-selection"></span>
                    </div>
                    <button class="lorgus-messenger-send" type="button" onclick="sendLocalRpMessage()" title="Отправить">➤</button>
                </section>

                <footer class="lorgus-messenger-footer">
                    <span>RP · ${region}</span>
                    <button type="button" onclick="renderFloodChat()">Флуд</button>
                </footer>
            </main>
        </div>
    `;

    const input = document.getElementById("lorgus-rp-input");
    if (input) {
        input.addEventListener("input", () => {
            input.style.height = "auto";
            input.style.height = Math.min(input.scrollHeight, 180) + "px";
        });
        input.addEventListener("keydown", event => {
            if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendLocalRpMessage();
            }
        });
    }

    await renderLocationParticipants(locationName, regionName);

    const chatSpace = window.activeRpChatSpace;
    if (chatSpace) {
        await loadRpMessages(chatSpace);
        await subscribeToRpMessages(chatSpace);
    }
}

async function loadRpMessages(presence) {
    const feed = document.getElementById("lorgus-rp-feed");
    if (!feed || !presence) return;

    let query = supabase
        .from("rp_messages")
        .select("id, character_id, body, created_at, status, reverted_at, revert_reason, characters(name)")
        .eq("presence_type", presence.type)
        .order("created_at", { ascending: true })
        .limit(200);

    if (presence.type === "location") {
        query = query.eq("region", presence.region).eq("location", presence.location);
    } else {
        query = query.eq("from_region", presence.fromRegion)
            .eq("from_location", presence.fromLocation)
            .eq("to_region", presence.toRegion)
            .eq("to_location", presence.toLocation);
    }

    const { data, error } = await query;
    if (error) {
        console.error("Не удалось загрузить RP-сообщения:", error);
        return;
    }

    feed.innerHTML = "";
    if (!data?.length) {
        feed.innerHTML = '<div class="lorgus-messenger-start"><div class="lorgus-messenger-start-mark">✦</div><strong>История ещё не началась</strong><span>Первое сообщение создаст сцену.</span><p>Пиши свободно. Действия, реплики и мысли персонажа будут появляться здесь как настоящая переписка.</p></div>';
        return;
    }

    const ids = [...new Set(data.map(row => row.character_id).filter(Boolean))];
    await Promise.all(ids.map(id => getRpCharacterPhoto(id)));
    for (const message of data) await appendRpMessage(message);
    feed.scrollTop = feed.scrollHeight;
}

async function subscribeToRpMessages(presence) {
    if (!supabase || !presence) return;

    if (window.rpMessagesChannel) {
        await supabase.removeChannel(window.rpMessagesChannel);
    }

    window.rpMessagesChannel = supabase
        .channel("lorgus-rp-messages-" + window.activeCharacterId)
        .on("postgres_changes", {
            event: "INSERT",
            schema: "public",
            table: "rp_messages"
        }, async payload => {
            const row = payload.new;
            const sameLocation = presence.type === "location" &&
                row.presence_type === "location" &&
                row.region === presence.region &&
                row.location === presence.location;

            const sameRoad = presence.type === "road" &&
                row.presence_type === "road" &&
                row.from_region === presence.fromRegion &&
                row.from_location === presence.fromLocation &&
                row.to_region === presence.toRegion &&
                row.to_location === presence.toLocation;

            if (!sameLocation && !sameRoad) return;

            const { data: character } = await supabase
                .from("characters")
                .select("name")
                .eq("id", row.character_id)
                .single();

            appendRpMessage({ ...row, characters: character });
        })
        .subscribe();
}

async function sendLocalRpMessage() {
    const input = document.getElementById("lorgus-rp-input");
    if (!input || !window.activeCharacterId) return;

    const body = input.value.trim();
    if (!body) return;

    const chat = window.activeRpChatSpace;
    if (!chat) {
        alert("RP-пространство не выбрано.");
        return;
    }

    const itemIds = Array.from(window.pendingRpItemIds || []);
    const { error } = await supabase.rpc(
        "send_lorgus_rp_message_with_items",
        {
            p_character_id: window.activeCharacterId,
            p_presence_type: chat.type,
            p_region: chat.type === "location" ? chat.region : null,
            p_location: chat.type === "location" ? chat.location : null,
            p_from_region: chat.type === "road" ? chat.fromRegion : null,
            p_from_location: chat.type === "road" ? chat.fromLocation : null,
            p_to_region: chat.type === "road" ? chat.toRegion : null,
            p_to_location: chat.type === "road" ? chat.toLocation : null,
            p_body: body,
            p_visibility: chat.visibility || "public",
            p_inventory_ids: itemIds
        }
    );

    if (error) {
        console.error("Не удалось отправить RP-сообщение:", error);
        alert("Не удалось отправить сообщение: " + error.message);
        return;
    }

    input.value = "";
    window.pendingRpItemIds = [];
    updateRpItemUseButton();
    window.activeRpPresence = await getRpPresence();

    if (window.activeRpPresence) {
        window.activeRpChatSpace = window.activeRpPresence;
        await loadRpMessages(window.activeRpPresence);
        await subscribeToRpMessages(window.activeRpPresence);
        await renderLocationParticipantsIfVisible();
    } else {
        await loadRpMessages(chat);
        await subscribeToRpMessages(chat);
    }
}


/* =========================================================
   ИНВЕНТАРЬ И ИСПОЛЬЗОВАНИЕ ПРЕДМЕТОВ
   ========================================================= */

const lorgusCurrencies = {
    aur: { name: "Аур", kingdom: "Атэрон", icon: "◈", goldRate: "1,00" },
    lira: { name: "Лира", kingdom: "Лирэн", icon: "✿", goldRate: "0,90" },
    kald: { name: "Кальд", kingdom: "Ксандр", icon: "◆", goldRate: "1,10" },
    dorn: { name: "Дорн", kingdom: "Каэлор", icon: "⬢", goldRate: "1,20" },
    fin: { name: "Фин", kingdom: "Морвейн", icon: "✧", goldRate: "0,80" }
};

function lorgusCurrencyLabel(code) {
    return lorgusCurrencies[code]?.name || code;
}

function formatLorgusCurrencyAmount(amount) {
    const copper = Math.max(0, Number(amount) || 0);
    const gold = Math.floor(copper / 10000);
    const silver = Math.floor((copper % 10000) / 100);
    const bronze = copper % 100;
    return [
        gold ? gold + " золот." : "",
        silver ? silver + " серебр." : "",
        bronze || (!gold && !silver) ? bronze + " медн." : ""
    ].filter(Boolean).join(" · ");
}

const inventorySlotLabels = {
    head: "Голова",
    chest: "Тело",
    hands: "Перчатки",
    legs: "Ноги",
    feet: "Ступни",
    main_hand: "Правая рука",
    off_hand: "Левая рука",
    accessory_chain: "Цепочка",
    accessory_ring: "Кольцо",
    accessory_bracelet: "Браслет"
};

const inventoryTypeLabels = {
    helmet: "Шлем", armor: "Броня", gloves: "Перчатки", pants: "Штаны", boots: "Обувь",
    sword: "Меч", spear: "Копьё", axe: "Топор", staff: "Посох", bow: "Лук", crossbow: "Арбалет",
    shield: "Щит", chain: "Цепочка", ring: "Кольцо", bracelet: "Браслет", potion: "Зелье",
    scroll: "Свиток", food: "Еда", quest_item: "Квестовый предмет", material: "Материал", misc: "Прочее"
};
const inventoryTypeIcons = {
    helmet:"⛑", armor:"🛡", gloves:"🧤", pants:"♜", boots:"🥾", sword:"⚔", spear:"🔱", axe:"🪓",
    staff:"♖", bow:"🏹", crossbow:"⦿", shield:"🛡", chain:"⛓", ring:"◉", bracelet:"◌", potion:"⚗",
    scroll:"▤", food:"✦", quest_item:"◆", material:"◇", misc:"◆"
};

function inventoryRarityLabel(rarity) {
    return titleRarityLabel(rarity);
}

function inventoryTypeLabel(item) {
    return inventoryTypeLabels[item?.item_subtype] || inventoryTypeLabels[item?.item_type] || "Предмет";
}

function inventoryItemMarkup(row, extraClass = "") {
    const item = row.items || {};
    const qty = row.quantity > 1 ? "×" + row.quantity : "";
    const equippedLabel = row.equipped_slot ? inventorySlotLabels[row.equipped_slot] : "";
    return '<article class="lorgus-inventory-item ' + extraClass + (row.equipped_slot ? ' is-equipped' : '') + '" draggable="true" data-inventory-id="' + escapeHtml(row.id) + '" style="--item-color:' + escapeHtml(item.color || "#b8a27a") + '">' +
        '<div class="lorgus-inventory-item-icon">' + escapeHtml(item.icon || "◆") + '</div>' +
        '<div class="lorgus-inventory-item-info"><strong>' + escapeHtml(item.name || "Предмет") + '</strong><small>' + escapeHtml(inventoryRarityLabel(item.rarity)) + ' · ' + escapeHtml(inventoryTypeLabel(item)) + '</small>' + (equippedLabel ? '<em>НАДЕТО · ' + escapeHtml(equippedLabel) + '</em>' : '') + '</div>' +
        '<b class="lorgus-inventory-qty">' + escapeHtml(qty) + '</b></article>';
}

async function loadCharacterInventory(characterId) {
    const { data, error } = await supabase.from("character_inventory")
        .select("id, quantity, equipped_slot, acquired_at, source_note, items(*)")
        .eq("character_id", characterId).gt("quantity", 0).order("acquired_at", { ascending: true });
    if (error) console.error("Не удалось загрузить инвентарь:", error);
    return { data: data || [], error };
}

async function renderLorgusInventory() {
    const container = document.getElementById("cabinet-content");
    const character = window.activeCharacter;
    if (!container || !character) return;
    container.className = "lorgus-inventory-page";
    container.innerHTML = '<div class="lorgus-inventory-shell">' + renderLorgusInterfaceNav("inventory") +
        '<main class="lorgus-inventory-main"><header class="lorgus-inventory-header"><div><span class="lorgus-command-kicker">СНАРЯЖЕНИЕ · ЛИЧНАЯ КЛАДОВАЯ</span><h1>Инвентарь</h1><p>' + escapeHtml(character.name || "Персонаж") + ' · перетаскивай снаряжение на персонажа.</p></div></header>' +
        '<div class="lorgus-inventory-layout"><section class="lorgus-equipment-stage"><div class="lorgus-equipment-stage-title">СНАРЯЖЕНИЕ</div><div class="lorgus-equipment-character"><div class="lorgus-equipment-aura"></div><div class="lorgus-equipment-avatar">✦</div><div class="lorgus-equipment-name">' + escapeHtml(character.name || "Персонаж") + '</div><div class="lorgus-equipment-slots">' +
        Object.entries(inventorySlotLabels).map(([slot,label]) => '<div class="lorgus-equipment-slot" data-equipment-slot="' + slot + '" title="' + label + '"><span>' + escapeHtml(label) + '</span><div class="lorgus-equipment-slot-item"></div></div>').join("") +
        '</div></div></section><section class="lorgus-inventory-grid-wrap"><div class="lorgus-inventory-grid-title">РЮКЗАК <span id="lorgus-inventory-count"></span></div><div id="lorgus-inventory-grid" class="lorgus-inventory-grid"><div class="lorgus-inventory-empty">Загрузка...</div></div></section></div></main></div>';
    const walletSection = document.createElement("section");
    walletSection.className = "lorgus-wallet-panel";
    walletSection.innerHTML = '<div class="lorgus-wallet-title"><span>КОШЕЛЁК</span><small>Валюты пяти королевств · 1 золотая = 100 серебряных · 1 серебряная = 100 медных</small></div><div class="lorgus-wallet-grid" id="lorgus-wallet-grid"></div>';
    container.querySelector(".lorgus-inventory-main").appendChild(walletSection);
    const { data: currencyRows } = await loadCharacterCurrency(character.id);
    const walletGrid = document.getElementById("lorgus-wallet-grid");
    if (walletGrid) walletGrid.innerHTML = Object.entries(lorgusCurrencies).map(([code,c]) => {
        const row=(currencyRows||[]).find(x=>x.currency_code===code);
        return '<div class="lorgus-wallet-card"><span class="lorgus-wallet-icon">' + escapeHtml(c.icon) + '</span><div><strong>' + escapeHtml(c.name) + '</strong><small>' + escapeHtml(c.kingdom) + ' · 1 золотая = ' + escapeHtml(c.goldRate) + ' экв.</small></div><b>' + escapeHtml(formatLorgusCurrencyAmount(row?.amount || 0)) + '</b></div>';
    }).join("");
    const { data, error } = await loadCharacterInventory(character.id);
    const grid = document.getElementById("lorgus-inventory-grid");
    if (!grid) return;
    if (error) { grid.innerHTML = '<div class="lorgus-inventory-empty"><h2>Инвентарь недоступен</h2><p>' + escapeHtml(error.message) + '</p></div>'; return; }
    const rows = data || [];
    const backpackRows = rows.filter(row => !row.equipped_slot);
    document.getElementById("lorgus-inventory-count").textContent = backpackRows.length + " ячеек";
    grid.innerHTML = backpackRows.length ? backpackRows.map(row => inventoryItemMarkup(row)).join("") : '<div class="lorgus-inventory-empty"><h2>Рюкзак пуст</h2><p>Перетащи сюда предмет с персонажа, чтобы снять его.</p></div>';
    const renderEquipped = () => document.querySelectorAll(".lorgus-equipment-slot").forEach(slot => {
        const row = rows.find(r => r.equipped_slot === slot.dataset.equipmentSlot);
        const item = row?.items; const box = slot.querySelector(".lorgus-equipment-slot-item");
        box.innerHTML = row && item ? '<div class="lorgus-equipped-item" draggable="true" data-inventory-id="' + escapeHtml(row.id) + '" style="--item-color:' + escapeHtml(item.color || "#b8a27a") + '"><span>' + escapeHtml(item.icon || "◆") + '</span><strong>' + escapeHtml(item.name || "Предмет") + '</strong></div>' : "";
    });
    renderEquipped();
    const getDraggedInventoryId = event => {
        const fromState = window.lorgusDraggedInventoryId;
        if (fromState) return fromState;
        const transfer = event?.dataTransfer;
        if (!transfer) return "";
        return transfer.getData("application/x-lorgus-inventory-id") || transfer.getData("text/plain") || "";
    };

    const clearDragFeedback = () => {
        grid.classList.remove("is-valid-unequip-drop");
        document.querySelectorAll(".lorgus-equipment-slot").forEach(slot => {
            slot.classList.remove("is-valid-drop", "is-invalid-drop");
        });
    };

    const setupDrag = card => {
        card.setAttribute("draggable", "true");
        // Не даём браузеру превращать внутренний текст/элементы в отдельный
        // "перетаскиваемый объект". Перетаскивается только сама карточка.
        card.querySelectorAll("*").forEach(child => child.setAttribute("draggable", "false"));

        card.addEventListener("dragstart", e => {
            e.stopPropagation();
            const id = card.dataset.inventoryId;

            if (!id || !e.dataTransfer) {
                e.preventDefault();
                return;
            }

            window.lorgusDraggedInventoryId = id;

            e.dataTransfer.clearData();
            e.dataTransfer.setData("application/x-lorgus-inventory-id", id);
            e.dataTransfer.setData("text/plain", id);
            e.dataTransfer.effectAllowed = "move";

            const ghost = document.createElement("div");
            ghost.className = "lorgus-drag-ghost lorgus-drag-ghost-item";
            ghost.innerHTML =
                '<span class="lorgus-drag-ghost-icon">' + escapeHtml(card.querySelector(".lorgus-inventory-item-icon")?.textContent || "◆") + '</span>' +
                '<span class="lorgus-drag-ghost-name">' + escapeHtml(card.querySelector(".lorgus-inventory-item-info strong")?.textContent || "Предмет") + '</span>';
            document.body.appendChild(ghost);
            e.dataTransfer.setDragImage(ghost, 24, 24);
            requestAnimationFrame(() => ghost.remove());

            card.classList.add("is-dragging");
        });

        card.addEventListener("dragend", () => {
            card.classList.remove("is-dragging");
            window.lorgusDraggedInventoryId = null;
        });
    };

    grid.querySelectorAll(".lorgus-inventory-item").forEach(setupDrag);
    document.querySelectorAll(".lorgus-equipped-item").forEach(setupDrag);

    // Снятие экипировки: тот же предмет переносится из ячейки персонажа обратно в рюкзак.
    // Никакого клонирования и создания новой записи.
    grid.addEventListener("dragover", e => {
        // Если тащим над уже существующим предметом в рюкзаке,
        // это НЕ зона снятия экипировки. Не даём событию всплыть
        // до общего drop-zone рюкзака.
        if (e.target.closest(".lorgus-inventory-item")) {
            grid.classList.remove("is-valid-unequip-drop");
            if (e.dataTransfer) e.dataTransfer.dropEffect = "none";
            return;
        }

        const inventoryId = getDraggedInventoryId(e);
        const row = rows.find(r => r.id === inventoryId);

        if (!row?.equipped_slot) return;

        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
        grid.classList.add("is-valid-unequip-drop");
    });

    grid.addEventListener("dragleave", e => {
        if (!grid.contains(e.relatedTarget)) {
            grid.classList.remove("is-valid-unequip-drop");
        }
    });

    grid.addEventListener("drop", async e => {
        // Нельзя снять предмет, бросив его поверх другой вещи в рюкзаке.
        // Снятие работает только при броске на свободную поверхность рюкзака.
        if (e.target.closest(".lorgus-inventory-item")) {
            grid.classList.remove("is-valid-unequip-drop");
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        const inventoryId = getDraggedInventoryId(e);
        const row = rows.find(r => r.id === inventoryId);
        grid.classList.remove("is-valid-unequip-drop");

        if (!row?.equipped_slot) {
            window.lorgusDraggedInventoryId = null;
            return;
        }

        const { error } = await supabase.rpc("unequip_character_item", {
            p_inventory_id: inventoryId
        });

        window.lorgusDraggedInventoryId = null;

        if (error) {
            console.error("Не удалось снять предмет:", error);
            grid.classList.add("is-invalid-drop");
            window.setTimeout(() => grid.classList.remove("is-invalid-drop"), 520);
            return;
        }

        await renderLorgusInventory();
    });

    document.querySelectorAll(".lorgus-equipment-slot").forEach(slot => {
        slot.addEventListener("dragover", e => {
            e.preventDefault();
            const inventoryId = getDraggedInventoryId(e);
            const row = rows.find(r => r.id === inventoryId);
            const item = row?.items;
            const valid = !!item?.equipment_slot && item.equipment_slot === slot.dataset.equipmentSlot && !row?.equipped_slot;
            slot.classList.toggle("is-valid-drop", valid);
            if (e.dataTransfer) e.dataTransfer.dropEffect = valid ? "move" : "none";
        });
        slot.addEventListener("dragleave", () => slot.classList.remove("is-valid-drop"));
        slot.addEventListener("drop", async e => {
            e.preventDefault();
            e.stopPropagation();

            const inventoryId = getDraggedInventoryId(e);
            const row = rows.find(r => r.id === inventoryId);
            const item = row?.items;
            const targetSlot = slot.dataset.equipmentSlot;
            slot.classList.remove("is-valid-drop");

            if (!inventoryId || !row || !item?.equipment_slot || item.equipment_slot !== targetSlot || row.equipped_slot) {
                rejectDrop(slot);
                window.lorgusDraggedInventoryId = null;
                return;
            }

            const { error } = await supabase.rpc("equip_character_item", {
                p_inventory_id: inventoryId,
                p_slot: targetSlot
            });

            window.lorgusDraggedInventoryId = null;

            if (error) {
                rejectDrop(slot);
                console.error("Не удалось экипировать предмет:", error);
                return;
            }

            await renderLorgusInventory();
        });
    });

    document.addEventListener("dragend", clearDragFeedback, { once: true });
}

function updateRpItemUseButton() {
    const label = document.getElementById("lorgus-rp-item-selection"); if (!label) return;
    const ids = Array.from(window.pendingRpItemIds || []);
    label.textContent = ids.length ? "Выбрано предметов: " + ids.length : "";
}


async function loadCharacterCurrency(characterId) {
    const { data, error } = await supabase.from("character_currency")
        .select("currency_code, amount")
        .eq("character_id", characterId)
        .order("currency_code");
    if (error) console.error("Не удалось загрузить валюту:", error);
    return { data: data || [], error };
}

async function loadRpChatParticipants(chat = window.activeRpChatSpace) {
    if (!chat) return [];
    let query = supabase
        .from("rp_presence")
        .select("character_id, presence_type, region, location, from_region, from_location, to_region, to_location, characters(id,name,race)")
        .eq("visibility", "public")
        .eq("presence_type", chat.type);

    if (chat.type === "location") {
        query = query.eq("region", chat.region).eq("location", chat.location);
    } else {
        query = query
            .eq("from_region", chat.fromRegion)
            .eq("from_location", chat.fromLocation)
            .eq("to_region", chat.toRegion)
            .eq("to_location", chat.toLocation);
    }

    const { data, error } = await query;
    if (error) {
        console.error("Не удалось загрузить участников чата:", error);
        return [];
    }
    return (data || []).filter(row => row.character_id && row.character_id !== window.activeCharacterId);
}

async function loadNearbyRpParticipants() {
    const presence = window.activeRpPresence || await getRpPresence();
    if (!presence || presence.type !== "location") return [];
    const { data, error } = await supabase
        .from("rp_presence")
        .select("character_id, characters(id,name,race)")
        .eq("visibility", "public")
        .eq("presence_type", "location")
        .eq("region", presence.region)
        .eq("location", presence.location);
    if (error) {
        console.error("Не удалось загрузить игроков рядом:", error);
        return [];
    }
    return (data || []).filter(row => row.character_id && row.character_id !== window.activeCharacterId);
}

function transferErrorMessage(error) {
    const map = {
        PLAYERS_NOT_IN_SAME_LOCATION: "Игроки должны находиться в одной локации.",
        PLAYERS_NOT_IN_SAME_CHAT: "Получатель не состоит в этом RP-чате.",
        ITEM_MUST_BE_UNEQUIPPED: "Сначала сними предмет с персонажа.",
        INSUFFICIENT_ITEM_QUANTITY: "Недостаточно предметов.",
        RECIPIENT_STACK_FULL: "У получателя нет места в стопке этого предмета.",
        NON_STACKABLE_ITEM: "Этот предмет нельзя передать в таком количестве.",
        INSUFFICIENT_CURRENCY: "Недостаточно валюты.",
        INVALID_AMOUNT: "Укажи корректную сумму.",
        TRANSFER_SELF: "Нельзя передать это самому себе."
    };
    return map[error?.message] || error?.message || "Не удалось выполнить передачу.";
}

async function openRpTransferPicker() {
    const existing = document.querySelector(".lorgus-rp-transfer-overlay"); if (existing) existing.remove();
    const participants = await loadNearbyRpParticipants();
    const { data: inventory, error } = await loadCharacterInventory(window.activeCharacterId);
    if (error) { alert("Не удалось открыть инвентарь:\n\n" + error.message); return; }
    const usable = (inventory || []).filter(row => row.quantity > 0 && !row.equipped_slot);
    const overlay = document.createElement("div"); overlay.className = "lorgus-rp-transfer-overlay";
    overlay.innerHTML = '<div class="lorgus-rp-item-backdrop"></div><article class="lorgus-rp-transfer-panel"><button type="button" class="lorgus-rp-item-close">×</button><span class="lorgus-command-kicker">RP · ПЕРЕДАЧА</span><h2>Передать предмет</h2><p>Передача доступна только персонажу, который сейчас находится рядом с тобой.</p>' +
        '<label>Кому<select class="lorgus-transfer-target"><option value="">Выбери персонажа...</option>' + (participants.length ? participants.map(row => '<option value="' + escapeHtml(row.character_id) + '">' + escapeHtml(row.characters?.name || "Без имени") + (row.characters?.race ? ' · ' + escapeHtml(row.characters.race) : '') + '</option>').join("") : '') + '</select></label>' +
        '<label>Предмет<select class="lorgus-transfer-item"><option value="">Выбери предмет...</option>' + usable.map(row => '<option value="' + escapeHtml(row.id) + '">' + escapeHtml(row.items?.icon || "◆") + ' ' + escapeHtml(row.items?.name || "Предмет") + ' · ' + escapeHtml(inventoryRarityLabel(row.items?.rarity)) + ' · ×' + escapeHtml(String(row.quantity)) + '</option>').join("") + '</select></label>' +
        '<label>Количество<input class="lorgus-transfer-quantity" type="number" min="1" value="1"></label>' +
        '<button type="button" class="gold-button lorgus-transfer-confirm">Передать</button></article>';
    document.body.appendChild(overlay); requestAnimationFrame(() => overlay.classList.add("open"));
    const close=()=>overlay.remove(); overlay.querySelector(".lorgus-rp-item-close").addEventListener("click",close); overlay.querySelector(".lorgus-rp-item-backdrop").addEventListener("click",close);
    const itemSelect=overlay.querySelector(".lorgus-transfer-item"), qty=overlay.querySelector(".lorgus-transfer-quantity");
    itemSelect.addEventListener("change",()=>{ const row=usable.find(x=>x.id===itemSelect.value); qty.max=String(row?.quantity||1); qty.value="1"; });
    overlay.querySelector(".lorgus-transfer-confirm").addEventListener("click",async()=>{
        const target=overlay.querySelector(".lorgus-transfer-target").value, itemId=itemSelect.value, amount=Math.max(1,Number.parseInt(qty.value,10)||1);
        if(!target||!itemId){ alert("Выбери персонажа и предмет."); return; }
        const row=usable.find(x=>x.id===itemId);
        if(!row || amount>row.quantity){ alert("Недостаточно предметов."); return; }
        const { error }=await supabase.rpc("lorgus_transfer_character_item",{p_sender_character_id:window.activeCharacterId,p_recipient_character_id:target,p_inventory_id:itemId,p_quantity:amount});
        if(error){ console.error(error); alert(transferErrorMessage(error)); return; }
        close(); await renderLocationParticipantsIfVisible(); alert("Предмет передан.");
    });
}

async function openRpCurrencyTransferPicker() {
    const existing = document.querySelector(".lorgus-rp-transfer-overlay"); if (existing) existing.remove();
    const participants = await loadRpChatParticipants(window.activeRpChatSpace);
    const { data: balances, error } = await loadCharacterCurrency(window.activeCharacterId);
    if (error) { alert("Не удалось открыть кошелёк:\n\n" + error.message); return; }
    const usable = (balances || []).filter(row => row.amount > 0);
    const overlay = document.createElement("div"); overlay.className = "lorgus-rp-transfer-overlay";
    overlay.innerHTML = '<div class="lorgus-rp-item-backdrop"></div><article class="lorgus-rp-transfer-panel"><button type="button" class="lorgus-rp-item-close">×</button><span class="lorgus-command-kicker">RP · ОБМЕН</span><h2>Передать валюту</h2><p>Передача доступна только персонажу, который сейчас состоит в этом RP-чате.</p>' +
        '<label>Кому<select class="lorgus-transfer-target"><option value="">Выбери персонажа...</option>' + participants.map(row => '<option value="' + escapeHtml(row.character_id) + '">' + escapeHtml(row.characters?.name || "Без имени") + '</option>').join("") + '</select></label>' +
        '<label>Валюта<select class="lorgus-transfer-currency">' + (usable.length ? usable.map(row => '<option value="' + escapeHtml(row.currency_code) + '">' + escapeHtml(lorgusCurrencies[row.currency_code]?.icon || "◆") + ' ' + escapeHtml(lorgusCurrencyLabel(row.currency_code)) + ' · доступно ' + escapeHtml(formatLorgusCurrencyAmount(row.amount)) + '</option>').join("") : '<option value="">Нет валюты</option>') + '</select></label>' +
        '<div class="lorgus-transfer-denominations"><label>Золотые<input class="lorgus-transfer-gold" type="number" min="0" value="0"></label><label>Серебряные<input class="lorgus-transfer-silver" type="number" min="0" value="0"></label><label>Медные<input class="lorgus-transfer-copper" type="number" min="0" value="1"></label></div>' +
        '<button type="button" class="gold-button lorgus-transfer-confirm">Передать</button></article>';
    document.body.appendChild(overlay); requestAnimationFrame(() => overlay.classList.add("open"));
    const close=()=>overlay.remove(); overlay.querySelector(".lorgus-rp-item-close").addEventListener("click",close); overlay.querySelector(".lorgus-rp-item-backdrop").addEventListener("click",close);
    overlay.querySelector(".lorgus-transfer-confirm").addEventListener("click",async()=>{
        const target=overlay.querySelector(".lorgus-transfer-target").value, code=overlay.querySelector(".lorgus-transfer-currency").value;
        const gold=Math.max(0,Number.parseInt(overlay.querySelector(".lorgus-transfer-gold").value,10)||0);
        const silver=Math.max(0,Number.parseInt(overlay.querySelector(".lorgus-transfer-silver").value,10)||0);
        const copper=Math.max(0,Number.parseInt(overlay.querySelector(".lorgus-transfer-copper").value,10)||0);
        const amount=gold*10000+silver*100+copper;
        if(!target||!code){ alert("Выбери персонажа и валюту."); return; }
        if(amount<1){ alert("Укажи сумму передачи."); return; }
        const balance=usable.find(x=>x.currency_code===code)?.amount||0;
        if(amount>balance){ alert("Недостаточно валюты."); return; }
        const chat = window.activeRpChatSpace;
        const { error }=await supabase.rpc("lorgus_transfer_character_currency_in_chat",{
            p_sender_character_id:window.activeCharacterId,
            p_recipient_character_id:target,
            p_currency_code:code,
            p_amount:amount,
            p_presence_type:chat?.type || null,
            p_region:chat?.type === "location" ? chat.region : null,
            p_location:chat?.type === "location" ? chat.location : null,
            p_from_region:chat?.type === "road" ? chat.fromRegion : null,
            p_from_location:chat?.type === "road" ? chat.fromLocation : null,
            p_to_region:chat?.type === "road" ? chat.toRegion : null,
            p_to_location:chat?.type === "road" ? chat.toLocation : null
        });
        if(error){ console.error(error); alert(transferErrorMessage(error)); return; }
        close(); alert("Валюта передана.");
    });
}

async function openRpItemPicker() {
    const existing = document.querySelector(".lorgus-rp-item-overlay"); if (existing) existing.remove();
    const { data, error } = await loadCharacterInventory(window.activeCharacterId);
    if (error) { alert("Не удалось открыть инвентарь:\n\n" + error.message); return; }
    const usable = (data || []).filter(row => row.quantity > 0);
    const overlay = document.createElement("div"); overlay.className = "lorgus-rp-item-overlay";
    overlay.innerHTML = '<div class="lorgus-rp-item-backdrop"></div><article class="lorgus-rp-item-picker"><button type="button" class="lorgus-rp-item-close">×</button><span class="lorgus-command-kicker">RP · ИНВЕНТАРЬ</span><h2>Использовать предмет</h2><p>Выбери предметы, которые будут зафиксированы в этом посте.</p><div class="lorgus-rp-item-picker-list">' +
        (usable.length ? usable.map(row => '<button type="button" class="lorgus-rp-item-choice" data-inventory-id="' + escapeHtml(row.id) + '" style="--item-color:' + escapeHtml(row.items?.color || "#d6b36a") + '"><span class="lorgus-rp-item-choice-icon">' + escapeHtml(row.items?.icon || "◆") + '</span><span><strong>' + escapeHtml(row.items?.name || "Предмет") + '</strong><small>' + escapeHtml(inventoryRarityLabel(row.items?.rarity)) + ' · ' + escapeHtml(inventoryTypeLabel(row.items || {})) + ' · осталось ' + escapeHtml(String(row.quantity)) + '</small></span><i>Добавить</i></button>').join("") : '<div class="lorgus-inventory-empty">Используемых предметов нет.</div>') +
        '</div><div class="lorgus-rp-item-picker-footer"><span class="lorgus-rp-item-picked"></span><button type="button" class="gold-button lorgus-rp-item-confirm">Добавить в пост</button></div></article>';
    document.body.appendChild(overlay); requestAnimationFrame(() => overlay.classList.add("open"));
    const close = () => overlay.remove();
    overlay.querySelector(".lorgus-rp-item-close").addEventListener("click", close);
    overlay.querySelector(".lorgus-rp-item-backdrop").addEventListener("click", close);
    const selected = new Set(window.pendingRpItemIds || []); const picked = overlay.querySelector(".lorgus-rp-item-picked");
    const update = () => { picked.textContent = selected.size ? "Выбрано: " + selected.size : "Ничего не выбрано"; overlay.querySelectorAll(".lorgus-rp-item-choice").forEach(btn => btn.classList.toggle("selected", selected.has(btn.dataset.inventoryId))); };
    overlay.querySelectorAll(".lorgus-rp-item-choice").forEach(btn => btn.addEventListener("click", () => { const id=btn.dataset.inventoryId; if(selected.has(id)) selected.delete(id); else selected.add(id); update(); }));
    overlay.querySelector(".lorgus-rp-item-confirm").addEventListener("click", () => { window.pendingRpItemIds=Array.from(selected); updateRpItemUseButton(); close(); });
    update();
}

async function openAdminCharacterInventory(application, container) {
    const characterId = application.character_id;
    if (!characterId) return;

    const { data: inventory, error: inventoryError } = await supabase
        .from("character_inventory")
        .select("id,character_id,item_id,quantity,equipped_slot,acquired_at,source_note,items(*)")
        .eq("character_id", characterId)
        .order("acquired_at", { ascending: true });

    if (inventoryError) {
        alert("Не удалось загрузить инвентарь:\n\n" + inventoryError.message);
        return;
    }

    const itemTypes = [
        ["helmet","Шлем / голова","equipment"],
        ["armor","Броня / тело","equipment"],
        ["gloves","Перчатки","equipment"],
        ["pants","Штаны / ноги","equipment"],
        ["boots","Обувь","equipment"],
        ["sword","Меч","equipment"],
        ["spear","Копьё","equipment"],
        ["axe","Топор","equipment"],
        ["staff","Посох","equipment"],
        ["bow","Лук","equipment"],
        ["crossbow","Арбалет","equipment"],
        ["shield","Щит","equipment"],
        ["chain","Цепочка","equipment"],
        ["ring","Кольцо","equipment"],
        ["bracelet","Браслет","equipment"],
        ["potion","Зелье","consumable"],
        ["scroll","Свиток","consumable"],
        ["food","Еда","consumable"],
        ["quest_item","Квестовый предмет","quest"],
        ["material","Материал","material"],
        ["misc","Прочее","misc"]
    ];

    const rarities = [
        ["common","Обычный"],
        ["uncommon","Необычный"],
        ["rare","Редкий"],
        ["epic","Эпический"],
        ["legendary","Легендарный"],
        ["mythic","Мифический"],
        ["unique","Уникальный"]
    ];

    const typeLabel = Object.fromEntries(itemTypes.map(([value,label]) => [value,label]));

    const overlay = document.createElement("div");
    overlay.className = "lorgus-admin-inventory-overlay";

    const panel = document.createElement("article");
    panel.className = "lorgus-admin-inventory-panel";
    panel.innerHTML =
        '<button type="button" class="lorgus-admin-inventory-close">×</button>' +
        '<span class="lorgus-command-kicker">АДМИНИСТРАЦИЯ · ИНВЕНТАРЬ</span>' +
        '<h2>' + escapeHtml(application.name || "Персонаж") + '</h2>' +
        '<p>Выдача персонажу. Предметов может быть сколько угодно — здесь нет каталога заранее заданных вещей.</p>' +
        '<div class="lorgus-admin-inventory-grant">' +
            '<input class="lorgus-admin-inventory-name" placeholder="Название предмета">' +
            '<select class="lorgus-admin-inventory-type">' +
                itemTypes.map(([value,label]) => '<option value="' + value + '">' + label + '</option>').join("") +
            '</select>' +
            '<select class="lorgus-admin-inventory-rarity">' +
                rarities.map(([value,label]) => '<option value="' + value + '">' + label + '</option>').join("") +
            '</select>' +
            '<input class="lorgus-admin-inventory-qty" type="number" min="1" value="1" placeholder="Количество">' +
            '<button type="button" class="lorgus-admin-inventory-grant-btn">Выдать</button>' +
        '</div>' +
        '<div class="lorgus-admin-currency-grant">' +
            '<span>КОШЕЛЁК</span>' +
            '<select class="lorgus-admin-currency-code">' +
                Object.entries(lorgusCurrencies).map(([code,c]) => '<option value="' + code + '">' + c.name + ' · ' + c.kingdom + '</option>').join("") +
            '</select>' +
            '<div class="lorgus-admin-currency-denominations">' +
                '<label>Золотые<input class="lorgus-admin-currency-gold" type="number" min="0" step="1" value="0"></label>' +
                '<label>Серебряные<input class="lorgus-admin-currency-silver" type="number" min="0" step="1" value="0"></label>' +
                '<label>Бронзовые<input class="lorgus-admin-currency-bronze" type="number" min="0" step="1" value="100"></label>' +
            '</div>' +
            '<button type="button" class="lorgus-admin-currency-btn">Выдать валюту</button>' +
        '</div>' +
        '<div class="lorgus-admin-currency-list"></div>' +
        '<div class="lorgus-admin-inventory-list"></div>';

    const currencyList = panel.querySelector(".lorgus-admin-currency-list");
    const refreshCurrency = async () => {
        const { data, error } = await loadCharacterCurrency(characterId);
        if (error) { currencyList.innerHTML = '<div class="lorgus-inventory-empty">' + escapeHtml(error.message) + '</div>'; return; }

        const currencies = Object.entries(lorgusCurrencies).map(([code,c]) => {
            const row=(data||[]).find(x=>x.currency_code===code);
            const copper = Math.max(0, Number(row?.amount) || 0);
            return {
                code,
                name: c.name,
                kingdom: c.kingdom,
                icon: c.icon,
                gold: Math.floor(copper / 10000),
                silver: Math.floor((copper % 10000) / 100),
                bronze: copper % 100
            };
        });

        currencyList.innerHTML =
            '<div class="lorgus-admin-currency-table">' +
                '<div class="lorgus-admin-currency-header">' +
                    '<div class="lorgus-admin-currency-label"></div>' +
                    currencies.map(c => '<div class="lorgus-admin-currency-name"><span>' + escapeHtml(c.icon) + '</span><strong>' + escapeHtml(c.name) + '</strong><small>' + escapeHtml(c.kingdom) + '</small></div>').join('') +
                '</div>' +
                '<div class="lorgus-admin-currency-line gold">' +
                    '<strong>Золото</strong>' +
                    currencies.map(c => '<div>' + c.gold + '</div>').join('') +
                '</div>' +
                '<div class="lorgus-admin-currency-line silver">' +
                    '<strong>Серебро</strong>' +
                    currencies.map(c => '<div>' + c.silver + '</div>').join('') +
                '</div>' +
                '<div class="lorgus-admin-currency-line bronze">' +
                    '<strong>Медь</strong>' +
                    currencies.map(c => '<div>' + c.bronze + '</div>').join('') +
                '</div>' +
            '</div>';
    };

    const list = panel.querySelector(".lorgus-admin-inventory-list");

    const refreshInventory = async () => {
        const { data: fresh, error } = await supabase
            .from("character_inventory")
            .select("id,character_id,item_id,quantity,equipped_slot,acquired_at,source_note,items(*)")
            .eq("character_id", characterId)
            .order("acquired_at", { ascending: true });

        if (error) {
            alert("Не удалось обновить инвентарь:\n\n" + error.message);
            return;
        }

        renderInventory(fresh || []);
    };

    const renderInventory = rows => {
        list.innerHTML = rows.length
            ? rows.map(row => {
                const item = row.items || {};
                const slot = row.equipped_slot
                    ? " · " + (inventorySlotLabels[row.equipped_slot] || row.equipped_slot)
                    : "";
                const subtype = typeLabel[item.item_subtype] || item.item_subtype || item.item_type || "Предмет";

                return (
                    '<div class="lorgus-admin-inventory-row">' +
                        '<span class="lorgus-admin-inventory-row-icon" style="--item-color:' + escapeHtml(item.color || "#b8a27a") + '">' +
                            escapeHtml(item.icon || "◆") +
                        '</span>' +
                        '<div>' +
                            '<strong>' + escapeHtml(item.name || "Предмет") + '</strong>' +
                            '<small>' + escapeHtml(inventoryRarityLabel(item.rarity)) + ' · ' + escapeHtml(subtype) + ' · ×' + escapeHtml(String(row.quantity)) + escapeHtml(slot) + '</small>' +
                        '</div>' +
                        '<button type="button" data-id="' + escapeHtml(row.id) + '">Забрать</button>' +
                    '</div>'
                );
            }).join("")
            : '<div class="lorgus-inventory-empty">Инвентарь пуст.</div>';

        list.querySelectorAll("button[data-id]").forEach(button => {
            button.addEventListener("click", async () => {
                if (!confirm("Забрать этот предмет?")) return;

                const { error } = await supabase.rpc("admin_revoke_character_item", {
                    p_inventory_id: button.dataset.id,
                    p_quantity: null
                });

                if (error) {
                    alert("Не удалось забрать предмет:\n\n" + error.message);
                    return;
                }

                await refreshInventory();
            });
        });
    };

    renderInventory(inventory || []);
    await refreshCurrency();
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("open"));

    const close = () => overlay.remove();
    panel.querySelector(".lorgus-admin-inventory-close").addEventListener("click", close);

    panel.querySelector(".lorgus-admin-currency-btn").addEventListener("click", async () => {
        const code=panel.querySelector(".lorgus-admin-currency-code").value;
        const gold=Number.parseInt(panel.querySelector(".lorgus-admin-currency-gold").value,10) || 0;
        const silver=Number.parseInt(panel.querySelector(".lorgus-admin-currency-silver").value,10) || 0;
        const bronze=Number.parseInt(panel.querySelector(".lorgus-admin-currency-bronze").value,10) || 0;
        if(gold<0 || silver<0 || bronze<0 || (gold===0 && silver===0 && bronze===0)){ alert("Укажи хотя бы одну ненулевую монету."); return; }
        const amount=(gold*10000)+(silver*100)+bronze;
        const { error }=await supabase.rpc("admin_grant_character_currency",{p_character_id:characterId,p_currency_code:code,p_amount:amount});
        if(error){ alert("Не удалось изменить валюту:\n\n"+error.message); return; }
        await refreshCurrency();
        panel.querySelector(".lorgus-admin-currency-gold").value="0";
        panel.querySelector(".lorgus-admin-currency-silver").value="0";
        panel.querySelector(".lorgus-admin-currency-bronze").value="0";
    });

    panel.querySelector(".lorgus-admin-inventory-grant-btn").addEventListener("click", async () => {
        const nameInput = panel.querySelector(".lorgus-admin-inventory-name");
        const typeInput = panel.querySelector(".lorgus-admin-inventory-type");
        const rarityInput = panel.querySelector(".lorgus-admin-inventory-rarity");
        const quantityInput = panel.querySelector(".lorgus-admin-inventory-qty");
        const name = nameInput.value.trim();
        const subtype = typeInput.value;
        const rarity = rarityInput.value;
        const quantity = Math.max(1, Number(quantityInput.value) || 1);

        if (!name) {
            alert("Укажи название предмета.");
            nameInput.focus();
            return;
        }

        const { error } = await supabase.rpc("admin_create_and_grant_character_item", {
            p_character_id: characterId,
            p_name: name,
            p_type: subtype,
            p_quantity: quantity,
            p_rarity: rarity,
            p_subtype: subtype
        });

        if (error) {
            alert("Не удалось выдать предмет:\n\n" + error.message);
            return;
        }

        nameInput.value = "";
        rarityInput.value = "common";
        quantityInput.value = "1";
        await refreshInventory();
    });
}
async function loadAdminItemUseLog(container) {
    const box=container.querySelector("#admin-item-use-log"); if(!box)return;
    const {data,error}=await supabase.from("rp_message_item_uses").select("id,message_id,character_id,item_id,quantity,consumed,status,used_at,reverted_at,revert_reason,items(name,icon,color,rarity),characters(name),rp_messages(body,created_at,status)").order("used_at",{ascending:false}).limit(200);
    if(error){box.innerHTML='<div class="admin-empty"><h2>Журнал недоступен</h2><p>'+escapeHtml(error.message)+'</p></div>';return;}
    box.innerHTML=data?.length?data.map(row=>{const item=row.items||{},char=row.characters||{},post=row.rp_messages||{};return '<article class="admin-item-use-entry '+(row.status==="reverted"?"reverted":"")+'"><div class="admin-item-use-icon" style="--item-color:'+escapeHtml(item.color||"#d6b36a")+'">'+escapeHtml(item.icon||"◆")+'</div><div class="admin-item-use-body"><strong>'+escapeHtml(item.name||"Предмет")+'</strong><span>'+escapeHtml(char.name||"Персонаж")+' · пост #'+escapeHtml(String(row.message_id))+' · '+escapeHtml(new Date(row.used_at).toLocaleString("ru-RU"))+'</span><p>'+escapeHtml(post.body||"")+'</p><small>'+(row.consumed?"Предмет расходуется":"Предмет не расходуется")+(row.status==="reverted"?" · ОТКАТ ВЫПОЛНЕН":"")+'</small></div><div class="admin-item-use-action">'+(row.status==="active"?'<button type="button" data-message-id="'+escapeHtml(String(row.message_id))+'">Отменить пост</button>':'<span>Отменено</span>')+'</div></article>';}).join(""):'<div class="admin-empty"><h2>Использований пока нет</h2><p>Когда игрок применит предмет в RP-посте, запись появится здесь.</p></div>';
    box.querySelectorAll("button[data-message-id]").forEach(button=>button.addEventListener("click",async()=>{const reason=prompt("Почему пост и использование предмета отменяются?","");if(reason===null)return;button.disabled=true;const {error}=await supabase.rpc("admin_revert_rp_message",{p_message_id:Number(button.dataset.messageId),p_reason:reason.trim()});if(error){alert("Не удалось отменить пост:\n\n"+error.message);button.disabled=false;return;}await loadAdminItemUseLog(container);}));
}

/* =========================================================
   ПИСЬМА И ГОЛУБИНАЯ ПОЧТА
   ========================================================= */

async function renderMail() {
    const container = document.getElementById("cabinet-content");
    if (!container || !window.activeCharacter) return;

    const character = window.activeCharacter;
    const name = escapeHtml(character.name || "Без имени");

    container.className = "lorgus-mail-page";
    container.innerHTML = `
        <div class="lorgus-world-shell">
            <aside class="lorgus-world-sidebar">
                <div class="lorgus-world-sidebar-symbol">✉</div>
                <div class="lorgus-world-sidebar-label">ПЕРСОНАЖ</div>
                <div class="lorgus-world-sidebar-name">${name}</div>
                <p class="lorgus-world-sidebar-meta">Почта персонажа и послания, доставленные голубями.</p>
                <button class="character-secondary-button lorgus-world-sidebar-button" type="button" onclick="returnToGame()">
                    ← Вернуться к миру
                </button>
            </aside>

            <main class="lorgus-world-browser">
                <header class="lorgus-world-header">
                    <span class="lorgus-world-kicker">СВЯЗЬ</span>
                    <h1>Письма</h1>
                    <p>Вне зависимости от расстояния персонажи могут отправлять друг другу послания. Голубь не появляется мгновенно: письмо сначала летит к адресату.</p>
                </header>

                <section class="lorgus-mail-layout">
                    <div class="lorgus-mail-compose">
                        <div class="lorgus-world-section-title">НОВОЕ ПОСЛАНИЕ</div>
                        <label for="lorgus-mail-recipient">Кому</label>
                        <select id="lorgus-mail-recipient">
                            <option value="">Загрузка персонажей...</option>
                        </select>

                        <label for="lorgus-mail-body">Текст письма</label>
                        <textarea id="lorgus-mail-body" rows="10" maxlength="10000" placeholder="Напиши то, что должен узнать другой персонаж..."></textarea>

                        <div class="lorgus-mail-compose-footer">
                            <span>🕊 Голубиная почта</span>
                            <button class="gold-button" type="button" onclick="sendLorgusMail()">Отправить голубя</button>
                        </div>
                        <div id="lorgus-mail-status" class="lorgus-mail-status"></div>
                    </div>

                    <div class="lorgus-mail-inbox">
                        <div class="lorgus-world-section-title">ВХОДЯЩИЕ</div>
                        <div id="lorgus-mail-inbox-list" class="lorgus-mail-list">
                            <div class="lorgus-empty-location">
                                <span>✉</span>
                                <h2>Загрузка почты...</h2>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    `;

    await loadMailRecipients();
    await loadMailInbox();
}

async function loadMailRecipients() {
    const select = document.getElementById("lorgus-mail-recipient");
    if (!select) return;

    // Статус персонажа хранится не в characters, а в character_applications.
    // Для почты показываем только персонажей с одобренной заявкой.
    const { data: applications, error: applicationsError } = await supabase
        .from("character_applications")
        .select("character_id")
        .eq("status", "approved")
        .not("character_id", "is", null);

    if (applicationsError) {
        console.error("Не удалось загрузить одобренные заявки:", applicationsError);
        select.innerHTML = `<option value="">Не удалось загрузить персонажей: ${escapeHtml(applicationsError.message)}</option>`;
        return;
    }

    const characterIds = [...new Set(
        (applications || [])
            .map(application => application.character_id)
            .filter(Boolean)
            .filter(id => String(id) !== String(window.activeCharacterId))
    )];

    if (!characterIds.length) {
        select.innerHTML = '<option value="">Нет доступных адресатов</option>';
        return;
    }

    const { data: characters, error: charactersError } = await supabase
        .from("characters")
        .select("id, name, race")
        .in("id", characterIds)
        .order("name", { ascending: true });

    if (charactersError) {
        console.error("Не удалось загрузить персонажей:", charactersError);
        select.innerHTML = `<option value="">Не удалось загрузить персонажей: ${escapeHtml(charactersError.message)}</option>`;
        return;
    }

    if (!characters?.length) {
        select.innerHTML = '<option value="">Нет доступных адресатов</option>';
        return;
    }

    select.innerHTML =
        '<option value="">Выбери персонажа</option>' +
        characters.map(character =>
            `<option value="${escapeHtml(character.id)}">${escapeHtml(character.name || "Без имени")} · ${escapeHtml(character.race || "персонаж")}</option>`
        ).join("");
}

function formatMailDate(value) {
    if (!value) return "";
    return new Date(value).toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}

async function loadMailInbox() {
    const list = document.getElementById("lorgus-mail-inbox-list");
    if (!list || !window.activeCharacterId) return;

    const { data, error } = await supabase
        .from("lorgus_mail")
        .select("id, sender_character_id, recipient_character_id, body, method, sent_at, deliver_at, delivered_at, read_at, sender:characters!lorgus_mail_sender_character_id_fkey(name)")
        .eq("recipient_character_id", window.activeCharacterId)
        .order("sent_at", { ascending: false })
        .limit(100);

    if (error) {
        console.error("Не удалось загрузить письма:", error);
        list.innerHTML = `<div class="lorgus-empty-location"><span>!</span><h2>Почта пока не готова</h2><p>${escapeHtml(error.message)}</p><small>После создания таблицы lorgus_mail здесь появятся письма.</small></div>`;
        return;
    }

    if (!data?.length) {
        list.innerHTML = '<div class="lorgus-empty-location"><span>✉</span><h2>Почтовый ящик пуст</h2><p>Ни одного послания пока не доставлено.</p></div>';
        return;
    }

    const now = Date.now();

    list.innerHTML = data.map(mail => {
        const delivered = mail.delivered_at || new Date(mail.deliver_at).getTime() <= now;
        const sender = mail.sender?.name || "Неизвестный отправитель";
        const unread = !mail.read_at && delivered;

        return `
            <article class="lorgus-mail-card ${unread ? "unread" : ""}" data-mail-id="${escapeHtml(mail.id)}">
                <div class="lorgus-mail-card-top">
                    <strong>${escapeHtml(sender)}</strong>
                    <span>${delivered ? "Доставлено" : "В пути"}</span>
                </div>
                <div class="lorgus-mail-card-meta">
                    ${mail.method === "pigeon" ? "🕊 Голубь" : "✉ Письмо"} · отправлено ${formatMailDate(mail.sent_at)}
                    ${delivered ? " · доставлено " + formatMailDate(mail.delivered_at || mail.deliver_at) : " · прибудет " + formatMailDate(mail.deliver_at)}
                </div>
                <p>${escapeHtml(mail.body)}</p>
                ${unread ? '<button class="character-secondary-button" type="button" onclick="markLorgusMailRead(\'' + escapeHtml(mail.id) + '\')">Прочитано</button>' : ""}
            </article>
        `;
    }).join("");
}

async function sendLorgusMail() {
    const recipient = document.getElementById("lorgus-mail-recipient")?.value;
    const bodyInput = document.getElementById("lorgus-mail-body");
    const status = document.getElementById("lorgus-mail-status");

    if (!recipient || !bodyInput) return;

    const body = bodyInput.value.trim();
    if (!body) {
        if (status) status.textContent = "Письмо не может быть пустым.";
        return;
    }

    if (recipient === window.activeCharacterId) {
        if (status) status.textContent = "Нельзя отправить письмо самому себе.";
        return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    const now = new Date();
    const deliverAt = new Date(now.getTime() + 5 * 60 * 1000);

    const { error } = await supabase
        .from("lorgus_mail")
        .insert({
            sender_character_id: window.activeCharacterId,
            sender_player_id: userData.user.id,
            recipient_character_id: recipient,
            body,
            method: "pigeon",
            sent_at: now.toISOString(),
            deliver_at: deliverAt.toISOString()
        });

    if (error) {
        console.error("Не удалось отправить письмо:", error);
        if (status) status.textContent = "Не удалось отправить письмо: " + error.message;
        return;
    }

    bodyInput.value = "";
    if (status) status.textContent = "Голубь отправлен. Письмо прибудет позже.";
}

async function markLorgusMailRead(mailId) {
    const { error } = await supabase
        .from("lorgus_mail")
        .update({ read_at: new Date().toISOString() })
        .eq("id", mailId)
        .eq("recipient_character_id", window.activeCharacterId);

    if (error) {
        console.error("Не удалось отметить письмо прочитанным:", error);
        return;
    }

    await loadMailInbox();
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
    localStorage.removeItem("lorgus_active_character_id");
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
window.openLorgusNotifications = openLorgusNotifications;
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
window.enterLocationRp = enterLocationRp;
window.sendLocalRpMessage = sendLocalRpMessage;
window.renderFloodChat = renderFloodChat;
window.sendLocalFloodMessage = sendLocalFloodMessage;
window.renderRoadChat = renderRoadChat;
window.startTravel = startTravel;
window.arriveAtDestination = arriveAtDestination;
window.getRpPresence = getRpPresence;
window.renderWorldCharacterTracker = renderWorldCharacterTracker;
window.renderMail = renderMail;
window.sendLorgusMail = sendLorgusMail;
window.markLorgusMailRead = markLorgusMailRead;


/* =========================================================
   ЗАПУСК
   ========================================================= */

initialize();


/* =========================================================
   LORGUS 2.1 — CINEMATIC WORLD MAP
   Карта остаётся исходным PNG. Игровые элементы лежат
   отдельным слоем поверх неё.
   ========================================================= */

function selectLorgusMapRegion(region) {
    const title = document.getElementById("lorgus-map-selection-title");
    const text = document.getElementById("lorgus-map-selection-text");
    const buttons = document.querySelectorAll(".lorgus-map-region-button");

    buttons.forEach(button => {
        button.classList.toggle("active", button.dataset.region === region);
    });

    const descriptions = {
        "Атэрон": "Знания, древности, исследования и руины.",
        "Каэлор": "Горы, кузницы, шахты и древнее мастерство.",
        "Ксандр": "Торговля, банки, дороги и большие рынки.",
        "Лирэн": "Леса, плодородные земли и древняя природа.",
        "Морвейн": "Паломничество, память и туманные долины.",
        "Святые Земли": "Нейтральная территория для переговоров монархов и глав церквей.",
        "Спорные Земли": "Независимые поселения и территории вне власти пяти королевств."
    };

    if (title) title.textContent = region;
    if (text) text.textContent = descriptions[region] || "Выбери край мира, чтобы узнать больше.";

    const enterButton = document.getElementById("lorgus-map-enter-button");
    if (!enterButton) return;

    const openable = Object.prototype.hasOwnProperty.call(descriptions, region);
    enterButton.disabled = !openable;
    enterButton.textContent = openable ? "Открыть край" : "Территория закрыта";
    enterButton.onclick = openable ? () => renderKingdomLocations(region) : null;
}

const LORGUS_MAP_MARKERS = [
    { id:"Атэрон", x:22, y:34, type:"kingdom", description:"Знания, древности, исследования и руины." },
    { id:"Каэлор", x:72, y:27, type:"kingdom", description:"Горы, кузницы, шахты и древнее мастерство." },
    { id:"Ксандр", x:79, y:61, type:"kingdom", description:"Торговля, банки, дороги и большие рынки." },
    { id:"Лирэн", x:31, y:69, type:"kingdom", description:"Леса, плодородные земли и древняя природа." },
    { id:"Морвейн", x:51, y:82, type:"kingdom", description:"Паломничество, память и туманные долины." },
    { id:"Святые Земли", x:52, y:50, type:"neutral", description:"Нейтральная территория для переговоров монархов и глав церквей." },
    { id:"Спорные Земли", x:62, y:66, type:"contested", description:"Независимые поселения и территории вне власти пяти королевств." }
];

const LORGUS_MAP_EDITOR_RECTS = [
    { id:"Атэрон", x:62.5, y:62.1, w:11.8, h:6.0, rotation:0 },
    { id:"Каэлор", x:62.0, y:69.7, w:11.9, h:6.3, rotation:0 },
    { id:"Ксандр", x:48.4, y:60.6, w:6.7, h:8.2, rotation:0 },
    { id:"Лирэн", x:25.4, y:56.0, w:17.2, h:8.9, rotation:0 },
    { id:"Морвейн", x:69.9, y:42.8, w:12.2, h:10.6, rotation:0 },
    { id:"Святые Земли", x:51.9, y:45.2, w:3.4, h:3.4, rotation:0 },
    { id:"Спорные Земли", x:54.6, y:31.5, w:6.1, h:5.3, rotation:0 }
];
function enableLorgusMapEditor() {
    const layer = document.getElementById("lorgus-map-marker-layer");
    const viewport = document.getElementById("lorgus-map-viewport");
    if (!layer || !viewport) return;

    layer.classList.toggle("editor-mode");
    const active = layer.classList.contains("editor-mode");
    const button = document.getElementById("lorgus-map-editor-toggle");
    if (button) button.textContent = active ? "✓ РЕДАКТОР ВКЛЮЧЁН" : "✎ РЕДАКТОР КАРТЫ";

    renderLorgusMapEditorRects(active);
}

function bindLorgusMapEditorInteraction(label, rectData, layer) {
    if (!label || !rectData || !layer) return;

    let drag = null;

    const start = (event, mode) => {
        if (!layer.classList.contains("editor-mode")) return;
        event.preventDefault();
        event.stopPropagation();

        const layerRect = layer.getBoundingClientRect();
        drag = {
            mode,
            startX: event.clientX,
            startY: event.clientY,
            x: rectData.x,
            y: rectData.y,
            w: rectData.w,
            h: rectData.h,
            layerW: layerRect.width,
            layerH: layerRect.height,
            moved: false
        };

        label.setPointerCapture?.(event.pointerId);
        label.classList.add("editing");
    };

    label.addEventListener("pointerdown", event => {
        if (event.target.closest(".lorgus-map-editor-handle")) return;
        start(event, "move");
    });

    const handle = document.createElement("span");
    handle.className = "lorgus-map-editor-handle";
    handle.title = "Изменить размер";
    label.appendChild(handle);

    handle.addEventListener("pointerdown", event => {
        start(event, "resize");
    });

    label.addEventListener("pointermove", event => {
        if (!drag) return;

        const dx = ((event.clientX - drag.startX) / drag.layerW) * 100;
        const dy = ((event.clientY - drag.startY) / drag.layerH) * 100;

        if (Math.abs(dx) + Math.abs(dy) > 0.15) drag.moved = true;

        if (drag.mode === "move") {
            rectData.x = Math.max(0, Math.min(100, drag.x + dx));
            rectData.y = Math.max(0, Math.min(100, drag.y + dy));
        } else {
            rectData.w = Math.max(1, Math.min(40, drag.w + dx));
            rectData.h = Math.max(1, Math.min(40, drag.h + dy));
        }

        label.style.left = rectData.x + "%";
        label.style.top = rectData.y + "%";
        label.style.width = rectData.w + "%";
        label.style.height = rectData.h + "%";
        fitLorgusMapLabel(label);
        updateLorgusMapEditorReadout(rectData);
    });

    const stop = event => {
        if (!drag) return;
        label.classList.remove("editing");
        label.dataset.moved = drag.moved ? "1" : "0";
        drag = null;
        if (event) updateLorgusMapEditorReadout(rectData);
    };

    label.addEventListener("pointerup", stop);
    label.addEventListener("pointercancel", stop);

    label.addEventListener("click", event => {
        if (label.dataset.moved === "1") {
            event.preventDefault();
            event.stopPropagation();
            label.dataset.moved = "0";
        }
    });
}

function updateLorgusMapEditorReadout(rectData) {
    const readout = document.getElementById("lorgus-map-editor-readout");
    if (!readout || !rectData) return;

    readout.innerHTML =
        "<strong>" + escapeHtml(rectData.id) + "</strong>" +
        "<span>X " + rectData.x.toFixed(1) + " · Y " + rectData.y.toFixed(1) +
        " · W " + rectData.w.toFixed(1) + " · H " + rectData.h.toFixed(1) + "</span>";
}

function syncLorgusMapLabelLayer() {
    const world = document.getElementById("lorgus-map-world");
    const image = world?.querySelector(".lorgus-map-image");
    const layer = document.getElementById("lorgus-map-marker-layer");

    if (!world || !image || !layer || !image.complete) return;

    // Координаты подписей относятся именно к PNG, а не ко всему viewport.
    // Это важно, когда object-fit: contain оставляет поля по краям.
    layer.style.left = image.offsetLeft + "px";
    layer.style.top = image.offsetTop + "px";
    layer.style.width = image.offsetWidth + "px";
    layer.style.height = image.offsetHeight + "px";
}

function fitLorgusMapLabel(label) {
    if (!label) return;

    const maxWidth = Math.max(20, label.clientWidth - 10);
    const maxHeight = Math.max(14, label.clientHeight - 6);
    const textLength = Math.max(1, (label.textContent || "").trim().length);

    // Размер названия напрямую зависит от размеров рамки.
    // Ширина учитывается через длину текста, а не через scrollWidth,
    // чтобы браузерное переносы строк не ужимали шрифт до крошечного размера.
    const heightSize = maxHeight * 0.78;
    const widthSize = maxWidth / Math.max(3.8, textLength * 0.52);

    let size = Math.min(56, Math.max(12, heightSize, widthSize));
    label.style.fontSize = size + "px";

    // Только реальный выход за границы уменьшает размер.
    while (
        size > 12 &&
        (label.scrollWidth > label.clientWidth + 2 || label.scrollHeight > label.clientHeight + 2)
    ) {
        size -= 1;
        label.style.fontSize = size + "px";
    }
}

function renderLorgusMapEditorRects() {
    const layer = document.getElementById("lorgus-map-marker-layer");
    const image = document.querySelector("#lorgus-map-world .lorgus-map-image");
    if (!layer || !image) return;

    layer.querySelectorAll(".lorgus-map-editor-rect").forEach(el => el.remove());

    const render = () => {
        syncLorgusMapLabelLayer();

        LORGUS_MAP_EDITOR_RECTS.forEach(rectData => {
            const label = document.createElement("button");
            label.type = "button";
            label.className = "lorgus-map-editor-rect";
            label.dataset.region = rectData.id;
            label.textContent = rectData.id;

            label.style.left = rectData.x + "%";
            label.style.top = rectData.y + "%";
            label.style.width = rectData.w + "%";
            label.style.height = rectData.h + "%";
            label.style.transform = "translate(-50%,-50%)";

            label.onclick = event => {
                event.preventDefault();
                event.stopPropagation();

                if (typeof window.selectLorgusMapRegion === "function") {
                    window.selectLorgusMapRegion(rectData.id);
                }
            };

            layer.appendChild(label);

            if (layer.classList.contains("editor-mode")) {
                bindLorgusMapEditorInteraction(label, rectData, layer);
            }
        });

        requestAnimationFrame(() => {
            syncLorgusMapLabelLayer();
            layer.querySelectorAll(".lorgus-map-editor-rect").forEach(fitLorgusMapLabel);
        });
    };

    if (image.complete) {
        render();    } else {
        image.addEventListener("load", render, { once: true });
    }
    if (window.lorgusMapLabelResizeObserver) {
        window.lorgusMapLabelResizeObserver.disconnect();
    }

    const world = document.getElementById("lorgus-map-world");
    if (!world) return;

    window.lorgusMapLabelResizeObserver = new ResizeObserver(() => {
        syncLorgusMapLabelLayer();
        layer.querySelectorAll(".lorgus-map-editor-rect").forEach(fitLorgusMapLabel);
    });

    window.lorgusMapLabelResizeObserver.observe(image);
    window.lorgusMapLabelResizeObserver.observe(world);
}
function addLorgusMapEditorUI() {
    const controls = document.querySelector(".lorgus-map-controls");
    if (!controls || document.getElementById("lorgus-map-editor-toggle")) return;

    controls.innerHTML = "";

    const button = document.createElement("button");
    button.id = "lorgus-map-editor-toggle";
    button.type = "button";
    button.className = "lorgus-map-control lorgus-map-editor-toggle";
    button.textContent = "✎ РЕДАКТОР КАРТЫ";
    button.onclick = enableLorgusMapEditor;
    controls.appendChild(button);

    const readout = document.createElement("div");
    readout.id = "lorgus-map-editor-readout";
    readout.className = "lorgus-map-editor-readout";
    readout.innerHTML = "<strong>РЕДАКТОР ВЫКЛЮЧЕН</strong><span>Нажми кнопку, затем перетаскивай названия</span>";
    controls.appendChild(readout);
}

function renderLorgusMapMarkers() {
    const layer = document.getElementById("lorgus-map-marker-layer");
    if (!layer) return;

    layer.innerHTML = LORGUS_MAP_MARKERS.map(marker => `
        <button
            type="button"
            class="lorgus-map-marker ${marker.type}"
            style="left:${marker.x}%;top:${marker.y}%"
            data-region="${escapeHtml(marker.id)}"
            onclick="selectLorgusMapMarker('${escapeHtml(marker.id)}')"
            title="${escapeHtml(marker.id)}"
            aria-label="Открыть ${escapeHtml(marker.id)}"
        >
            <span class="lorgus-map-marker-pulse"></span>
            <span class="lorgus-map-marker-core"></span>
            <span class="lorgus-map-marker-label">${escapeHtml(marker.id)}</span>
        </button>
    `).join("");

    const presence = window.activeRpPresence;
    if (presence?.type === "location" && presence.location) {
        const current = layer.querySelector(`[data-region="${CSS.escape(presence.location)}"]`);
        current?.classList.add("current");
    }
}

function selectLorgusMapMarker(region) {
    selectLorgusMapRegion(region);
    const marker = document.querySelector(`.lorgus-map-marker[data-region="${CSS.escape(region)}"]`);
    document.querySelectorAll(".lorgus-map-marker").forEach(item => item.classList.remove("selected"));
    marker?.classList.add("selected");
}

function handleLorgusMapSurfaceClick(event) {
    if (event.target.closest(".lorgus-map-marker")) return;
    const viewport = document.getElementById("lorgus-map-viewport");
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    const x = Math.round(((event.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((event.clientY - rect.top) / rect.height) * 100);
    const hint = document.getElementById("lorgus-map-surface-hint");
    if (hint) {
        hint.textContent = `ТОЧКА КАРТЫ · ${Math.max(0,Math.min(100,x))}% / ${Math.max(0,Math.min(100,y))}%`;
        hint.classList.add("visible");
        clearTimeout(window.lorgusMapHintTimer);
        window.lorgusMapHintTimer = setTimeout(() => hint.classList.remove("visible"), 1800);
    }
}

function renderLorgusWorldMap(container, character) {
    if (!container || !character) return;

    container.className = "lorgus-map-page";

    const name = escapeHtml(character.name || "Без имени");
    const race = escapeHtml(character.race || "Раса не указана");
    const homeland = escapeHtml(character.homeland || "Родина не указана");

    const presence = window.activeRpPresence;
    const currentLocation =
        presence?.type === "location"
            ? presence.location
            : presence?.type === "road"
                ? "В пути"
                : "Местоположение ещё не определено";

    container.innerHTML = `
        ${renderLorgusInterfaceNav("world")}
        <div class="lorgus-map-shell">
            <aside class="lorgus-map-sidebar">
                <div class="lorgus-map-brand">
                    <span class="lorgus-map-brand-mark">✦</span>
                    <span>ЛОРГУС</span>
                </div>

                <div class="lorgus-map-character">
                    <span class="lorgus-map-kicker">ПУТЬ ПЕРСОНАЖА</span>
                    <h1>${name}</h1>
                    <p>${race} · ${homeland}</p>
                    <div class="lorgus-character-seal" aria-hidden="true"><span>✦</span></div>
                </div>

                <div class="lorgus-map-location-status">
                    <span>ТЕКУЩЕЕ МЕСТОПОЛОЖЕНИЕ</span>
                    <strong>${escapeHtml(currentLocation)}</strong>
                    <small>Положение персонажа в мире</small>
                </div>
                <div class="lorgus-map-world-stats">
                    <div><strong>07</strong><span>КРАЁВ</span></div>
                    <div><strong>01</strong><span>ЗАКРЫТ</span></div>
                    <div><strong>∞</strong><span>ПУТЕЙ</span></div>
                </div>

                <div class="lorgus-map-divider"></div>

                <button class="gold-button lorgus-map-side-button" type="button" onclick="openActiveCharacterProfile()">Профиль</button>
                <button class="character-secondary-button lorgus-map-side-button" type="button" onclick="renderWorldCharacterTracker()">Люди мира</button>
                <button class="character-secondary-button lorgus-map-side-button" type="button" onclick="renderMail()">Письма</button>
                <button class="character-secondary-button lorgus-map-side-button" type="button" onclick="switchCharacter()">Сменить персонажа</button>
            </aside>

            <main class="lorgus-map-main">
                <header class="lorgus-map-header">
                    <div>
                        <span class="lorgus-map-kicker">МИР ЛОРГУСА · КАРТА</span>
                        <h2>Лоргус</h2>
                    </div>
                    <div class="lorgus-map-header-actions">
                        <div class="lorgus-map-header-status">
                            <span class="lorgus-map-status-dot"></span>
                            <span>МИР АКТИВЕН</span>
                        </div>
                    </div>
                </header>

                <section class="lorgus-map-stage">
                    <div class="lorgus-map-frame">
                        <div class="lorgus-map-image-wrap" id="lorgus-map-viewport" >
                            <div class="lorgus-map-atmosphere" aria-hidden="true"><i></i><i></i><i></i></div>
                            <div class="lorgus-map-world" id="lorgus-map-world">
                                <img class="lorgus-map-image" src="/assets/world/nerovland-map.png" alt="Карта Лоргуса" draggable="false">
                                <div class="lorgus-map-marker-layer" id="lorgus-map-marker-layer" aria-label="Обозначения карты"></div>
                            </div>
                            <div class="lorgus-map-surface-hint" id="lorgus-map-surface-hint">ТОЧКА КАРТЫ</div>
                            <div class="lorgus-map-overlay">
                                <div class="lorgus-map-corner-mark top-left">L · 001</div>
                                <div class="lorgus-map-corner-mark top-right">CARTA MUNDI</div>
                                <div class="lorgus-map-corner-mark bottom-left">ЛОРГУС / WORLD</div>
                                <div class="lorgus-map-corner-mark bottom-right">07 REGIONS</div>
                                <div class="lorgus-map-compass" aria-hidden="true"><span>N</span><i></i></div>
                                <div class="lorgus-map-scale"><span></span><small>МИР</small></div>
                            </div>
                        </div>

                        <div class="lorgus-map-controls" aria-label="Управление картой">

                        </div>

                        <div class="lorgus-map-hint">
                            <span>КАРТА МИРА</span>
                            <small>Статичная карта · территории выбираются нажатием</small>
                        </div>
                    </div>

                    <aside class="lorgus-map-inspector">
                        <span class="lorgus-map-kicker">ВЫБРАННЫЙ КРАЙ</span>
                        <div class="lorgus-map-selection-symbol"><span>◇</span><i></i></div>
                        <h3 id="lorgus-map-selection-title">Атэрон</h3>
                        <p id="lorgus-map-selection-text">Знания, древности, исследования и руины.</p>
                        <div class="lorgus-map-inspector-meta">
                            <span>СТАТУС</span><strong>ОТКРЫТ ДЛЯ ИССЛЕДОВАНИЯ</strong>
                        </div>

                        <button id="lorgus-map-enter-button" class="gold-button lorgus-map-enter-button" type="button" onclick="renderKingdomLocations('Атэрон')">Открыть край</button>

                        <div class="lorgus-map-regions">
                            <span class="lorgus-map-regions-title">РЕГИОНЫ</span>
                            <button class="lorgus-map-region-button active" data-region="Атэрон" type="button" onclick="selectLorgusMapRegion('Атэрон')"><i></i><span>Атэрон</span></button>
                            <button class="lorgus-map-region-button" data-region="Каэлор" type="button" onclick="selectLorgusMapRegion('Каэлор')"><i></i><span>Каэлор</span></button>
                            <button class="lorgus-map-region-button" data-region="Ксандр" type="button" onclick="selectLorgusMapRegion('Ксандр')"><i></i><span>Ксандр</span></button>
                            <button class="lorgus-map-region-button" data-region="Лирэн" type="button" onclick="selectLorgusMapRegion('Лирэн')"><i></i><span>Лирэн</span></button>
                            <button class="lorgus-map-region-button" data-region="Морвейн" type="button" onclick="selectLorgusMapRegion('Морвейн')"><i></i><span>Морвейн</span></button>
                            <button class="lorgus-map-region-button" data-region="Святые Земли" type="button" onclick="selectLorgusMapRegion('Святые Земли')"><i></i><span>Святые Земли</span></button>
                            <button class="lorgus-map-region-button" data-region="Спорные Земли" type="button" onclick="selectLorgusMapRegion('Спорные Земли')"><i></i><span>Спорные Земли</span></button>
                        </div>

                        <div class="lorgus-map-closed">
                            <span>ЗАКРЫТАЯ ТЕРРИТОРИЯ</span>
                            <strong>Геена</strong>
                            <p>Континент закрыт для игроков. Посещение и происхождение персонажа здесь недоступны.</p>
                        </div>
                    </aside>
                </section>
            </main>
        </div>
    `;

    selectLorgusMapRegion("Атэрон");
    initializeLorgusMapViewport();
    renderLorgusMapEditorRects(false);
    addLorgusMapEditorUI();
}

let lorgusMapScale = 1;
let lorgusMapOffsetX = 0;
let lorgusMapOffsetY = 0;
let lorgusMapViewportCleanup = null;

function initializeLorgusMapViewport() {
    if (lorgusMapViewportCleanup) {
        lorgusMapViewportCleanup();
        lorgusMapViewportCleanup = null;
    }

    lorgusMapScale = 1;
    lorgusMapOffsetX = 0;
    lorgusMapOffsetY = 0;

    const world = document.getElementById("lorgus-map-world");
    if (world) {
        world.style.transform = "translate3d(0,0,0) scale(1)";
    }

    syncLorgusMapLabelLayer();
    requestAnimationFrame(syncLorgusMapLabelLayer);
}

function lorgusMapZoom(factor) {
    lorgusMapScale = Math.min(3.2, Math.max(.8, lorgusMapScale * factor));
    const world = document.querySelector(".lorgus-map-world");
    if (world) {
        world.style.transform = `translate3d(${lorgusMapOffsetX}px,${lorgusMapOffsetY}px,0) scale(${lorgusMapScale})`;
    }
}

function lorgusMapReset() {
    lorgusMapScale = 1;
    lorgusMapOffsetX = 0;
    lorgusMapOffsetY = 0;
    const world = document.querySelector(".lorgus-map-world");
    if (world) world.style.transform = "translate3d(0,0,0) scale(1)";
}

/* Последняя декларация заменяет старый экран выбора королевств. */
function renderCharacter(container, character) {
    renderLorgusWorldMap(container, character);
}

async function refreshLorgusNotificationBadge() {
    const badgeNodes = document.querySelectorAll(".lorgus-notification-badge");
    if (!badgeNodes.length || !window.lorgusCurrentUserId || !supabase) return;

    const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null);

    if (error) {
        console.error("Не удалось загрузить счётчик уведомлений:", error);
        return;
    }

    badgeNodes.forEach(badge => {
        const unread = Number(count || 0);
        badge.textContent = unread > 99 ? "99+" : String(unread);
        badge.classList.toggle("visible", unread > 0);
    });
}

function formatLorgusNotificationTime(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    const diff = Math.max(0, Date.now() - date.getTime());
    if (diff < 60 * 1000) return "только что";
    if (diff < 60 * 60 * 1000) return Math.floor(diff / (60 * 1000)) + " мин назад";
    if (diff < 24 * 60 * 60 * 1000) return Math.floor(diff / (60 * 60 * 1000)) + " ч назад";

    return date.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

async function openLorgusNotifications() {
    const existing = document.querySelector(".lorgus-notifications-overlay");
    if (existing) {
        existing.remove();
        return;
    }

    const overlay = document.createElement("div");
    overlay.className = "lorgus-notifications-overlay";
    overlay.innerHTML = `
        <div class="lorgus-notifications-backdrop"></div>
        <article class="lorgus-notifications-panel">
            <button type="button" class="lorgus-notifications-close" aria-label="Закрыть">×</button>
            <div class="lorgus-notifications-heading">
                <div>
                    <span class="lorgus-command-kicker">ЛОРГУС · ВЕСТИ</span>
                    <h2>Уведомления</h2>
                    <p>События, которые произошли, пока тебя не было.</p>
                </div>
                <button type="button" class="lorgus-notifications-read-all">Прочитать всё</button>
            </div>
            <div class="lorgus-notifications-list">
                <div class="lorgus-notifications-loading">Загружаем вести...</div>
            </div>
        </article>
    `;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector(".lorgus-notifications-close").addEventListener("click", close);
    overlay.querySelector(".lorgus-notifications-backdrop").addEventListener("click", close);

    const list = overlay.querySelector(".lorgus-notifications-list");
    const readAll = overlay.querySelector(".lorgus-notifications-read-all");

    const render = rows => {
        if (!rows.length) {
            list.innerHTML = `
                <div class="lorgus-notifications-empty">
                    <span>✦</span>
                    <strong>Пока тихо</strong>
                    <p>Здесь появятся важные события, произошедшие в твоё отсутствие.</p>
                </div>
            `;
            return;
        }

        list.innerHTML = rows.map(row => `
            <button type="button"
                class="lorgus-notification-entry${row.read_at ? "" : " unread"}"
                data-notification-id="${escapeHtml(row.id)}">
                <span class="lorgus-notification-mark">${row.type === "currency_received" ? "₵" : "✦"}</span>
                <span class="lorgus-notification-content">
                    <strong>${escapeHtml(row.title)}</strong>
                    <span>${escapeHtml(row.body)}</span>
                    <small>${escapeHtml(formatLorgusNotificationTime(row.created_at))}</small>
                </span>
                ${row.read_at ? "" : '<i class="lorgus-notification-unread-dot"></i>'}
            </button>
        `).join("");

        list.querySelectorAll(".lorgus-notification-entry.unread").forEach(entry => {
            entry.addEventListener("click", async () => {
                const id = entry.dataset.notificationId;
                const { error } = await supabase
                    .from("notifications")
                    .update({ read_at: new Date().toISOString() })
                    .eq("id", id)
                    .is("read_at", null);

                if (error) {
                    console.error("Не удалось отметить уведомление:", error);
                    return;
                }

                entry.classList.remove("unread");
                entry.querySelector(".lorgus-notification-unread-dot")?.remove();
                await refreshLorgusNotificationBadge();
            });
        });
    };

    const { data, error } = await supabase
        .from("notifications")
        .select("id, type, title, body, read_at, created_at, data")
        .order("created_at", { ascending: false })
        .limit(50);

    if (error) {
        list.innerHTML = '<div class="lorgus-notifications-empty"><strong>Не удалось загрузить уведомления.</strong><p>' + escapeHtml(error.message) + '</p></div>';
        console.error("Не удалось загрузить уведомления:", error);
        return;
    }

    render(data || []);

    readAll.addEventListener("click", async () => {
        const now = new Date().toISOString();
        const { error: updateError } = await supabase
            .from("notifications")
            .update({ read_at: now })
            .is("read_at", null);

        if (updateError) {
            alert("Не удалось отметить уведомления:\\n\\n" + updateError.message);
            return;
        }

        (data || []).forEach(row => { row.read_at = now; });
        render(data || []);
        await refreshLorgusNotificationBadge();
    });
}

function renderLorgusInterfaceNav(active = "world") {
    const items = [
        ["overview", "⌂", "Обзор", "/overview"],
        ["world", "✦", "Мир", "/world"],
        ["character", "♙", "Персонаж", "/character"],
        ["rp", "◈", "Ролевая", "/rp"],
        ["people", "♧", "Люди", "/people"],
        ["mail", "✉", "Письма", "/mail"],
        ["inventory", "◈", "Инвентарь", "/inventory"]
    ];
    return `
        <nav class="lorgus-global-nav" aria-label="Разделы Лоргуса">
            <div class="lorgus-global-brand"><span>✦</span><strong>ЛОРГУС</strong><small>ЖИВОЙ МИР</small></div>
            <div class="lorgus-global-links">
                ${items.map(([id, icon, label, action]) => `
                    <button type="button" class="${id === active ? "active" : ""}" data-route="${action}">
                        <span>${icon}</span><b>${label}</b>
                    </button>`).join("")}
            </div>
            <div class="lorgus-global-account">
                <div class="lorgus-global-presence"><i></i><span>МИР АКТИВЕН</span></div>
                <span class="lorgus-global-user">${escapeHtml(window.lorgusCurrentUsername || "Игрок")}</span>${renderTitleBadge(window.activeTitle, "lorgus-global-nav-title")}
                <button type="button" class="lorgus-notification-trigger" onclick="openLorgusNotifications()" aria-label="Уведомления" title="Уведомления">
                    <span class="lorgus-notification-icon">♢</span>
                    <b class="lorgus-notification-badge"></b>
                </button>
                <button type="button" class="lorgus-global-logout" onclick="logout()">ВЫЙТИ</button>
            </div>
        </nav>
    `;

    window.setTimeout(() => refreshLorgusNotificationBadge(), 0);
}

function renderLorgusOverview() {
    const container = document.getElementById("cabinet-content");
    const character = window.activeCharacter;
    if (!container || !character) return;

    const name = escapeHtml(character.name || "Без имени");
    const race = escapeHtml(character.race || "Раса не указана");
    const homeland = escapeHtml(character.homeland || "Родина не указана");
    const presence = window.activeRpPresence;
    const place = presence?.type === "location" ? presence.location : presence?.type === "road" ? "В пути" : "Не определено";

    container.className = "lorgus-command-page";
    container.innerHTML = `
        ${renderLorgusInterfaceNav("overview")}
        <main class="lorgus-command-main">
            <section class="lorgus-command-hero">
                <div>
                    <span class="lorgus-command-kicker">ЛОРГУС · ЛИЧНАЯ ХРОНИКА</span>
                    <h1>${name}</h1>
                    <p>${race} · Родина: ${homeland}</p>
                </div>
                <div class="lorgus-command-status"><i></i><span>МИР ПРОДОЛЖАЕТСЯ</span><small>Даже когда тебя нет</small></div>
            </section>
            <section class="lorgus-command-grid">
                <article class="lorgus-command-card command-location">
                    <span>ФИЗИЧЕСКОЕ ПОЛОЖЕНИЕ</span><strong>${escapeHtml(place)}</strong>
                    <small>Положение персонажа фиксируется только ролевым действием.</small>
                    <button type="button" onclick="renderLorgusWorldMapCurrent()">Открыть карту →</button>
                </article>
                <article class="lorgus-command-card"><span>ПЕРСОНАЖ</span><strong>История и состояние</strong><small>Характеристики, навыки, снаряжение, деньги и биография.</small><button type="button" onclick="renderLorgusCharacterHub()">Открыть досье →</button></article>
                <article class="lorgus-command-card"><span>РОЛЕВАЯ</span><strong>Текущая сцена</strong><small>Место, участники, сообщения и последствия действий.</small><button type="button" onclick="renderLorgusRpHub()">Войти в RP →</button></article>
                <article class="lorgus-command-card"><span>СВЯЗИ</span><strong>Люди мира</strong><small>Знакомства, отношения и персонажи, находящиеся рядом с историей.</small><button type="button" onclick="renderWorldCharacterTracker()">Люди мира →</button></article>
                <article class="lorgus-command-card"><span>ХРОНИКА</span><strong>Мир не ждёт</strong><small>События, слухи, войны, путешествия и изменения, происходящие независимо от тебя.</small><button type="button" onclick="renderLorgusWorldMapCurrent()">Смотреть мир →</button></article>
                <article class="lorgus-command-card command-mail"><span>ПОСЛАНИЯ</span><strong>Письма</strong><small>Связь с другими персонажами независимо от расстояния.</small><button type="button" onclick="renderMail()">Открыть почту →</button></article>
            </section>
            <section class="lorgus-command-bottom">
                <div><span class="lorgus-command-kicker">ПРИНЦИП ЛОРГУСА</span><h2>Ты не главный герой этого мира.</h2><p>Королевства принимают решения, торговцы ведут дела, люди рождаются и умирают, армии двигаются, а слухи распространяются — независимо от того, смотришь ли ты на это.</p></div>
                <div class="lorgus-command-metrics"><div><b>07</b><span>КРАЁВ</span></div><div><b>∞</b><span>ИСТОРИЙ</span></div><div><b>01</b><span>ТВОЯ ЖИЗНЬ</span></div></div>
            </section>
        </main>
    `;
}

function renderLorgusWorldMapCurrent() {
    const container = document.getElementById("cabinet-content");
    if (container && window.activeCharacter) renderLorgusWorldMap(container, window.activeCharacter);
}

async function renderLorgusCharacterHub() {
    const container = document.getElementById("cabinet-content");
    const c = window.activeCharacter;
    if (!container || !c) return;
    container.className = "lorgus-command-page";
    container.innerHTML = `
        ${renderLorgusInterfaceNav("character")}
        <main class="lorgus-command-main">
            <section class="lorgus-profile-hero">
                <div class="lorgus-profile-sigil">✦</div>
                <div><span class="lorgus-command-kicker">ЛИЧНОЕ ДОСЬЕ</span><h1>${escapeHtml(c.name || "Без имени")}</h1><p>${escapeHtml(c.race || "Раса")} · ${escapeHtml(c.homeland || "Родина не указана")}</p>${renderTitleBadge(window.activeTitle, "lorgus-profile-title")}</div>
                <button type="button" class="lorgus-title-manage-button" onclick="openTitlePicker()">Выбрать титул</button>
            </section>
            <section class="lorgus-dossier-grid">
                <article><span>ПРОИСХОЖДЕНИЕ</span><strong>${escapeHtml(c.homeland || "Не указано")}</strong><p>Родина определяет происхождение, но не физическое положение персонажа.</p></article>
                <article><span>СОСТОЯНИЕ</span><strong>${escapeHtml(String(c.status || "ACTIVE"))}</strong><p>Жизнь персонажа продолжается в мире Лоргуса.</p></article>
                <article class="lorgus-dossier-abilities"><span>СПОСОБНОСТИ</span><strong>Подтверждённые администрацией</strong><div class="lorgus-ability-list"><div class="lorgus-ability-empty">Загрузка...</div></div></article>
                <article class="lorgus-dossier-inventory"><span>СНАРЯЖЕНИЕ</span><strong>Инвентарь</strong><p>Оружие, броня, предметы и вещи, которыми владеет персонаж.</p><button type="button" onclick="renderLorgusInventory()">Открыть инвентарь →</button></article>
                <article><span>ОТНОШЕНИЯ</span><strong>Связи</strong><p>Доверие, дружба, вражда, семья, долги и обещания.</p></article>
                <article><span>ИСТОРИЯ</span><strong>Личная хроника</strong><p>События жизни и последствия решений персонажа.</p></article>
            </section>
        </main>
    `;
    const abilities = await loadCharacterAbilities(c.id);
    const list = container.querySelector(".lorgus-ability-list");
    if (list) list.innerHTML = renderAbilityList(abilities);
}

function renderLorgusRpHub() {
    const container = document.getElementById("cabinet-content");
    if (!container || !window.activeCharacter) return;
    const p = window.activeRpPresence;
    const place = p?.type === "location" ? p.location : p?.type === "road" ? "В пути" : "Свободное состояние";
    container.className = "lorgus-command-page";
    container.innerHTML = `
        ${renderLorgusInterfaceNav("rp")}
        <main class="lorgus-command-main">
            <section class="lorgus-command-hero"><div><span class="lorgus-command-kicker">РОЛЕВАЯ ЖИЗНЬ</span><h1>Текущая сцена</h1><p>Место действия определяется поступками персонажа, а не открытием страницы.</p></div><div class="lorgus-command-status"><i></i><span>СЦЕНА</span><small>${escapeHtml(place)}</small></div></section>
            <section class="lorgus-rp-grid">
                <article><span>МЕСТО</span><strong>${escapeHtml(place)}</strong><p>Первое сообщение в локации фиксирует физическое положение.</p><button onclick="renderLorgusWorldMapCurrent()">Открыть мир →</button></article>
                <article><span>УЧАСТНИКИ</span><strong>Люди рядом</strong><p>Персонажи, находящиеся в доступной сцене.</p><button onclick="renderWorldCharacterTracker()">Отследить →</button></article>
                <article><span>ПУТЬ</span><strong>Дороги и переходы</strong><p>Путешествие требует отдельной дорожной сцены и последовательности действий.</p><button onclick="renderLorgusWorldMapCurrent()">Выбрать путь →</button></article>
            </section>
        </main>
    `;
}

window.renderLorgusOverview = renderLorgusOverview;
window.renderLorgusWorldMapCurrent = renderLorgusWorldMapCurrent;
window.renderLorgusCharacterHub = renderLorgusCharacterHub;
window.renderLorgusRpHub = renderLorgusRpHub;
window.openTitlePicker = openTitlePicker;
window.openAdminCharacterTitles = openAdminCharacterTitles;
window.openAdminCharacterAbilities = openAdminCharacterAbilities;
window.renderLorgusInventory = renderLorgusInventory;
window.openRpItemPicker = openRpItemPicker;
window.openRpTransferPicker = openRpTransferPicker;
window.openRpCurrencyTransferPicker = openRpCurrencyTransferPicker;
window.openAdminCharacterInventory = openAdminCharacterInventory;

window.selectLorgusMapRegion = selectLorgusMapRegion;
window.selectLorgusMapMarker = selectLorgusMapMarker;
window.handleLorgusMapSurfaceClick = handleLorgusMapSurfaceClick;
window.lorgusMapZoom = lorgusMapZoom;
window.lorgusMapReset = lorgusMapReset;


/* =========================================================
   LORGUS // THREE.JS DEPTH GATE
   ========================================================= */
function initializeLorgusWebGL() {
    const canvas = document.getElementById("lorgus-webgl");
    if (!canvas) return;
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    } catch (error) {
        console.warn("LORGUS WebGL unavailable:", error);
        return;
    }
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x171511, 0.0075);
    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 220);
    camera.position.set(0, 8.2, 36);
    const world = new THREE.Group();
    scene.add(world);

    const makeStoneTexture = (base, mortar = false) => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 256;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 1800; i++) {
            const x = Math.random() * 256;
            const y = Math.random() * 256;
            const v = 18 + Math.random() * 34;
            ctx.fillStyle = `rgba(${v},${v * .86},${v * .7},${Math.random() * .16})`;
            ctx.fillRect(x, y, 1 + Math.random() * 3, 1 + Math.random() * 3);
        }
        ctx.strokeStyle = mortar ? "rgba(12,10,8,.42)" : "rgba(16,13,10,.25)";
        ctx.lineWidth = mortar ? 2 : 1;
        for (let y = 18; y < 256; y += 42 + Math.random() * 12) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y + (Math.random() - .5) * 8); ctx.stroke();
        }
        for (let i = 0; i < 28; i++) {
            const x = Math.random() * 256, y = Math.random() * 256;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + (Math.random() - .5) * 28, y + 8 + Math.random() * 22);
            ctx.stroke();
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2.2, 2.2);
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    };

    const stoneTexture = makeStoneTexture("#51483d", true);
    const darkStoneTexture = makeStoneTexture("#302b26", false);
    const groundTexture = makeStoneTexture("#39332c", true);

    const stone = new THREE.MeshStandardMaterial({
        map: stoneTexture, color: 0xb28a62, roughness: 0.88, metalness: 0,
        bumpMap: stoneTexture, bumpScale: 0.16
    });
    const stoneDark = new THREE.MeshStandardMaterial({
        map: darkStoneTexture, color: 0x626864, roughness: 0.93, metalness: 0,
        bumpMap: darkStoneTexture, bumpScale: 0.12
    });
    const stoneEdge = new THREE.MeshStandardMaterial({
        map: stoneTexture, color: 0xc39a68, roughness: 0.80, metalness: 0,
        bumpMap: stoneTexture, bumpScale: 0.18
    });
    const groundStone = new THREE.MeshStandardMaterial({
        map: groundTexture, color: 0x81745e, roughness: 0.94, metalness: 0,
        bumpMap: groundTexture, bumpScale: 0.08
    });
    const rune = new THREE.MeshStandardMaterial({ color: 0x8c6827, emissive: 0x8c6827, emissiveIntensity: 4.2, transparent: true, opacity: 0.82 });
    const ember = new THREE.MeshBasicMaterial({ color: 0xe2a33d, transparent: true, opacity: 0.8 });

    const bevelStone = (sx, sy, sz, material = stone, bevel = 0.16) => {
        const radius = Math.min(bevel, sx * 0.14, sy * 0.14, sz * 0.14);
        const geometry = new THREE.BoxGeometry(sx, sy, sz, 3, 3, 3);
        const pos = geometry.attributes.position;
        const inset = Math.min(bevel, sx * 0.08, sy * 0.08, sz * 0.08);
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
            if (Math.abs(x) > sx * 0.48) pos.setX(i, x - Math.sign(x) * inset * 0.12);
            if (Math.abs(y) > sy * 0.48) pos.setY(i, y - Math.sign(y) * inset * 0.12);
            if (Math.abs(z) > sz * 0.48) pos.setZ(i, z - Math.sign(z) * inset * 0.12);
        }
        pos.needsUpdate = true;
        geometry.computeVertexNormals();
        return new THREE.Mesh(geometry, material);
    };

    const addArchitecturalBlock = (x, y, z, sx, sy, sz, material = stone, rot = 0, detail = 0) => {
        const group = new THREE.Group();
        const body = bevelStone(sx, sy, sz, material, 0.16);
        body.position.set(0, 0, 0);
        body.rotation.z = rot;
        group.add(body);
        if (detail > 0) {
            const inset = new THREE.Mesh(
                new THREE.BoxGeometry(Math.max(0.3, sx * 0.72), Math.max(0.25, sy * 0.18), sz * 0.08),
                stoneDark
            );
            inset.position.set(0, sy * 0.08, sz * 0.52);
            inset.rotation.z = rot;
            group.add(inset);
        }
        group.position.set(x, y, z);
        world.add(group);
        return group;
    };

    // Monumental layered foundations: the gate should read as architecture, not stacked primitives.
    addArchitecturalBlock(-10.4, 1.35, 1.15, 5.8, 2.7, 5.4, stoneEdge, -0.015, 1);
    addArchitecturalBlock(10.4, 1.35, 1.15, 5.8, 2.7, 5.4, stoneEdge, 0.015, 1);
    addArchitecturalBlock(-10.4, 7.0, 1.05, 5.0, 10.5, 4.7, stone, -0.01, 1);
    addArchitecturalBlock(10.4, 7.3, 1.05, 5.2, 11.2, 4.7, stone, 0.01, 1);

    // Deep shadowed recesses make the masonry feel carved and massive.
    for (const side of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
            const recess = new THREE.Mesh(
                new THREE.BoxGeometry(1.45, 4.8 + i * 0.35, 0.32),
                stoneDark
            );
            recess.position.set(side * (10.35 + (i - 1) * 1.45), 4.2 + i * 3.1, 3.42);
            world.add(recess);
        }
    }

    // Heavy capstones break the perfectly rectangular silhouette.
    for (const side of [-1, 1]) {
        for (let i = 0; i < 4; i++) {
            const cap = new THREE.Mesh(
                new THREE.BoxGeometry(2.4 + Math.random() * 0.7, 1.0 + Math.random() * 0.35, 5.5, 2, 2, 2),
                i === 3 ? stoneEdge : stone
            );
            cap.position.set(
                side * (9.1 + i * 0.75),
                12.9 + i * 0.9,
                0.75 + (Math.random() - 0.5) * 0.35
            );
            cap.rotation.z = (Math.random() - 0.5) * 0.055;
            cap.castShadow = true;
            cap.receiveShadow = true;
            world.add(cap);
        }
    }

    // Architectural masonry pass: layered stone courses with bevels and irregular faces.
    const makeMasonryBlock = (x, y, z, w, h, d, material, rotation = 0, scaleY = 1) => {
        const geo = new THREE.BoxGeometry(w, h, d, 2, 2, 2);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i);
            if (Math.abs(px) > w * 0.35) pos.setX(i, px + (Math.random() - 0.5) * 0.12);
            if (Math.abs(py) > h * 0.35) pos.setY(i, py + (Math.random() - 0.5) * 0.10);
            if (Math.abs(pz) > d * 0.35) pos.setZ(i, pz + (Math.random() - 0.5) * 0.08);
        }
        pos.needsUpdate = true;
        geo.computeVertexNormals();
        const mesh = new THREE.Mesh(geo, material);
        mesh.position.set(x, y, z);
        mesh.rotation.z = rotation;
        mesh.scale.y = scaleY;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        world.add(mesh);
        return mesh;
    };

    // Massive masonry courses replace the "two giant cubes" silhouette.
    for (const side of [-1, 1]) {
        const sx = side;
        for (let row = 0; row < 6; row++) {
            const y = 2.9 + row * 1.95;
            const count = row % 2 ? 3 : 2;
            const total = 5.1;
            const bw = total / count;
            for (let col = 0; col < count; col++) {
                const x = sx * (7.85 + col * bw);
                makeMasonryBlock(
                    x, y, 1.05,
                    bw * 0.92, 1.72 + Math.random() * 0.22, 4.65,
                    row % 3 === 0 ? stoneEdge : stone,
                    (Math.random() - 0.5) * 0.012
                );
            }
        }
    }

    // Individual stone color variation: old masonry should have age and mineral differences.
    const masonryTints = [0x9a795b, 0xa68764, 0x8c7057, 0xb0926e, 0x7e6a55];
    for (const side of [-1, 1]) {
        for (let row = 0; row < 6; row++) {
            for (let col = 0; col < (row % 2 ? 3 : 2); col++) {
                const x = side * (7.85 + col * (5.1 / (row % 2 ? 3 : 2)));
                const y = 2.9 + row * 1.95;
                const tint = new THREE.MeshStandardMaterial({
                    map: stoneTexture,
                    color: masonryTints[(row * 3 + col) % masonryTints.length],
                    roughness: 0.88,
                    bumpMap: stoneTexture,
                    bumpScale: 0.14
                });
                const wash = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.92, 0.045, 2, 2), tint);
                wash.position.set(x + (Math.random() - 0.5) * 0.35, y + (Math.random() - 0.5) * 0.25, 3.40);
                wash.rotation.z = (Math.random() - 0.5) * 0.025;
                world.add(wash);
            }
        }
    }

    // Deep carved seams on the front face.
    const seamMat = new THREE.MeshBasicMaterial({
        color: 0x15110e,
        transparent: true,
        opacity: 0.62
    });
    for (const side of [-1, 1]) {
        for (let row = 0; row < 7; row++) {
            const seam = new THREE.Mesh(
                new THREE.BoxGeometry(4.9, 0.075, 0.055),
                seamMat
            );
            seam.position.set(side * 10.0, 2.0 + row * 1.95, 3.43);
            world.add(seam);
        }
    }

    // Broken masonry and fallen stones at the bases.
    for (const side of [-1, 1]) {
        for (let i = 0; i < 12; i++) {
            const w = 0.8 + Math.random() * 1.5;
            const h = 0.35 + Math.random() * 0.9;
            const d = 0.8 + Math.random() * 1.5;
            const chunk = makeMasonryBlock(
                side * (5.8 + Math.random() * 5.4),
                h * 0.45 - 0.08,
                2.5 + (Math.random() - 0.5) * 4,
                w, h, d, stoneDark,
                (Math.random() - 0.5) * 0.7
            );
            chunk.rotation.x = (Math.random() - 0.5) * 0.35;
            chunk.rotation.y = (Math.random() - 0.5) * 0.35;
        }
    }

    // Long approach masonry connects the bottom of the frame to the portal.
    for (let row = 0; row < 14; row++) {
        const z = 8.5 - row * 5.2;
        const spread = 5.0 + row * 1.55;
        const pieces = 5 + (row % 2);
        for (let col = 0; col < pieces; col++) {
            const width = (spread * 2) / pieces - 0.14;
            const slab = new THREE.Mesh(
                new THREE.BoxGeometry(width, 0.28 + Math.random() * 0.16, 2.05 + Math.random() * 0.35),
                row < 3 ? stoneEdge : groundStone
            );
            slab.position.set(
                -spread + width * 0.5 + col * (width + 0.14) + (Math.random() - 0.5) * 0.12,
                -0.03 + Math.random() * 0.07,
                z
            );
            slab.rotation.y = (Math.random() - 0.5) * 0.035;
            slab.castShadow = true;
            slab.receiveShadow = true;
            world.add(slab);
        }
    }

    // World-life pass: distant ruins, dead trees and scattered structures give the landscape scale.
    const ruinMat = new THREE.MeshStandardMaterial({
        map: darkStoneTexture, color: 0x4d5148, roughness: 0.98, bumpMap: darkStoneTexture, bumpScale: 0.1
    });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x241c16, roughness: 1 });

    // Distant ruined walls flank the horizon.
    for (const side of [-1, 1]) {
        for (let i = 0; i < 6; i++) {
            const w = 2.5 + Math.random() * 3.5;
            const h = 2.5 + Math.random() * 5.5;
            const ruin = new THREE.Mesh(
                new THREE.BoxGeometry(w, h, 1.2 + Math.random() * 1.4),
                ruinMat
            );
            ruin.position.set(
                side * (15 + i * 4.5 + Math.random() * 2),
                h * 0.5 - 0.1,
                -10 - Math.random() * 8
            );
            ruin.rotation.y = (Math.random() - 0.5) * 0.12;
            ruin.rotation.z = (Math.random() - 0.5) * 0.08;
            ruin.castShadow = true;
            ruin.receiveShadow = true;
            world.add(ruin);
        }
    }

    // Broken towers create recognizable silhouettes in the distance.
    for (const side of [-1, 1]) {
        for (let i = 0; i < 2; i++) {
            const tower = new THREE.Mesh(
                new THREE.CylinderGeometry(1.4 + Math.random() * 0.6, 1.9 + Math.random() * 0.6, 8 + Math.random() * 5, 8),
                ruinMat
            );
            tower.position.set(side * (25 + i * 8), 3.5, -18 - i * 4);
            tower.rotation.y = Math.random();
            tower.castShadow = true;
            tower.receiveShadow = true;
            world.add(tower);
        }
    }

    // Dead trees break the silhouette without turning the gate into a forest.
    const addDeadTree = (x, z, scale) => {
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.34, 3.8, 6), woodMat);
        trunk.position.y = 1.9;
        trunk.rotation.z = (Math.random() - 0.5) * 0.12;
        tree.add(trunk);
        for (let b = 0; b < 4; b++) {
            const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.13, 1.8 + Math.random(), 5), woodMat);
            branch.position.set((Math.random() - 0.5) * 0.9, 2.5 + b * 0.38, 0);
            branch.rotation.z = (Math.random() - 0.5) * 1.5;
            branch.rotation.x = (Math.random() - 0.5) * 0.35;
            tree.add(branch);
        }
        tree.position.set(x, 0, z);
        tree.scale.setScalar(scale);
        tree.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        world.add(tree);
    };
    addDeadTree(-17, -1, 1.5);
    addDeadTree(17, -2, 1.35);
    addDeadTree(-24, -9, 2.0);
    addDeadTree(23, -11, 1.8);

    // Small warm points in the distance imply settlements or fires beyond the gate.
    const distantFire = new THREE.MeshBasicMaterial({
        color: 0xd98a32, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending, depthWrite: false
    });
    for (let i = 0; i < 14; i++) {
        const ember = new THREE.Mesh(new THREE.SphereGeometry(0.08 + Math.random() * 0.09, 8, 8), distantFire);
        ember.position.set((Math.random() - 0.5) * 38, 0.8 + Math.random() * 3.5, -13 - Math.random() * 12);
        world.add(ember);
    }

    // Foreground slabs: irregular perspective lines lead the eye into the portal.
    for (let i = 0; i < 16; i++) {
        const width = 4.5 + i * 1.05;
        const slab = makeMasonryBlock(
            (Math.random() - 0.5) * (1.0 + i * 0.45),
            -0.12 + Math.random() * 0.08,
            4.5 + i * 3.8,
            width,
            0.22 + Math.random() * 0.18,
            2.5 + Math.random() * 0.8,
            i % 2 ? groundStone : stoneDark,
            (Math.random() - 0.5) * 0.045
        );
        slab.scale.x *= 0.8 + Math.random() * 0.35;
    }

    // Monumental portal frame: a single carved arch, deep jambs and individual voussoirs.
    const archShape = new THREE.Shape();
    archShape.moveTo(-7.2, 0);
    archShape.lineTo(-7.2, 8.2);
    archShape.quadraticCurveTo(0, 15.4, 7.2, 8.2);
    archShape.lineTo(7.2, 0);
    archShape.closePath();

    // Cut the actual passage out of the gate. The gate is a stone FRAME, not a filled wall.
    const openingHole = new THREE.Path();
    openingHole.moveTo(-5.15, 0.08);
    openingHole.lineTo(-5.15, 8.25);
    openingHole.quadraticCurveTo(0, 13.4, 5.15, 8.25);
    openingHole.lineTo(5.15, 0.08);
    openingHole.closePath();
    archShape.holes.push(openingHole);

    const archGeo = new THREE.ExtrudeGeometry(archShape, {
        depth: 5.2,
        bevelEnabled: true,
        bevelSegments: 4,
        bevelSize: 0.16,
        bevelThickness: 0.18,
        curveSegments: 40
    });
    const arch = new THREE.Mesh(archGeo, stoneEdge);
    arch.position.set(0, 0, 0.25);
    arch.castShadow = true;
    arch.receiveShadow = true;
    world.add(arch);

    for (const side of [-1, 1]) {
        const jamb = new THREE.Mesh(
            new THREE.BoxGeometry(2.0, 10.4, 5.3, 3, 3, 3),
            stone
        );
        jamb.position.set(side * 6.65, 5.25, 0.25);
        jamb.castShadow = true;
        jamb.receiveShadow = true;
        world.add(jamb);

        const innerJamb = new THREE.Mesh(
            new THREE.BoxGeometry(0.62, 9.6, 5.55, 2, 2, 2),
            stoneDark
        );
        innerJamb.position.set(side * 5.45, 4.9, -0.05);
        innerJamb.castShadow = true;
        innerJamb.receiveShadow = true;
        world.add(innerJamb);
    }

    // Clean outer arch: no oversized floating voussoirs.
    // The extruded arch itself is the masonry silhouette.
    // Crown stone gives the gate a strong readable silhouette.
    // No horizontal crown: the arch itself forms the complete central silhouette.

    // Portal glow uses the exact same arched silhouette as the passage.
    // No rectangular plane, no border: just a soft luminous shape behind the stone frame.
    const glowShape = new THREE.Shape();
    glowShape.moveTo(-5.85, 0.04);
    glowShape.lineTo(-5.85, 8.15);
    glowShape.quadraticCurveTo(0, 14.45, 5.85, 8.15);
    glowShape.lineTo(5.85, 0.04);
    glowShape.closePath();

    const rift = new THREE.Mesh(
        new THREE.ShapeGeometry(glowShape, 48),
        new THREE.MeshBasicMaterial({
            color: 0xd47b24,
            transparent: true,
            opacity: 0.34,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: true,
            side: THREE.DoubleSide
        })
    );
    rift.position.set(0, 0, -0.72);
    rift.renderOrder = 1;
    world.add(rift);

    // True arched portal void — no rectangular plate behind the entrance.
    
// Decorative architectural detail: inset buttresses and carved stone bands.
// These break the primitive-box silhouette and give the gate a deliberate medieval design.
const addButtress = (side, x, z) => {
    const g = new THREE.Group();
    const base = new THREE.Mesh(
        new THREE.BoxGeometry(3.0, 7.8, 5.0, 2, 2),
        stoneDark
    );
    base.position.y = 3.9;
    base.scale.x = 0.78;
    g.add(base);

    const face = new THREE.Mesh(
        new THREE.BoxGeometry(2.15, 6.4, 0.42, 2, 2),
        stoneEdge
    );
    face.position.set(side * 0.35, 4.15, 2.55);
    face.rotation.z = side * 0.055;
    g.add(face);

    const crown = new THREE.Mesh(
        new THREE.BoxGeometry(3.35, 0.55, 5.45, 2, 2),
        stoneEdge
    );
    crown.position.set(0, 7.85, 0);
    crown.rotation.z = side * 0.025;
    g.add(crown);

    g.position.set(x, 0, z);
    g.rotation.y = side * 0.035;
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    world.add(g);
};

addButtress(-1, -7.55, 0.75);
addButtress(1, 7.55, 0.75);

// Carved horizontal courses give the façade a designed rhythm instead of a stack of cubes.
for (const side of [-1, 1]) {
    for (let row = 0; row < 5; row++) {
        const y = 3.15 + row * 2.05;
        const band = new THREE.Mesh(
            new THREE.BoxGeometry(6.2, 0.24, 4.95, 2, 2),
            row % 2 ? stoneEdge : stoneDark
        );
        band.position.set(side * 9.25, y, 3.34);
        band.rotation.z = side * 0.006;
        band.castShadow = true;
        band.receiveShadow = true;
        world.add(band);
    }
}

const openingShape = new THREE.Shape();
    openingShape.moveTo(-5.15, 0);
    openingShape.lineTo(-5.15, 8.25);
    openingShape.absarc(0, 8.25, 5.15, Math.PI, 0, false);
    openingShape.lineTo(5.15, 0);
    openingShape.closePath();
    const innerGate = new THREE.Mesh(
        new THREE.ShapeGeometry(openingShape, 48),
        new THREE.MeshBasicMaterial({
            color: 0x070605,
            transparent: true,
            opacity: 0.72,
            depthWrite: false
        })
    );
    innerGate.position.set(0, 0, -0.9);
    innerGate.renderOrder = 0;
    world.add(innerGate);

    const threshold = new THREE.Mesh(
        new THREE.CircleGeometry(4.8, 64),
        new THREE.MeshBasicMaterial({
            color: 0xb56f27,
            transparent: true,
            opacity: 0.10,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        })
    );
    threshold.rotation.x = -Math.PI / 2;
    threshold.position.set(0, 0.025, 0.45);
    world.add(threshold);

    // Layered portal energy: depth, sparks and drifting motes instead of a flat glowing plane.
    const portalDepthShape = new THREE.Shape();
    portalDepthShape.moveTo(-5.05, 0.08);
    portalDepthShape.lineTo(-5.05, 8.15);
    portalDepthShape.quadraticCurveTo(0, 13.15, 5.05, 8.15);
    portalDepthShape.lineTo(5.05, 0.08);
    portalDepthShape.closePath();

    const portalCoreShape = new THREE.Shape();
    portalCoreShape.moveTo(-4.35, 0.08);
    portalCoreShape.lineTo(-4.35, 7.95);
    portalCoreShape.quadraticCurveTo(0, 12.55, 4.35, 7.95);
    portalCoreShape.lineTo(4.35, 0.08);
    portalCoreShape.closePath();

    const portalCore = new THREE.Mesh(
        new THREE.ShapeGeometry(portalCoreShape, 48),
        new THREE.MeshBasicMaterial({
            color: 0xffc46a,
            transparent: true,
            opacity: 0.075,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        })
    );
    portalCore.position.set(0, 0, -0.78);
    world.add(portalCore);

    const portalMist = new THREE.Mesh(
        new THREE.ShapeGeometry(portalDepthShape, 48),
        new THREE.MeshBasicMaterial({
            color: 0xc56f25,
            transparent: true,
            opacity: 0.045,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        })
    );
    portalMist.position.set(0, 0, -0.94);
    world.add(portalMist);

    const sparkMat = new THREE.MeshBasicMaterial({
        color: 0xffc66a,
        transparent: true,
        opacity: 0.78,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const portalSparks = [];
    for (let i = 0; i < 70; i++) {
        const spark = new THREE.Mesh(
            new THREE.SphereGeometry(0.025 + Math.random() * 0.055, 6, 6),
            sparkMat
        );
        spark.position.set(
            (Math.random() - 0.5) * 11.0,
            1.0 + Math.random() * 14.5,
            -0.5 + (Math.random() - 0.5) * 1.8
        );
        spark.userData.phase = Math.random() * Math.PI * 2;
        spark.userData.speed = 0.25 + Math.random() * 0.7;
        portalSparks.push(spark);
        world.add(spark);
    }

    const riftLight = new THREE.PointLight(0xff8b2c, 52, 28, 2);
    riftLight.position.set(0, 7.8, -0.4);
    world.add(riftLight);    world.add(new THREE.HemisphereLight(0xc8a879, 0x17120d, 1.3));
    world.add(new THREE.AmbientLight(0xb08f68, 0.48));
    const coolFill = new THREE.DirectionalLight(0x7898ad, 1.8);
    coolFill.position.set(18, 12, 10);
    world.add(coolFill);

    const directional = new THREE.DirectionalLight(0xe6c995, 6.4);
    directional.castShadow = true;
    directional.shadow.mapSize.set(1024, 1024);
    directional.shadow.camera.left = -28;
    directional.shadow.camera.right = 28;
    directional.shadow.camera.top = 24;
    directional.shadow.camera.bottom = -8;
    directional.position.set(-12, 18, 22);
    world.add(directional);
    directional.target.position.set(0, 6, 0);
    world.add(directional.target);

    const floorGeometry = new THREE.PlaneGeometry(80, 70, 32, 28);
    const floorPositions = floorGeometry.attributes.position;
    for (let i = 0; i < floorPositions.count; i++) {
        const x = floorPositions.getX(i);
        const y = floorPositions.getY(i);
        const ripple = Math.sin(x * 0.17) * 0.035 + Math.sin(y * 0.21 + x * 0.08) * 0.028;
        floorPositions.setZ(i, ripple);
    }
    floorPositions.needsUpdate = true;
    floorGeometry.computeVertexNormals();
    // Full cinematic environment: eliminate the empty black frame around the monument.
    // Distant mountain silhouettes give the scene a horizon and scale.
    const mountainMat = new THREE.MeshStandardMaterial({
        color: 0x252d2b, roughness: 1, metalness: 0
    });
    const mountainGroup = new THREE.Group();
    for (let i = 0; i < 11; i++) {
        const width = 9 + Math.random() * 9;
        const height = 7 + Math.random() * 13;
        const mountain = new THREE.Mesh(
            new THREE.ConeGeometry(width, height, 5 + Math.floor(Math.random() * 3)),
            mountainMat
        );
        mountain.position.set(-48 + i * 9.5 + Math.random() * 3, height * 0.5 - 1, -15 - Math.random() * 5);
        mountain.rotation.y = Math.random() * Math.PI;
        mountainGroup.add(mountain);
    }
    world.add(mountainGroup);

    // Giant side monoliths frame the gate instead of leaving empty black corners.
    const monolithMat = new THREE.MeshStandardMaterial({
        map: darkStoneTexture, color: 0x4b514f, roughness: 0.98
    });
    for (const side of [-1, 1]) {
        for (let i = 0; i < 4; i++) {
            const h = 8 + Math.random() * 8;
            const monolith = new THREE.Mesh(
                new THREE.DodecahedronGeometry(2.0 + Math.random() * 1.5, 1),
                monolithMat
            );
            monolith.scale.y = h / 4.0;
            monolith.position.set(
                side * (19 + i * 5 + Math.random() * 2),
                h * 0.5 - 1,
                -4 - i * 3.5
            );
            monolith.rotation.set(
                (Math.random() - 0.5) * 0.12,
                Math.random() * Math.PI,
                (Math.random() - 0.5) * 0.08
            );
            monolith.castShadow = true;
            monolith.receiveShadow = true;
            world.add(monolith);
        }
    }

    // Elevated cliffs behind the gate connect the architecture to the horizon.
    const cliffMat = new THREE.MeshStandardMaterial({
        map: darkStoneTexture, color: 0x343a38, roughness: 1
    });
    for (const side of [-1, 1]) {
        const cliff = new THREE.Mesh(
            new THREE.ConeGeometry(15, 20, 7, 3),
            cliffMat
        );
        cliff.scale.z = 0.42;
        cliff.position.set(side * 23, 7, -9);
        cliff.rotation.y = side * 0.35;
        cliff.castShadow = true;
        cliff.receiveShadow = true;
        world.add(cliff);
    }

    // Foreground ruins create depth near the camera.
    for (const side of [-1, 1]) {
        for (let i = 0; i < 7; i++) {
            const rock = new THREE.Mesh(
                new THREE.DodecahedronGeometry(0.8 + Math.random() * 1.8, 1),
                stoneDark
            );
            rock.scale.y = 0.45 + Math.random() * 1.1;
            rock.position.set(
                side * (9 + Math.random() * 13),
                rock.scale.y * 0.7 - 0.05,
                8 - i * 2.7 + Math.random() * 2
            );
            rock.rotation.set(Math.random(), Math.random(), Math.random());
            rock.castShadow = true;
            rock.receiveShadow = true;
            world.add(rock);
        }
    }

    const floor = new THREE.Mesh(
        floorGeometry,
        groundStone
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -0.15, -8);
    floor.receiveShadow = true;
    world.add(floor);

    const pathStone = new THREE.Group();
    world.add(pathStone);
    for (let row = 0; row < 9; row++) {
        const z = 2.5 - row * 4.2;
        const halfWidth = 5.5 + row * 0.75;
        const pieces = row % 2 === 0 ? 5 : 6;
        for (let col = 0; col < pieces; col++) {
            const gap = 0.18;
            const width = (halfWidth * 2) / pieces - gap;
            const slab = new THREE.Mesh(
                new THREE.BoxGeometry(width, 0.22 + Math.random() * 0.12, 3.25 + Math.random() * 0.5),
                row < 2 ? stoneEdge : groundStone
            );
            slab.position.set(
                -halfWidth + width * 0.5 + col * (width + gap) + (Math.random() - 0.5) * 0.18,
                -0.02 + Math.random() * 0.05,
                z + (Math.random() - 0.5) * 0.3
            );
            slab.rotation.y = (Math.random() - 0.5) * 0.035;
            pathStone.add(slab);
        }
    }

    const floorGlow = new THREE.Mesh(
        new THREE.CircleGeometry(5.8, 64),
        new THREE.MeshBasicMaterial({ color: 0x8d5a1f, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending })
    );
    floorGlow.rotation.x = -Math.PI / 2;
    floorGlow.position.set(0, 0.02, 1.5);
    world.add(floorGlow);

    const sideStones = [];
    for (let side of [-1, 1]) {
        for (let n = 0; n < 9; n++) {
            const w = 1.2 + Math.random() * 1.8;
            const h = 0.7 + Math.random() * 1.7;
            const stoneBlock = new THREE.Mesh(
                new THREE.BoxGeometry(w, h, 1.8 + Math.random() * 1.4),
                stone
            );
            stoneBlock.position.set(
                side * (12.5 + Math.random() * 4.5),
                h * 0.5 - 0.1,
                -2 - n * 1.8 + Math.random() * 1.2
            );
            stoneBlock.rotation.y = (Math.random() - 0.5) * 0.18;
            stoneBlock.rotation.z = (Math.random() - 0.5) * 0.12;
            stoneBlock.castShadow = true;
        stoneBlock.receiveShadow = true;
        world.add(stoneBlock);
            sideStones.push(stoneBlock);
        }
    }

    const gateInnerGlow = new THREE.PointLight(0xff9b3d, 44, 32, 2);
    gateInnerGlow.position.set(0, 5, -0.7);
    world.add(gateInnerGlow);

    const debris = [];
    for (let n = 0; n < 95; n++) {
        const size = 0.05 + Math.random() * 0.28;
        const mesh = new THREE.Mesh(
            new THREE.IcosahedronGeometry(size, 0),
            Math.random() > 0.72 ? ember : stoneDark
        );
        mesh.position.set((Math.random() - 0.5) * 30, Math.random() * 17 - 1, -5 - Math.random() * 24);
        mesh.userData.spin = (Math.random() - 0.5) * 0.9;
        world.add(mesh);
        debris.push(mesh);
    }

    // Living night sky: many bright moving stars, not a static handful of dots.
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 260;
    const starPositions = new Float32Array(starCount * 3);
    const starSpeeds = new Float32Array(starCount);
    for (let i = 0; i < starCount; i++) {
        starPositions[i * 3] = (Math.random() - 0.5) * 105;
        starPositions[i * 3 + 1] = 8 + Math.random() * 42;
        starPositions[i * 3 + 2] = -32 - Math.random() * 38;
        starSpeeds[i] = 0.008 + Math.random() * 0.028;
    }
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
        color: 0xffe3a8,
        size: 0.11,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true
    });
    const starField = new THREE.Points(starGeometry, starMaterial);
    world.add(starField);

    // Gate-side architecture: stepped buttresses sit beside the arch without swallowing it.
    for (const side of [-1, 1]) {
        const pier = new THREE.Group();

        const main = new THREE.Mesh(
            new THREE.BoxGeometry(3.55, 11.3, 5.15, 3, 3, 3),
            stone
        );
        main.position.set(0, 5.65, 0.15);
        main.castShadow = true;
        main.receiveShadow = true;
        pier.add(main);

        // Three projecting courses give the masonry a real load-bearing rhythm.
        const courses = [
            [4.15, 1.05, 5.7, 0.52],
            [3.85, 0.72, 5.5, 4.15],
            [4.05, 0.86, 5.65, 7.85],
            [4.3, 1.05, 5.8, 11.15]
        ];
        for (const [w, h, d, y] of courses) {
            const block = new THREE.Mesh(
                new THREE.BoxGeometry(w, h, d, 3, 2, 3),
                y === 0.52 || y === 11.15 ? stoneEdge : stone
            );
            block.position.set(0, y, 0.12);
            block.rotation.z = (Math.random() - 0.5) * 0.018;
            block.castShadow = true;
            block.receiveShadow = true;
            pier.add(block);
        }

        // Recessed vertical face: darker stone makes the pier read as carved masonry.
        const inset = new THREE.Mesh(
            new THREE.BoxGeometry(2.15, 7.5, 0.28, 2, 2, 2),
            stoneDark
        );
        inset.position.set(0, 5.9, 2.73);
        inset.castShadow = true;
        inset.receiveShadow = true;
        pier.add(inset);

        // Narrow projecting shoulder toward the gate, visually tying the pier to the arch jamb.
        const shoulder = new THREE.Mesh(
            new THREE.BoxGeometry(0.72, 9.2, 5.45, 2, 3, 2),
            stoneEdge
        );
        shoulder.position.set(-side * 1.38, 5.0, 0.18);
        shoulder.castShadow = true;
        shoulder.receiveShadow = true;
        pier.add(shoulder);

        pier.position.set(side * 10.05, 0, 0.78);
        world.add(pier);

        // Separate foundation stones ground the structure instead of letting it read as a cube.
        for (let i = 0; i < 3; i++) {
            const base = new THREE.Mesh(
                new THREE.BoxGeometry(2.7 + i * 0.55, 0.55 + i * 0.12, 5.95 + i * 0.22, 2, 2, 2),
                i === 0 ? stoneEdge : stone
            );
            base.position.set(side * (10.05 - i * 0.04), 0.3 + i * 0.56, 0.78);
            base.rotation.z = (Math.random() - 0.5) * 0.012;
            base.castShadow = true;
            base.receiveShadow = true;
            world.add(base);
        }
    }

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    let raf = 0;
    let disposed = false;
    let portalFlight = null;

    const onPointer = event => {
        pointer.tx = event.clientX / window.innerWidth - 0.5;
        pointer.ty = event.clientY / window.innerHeight - 0.5;
    };

    const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.65);
        const width = window.innerWidth;
        const height = window.innerHeight;
        renderer.setPixelRatio(dpr);
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(height, 1);
        camera.updateProjectionMatrix();
    };

    const clock = new THREE.Clock();

    const frame = () => {
        if (disposed) return;
        raf = requestAnimationFrame(frame);
        const time = clock.getElapsedTime();

        pointer.x += (pointer.tx - pointer.x) * 0.035;
        pointer.y += (pointer.ty - pointer.y) * 0.035;

        if (lorgusPortalDepartureAligning) {
            camera.fov += (46 - camera.fov) * 0.08;
            camera.updateProjectionMatrix();
            camera.lookAt(pointer.x * 0.7, 7.5 + pointer.y * 0.55, -0.5);
        } else if (lorgusPortalEntering) {
            const elapsed = performance.now() - lorgusPortalEnterStartedAt;
            const progress = Math.min(1, elapsed / 1080);
            // Более мягкий старт: камера сначала словно "цепляется" за взгляд,
            // затем быстро набирает скорость к воротам.
            const ease = progress < 0.22
                ? 0.18 * Math.pow(progress / 0.22, 2)
                : 0.18 + 0.82 * (1 - Math.pow(1 - ((progress - 0.22) / 0.78), 2));

            // Capture the camera exactly where the player was looking when the
            // transition began. The flight then stays on one straight line through
            // the portal instead of spawning a second "video camera".
            if (!portalFlight) {
                const portalCenter = new THREE.Vector3(0, 6.9, -0.85);
                world.localToWorld(portalCenter);

                const start = camera.position.clone();
                const travelDirection = portalCenter.clone().sub(start).normalize();
                // Камера останавливается перед плоскостью ворот — она не летит сквозь портал.
                const end = portalCenter.clone().addScaledVector(travelDirection, -6.5);

                const startQuat = camera.quaternion.clone();
                const aimCamera = camera.clone();
                aimCamera.lookAt(portalCenter);

                portalFlight = {
                    start,
                    end,
                    travelDirection,
                    startQuat,
                    targetQuat: aimCamera.quaternion.clone(),
                    portalCenter,
                    worldRotationY: world.rotation.y
                };
            }

            const flight = portalFlight;
            camera.position.lerpVectors(flight.start, flight.end, ease);

            // During the first part of the shot the camera smoothly turns toward
            // the portal centre; after crossing, it keeps looking forward.
            const aimBlend = Math.min(1, progress / 0.24);
            camera.lookAt(flight.portalCenter);

            // Preserve continuity from the exact original orientation instead of
            // snapping the camera to a new canned starting angle.
            if (aimBlend < 1) {
                const blended = flight.startQuat.clone().slerp(flight.targetQuat, aimBlend);
                camera.quaternion.copy(blended);
            }

            camera.fov = 46 + (34 - 46) * ease;
            camera.updateProjectionMatrix();
        } else {
            portalFlight = null;
            camera.fov += (46 - camera.fov) * 0.06;
            camera.updateProjectionMatrix();
            camera.position.x += (pointer.x * 1.8 - camera.position.x) * 0.018;
            camera.position.y += (7.2 - pointer.y * 1.5 - camera.position.y) * 0.018;
            camera.lookAt(pointer.x * 0.7, 7.5 + pointer.y * 0.55, -0.5);
        }

        portalCore.scale.setScalar(0.92 + Math.sin(time * 1.35) * 0.06);
        portalMist.scale.setScalar(0.96 + Math.sin(time * 0.8 + 1.2) * 0.08);
        portalSparks.forEach((spark, i) => {
            spark.position.y += Math.sin(time * spark.userData.speed + spark.userData.phase) * 0.0025 + 0.004;
            if (spark.position.y > 16.2) spark.position.y = 0.8 + (i % 9) * 0.7;
            spark.position.x += Math.sin(time * 0.7 + spark.userData.phase) * 0.0018;
        });
        riftLight.intensity = 26 + Math.sin(time * 2.1) * 6;
        gateInnerGlow.intensity = 12 + Math.sin(time * 1.7) * 3;
        floorGlow.material.opacity = 0.11 + Math.sin(time * 1.9) * 0.025;
        const starPos = starGeometry.attributes.position;
        for (let i = 0; i < starCount; i++) {
            const idx = i * 3;
            starPos.array[idx + 1] -= starSpeeds[i];
            starPos.array[idx] += Math.sin(time * 0.22 + i) * 0.0009;
            if (starPos.array[idx + 1] < 5) {
                starPos.array[idx + 1] = 48 + Math.random() * 5;
                starPos.array[idx] = (Math.random() - 0.5) * 105;
            }
        }
        starPos.needsUpdate = true;

        if (lorgusPortalEntering && portalFlight) {
            world.rotation.y = portalFlight.worldRotationY;

            // Пока камера летит, пространство между ней и воротами не остаётся
            // чёрным: дальние частицы и обломки слегка ускоряются навстречу кадру,
            // создавая ощущение реального пролёта, а не движения камеры в пустоте.
            const flightProgress = Math.min(
                1,
                (performance.now() - lorgusPortalEnterStartedAt) / 1080
            );
            const flightBoost = Math.max(0, flightProgress - 0.12);
            for (const mesh of debris) {
                if (mesh.userData.portalDrift === undefined) {
                    mesh.userData.portalDrift = 0.12 + Math.random() * 0.22;
                }
                mesh.position.z += mesh.userData.portalDrift * flightBoost;
                if (mesh.position.z > 18) mesh.position.z -= 42;
            }
        } else {
            world.rotation.y = pointer.x * -0.025;
        }

        for (const mesh of debris) {
            mesh.rotation.x += mesh.userData.spin * 0.004;
            mesh.rotation.y += mesh.userData.spin * 0.006;
            if (mesh.userData.portalDrift === undefined) {
                mesh.userData.portalDrift = 0.12 + Math.random() * 0.22;
            }
        }

        renderer.render(scene, camera);
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    frame();

    const previousCleanup = lorgusSceneCleanup;
    lorgusSceneCleanup = () => {
        disposed = true;
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        window.removeEventListener("pointermove", onPointer);
        renderer.dispose();
        if (previousCleanup) previousCleanup();
    };
}
async function appendRpMessage(message) {
    const feed = document.getElementById("lorgus-rp-feed");
    if (!feed || feed.querySelector('[data-rp-message-id="' + message.id + '"]')) return;
    const empty = feed.querySelector(".lorgus-messenger-start");
    if (empty) empty.remove();

    const photo = await getRpCharacterPhoto(message.character_id);
    const mine = String(message.character_id) === String(window.activeCharacterId);
    const article = document.createElement("article");
    article.className = "lorgus-messenger-message" + (mine ? " mine" : "") + (message.status === "reverted" ? " reverted" : "");
    article.dataset.rpMessageId = message.id;
    const time = new Date(message.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

    article.innerHTML =
        '<div class="lorgus-messenger-message-avatar">' +
            (photo ? '<img src="' + escapeHtml(photo) + '" alt="">' : '<span>✦</span>') +
        '</div>' +
        '<div class="lorgus-messenger-message-content">' +
            '<div class="lorgus-messenger-message-meta"><strong>' + escapeHtml(message.characters?.name || "Без имени") + '</strong><time>' + escapeHtml(time) + '</time></div>' +
            '<div class="lorgus-messenger-bubble">' +
                '<p>' + escapeHtml(message.body) + '</p>' +
                (message.status === "reverted" ? '<div class="lorgus-rp-reverted-mark">Пост отменён администрацией' + (message.revert_reason ? ' · ' + escapeHtml(message.revert_reason) : '') + '</div>' : '') +
                '<div class="lorgus-rp-item-uses"></div>' +
            '</div>' +
        '</div>';

    feed.appendChild(article);

    const { data: uses, error } = await supabase
        .from("rp_message_item_uses")
        .select("item_id, quantity, status, items(name, icon, color, rarity)")
        .eq("message_id", message.id)
        .eq("status", "active");

    const useBox = article.querySelector(".lorgus-rp-item-uses");
    if (useBox && !error && uses?.length) {
        useBox.innerHTML = uses.map(use => {
            const item = use.items || {};
            return '<span class="lorgus-rp-item-use" style="--item-color:' + escapeHtml(item.color || "#d6b36a") + '"><span>' + escapeHtml(item.icon || "◆") + '</span><strong>' + escapeHtml(item.name || "Предмет") + '</strong>' + (use.quantity > 1 ? '<small>×' + escapeHtml(String(use.quantity)) + '</small>' : '') + '</span>';
        }).join("");
    }
    feed.scrollTop = feed.scrollHeight;
}

