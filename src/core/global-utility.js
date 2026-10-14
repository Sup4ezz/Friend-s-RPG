/* Persistent utility controls shared by LORGUS game pages. */
(() => {
  const ROOTS = [
    ".lorgus-map-page", ".lorgus-character-page", ".lorgus-mail-page",
    ".lorgus-inventory-page", ".lorgus-subpage-container",
    ".lorgus-character-view", ".lorgus-character-details",
    ".lorgus-codex-page", "[class*='lorgus-codex']"
  ].join(",");
  function ensureToolbar() {
    let bar = document.querySelector(".lorgus-global-utility");
    if (!bar) {
      bar = document.createElement("div");
      bar.className = "lorgus-global-utility";
      bar.setAttribute("aria-label", "Действия аккаунта");
      bar.innerHTML = '<button type="button" class="lorgus-global-notifications" aria-label="Уведомления"><span aria-hidden="true">♢</span> УВЕДОМЛЕНИЯ</button><button type="button" class="lorgus-global-logout">ВЫЙТИ</button>';
      bar.querySelector(".lorgus-global-notifications").addEventListener("click", () => {
        if (typeof window.openLorgusNotifications === "function") window.openLorgusNotifications();
      });
      bar.querySelector(".lorgus-global-logout").addEventListener("click", () => {
        if (typeof window.logout === "function") window.logout();
      });
      document.body.appendChild(bar);
    }
    const active = document.querySelector(ROOTS);
    bar.classList.toggle("is-visible", Boolean(active));

    let returnArrow = document.querySelector(".lorgus-direction-return");
    const path = (window.location.pathname || "").replace(/\\/$/, "");
    const directions = {
      "/mail": { glyph: "↑", direction: "top", label: "Вернуться на карту из писем" },
      "/character": { glyph: "↓", direction: "bottom", label: "Вернуться на карту из персонажа" },
      "/lorblook": { glyph: "←", direction: "left", label: "Вернуться на карту из лорбука" },
      "/rp": { glyph: "→", direction: "right", label: "Вернуться на карту из ролевой" }
    };
    const config = directions[path];
    if (config && active) {
      if (!returnArrow) {
        returnArrow = document.createElement("button");
        returnArrow.type = "button";
        returnArrow.className = "lorgus-direction-return";
        document.body.appendChild(returnArrow);
        returnArrow.addEventListener("click", () => {
          const current = directions[(window.location.pathname || "").replace(/\\/$/, "")];
          if (!current || typeof window.renderLorgusWorldMapCurrent !== "function") return;
          if (typeof window.lorgusSubpageTransition === "function") {
            window.lorgusSubpageTransition(current.direction, window.renderLorgusWorldMapCurrent);
          } else {
            window.renderLorgusWorldMapCurrent();
          }
        });
      }
      returnArrow.textContent = config.glyph;
      returnArrow.setAttribute("aria-label", config.label);
      returnArrow.title = config.label;
      returnArrow.hidden = false;
    } else if (returnArrow) {
      returnArrow.hidden = true;
    }
  }
  function removeBackButtons() {
    document.querySelectorAll(
      "#lorgus-global-back,.lorgus-global-back," +
      ".lorgus-character-back,.lorgus-mail-back,.lorgus-subpage-back-arrow," +
      ".back-button,.back-btn,.btn-back,[class*='back-button'],[class*='back-btn']"
    ).forEach(el => {
      if (!el.closest(".lorgus-global-utility")) el.remove();
    });

    document.querySelectorAll("button,a,[role='button'],input[type='button'],input[type='submit']").forEach(el => {
      if (el.closest(".lorgus-global-utility")) return;
      const label = [
        el.textContent || "",
        el.getAttribute("aria-label") || "",
        el.getAttribute("title") || "",
        el.value || ""
      ].join(" ").replace(/[←←‹«→\s]+/g, " ").trim().toLocaleUpperCase("ru-RU");
      if (/(^|\\s)НАЗАД($|\\s)/u.test(label)) {
        el.remove();
      }
    });
  }
  function refresh() { removeBackButtons(); ensureToolbar(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", refresh, { once: true });
  else refresh();
  new MutationObserver(refresh).observe(document.documentElement, { childList: true, subtree: true });
})();