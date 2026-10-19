/* Persistent utility controls shared by LORGUS game pages. */
(() => {
  // Сбрасываем незавершённое состояние сцены после перезагрузки/возврата из фона.
  // Иначе мобильный браузер может оставить страницу затемнённой и заблокировать стрелку.
  const recoverScene = () => {
    window.lorgusMainMenuNavigating = false;
    delete document.documentElement.dataset.lorgusTransition;
    document.documentElement.classList.remove("lorgus-transition-active", "lorgus-scene-transitioning");
    document.body?.classList.remove("lorgus-transition-active", "lorgus-scene-transitioning");

    // A portal/eye overlay must never survive a reload or a return from the
    // mobile browser background; either layer covers the whole screen in black.
    document.querySelectorAll(".lorgus-portal-transition, .lorgus-eye-transition, .lorgus-region-transition-veil, .lorgus-transition-screen, .lorgus-scene-transition-overlay, .lorgus-transition-overlay")
      .forEach(overlay => overlay.remove());
    window.lorgusPortalOverlay = null;
  };
  recoverScene();
  window.addEventListener("pageshow", recoverScene);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") recoverScene();
  });
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

    const path = (window.location.pathname || "").replace(/\/+$/, "") || "/";
    const route = /^\/rp\/(chat|road)\//.test(path) ? "/rp" : path;
    const active = document.querySelector(ROOTS);
    bar.classList.toggle("is-visible", Boolean(active));

    const sectionPaths = new Set(["/mail", "/character", "/lorblook", "/rp"]);
    let nav = document.querySelector(".lorgus-subpage-nav");
    if (sectionPaths.has(route) && active) {
      if (!nav) {
        nav = document.createElement("nav");
        nav.className = "lorgus-mainmenu-nav lorgus-subpage-nav";
        nav.setAttribute("aria-label", "Навигация по миру");
        document.body.appendChild(nav);
      }
      nav.innerHTML = `
        <button type="button" class="lorgus-mainmenu-arrow top" data-route="/character" aria-label="Персонаж" title="Персонаж"><span class="lorgus-nav-symbol" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 20V4M5 11l7-7 7 7"/></svg></span><b>ПЕРСОНАЖ</b></button>
        <button type="button" class="lorgus-mainmenu-arrow bottom" data-route="/mail" aria-label="Письма" title="Письма"><span class="lorgus-nav-symbol" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 4v16M5 13l7 7 7-7"/></svg></span><b>ПИСЬМА</b></button>
        <button type="button" class="lorgus-mainmenu-arrow left" data-route="/rp" aria-label="Ролевая" title="Ролевая"><span class="lorgus-nav-symbol" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 12H4M11 5l-7 7 7 7"/></svg></span><b>РОЛЕВАЯ</b></button>
        <button type="button" class="lorgus-mainmenu-arrow right" data-route="/lorblook" aria-label="Лорбук" title="Лорбук"><span class="lorgus-nav-symbol" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 12h16M13 5l7 7-7 7"/></svg></span><b>ЛОРБУК</b></button>
      `;
      nav.hidden = false;
      nav.querySelectorAll("button[data-route]").forEach(button => {
        button.addEventListener("click", event => {
          // Router's capture handler performs clean full-page navigation on phones.
          if (window.matchMedia("(max-width: 720px)").matches) return;
          event.preventDefault();
          const target = button.dataset.route;
          const direction = ["top", "bottom", "left", "right"].find(name => button.classList.contains(name)) || "right";
          const openTarget = () => {
            if (typeof window.lorgusNavigate === "function") window.lorgusNavigate(target);
            else window.location.assign(target);
          };
          if (typeof window.lorgusSubpageTransition === "function") {
            window.lorgusSubpageTransition(direction, openTarget);
          } else {
            openTarget();
          }
        });
      });
    } else if (nav) {
      nav.remove();
    }

    // Удаляем кнопку старого дизайна, если она осталась в уже открытой SPA-странице.
    document.querySelectorAll(".lorgus-direction-return").forEach(el => el.remove());
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
      if (el.closest(".lorgus-global-utility,.lorgus-subpage-nav")) return;
      const label = [
        el.textContent || "",
        el.getAttribute("aria-label") || "",
        el.getAttribute("title") || "",
        el.value || ""
      ].join(" ").replace(/[←‹«→\s]+/g, " ").trim().toLocaleUpperCase("ru-RU");
      if (/(^|\s)НАЗАД($|\s)/u.test(label)) el.remove();
    });
  }

  function refresh() {
    removeBackButtons();
    ensureToolbar();
  }

  // SPA-страницы создают сотни DOM-узлов за один переход. Объединяем обновления в один кадр.
  let refreshQueued = false;
  function scheduleRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    window.requestAnimationFrame(() => {
      refreshQueued = false;
      refresh();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", refresh, { once: true });
  } else {
    refresh();
  }
  const observer = new MutationObserver(records => {
    const relevant = records.some(record => {
      const target = record.target.nodeType === 1 ? record.target : record.target.parentElement;
      return !target?.closest(".lorgus-global-utility,.lorgus-subpage-nav,.lorgus-direction-return");
    });
    if (relevant) scheduleRefresh();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
