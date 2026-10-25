(() => {
  const notice = document.querySelector("#notice");
  const settings = document.querySelector("#settings");
  const title = document.querySelector("#notice-title");
  const body = document.querySelector("#notice-body");
  const kicker = document.querySelector("#notice-kicker");

  const messages = {
    continue: ["ПУТЬ ПРОДОЛЖАЕТСЯ", "Игровые ворота пока закрыты", "Это первый визуальный прототип клиента. На следующем этапе подключим авторизацию и существующие данные LORGUS. Сейчас никаких запросов к аккаунтам и Supabase не выполняется."],
    world: ["АТЛАС ЗЕМЕЛЬ", "Карта готовится к открытию", "Интерактивная карта станет одним из первых игровых модулей. Канонические регионы и маршруты будут перенесены из действующего LORGUS после проверки их источников."],
    chronicles: ["АРХИВ ЛЕТОПИСЦА", "Хроники ещё собираются", "Архив будет подключён к существующему лору. Этот прототип пока не загружает игровые или личные данные."]
  };

  document.querySelectorAll("[data-action]").forEach(button => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      if (action === "settings") { settings.showModal(); return; }
      const message = messages[action];
      if (!message) return;
      [kicker.textContent, title.textContent, body.textContent] = message;
      notice.showModal();
    });
  });

  document.querySelector("#settings-open").addEventListener("click", () => settings.showModal());
  document.querySelectorAll("[data-close]").forEach(button => {
    button.addEventListener("click", () => button.closest("dialog")?.close());
  });
  [notice, settings].forEach(dialog => {
    dialog.addEventListener("click", event => {
      if (event.target === dialog) dialog.close();
    });
  });

  document.querySelector("#reduced-motion").addEventListener("change", event => {
    document.documentElement.classList.toggle("reduced-motion", event.target.checked);
  });
  document.querySelector("#large-text").addEventListener("change", event => {
    document.documentElement.classList.toggle("large-text", event.target.checked);
  });

  if (window.lorgusDesktop) {
    document.querySelector("#build-label").textContent = "КЛИЕНТ WINDOWS · " + window.lorgusDesktop.version.toUpperCase();
  }
})();
