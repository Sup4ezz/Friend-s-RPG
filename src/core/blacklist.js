/* LORGUS global blacklist gate and administrator controls */
(() => {
    const db = () => window.supabaseClient;
    // Share one short-lived admin check across startup gates to avoid duplicate RPCs.
    let adminCheckPromise = null;
    window.lorgusGetAdminStatus = window.lorgusGetAdminStatus || async function() {
        const now = Date.now();
        const cached = window.__lorgusAdminStatusCache;
        if (cached && now - cached.checkedAt < 10000) return cached.value;
        if (adminCheckPromise) return adminCheckPromise;
        adminCheckPromise = (async () => {
            let lastError;
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    const result = await Promise.race([
                        db().rpc("is_admin"),
                        new Promise((_, reject) => window.setTimeout(
                            () => reject(new Error("LORGUS_REQUEST_TIMEOUT")),
                            2500
                        ))
                    ]);
                    if (result.error) throw result.error;
                    const value = result.data === true;
                    window.__lorgusAdminStatusCache = { value, checkedAt: Date.now() };
                    return value;
                } catch (error) {
                    lastError = error;
                    if (attempt < 2) await new Promise(resolve => window.setTimeout(resolve, 350 * (attempt + 1)));
                }
            }
            // Fail closed for privilege elevation: a network outage must never
            // grant admin rights. Cache false briefly so startup does not repeat
            // the same failing RPC immediately in the cabinet loader.
            console.warn("LORGUS: is_admin unavailable after retries; temporarily treating session as non-admin.", lastError);
            window.__lorgusAdminStatusCache = { value: false, checkedAt: Date.now() };
            return false;
        })().finally(() => { adminCheckPromise = null; });
        return adminCheckPromise;
    };
    const esc = value => window.escapeHtml
        ? window.escapeHtml(String(value ?? ""))
        : String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

    function showBlacklistedScreen() {
        const root = document.getElementById("root");
        if (!root) return;
        root.innerHTML = `
          <main style="min-height:100vh;display:grid;place-items:center;padding:28px;box-sizing:border-box;background:radial-gradient(ellipse at 50% 35%,#28231d 0%,#10100f 48%,#070707 100%);color:#d8c8ad;font-family:'Cormorant Garamond',Georgia,serif;text-align:center">
            <section style="width:min(680px,100%);box-sizing:border-box;padding:clamp(28px,6vw,64px);border:1px solid #554631;background:linear-gradient(145deg,rgba(30,27,23,.97),rgba(8,8,8,.98));box-shadow:0 25px 100px #000;border-radius:3px">
              <div style="font-size:12px;letter-spacing:.34em;color:#9b8057;margin-bottom:24px">ЛОРГУС · ДОСТУП ЗАКРЫТ</div>
              <div aria-hidden="true" style="font-size:42px;color:#8c7048;margin-bottom:18px">✦</div>
              <h1 style="font-size:clamp(32px,6vw,52px);font-weight:500;line-height:1.05;margin:0 0 24px">Похоже вас внесли в черный список проекта(</h1>
              <p style="font-size:clamp(19px,3vw,25px);line-height:1.5;color:#c5b9a4;margin:0">Что-бы апеллировать решение, свяжитесь с владельцем ЛОРГУС'а</p>
            </section>
          </main>`;
        document.title = "Доступ закрыт · ЛОРГУС";
        window.lorgusBlacklisted = true;
    }

    // Never block game startup on a separate blacklist preflight.
    // Restore the player/admin screen immediately; check the blacklist in parallel.
    // If a confirmed match is returned, replace the screen with the block notice.
    const originalLoadPlayerState = window.loadPlayerState;
    if (typeof originalLoadPlayerState === "function") {
        window.loadPlayerState = function(session, ...args) {
            window.lorgusBlacklisted = false;
            if (session?.user?.id && db()) {
                Promise.resolve().then(async () => {
                    try {
                        const admin = await window.lorgusGetAdminStatus();
                        if (admin) return;
                        const { data, error } = await Promise.race([
                            db().from("lorgus_blacklist")
                                .select("user_id").eq("user_id", session.user.id).maybeSingle(),
                            new Promise((_, reject) => window.setTimeout(
                                () => reject(new Error("LORGUS_BLACKLIST_CHECK_TIMEOUT")),
                                3000
                            ))
                        ]);
                        if (error) throw error;
                        if (data) showBlacklistedScreen();
                    } catch (error) {
                        // Network errors must not hold up gameplay. Database RLS remains
                        // the authority for protected data; retry the live check later.
                        console.warn("LORGUS background blacklist check unavailable:", error);
                    }
                });
            }
            return originalLoadPlayerState.call(this, session, ...args);
        };
    }

    // Kick an already logged-in player shortly after an administrator blocks them.
    // This supplements the login gate; it does not replace database RLS.
    let blacklistPollBusy = false;
    const checkCurrentSessionBlacklist = async () => {
        if (blacklistPollBusy || window.lorgusBlacklisted || !db()?.auth) return;
        blacklistPollBusy = true;
        try {
            const { data: sessionData, error: sessionError } = await db().auth.getSession();
            if (sessionError) throw sessionError;
            const userId = sessionData?.session?.user?.id;
            if (!userId) return;
            const admin = await window.lorgusGetAdminStatus();
            if (admin) return;
            const { data, error } = await db().from("lorgus_blacklist")
                .select("user_id").eq("user_id", userId).maybeSingle();
            if (error) throw error;
            if (data) showBlacklistedScreen();
        } catch (error) {
            console.warn("LORGUS live blacklist check failed:", error);
        } finally {
            blacklistPollBusy = false;
        }
    };
    window.setInterval(checkCurrentSessionBlacklist, 15000);
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) checkCurrentSessionBlacklist();
    });

    // Add a blacklist manager to the existing admin dashboard without replacing it.
    const originalRenderAdminApplications = window.renderAdminApplications;
    if (typeof originalRenderAdminApplications === "function") {
        window.renderAdminApplications = async function(container, applications) {
            await originalRenderAdminApplications.call(this, container, applications);
            if (!container || container.querySelector("#lorgus-blacklist-admin")) return;

            const section = document.createElement("section");
            section.id = "lorgus-blacklist-admin";
            section.className = "admin-section";
            section.innerHTML = `
              <div class="admin-section-heading"><div><h2>Чёрный список</h2><p>Заблокированный аккаунт при входе увидит только заглушку.</p></div></div>
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;margin:16px 0">
                <label style="display:grid;gap:6px">Логин игрока<input id="lorgus-blacklist-username" autocomplete="off" placeholder="Например, test"></label>
                <label style="display:grid;gap:6px">Причина (необязательно)<input id="lorgus-blacklist-reason" placeholder="Причина блокировки"></label>
                <button type="button" class="admin-tool-button" id="lorgus-blacklist-add">Заблокировать</button>
              </div>
              <div id="lorgus-blacklist-status" role="status" style="margin:8px 0"></div>
              <div id="lorgus-blacklist-list">Загрузка списка…</div>`;
            const lore = container.querySelector(".admin-lore-tree-section");
            if (lore?.parentNode) lore.parentNode.insertBefore(section, lore.nextSibling);
            else container.prepend(section);

            const status = section.querySelector("#lorgus-blacklist-status");
            const list = section.querySelector("#lorgus-blacklist-list");
            const refresh = async () => {
                const { data, error } = await db().rpc("admin_list_lorgus_blacklist");
                if (error) { list.textContent = "Не удалось загрузить список: " + error.message; return; }
                if (!data?.length) { list.innerHTML = "<p>Чёрный список пуст.</p>"; return; }
                list.innerHTML = data.map(row => `
                  <div style="display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:12px 0;border-bottom:1px solid #514637">
                    <div><strong>${esc(row.username || row.user_id)}</strong><div style="opacity:.75;font-size:14px">${esc(row.reason || "Причина не указана")}</div></div>
                    <button type="button" class="admin-tool-button" data-unban="${esc(row.user_id)}">Разблокировать</button>
                  </div>`).join("");
            };

            section.querySelector("#lorgus-blacklist-add").addEventListener("click", async () => {
                const username = section.querySelector("#lorgus-blacklist-username").value.trim();
                const reason = section.querySelector("#lorgus-blacklist-reason").value.trim();
                if (!username) { status.textContent = "Укажи логин игрока."; return; }
                status.textContent = "Блокировка аккаунта…";
                const { error } = await db().rpc("admin_block_lorgus_player", {
                    p_username: username,
                    p_reason: reason
                });
                if (error) {
                    status.textContent = error.message.includes("PLAYER_NOT_FOUND")
                        ? "Аккаунт не найден."
                        : error.message.includes("CANNOT_BLOCK_SELF")
                            ? "Нельзя заблокировать собственный аккаунт администратора."
                            : "Ошибка блокировки: " + error.message;
                    return;
                }
                status.textContent = "Пользователь добавлен в чёрный список.";
                section.querySelector("#lorgus-blacklist-username").value = "";
                section.querySelector("#lorgus-blacklist-reason").value = "";
                await refresh();
            });

            list.addEventListener("click", async event => {
                const button = event.target.closest("[data-unban]");
                if (!button) return;
                button.disabled = true;
                const { error } = await db().rpc("admin_unblock_lorgus_player", {
                    p_user_id: button.dataset.unban
                });
                if (error) { status.textContent = "Ошибка разблокировки: " + error.message; button.disabled = false; return; }
                status.textContent = "Блокировка снята.";
                await refresh();
            });
            await refresh();
        };
    }
})();