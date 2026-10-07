import {
    createClient
} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js";

let supabase;
let authSwitching = false;
window.lorgusPortalEntering = false;
window.lorgusPortalDepartureAligning = false;
window.lorgusPortalEnterStartedAt = 0;
let lorgusPortalOverlay = null;
window.THREE = THREE;
window.escapeHtml = escapeHtml;\nwindow.supabaseClient = null;

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

        if (authScene && !window.lorgusPortalEntering && !window.lorgusPortalDepartureAligning) {
            // UI уходит и камера начинает полёт из ЕЁ текущего положения.
            // Никакого отдельного transition-screen между сценами нет.
            window.lorgusPortalDepartureAligning = false;
            authScene.classList.add("portal-departure");

            // Сначала даём интерфейсу заметно раствориться. Камера всё это время
            // остаётся в исходной позиции — это один непрерывный кадр, а не склейка.
            window.setTimeout(() => {
                if (!document.querySelector(".lorgus-cinematic-auth")) return;

                window.lorgusPortalEntering = true;
                window.lorgusPortalEnterStartedAt = performance.now();

                // Когда портал подходит вплотную, мы не показываем "экран перехода".
                // Игрок видит закрывающиеся веки: это буквально взгляд персонажа.
                let eyeTransition = null;
                window.setTimeout(async () => {
                    if (!window.lorgusPortalEntering) return;

                    eyeTransition = createLorgusEyeTransition();

                    // Пока веки сомкнуты, кабинет спокойно готовится под ними.
                    await renderCabinet(session, true, true);

                    window.lorgusPortalEntering = false;

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
        window.lorgusPortalEntering = false;
        window.lorgusPortalDepartureAligning = false;
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

