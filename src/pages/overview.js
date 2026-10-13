window.LORGUS_PAGES = window.LORGUS_PAGES || {};

const LORGUS_WORLD_WHISPERS = {
    "Атэрон": [
        "В архиве Примума обнаружили страницы, исписанные почерком давно умершего переписчика. Чернила ещё не высохли.",
        "Старый библиотекарь утверждает, что в одном из каталогов появилась книга, которой никто не приносил. На корешке — имя живого человека."
    ],
    "Каэлор": [
        "В кузницах Хелиона шепчутся о клинке, который не отражает пламя. Мастер, видевший его, больше не берёт заказов.",
        "Ночью горны одной из старых мастерских вспыхнули сами собой. Утром на наковальне лежал холодный металл с незнакомым клеймом."
    ],
    "Ксандр": [
        "В одном из банков нашли долговую запись, датированную годом, который ещё не наступил. Подпись принадлежит человеку, которого все знают.",
        "Купец из Гринвельда предлагает целое состояние за обычную медную монету. Он не торгуется и не объясняет почему."
    ],
    "Лирэн": [
        "На камнях у лесной границы кто-то оставляет имена живых людей. Последнее имя принадлежало путнику, который исчез накануне.",
        "Лесники клянутся, что одна поляна каждое утро оказывается дальше от дороги, чем была вчера."
    ],
    "Морвейн": [
        "Паломники из разных деревень описывают один и тот же колокол. Ни на одной карте нет храма, откуда он звучит.",
        "В туманной долине нашли следы босых ног, ведущие к обрыву. Обратно следов нет — но земля по обе стороны истоптана."
    ],
    "Святые Земли": [
        "Во время закрытого совета три посланника замолчали одновременно. Позже каждый поклялся, что услышал своё имя — произнесённое из пустого кресла.",
        "Слуги утверждают, что на столе переговоров появилась четвёртая печать. Ни один из присутствовавших правителей не признал её своей."
    ],
    "Спорные Земли": [
        "Караван прибыл без следов на дороге. У всех животных была мокрая шерсть, хотя в округе не было дождя уже две недели.",
        "В придорожной таверне оставили карту, на которой отмечено поселение, отсутствующее на всех известных картах. Хозяин помнит, как туда добирался — но не помнит возвращения."
    ],
    "default": [
        "Путники в разных краях рассказывают об одном и том же сне. Никто не может вспомнить лицо того, кто в нём говорил.",
        "В старых записях всё чаще встречается одна и та же пометка на полях. Ни один архивариус не узнаёт почерк."
    ]
};

const LORGUS_WHISPER_CSS = `
.lorgus-whisper{
  position:relative; isolation:isolate; overflow:hidden;
  display:grid; grid-template-columns:minmax(0,1.05fr) minmax(260px,.95fr);
  gap:clamp(22px,4vw,58px); align-items:center;
  margin:clamp(24px,4vw,46px) 0 18px; padding:clamp(24px,4vw,48px);
  border:1px solid rgba(185,147,87,.24); border-radius:3px;
  background:linear-gradient(112deg,rgba(19,17,14,.96),rgba(10,11,10,.92) 62%,rgba(26,21,15,.94));
  box-shadow:0 22px 70px rgba(0,0,0,.22),inset 0 0 55px rgba(182,137,70,.035);
}
.lorgus-whisper::before{
  content:"";position:absolute;z-index:-1;width:440px;height:440px;right:-120px;top:-220px;
  border-radius:50%;background:radial-gradient(circle,rgba(186,145,78,.12),rgba(111,91,57,.035) 42%,transparent 70%);
  animation:lorgus-whisper-glow 8s ease-in-out infinite alternate;
}
.lorgus-whisper::after{
  content:"";position:absolute;inset:10px;pointer-events:none;border:1px solid rgba(196,160,102,.065);
}
.lorgus-whisper-copy,.lorgus-whisper-reveal{position:relative;z-index:1;min-width:0}
.lorgus-whisper-kicker{display:flex;align-items:center;gap:10px;color:#b59a6c;font-size:10px;letter-spacing:.22em;text-transform:uppercase}
.lorgus-whisper-kicker::before{content:"";width:24px;height:1px;background:#a98b58;box-shadow:0 0 10px rgba(212,172,104,.45)}
.lorgus-whisper h2{margin:17px 0 12px;color:#e8dfcc;font:500 clamp(27px,3vw,43px)/1.05 'Cormorant Garamond',Georgia,serif;letter-spacing:.015em}
.lorgus-whisper-intro{max-width:48ch;color:rgba(220,211,192,.62);font:400 13px/1.8 'Lora',Georgia,serif}
.lorgus-whisper-place{display:inline-block;margin-top:20px;padding:7px 10px;border-left:1px solid rgba(190,151,88,.6);background:rgba(187,144,75,.055);color:#bca57d;font-size:10px;letter-spacing:.12em;text-transform:uppercase}
.lorgus-whisper-reveal{min-height:190px;display:flex;flex-direction:column;justify-content:center;padding:clamp(20px,3vw,32px);border:1px solid rgba(195,161,105,.16);background:linear-gradient(145deg,rgba(0,0,0,.22),rgba(145,111,60,.045));}
.lorgus-whisper-seal{display:grid;place-items:center;width:42px;height:42px;margin-bottom:18px;border:1px solid rgba(190,150,87,.5);border-radius:50%;color:#c4a36c;font:24px/1 'Cormorant Garamond',serif;box-shadow:0 0 26px rgba(179,133,66,.08),inset 0 0 15px rgba(179,133,66,.06)}
.lorgus-whisper-text{min-height:76px;color:#d8cbb0;font:italic 16px/1.75 'Cormorant Garamond',Georgia,serif}
.lorgus-whisper-text.is-revealing{animation:lorgus-whisper-appear .8s cubic-bezier(.2,.7,.2,1) both}
.lorgus-whisper-meta{margin-top:15px;color:rgba(195,173,136,.42);font-size:9px;letter-spacing:.16em;text-transform:uppercase}
.lorgus-whisper-action{align-self:flex-start;display:inline-flex;align-items:center;gap:12px;margin-top:18px;padding:11px 0;border:0;border-bottom:1px solid rgba(184,146,88,.4);background:transparent;color:#d1b17b;font:inherit;font-size:11px;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;transition:color .2s,border-color .2s,gap .2s}
.lorgus-whisper-action:hover{gap:17px;color:#f0d8a5;border-color:#e2bd7b}
.lorgus-whisper-action:focus-visible{outline:1px solid #c7a56e;outline-offset:5px}
@keyframes lorgus-whisper-glow{from{transform:translate3d(-12px,8px,0) scale(.9);opacity:.6}to{transform:translate3d(10px,-5px,0) scale(1.12);opacity:1}}
@keyframes lorgus-whisper-appear{0%{opacity:0;filter:blur(7px);transform:translateY(7px)}100%{opacity:1;filter:blur(0);transform:translateY(0)}}
@media(max-width:720px){.lorgus-whisper{grid-template-columns:1fr;gap:22px;padding:23px 19px}.lorgus-whisper-reveal{min-height:170px}.lorgus-whisper h2{font-size:34px}}
@media(prefers-reduced-motion:reduce){.lorgus-whisper::before,.lorgus-whisper-text.is-revealing{animation:none!important}}
`;

