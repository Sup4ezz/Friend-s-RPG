/* LORGUS global blacklist gate and administrator controls */
(() => {
    const db = () => window.supabaseClient;
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

    // Gate every authenticated entry, including direct SPA URLs.
    const originalLoadPlayerState = window.loadPlayerState;
    if (typeof originalLoadPlayerState === "function") {
        window.loadPlayerState = async function(session, ...args) {
            if (session?.user?.id && db()) {
                try {
                    const { data: admin, error: adminError } = await db().rpc("is_admin");
                    if (adminError) throw adminError;
                    if (!admin) {
                        const { data, error } = await db().from("lorgus_blacklist")
                            .select("user_id").eq("user_id", session.user.id).maybeSingle();
                        if (error) throw error;
                        if (data) {
                            showBlacklistedScreen();
                            return;
                        }
                    }
                } catch (error) {
                    console.error("LORGUS blacklist check failed:", error);
                    const root = document.getElementById("root");
                    if (root) root.innerHTML = '<main style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#10100f;color:#d8c8ad;text-align:center"><section><h1>Не удалось проверить доступ</h1><p>Доступ к миру временно закрыт. Попробуйте обновить страницу позже.</p><button onclick="location.reload()">Повторить</button></section></main>';
                    window.lorgusBlacklisted = true;
                    return;
                }
            }
            window.lorgusBlacklisted = false;
            return originalLoadPlayerState.call(this, session, ...args);
        };
    }

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
                const { data, error } = await db().from("lorgus_blacklist")
                    .select("user_id,reason,created_at").order("created_at", { ascending: false });
                if (error) { list.textContent = "Не удалось загрузить список: " + error.message; return; }
                if (!data?.length) { list.innerHTML = "<p>Чёрный список пуст.</p>"; return; }
                const ids = data.map(row => row.user_id);
                const { data: players, error: playersError } = await db().from("players").select("id,username").in("id", ids);
                if (playersError) console.warn("Не удалось получить логины для чёрного списка", playersError);
                const names = new Map((players || []).map(p => [p.id, p.username]));
                list.innerHTML = data.map(row => `
                  <div style="display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:12px 0;border-bottom:1px solid #514637">
                    <div><strong>${esc(names.get(row.user_id) || row.user_id)}</strong><div style="opacity:.75;font-size:14px">${esc(row.reason || "Причина не указана")}</div></div>
                    <button type="button" class="admin-tool-button" data-unban="${esc(row.user_id)}">Разблокировать</button>
                  </div>`).join("");
            };

            section.querySelector("#lorgus-blacklist-add").addEventListener("click", async () => {
                const username = section.querySelector("#lorgus-blacklist-username").value.trim();
                const reason = section.querySelector("#lorgus-blacklist-reason").value.trim();
                if (!username) { status.textContent = "Укажи логин игрока."; return; }
                status.textContent = "Поиск аккаунта…";
                const { data: player, error: playerError } = await db().from("players")
                    .select("id,username").ilike("username", username).maybeSingle();
                if (playerError || !player) { status.textContent = "Аккаунт не найден или недоступен для поиска."; return; }
                if (player.id === window.lorgusCurrentUserId) { status.textContent = "Нельзя заблокировать собственный аккаунт администратора."; return; }
                const { error } = await db().from("lorgus_blacklist").upsert({
                    user_id: player.id, reason, created_by: window.lorgusCurrentUserId
                }, { onConflict: "user_id" });
                if (error) { status.textContent = "Ошибка блокировки: " + error.message; return; }
                status.textContent = "Пользователь добавлен в чёрный список.";
                section.querySelector("#lorgus-blacklist-username").value = "";
                section.querySelector("#lorgus-blacklist-reason").value = "";
                await refresh();
            });

            list.addEventListener("click", async event => {
                const button = event.target.closest("[data-unban]");
                if (!button) return;
                button.disabled = true;
                const { error } = await db().from("lorgus_blacklist").delete().eq("user_id", button.dataset.unban);
                if (error) { status.textContent = "Ошибка разблокировки: " + error.message; button.disabled = false; return; }
                status.textContent = "Блокировка снята.";
                await refresh();
            });
            await refresh();
        };
    }
})();