(() => {
  const $ = (selector) => document.querySelector(selector);
  const splash = $("#splash");
  const login = $("#login-screen");
  const loginCard = $("#login-card");
  const messenger = $("#messenger");
  const feather = $("#feather-wipe");
  const cabinet = $("#cabinet");
  const form = $("#login-form");
  const error = $("#login-error");
  const notice = $("#notice");
  let introDone = false;
  let transitioning = false;

  function revealLogin() {
    if (introDone) return;
    introDone = true;
    splash.classList.add("fade-away");
    login.classList.add("is-visible");
    document.body.classList.add("intro-complete");
    window.setTimeout(() => splash.remove(), 1500);
  }
  window.setTimeout(revealLogin, 4800);
  $("#skip-intro").addEventListener("click", revealLogin);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (transitioning) return;
    // Authentication is intentionally not faked: this prototype has no Supabase connection.
    error.textContent = "Авторизация ещё не подключена. Сейчас покажем только демонстрацию перехода.";
    error.classList.add("is-visible");
    playMessengerTransition();
  });

  function playMessengerTransition() {
    if (transitioning) return;
    transitioning = true;
    login.classList.add("login-leaving");
    messenger.classList.add("pigeon-flight");
    window.setTimeout(() => {
      feather.classList.add("feather-cover");
    }, 1750);
    window.setTimeout(() => {
      cabinet.classList.add("cabinet-reveal");
      cabinet.setAttribute("aria-hidden", "false");
    }, 2800);
    window.setTimeout(() => {
      feather.classList.add("feather-fall");
    }, 3300);
    window.setTimeout(() => {
      feather.classList.remove("feather-cover", "feather-fall");
      messenger.classList.remove("pigeon-flight");
      login.hidden = true;
      transitioning = false;
    }, 4700);
  }

  const messages = {
    characters: ["МОИ ПЕРСОНАЖИ", "Летопись ещё не открыта", "Подключим существующие аккаунты и персонажей LORGUS после проверки безопасной авторизации. Никакие данные сейчас не загружаются."],
    atlas: ["АТЛАС ЗЕМЕЛЬ", "Туман скрывает дороги", "Интерактивная карта станет одним из следующих этапов разработки клиента."],
    chronicles: ["АРХИВ ЛЕТОПИСЦА", "Хроники ещё собираются", "Архив будет связан с каноническим лором LORGUS на следующем этапе."]
  };
  document.querySelectorAll("[data-cabinet]").forEach(button => button.addEventListener("click", () => {
    const message = messages[button.dataset.cabinet];
    $("#notice .eyebrow").textContent = message[0];
    $("#notice-title").textContent = message[1];
    $("#notice-body").textContent = message[2];
    notice.showModal();
  }));
  $("#cabinet-settings").addEventListener("click", () => {
    $("#notice .eyebrow").textContent = "НАСТРОЙКИ";
    $("#notice-title").textContent = "Тишина перед дорогой";
    $("#notice-body").textContent = "Настройки изображения, звука и управления появятся в следующих версиях клиента.";
    notice.showModal();
  });
  document.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", () => button.closest("dialog")?.close()));
  notice.addEventListener("click", event => { if (event.target === notice) notice.close(); });
  if (window.lorgusDesktop) document.title = "ЛОРГУС · " + window.lorgusDesktop.version;
})();