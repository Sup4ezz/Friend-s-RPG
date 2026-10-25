(() => {
  "use strict";
  const $ = (selector) => document.querySelector(selector);
  const splash = $("#splash");
  const login = $("#login-screen");
  const messenger = $("#messenger");
  const feather = $("#feather-wipe");
  const cabinet = $("#cabinet");
  const form = $("#login-form");
  const error = $("#login-error");
  const notice = $("#notice");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let introDone = false;
  let transitioning = false;

  function revealLogin() {
    if (introDone) return;
    introDone = true;
    splash.classList.add("fade-away");
    login.classList.add("is-visible");
    document.body.classList.add("intro-complete");
    window.setTimeout(() => splash.remove(), reducedMotion ? 20 : 1500);
  }
  window.setTimeout(revealLogin, reducedMotion ? 100 : 4800);
  $("#skip-intro").addEventListener("click", revealLogin);

  // Never treat a click or locally entered credentials as a successful login.
  // The cinematic transition is only called by a future verified auth-success handler.
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (transitioning) return;
    error.textContent = "Авторизация пока не подключена. Вход не выполнен, игровые данные не загружены.";
    error.classList.add("is-visible");
    $("#password").setAttribute("aria-invalid", "true");
    $("#password").focus();
  });

  function playMessengerTransition() {
    if (transitioning) return;
    transitioning = true;
    login.classList.add("login-leaving");
    messenger.classList.add("pigeon-flight");
    const wait = (ms) => new Promise(resolve => window.setTimeout(resolve, reducedMotion ? 20 : ms));
    (async () => {
      await wait(1750);
      feather.classList.add("feather-cover");
      await wait(1050);
      cabinet.classList.add("cabinet-reveal");
      cabinet.setAttribute("aria-hidden", "false");
      await wait(500);
      feather.classList.add("feather-fall");
      await wait(1400);
      feather.classList.remove("feather-cover", "feather-fall");
      messenger.classList.remove("pigeon-flight");
      login.hidden = true;
      transitioning = false;
    })();
  }
  // Kept private until real Supabase authentication is implemented.
  void playMessengerTransition;

  const messages = {
    characters: ["МОИ ПЕРСОНАЖИ", "Летопись ещё не открыта", "Подключение персонажей будет выполнено после безопасной интеграции с существующей авторизацией LORGUS. Сейчас запросы к игровым данным не выполняются."],
    atlas: ["АТЛАС ЗЕМЕЛЬ", "Туман скрывает дороги", "Карта ЛОРГУСА ещё не подключена к этому настольному клиенту."],
    chronicles: ["АРХИВ ЛЕТОПИСЦА", "Хроники ещё собираются", "Раздел будет связан с каноническим архивом LORGUS после подключения реальных игровых экранов."]
  };
  document.querySelectorAll("[data-cabinet]").forEach(button => button.addEventListener("click", () => {
    const message = messages[button.dataset.cabinet];
    $("#notice .eyebrow").textContent = message[0];
    $("#notice-title").textContent = message[1];
    $("#notice-body").textContent = message[2];
    if (!notice.open) notice.showModal();
  }));
  $("#cabinet-settings").addEventListener("click", () => {
    $("#notice .eyebrow").textContent = "НАСТРОЙКИ";
    $("#notice-title").textContent = "Тишина перед дорогой";
    $("#notice-body").textContent = "Настройки изображения, звука и управления появятся вместе с полноценными игровыми экранами.";
    if (!notice.open) notice.showModal();
  });
  document.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", () => button.closest("dialog")?.close()));
  notice.addEventListener("click", event => { if (event.target === notice) notice.close(); });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !introDone) revealLogin();
  });
  if (window.lorgusDesktop) document.title = "ЛОРГУС · " + window.lorgusDesktop.version;
})();