import { createClient } from "@supabase/supabase-js";

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
  const config = window.LORGUS_CONFIG;
  const supabase = config?.supabaseUrl && config?.supabasePublishableKey
    ? createClient(config.supabaseUrl, config.supabasePublishableKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
      })
    : null;
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

  // Uses the exact username -> synthetic email mapping from the production web client.
  function encodeUsername(username) {
    return btoa(encodeURIComponent(username))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replaceAll("=", "");
  }
  function getAuthEmail(username) {
    return `u_${encodeUsername(username)}@auth.lorgus.local`;
  }
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (transitioning) return;
    const usernameInput = $("#username");
    const passwordInput = $("#password");
    const submitButton = form.querySelector('button[type="submit"]');
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    error.classList.remove("is-visible");
    passwordInput.removeAttribute("aria-invalid");
    if (!supabase) {
      error.textContent = "Не удалось загрузить конфигурацию клиента. Обнови сборку или сообщи администратору.";
      error.classList.add("is-visible");
      return;
    }
    if (!username || !password) return;
    submitButton.disabled = true;
    submitButton.setAttribute("aria-busy", "true");
    submitButton.querySelector("span").textContent = "ПРОВЕРЯЕМ ДОСТУП…";
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: getAuthEmail(username),
        password
      });
      if (authError || !data?.session) {
        error.textContent = "Не удалось войти. Проверь логин и пароль, затем попробуй ещё раз.";
        error.classList.add("is-visible");
        passwordInput.setAttribute("aria-invalid", "true");
        passwordInput.focus();
        return;
      }
      error.classList.remove("is-visible");
      playMessengerTransition();
    } catch {
      error.textContent = "Не удалось связаться с ЛОРГУСОМ. Проверь подключение к интернету и повтори попытку.";
      error.classList.add("is-visible");
    } finally {
      submitButton.disabled = false;
      submitButton.removeAttribute("aria-busy");
      submitButton.querySelector("span").textContent = "ВОЙТИ В ЛОРГУС";
    }
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