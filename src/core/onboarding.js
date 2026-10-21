/* First-visit onboarding tours for LORGUS sections. */
(() => {
  const tours = {
    "/main-page": {
      title: "Карта мира",
      steps: [
        { target: ".lorgus-map-page, .lorgus-world-map, #world-map", text: "Это карта Лоргуса. Выбирай королевство или доступную область, чтобы изучить земли и найти нужные места." },
        { target: ".lorgus-global-utility", text: "Уведомления и выход из аккаунта всегда доступны здесь. На телефоне пользуйся штатной нижней навигацией и кнопками самой страницы." }
      ]
    },
    "/lorblook": {
      title: "Лорбук",
      steps: [
        { target: ".lorgus-codex-page", text: "Лорбук — справочник мира: королевства, известные люди, религии, боевая система, магия и существа. Открывай разделы и записи, чтобы изучать лор." },
        { target: ".lorgus-codex-page input, .lorgus-codex-page [type='search']", text: "Если ищешь конкретное имя или тему, используй поиск внутри Лорбука. Чтобы вернуться к карте, нажми «Вернуться к карте»." },
        { target: ".lorgus-codex-map-return-top", text: "Эта кнопка возвращает к карте мира. В любой момент можно закрыть подсказки — они больше не будут появляться для этого раздела." }
      ]
    },
    "/character": {
      title: "Персонаж",
      steps: [
        { target: ".lorgus-character-page", text: "Здесь находится твой персонаж: его сведения и доступные действия. Изучай карточки и нажимай на нужные элементы, чтобы открыть подробности." },
        { target: ".lorgus-global-utility", text: "Уведомления и выход из аккаунта доступны в верхней панели. Чтобы перейти в другой раздел, используй навигацию сайта." }
      ]
    },
    "/mail": {
      title: "Письма",
      steps: [
        { target: ".lorgus-mail-page", text: "Здесь находится внутриигровая почта. Открывай письма, чтобы прочитать сообщения и проверить новые поступления." },
        { target: ".lorgus-global-utility", text: "Следи за уведомлениями о важных событиях. Они не заменяют сами письма — если пришло сообщение, открой его в этом разделе." }
      ]
    },
    "/rp": {
      title: "Ролевая",
      steps: [
        { target: ".lorgus-rp-page-container, .lorgus-rp-page, .lorgus-rp-hub", text: "Здесь начинается ролевая игра. Выбери доступное место, чтобы войти в игровой чат и писать действия своего персонажа." },
        { target: ".lorgus-rp-page-container, .lorgus-rp-page, .lorgus-rp-hub", text: "После входа в локацию используй кнопку перехода на дорогу прямо в чате, чтобы путешествовать между связанными местами, не возвращаясь каждый раз на карту." }
      ]
    }
  };
  const style = document.createElement("style");
  style.textContent = `
    .lorgus-guide-backdrop{position:fixed;inset:0;background:rgba(5,7,9,.72);z-index:100500}
    .lorgus-guide-focus{position:relative!important;z-index:100501!important;box-shadow:0 0 0 3px #d4b16d,0 0 0 7px rgba(212,177,109,.22),0 0 0 9999px rgba(5,7,9,.66)!important;border-radius:5px!important}
    .lorgus-guide-card{position:fixed;z-index:100502;left:50%;bottom:max(22px,env(safe-area-inset-bottom));transform:translateX(-50%);width:min(520px,calc(100vw - 28px));box-sizing:border-box;padding:22px 22px 18px;border:1px solid rgba(212,177,109,.72);border-radius:10px;background:linear-gradient(145deg,#211b13,#100e0b);color:#f0e4cb;box-shadow:0 18px 60px rgba(0,0,0,.6);font-family:Georgia,serif}
    .lorgus-guide-eyebrow{font:600 10px/1.4 Arial,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#d4b16d;margin-bottom:8px}
    .lorgus-guide-title{font-size:25px;line-height:1.15;margin:0 0 10px;color:#f4dfb2}
    .lorgus-guide-copy{font-size:16px;line-height:1.5;margin:0 0 18px;color:#e2d8c6}
    .lorgus-guide-actions{display:flex;align-items:center;justify-content:space-between;gap:10px}
    .lorgus-guide-count{font:12px Arial,sans-serif;color:#b7a98f}
    .lorgus-guide-actions button{min-height:40px;padding:0 16px;border:1px solid rgba(212,177,109,.65);border-radius:5px;background:#c6a15d;color:#17120b;font-weight:700;cursor:pointer}
    .lorgus-guide-actions .lorgus-guide-skip{background:transparent;color:#dfd0b3}
    @media(max-width:600px){.lorgus-guide-card{bottom:max(12px,env(safe-area-inset-bottom));padding:18px 16px 15px}.lorgus-guide-title{font-size:23px}.lorgus-guide-copy{font-size:15px}}
    @media(prefers-reduced-motion:no-preference){.lorgus-guide-card{animation:lorgus-guide-in .18s ease-out}@keyframes lorgus-guide-in{from{opacity:0;transform:translate(-50%,8px)}to{opacity:1;transform:translate(-50%,0)}}}
  `;
  document.head.appendChild(style);
  let activeRoute = "";
  let cleanup = null;
  function currentRoute() {
    const path = (location.pathname.replace(/\/+$/, "") || "/");
    return /^\/rp\/(chat|road)\//.test(path) ? "/rp" : path;
  }
  function startTour(route, tour) {
    if (cleanup) cleanup();
    const backdrop = document.createElement("div");
    backdrop.className = "lorgus-guide-backdrop";
    backdrop.setAttribute("aria-hidden", "true");
    const card = document.createElement("section");
    card.className = "lorgus-guide-card";
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-modal", "true");
    card.setAttribute("aria-label", "Подсказки по разделу");
    document.body.append(backdrop, card);
    let index = 0;
    let highlighted = null;
    const clearHighlight = () => {
      if (highlighted) highlighted.classList.remove("lorgus-guide-focus");
      highlighted = null;
    };
    const finish = () => {
      try { localStorage.setItem("lorgus-guide-seen:" + route, "1"); } catch (_) {}
      cleanup?.();
      cleanup = null;
    };
    const renderStep = () => {
      clearHighlight();
      const step = tour.steps[index];
      const target = document.querySelector(step.target);
      if (target && !target.closest(".lorgus-guide-card")) {
        highlighted = target;
        highlighted.classList.add("lorgus-guide-focus");
        try { target.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" }); } catch (_) {}
      }
      card.innerHTML = "";
      const eyebrow = document.createElement("div");
      eyebrow.className = "lorgus-guide-eyebrow";
      eyebrow.textContent = "ПУТЕВОДИТЕЛЬ ПО ЛОРГУСУ";
      const heading = document.createElement("h2");
      heading.className = "lorgus-guide-title";
      heading.textContent = index === 0 ? tour.title : "Полезно знать";
      const copy = document.createElement("p");
      copy.className = "lorgus-guide-copy";
      copy.textContent = step.text;
      const actions = document.createElement("div");
      actions.className = "lorgus-guide-actions";
      const count = document.createElement("span");
      count.className = "lorgus-guide-count";
      count.textContent = (index + 1) + " из " + tour.steps.length;
      const buttons = document.createElement("div");
      buttons.style.display = "flex";
      buttons.style.gap = "8px";
      const skip = document.createElement("button");
      skip.type = "button";
      skip.className = "lorgus-guide-skip";
      skip.textContent = "Пропустить";
      skip.addEventListener("click", finish);
      const next = document.createElement("button");
      next.type = "button";
      next.textContent = index === tour.steps.length - 1 ? "Понятно" : "Далее →";
      next.addEventListener("click", () => {
        if (index < tour.steps.length - 1) { index += 1; renderStep(); }
        else finish();
      });
      buttons.append(skip, next);
      actions.append(count, buttons);
      card.append(eyebrow, heading, copy, actions);
      next.focus({ preventScroll: true });
    };
    cleanup = () => {
      clearHighlight();
      backdrop.remove();
      card.remove();
    };
    backdrop.addEventListener("click", finish);
    renderStep();
  }
  function checkRoute() {
    const route = currentRoute();
    if (route === activeRoute) return;
    activeRoute = route;
    const tour = tours[route];
    if (!tour) return;
    let seen = false;
    try { seen = localStorage.getItem("lorgus-guide-seen:" + route) === "1"; } catch (_) {}
    if (seen) return;
    // Let the page adapter finish rendering before we locate the guided element.
    window.setTimeout(() => {
      if (currentRoute() === route && !document.querySelector(".lorgus-guide-card")) startTour(route, tour);
    }, 700);
  }
  window.addEventListener("popstate", checkRoute);
  const observer = new MutationObserver(checkRoute);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  checkRoute();
})();
