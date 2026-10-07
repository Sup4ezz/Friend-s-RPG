/* LORGUS cinematic auth scene and transitions */
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

    window.lorgusPortalOverlay = overlay;
    return overlay;
}

function finishPortalTransition() {
    if (!window.lorgusPortalOverlay) return;

    window.lorgusPortalOverlay.classList.add("release");
    window.setTimeout(() => {
        if (window.lorgusPortalOverlay) {
            window.lorgusPortalOverlay.remove();
            window.lorgusPortalOverlay = null;
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
                    await window.renderCabinet(session, true, true);

                    window.lorgusPortalEntering = false;

                    if (window.lorgusSceneCleanup) {
                        const cleanup = window.lorgusSceneCleanup;
                        window.lorgusSceneCleanup = null;
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

        window.renderCabinet(session);
    } else {
        window.lorgusPortalEntering = false;
        window.lorgusPortalDepartureAligning = false;
        if (window.lorgusPortalOverlay) {
            window.lorgusPortalOverlay.remove();
            window.lorgusPortalOverlay = null;
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
                <span class="title-ghost">ЛОРГУС</span>
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
    window.initializeLorgusWebGL();
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

let window.lorgusSceneCleanup = null;

function initializeLorgusScene() {
    if (window.lorgusSceneCleanup) {
        window.lorgusSceneCleanup();
        window.lorgusSceneCleanup = null;
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

    window.lorgusSceneCleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        window.removeEventListener("pointermove", onPointerMove);
    };
}

window.createPortalTransitionOverlay = createPortalTransitionOverlay;
window.finishPortalTransition = finishPortalTransition;
window.createLorgusEyeTransition = createLorgusEyeTransition;
window.render = render;
window.renderAuth = renderAuth;
window.initializeLorgusAudio = initializeLorgusAudio;
window.initializeLorgusScene = initializeLorgusScene;
