/* LORGUS maintenance-mode gate and administrator toggle. */
(() => {
    const db = () => window.supabaseClient;
    const defaultMessage = "В мире проводятся технические работы. Попробуй заглянуть немного позже.";
    const esc = value => window.escapeHtml
        ? window.escapeHtml(String(value ?? ""))
        : String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
    let lastEnabled = null;
    let pollBusy = false;

    function showMaintenance(message) {
        const root = document.getElementById("root");
        if (!root) return;
        const safeMessage = esc(message || defaultMessage);
        root.innerHTML = `
          <main style="min-height:100vh;display:grid;place-items:center;padding:24px;box-sizing:border-box;background:radial-gradient(ellipse at 50% 34%,#28231d 0%,#10100f 48%,#070707 100%);color:#d8c8ad;font-family:'Cormorant Garamond',Georgia,serif;text-align:center">
            <section style="width:min(720px,100%);box-sizing:border-box;padding:clamp(28px,6vw,68px);border:1px solid #554631;background:linear-gradient(145deg,rgba(30,27,23,.97),rgba(8,8,8,.98));box-shadow:0 25px 100px #000;border-radius:3px">
              <div style="font-size:12px;letter-spacing:.34em;color:#9b8057;margin-bottom:24px">ЛОРГУС · ВРЕМЯ ПЕРЕДЫШКИ</div>
              <div aria-hidden="true" style="font-size:44px;color:#b29667;margin-bottom:16px">⚒</div>
              <h1 style="font-size:clamp(34px,6vw,54px);font-weight:500;line-height:1.05;margin:0 0 20px">Мир временно закрыт</h1>
              <p style="font-size:clamp(19px,3vw,25px);line-height:1.55;color:#c5b9a4;margin:0 auto;max-width:520px;white-space:pre-wrap">${safeMessage}</p>
              <div style="width:100px;height:1px;background:#796344;margin:28px auto"></div>
              <p style="font-size:12px;letter-spacing:.2em;color:#8e7b5d;margin:0">ТЕХНИЧЕСКИЕ РАБОТЫ · LORGUS</p>
              <button type="button" id="lorgus-maintenance-recheck" style="margin-top:28px;padding:10px 18px;border:1px solid #786344;background:#171511;color:#d8c8ad;font:inherit;font-size:16px;cursor:pointer">Проверить доступ</button>
            </section>
          </main>`;
        document.title = "Технические работы · ЛОРГУС";
        const button = document.getElementById("lorgus-maintenance-recheck");
        if (button) button.addEventListener("click", () => location.reload());
        window.lorgusMaintenanceActive = true;
    }

    async function readSettings() {
        if (!db()) throw new Error("Supabase client is not ready");
        const { data, error } = await db().from("lorgus_site_settings")
            .select("maintenance_enabled, maintenance_message").eq("id", true).maybeSingle();
        if (error) throw error;
        return data || { maintenance_enabled: false, maintenance_message: defaultMessage };
    }

    async function isAdmin() {
        if (!db()) return false;
        const { data, error } = await db().rpc("is_admin");
        if (error) throw error;
        return data === true;
    }

    function installPlayerGate() {
        const originalLoadPlayerState = window.loadPlayerState;
        if (typeof originalLoadPlayerState !== "function" || originalLoadPlayerState.__lorgusMaintenanceWrapped) return false;
        const wrapped = async function(session, ...args) {
            const result = await originalLoadPlayerState.call(this, session, ...args);
            if (window.lorgusBlacklisted || !session?.user?.id || !db()) return result;
            try {
                if (await isAdmin()) {
                    window.lorgusMaintenanceActive = false;
                    return result;
                }
                const settings = await readSettings();
                lastEnabled = !!settings.maintenance_enabled;
                if (lastEnabled) showMaintenance(settings.maintenance_message);
                else window.lorgusMaintenanceActive = false;
            } catch (error) {
                console.error("LORGUS maintenance check failed:", error);
                const root = document.getElementById("root");
                if (root) root.innerHTML = '<main style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#10100f;color:#d8c8ad;text-align:center"><section><h1>Мир временно недоступен</h1><p>Не удалось проверить состояние мира. Попробуй обновить страницу.</p><button onclick="location.reload()">Повторить</button></section></main>';
                window.lorgusMaintenanceActive = true;
            }
            return result;
        };
        wrapped.__lorgusMaintenanceWrapped = true;
        window.loadPlayerState = wrapped;
        return true;
    }

    async function pollMaintenance() {
        if (pollBusy || !db() || document.hidden || window.lorgusBlacklisted) return;
        pollBusy = true;
        try {
            const { data: sessionData, error: sessionError } = await db().auth.getSession();
            if (sessionError) throw sessionError;
            const session = sessionData?.session;
            if (!session?.user?.id) return;
            if (await isAdmin()) return;
            const settings = await readSettings();
            const enabled = !!settings.maintenance_enabled;
            if (enabled) {
                if (!window.lorgusMaintenanceActive) showMaintenance(settings.maintenance_message);
                else {
                    const messageNode = document.querySelector("#root main section p");
                    if (messageNode) messageNode.textContent = settings.maintenance_message || defaultMessage;
                }
            } else if (window.lorgusMaintenanceActive) {
                location.reload();
            }
            lastEnabled = enabled;
        } catch (error) {
            console.warn("LORGUS maintenance refresh failed:", error);
        } finally {
            pollBusy = false;
        }
    }
    window.setInterval(pollMaintenance, 15000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) pollMaintenance(); });

    function installAdminToggle() {
        const originalRenderAdminApplications = window.renderAdminApplications;
        if (typeof originalRenderAdminApplications !== "function" || originalRenderAdminApplications.__lorgusMaintenanceWrapped) return false;
        const wrapped = async function(container, applications) {
            await originalRenderAdminApplications.call(this, container, applications);
            if (!container || container.querySelector("#lorgus-maintenance-admin")) return;
            let settings;
            try { settings = await readSettings(); }
            catch (error) { console.error("Unable to load maintenance settings:", error); }
            settings = settings || { maintenance_enabled: false, maintenance_message: defaultMessage };

            const section = document.createElement("section");
            section.id = "lorgus-maintenance-admin";
            section.className = "admin-section";
            section.innerHTML = `
              <style>
                #lorgus-maintenance-admin .lorgus-maintenance-switch{position:relative;display:inline-flex;flex:0 0 46px;width:46px;height:26px}
                #lorgus-maintenance-admin .lorgus-maintenance-switch input{position:absolute;inset:0;opacity:0;width:100%;height:100%;margin:0;cursor:pointer;z-index:2}
                #lorgus-maintenance-admin .lorgus-maintenance-switch span{position:absolute;inset:0;border:1px solid #65533a;border-radius:20px;background:#29251f;transition:background .18s,border-color .18s}
                #lorgus-maintenance-admin .lorgus-maintenance-switch span:after{content:"";position:absolute;width:18px;height:18px;left:3px;top:3px;border-radius:50%;background:#a99a81;transition:transform .18s,background .18s}
                #lorgus-maintenance-admin .lorgus-maintenance-switch input:checked+span{background:#745b34;border-color:#b29667}
                #lorgus-maintenance-admin .lorgus-maintenance-switch input:checked+span:after{transform:translateX(20px);background:#f0dfbd}
                #lorgus-maintenance-admin .lorgus-maintenance-switch input:focus-visible+span{outline:2px solid #d7b879;outline-offset:3px}
              </style>
              <div class="admin-section-heading"><div><h2>Заглушка технических работ</h2><p>Закрывает игровой мир для игроков. Администратор сохраняет доступ к панели управления.</p></div></div>
              <div style="display:grid;gap:14px;max-width:760px">
                <label style="display:flex;align-items:center;gap:12px;cursor:pointer;font-size:17px">
                  <span class="lorgus-maintenance-switch"><input id="lorgus-maintenance-enabled" type="checkbox" role="switch" aria-label="Включить режим технических работ"><span aria-hidden="true"></span></span>
                  <span><strong>Включить режим технических работ</strong><small style="display:block;opacity:.7;font-size:14px">Игроки увидят заглушку вместо игрового мира.</small></span>
                </label>
                <label style="display:grid;gap:6px">Текст заглушки
                  <textarea id="lorgus-maintenance-message" rows="3" maxlength="500" style="width:100%;box-sizing:border-box" placeholder="${esc(defaultMessage)}"></textarea>
                </label>
                <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
                  <button type="button" class="admin-tool-button" id="lorgus-maintenance-save">Сохранить режим</button>
                  <span id="lorgus-maintenance-status" role="status" aria-live="polite"></span>
                </div>
              </div>`;
            const checkbox = section.querySelector("#lorgus-maintenance-enabled");
            const message = section.querySelector("#lorgus-maintenance-message");
            const status = section.querySelector("#lorgus-maintenance-status");
            const save = section.querySelector("#lorgus-maintenance-save");
            checkbox.checked = !!settings.maintenance_enabled;
            message.value = settings.maintenance_message || defaultMessage;
            save.addEventListener("click", async () => {
                save.disabled = true;
                status.textContent = "Сохраняю…";
                try {
                    const { data: userData, error: userError } = await db().auth.getUser();
                    if (userError) throw userError;
                    const { error } = await db().from("lorgus_site_settings").update({
                        maintenance_enabled: checkbox.checked,
                        maintenance_message: message.value.trim() || defaultMessage,
                        updated_at: new Date().toISOString(),
                        updated_by: userData.user.id
                    }).eq("id", true);
                    if (error) throw error;
                    lastEnabled = checkbox.checked;
                    status.textContent = checkbox.checked ? "Заглушка включена. Игроки увидят её в течение 15 секунд." : "Режим технических работ выключен.";
                } catch (error) {
                    console.error("Unable to save maintenance settings:", error);
                    status.textContent = "Не удалось сохранить настройки. Проверь права доступа.";
                } finally {
                    save.disabled = false;
                }
            });
            const lore = container.querySelector(".admin-lore-tree-section");
            if (lore?.parentNode) lore.parentNode.insertBefore(section, lore.nextSibling);
            else container.prepend(section);
        };
        wrapped.__lorgusMaintenanceWrapped = true;
        window.renderAdminApplications = wrapped;
        return true;
    }

    function installHooks() {
        const gateReady = installPlayerGate();
        const adminReady = installAdminToggle();
        return gateReady && adminReady;
    }
    if (!installHooks()) {
        const retry = window.setInterval(() => {
            if (installHooks()) window.clearInterval(retry);
        }, 250);
        window.addEventListener("load", installHooks, { once: true });
    }

})();
