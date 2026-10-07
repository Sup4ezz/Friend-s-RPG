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
        await window.loadAdminPanel(container);
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

            await window.loadAdminPanel(container);
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
            await window.loadAdminPanel(container);
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
            await window.loadAdminPanel(container);
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
            await window.loadAdminPanel(container);
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