function ensureLorgusWhisperStyles() {
    if (document.getElementById("lorgus-whisper-styles")) return;
    const style = document.createElement("style");
    style.id = "lorgus-whisper-styles";
    style.textContent = LORGUS_WHISPER_CSS;
    document.head.appendChild(style);
}

function renderLorgusWorldWhisper() {
    const main = document.querySelector(".lorgus-command-main");
    if (!main || main.querySelector("[data-lorgus-world-whisper]")) return;

    ensureLorgusWhisperStyles();

    const presence = window.activeRpPresence;
    const locationName = presence?.type === "location" ? presence.location :
        presence?.type === "road" ? "В пути" : (window.activeCharacter?.homeland || "Неизвестный край");
    const whispers = LORGUS_WORLD_WHISPERS[locationName] || LORGUS_WORLD_WHISPERS.default;

    const section = document.createElement("section");
    section.className = "lorgus-whisper";
    section.dataset.lorgusWorldWhisper = "1";
    section.innerHTML = `
      <div class="lorgus-whisper-copy">
        <div class="lorgus-whisper-kicker">Фрагмент неофициальной летописи</div>
        <h2>У мира есть тайны.<br>Не все хотят быть найденными.</h2>
        <div class="lorgus-whisper-intro">Слухи доходят раньше гонцов. Одни рождаются из страха, другие — из правды, которую никто не решается произнести вслух. Прислушайся к тому, что шепчут о твоём крае.</div>
        <span class="lorgus-whisper-place">${window.escapeHtml ? window.escapeHtml(locationName) : String(locationName).replace(/[&<>"']/g, "")}</span>
      </div>
      <div class="lorgus-whisper-reveal">
        <div class="lorgus-whisper-seal" aria-hidden="true">✧</div>
        <div class="lorgus-whisper-text" aria-live="polite">Печать не тронута. Пока ты не прислушаешься, это всего лишь слова на полях чужой книги.</div>
        <div class="lorgus-whisper-meta">СЛУХ · НЕПОДТВЕРЖДЁННЫЕ СВЕДЕНИЯ</div>
        <button class="lorgus-whisper-action" type="button">Прислушаться к миру <span aria-hidden="true">↗</span></button>
      </div>`;
    const text = section.querySelector(".lorgus-whisper-text");
    const button = section.querySelector(".lorgus-whisper-action");
    let lastIndex = -1;
    button.addEventListener("click", () => {
        let index = Math.floor(Math.random() * whispers.length);
        if (whispers.length > 1 && index === lastIndex) index = (index + 1) % whispers.length;
        lastIndex = index;
        text.classList.remove("is-revealing");
        void text.offsetWidth;
        text.textContent = whispers[index];
        text.classList.add("is-revealing");
        button.innerHTML = 'Услышать ещё один слух <span aria-hidden="true">↗</span>';
    });
    const bottom = main.querySelector(".lorgus-command-bottom");
    if (bottom) bottom.after(section);
    else main.appendChild(section);
}

window.LORGUS_PAGES.overview = {
    render() {
        window.renderLorgusOverview?.();
        const grid = document.querySelector(".lorgus-command-grid");
        if (!grid) return;

        if (!grid.querySelector("[data-lorgus-codex-card]")) {
            const card = document.createElement("article");
            card.className = "lorgus-command-card";
            card.dataset.lorgusCodexCard = "1";
            const label = document.createElement("span");
            label.textContent = "ЗНАНИЯ МИРА";
            const title = document.createElement("strong");
            title.textContent = "Справочник Лоргуса";
            const description = document.createElement("small");
            description.textContent = "Школы меча и магии, церкви, армии, графства и известные жители.";
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = "Открыть справочник →";
            button.addEventListener("click", () => window.lorgusNavigate?.("/codex"));
            card.append(label, title, description, button);
            grid.appendChild(card);
        }

        renderLorgusWorldWhisper();
    }
};
