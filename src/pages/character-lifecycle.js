/* LORGUS character selection, creation and submission */
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
        const result = await window.supabaseClient.from("characters").select("*").eq("id", application.character_id).single();
        if (result.error || !result.data) continue;

        const character = result.data;
        const status = String(character.status || "ACTIVE").toUpperCase();
        const card = document.createElement("article");
        card.className = "character-card";

        const avatar = document.createElement("div");
        avatar.className = "character-card-avatar";

        if (application.photo_path) {
            const { data: photoData, error: photoError } = await window.supabaseClient
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
    const result = await window.supabaseClient.from("characters").select("*").eq("id", characterId).single();
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
    } = await window.supabaseClient.auth.getUser();

    if (!user) {
        setCharacterMessage(
            "Необходимо войти в аккаунт.",
            "error"
        );
        return;
    }

    const { data: existingApplications, error: countError } = await window.supabaseClient
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
        } = await window.supabaseClient.storage
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
    } = await window.supabaseClient
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

window.renderCharacterSelection = renderCharacterSelection;
window.initializeLorgusCharacterSelectionAudio = initializeLorgusCharacterSelectionAudio;
window.selectCharacter = selectCharacter;
window.initializeLorgusCharacterCreationAudio = initializeLorgusCharacterCreationAudio;
window.renderCharacterApplicationForm = renderCharacterApplicationForm;
window.initializeCharacterPortraitCrop = initializeCharacterPortraitCrop;
window.submitCharacterApplication = submitCharacterApplication;
