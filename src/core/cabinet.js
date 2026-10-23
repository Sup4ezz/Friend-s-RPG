/* LORGUS cabinet and player state */
async function renderCabinet(session, preserveCurrentScene = false, forceCharacterSelection = false) {
    const username =
        session.user.user_metadata?.username ||
        "Игрок";

    window.lorgusUsername = username;
    window.lorgusCurrentUsername = username;
    window.lorgusCurrentUserId = session.user.id;

    const root = document.getElementById("root");
    if (!root) return;

    const previousScene = preserveCurrentScene
        ? root.firstElementChild
        : null;

    const cabinet = document.createElement("main");
    cabinet.className = "game-page lorgus-cabinet-entering";
    if (preserveCurrentScene) {
        cabinet.classList.add("preparing");
    }
    // A direct mobile page load must never leave the entire cabinet invisible
    // while Supabase restores the player. Only transition-overlays start hidden.
    cabinet.style.opacity = preserveCurrentScene ? "0" : "1";
    cabinet.style.pointerEvents = preserveCurrentScene ? "none" : "";
    cabinet.innerHTML = `
        <section id="cabinet-content"></section>
    `;

    if (preserveCurrentScene) {
        // Кабинет готовится поверх текущего кадра, но пока полностью прозрачен.
        // Поэтому ожидание Supabase никогда не превращается в чёрный промежуточный экран.
        cabinet.style.position = "fixed";
        cabinet.style.inset = "0";
        cabinet.style.zIndex = "20";
        root.appendChild(cabinet);
    } else {
        root.innerHTML = "";
        root.appendChild(cabinet);
    }

    // Boot-stage diagnostics: a pending Supabase Promise does not throw to the console.
    window.lorgusBootStage = "создание кабинета";

    // Mobile recovery guard: report which awaited operation stalled instead of guessing.
    const mobileRecoveryTimer = window.setTimeout(() => {
        if (!cabinet.isConnected) return;
        const content = cabinet.querySelector("#cabinet-content");
        if (!content || content.children.length) return;
        document.querySelectorAll(".lorgus-portal-transition, .lorgus-eye-transition, .lorgus-region-transition-veil, .lorgus-transition-screen, .lorgus-scene-transition-overlay, .lorgus-transition-overlay").forEach(el => el.remove());
        window.lorgusPortalEntering = false;
        window.lorgusPortalDepartureAligning = false;
        cabinet.style.opacity = "1";
        cabinet.style.visibility = "visible";
        cabinet.style.pointerEvents = "auto";
        const bootStage = window.lorgusBootStage || "этап не определён";
        content.innerHTML = '<section style="max-width:560px;margin:12vh auto;padding:28px 22px;color:#e9dfca;background:#15110c;border:1px solid rgba(215,182,109,.35);font:16px/1.6 Georgia,serif"><h2 style="margin-top:0;color:#d7b66d">Мир не загрузился</h2><p>Загрузка остановилась на этапе: <strong>' + window.escapeHtml(bootStage) + '</strong>.</p><p>Это помогает отличить зависший запрос от ошибки отрисовки.</p><button type="button" onclick="location.reload()" style="min-height:46px;padding:10px 18px;background:#d7b66d;color:#17110a;border:0;font-weight:700">Повторить загрузку</button></section>';
        console.error("LORGUS: запуск завис на этапе:", bootStage);
    }, 10000);

    window.lorgusIsAdmin = false;
    try {
        window.lorgusBootStage = "загрузка состояния пользователя";
        await loadPlayerState(session, forceCharacterSelection);
    } catch (error) {
        console.error("LORGUS: не удалось восстановить экран игрока:", error);
        const content = document.getElementById("cabinet-content");
        if (content && !content.children.length) {
            content.innerHTML = `
                <section style="max-width:560px;margin:12vh auto;padding:28px 22px;color:#e9dfca;background:#15110c;border:1px solid rgba(215,182,109,.35);font:16px/1.6 Georgia,serif">
                    <h2 style="margin-top:0;color:#d7b66d">Не удалось открыть мир</h2>
                    <p>Не получилось восстановить данные персонажа. Проверь соединение и попробуй ещё раз.</p>
                    <button type="button" onclick="location.reload()" style="min-height:46px;padding:10px 18px;background:#d7b66d;color:#17110a;border:0;font-weight:700">Повторить загрузку</button>
                </section>`;
        }
    }

    window.clearTimeout(mobileRecoveryTimer);

    // Админская панель — самостоятельный экран. Не заменяем её SPA-маршрутом
    // персонажа, если у администратора сохранён активный персонаж.
    if (window.lorgusIsAdmin) {
        cabinet.style.opacity = "";
        cabinet.style.pointerEvents = "";
        cabinet.style.position = "";
        cabinet.style.inset = "";
        cabinet.style.zIndex = "";
        cabinet.classList.remove("preparing");
        requestAnimationFrame(() => cabinet.classList.add("ready"));
        return cabinet;
    }

    /*
        Если приложение было открыто напрямую по SPA-маршруту,
        после восстановления персонажа отдаём управление router.js.
        Существующий рендер состояния остаётся fallback-ом для "/".
    */
    if (
        window.activeCharacter &&
        window.lorgusRouter &&
        window.lorgusRouter.currentPath !== "/"
    ) {
        window.lorgusRouter.bootCurrentRoute();
    }

    if (previousScene && previousScene.parentNode === root) {
        previousScene.remove();
    }

    cabinet.style.opacity = "";
    cabinet.style.pointerEvents = "";
    cabinet.style.position = "";
    cabinet.style.inset = "";
    cabinet.style.zIndex = "";

    cabinet.classList.remove("preparing");
    requestAnimationFrame(() => cabinet.classList.add("ready"));

    return cabinet;
}

/* =========================================================
   СОСТОЯНИЕ ИГРОКА
   ========================================================= */

async function loadPlayerState(session, forceCharacterSelection = false) {
    const container =
        document.getElementById("cabinet-content");

    if (!container) return;

    window.lorgusBootStage = "проверка прав администратора (Supabase RPC is_admin)";
    const adminCheck = window.lorgusGetAdminStatus
        ? await window.lorgusGetAdminStatus().then(data => ({ data, error: null }))
        : await Promise.race([
            window.supabaseClient.rpc("is_admin"),
            new Promise((_, reject) => window.setTimeout(
                () => reject(new Error("Тайм-аут проверки прав администратора (is_admin).")),
                8000
            ))
        ]);
    const { data: isAdmin, error: adminError } = adminCheck;

    if (adminError) {
        console.error(
            "Ошибка проверки администратора:",
            adminError
        );
    } else if (isAdmin) {
        window.lorgusIsAdmin = true;
        window.lorgusBootStage = "загрузка заявок админки";
        await window.loadAdminPanel(container);
        window.attachLorgusClientErrorReports?.();
        return;
    }

    const {
        data: applications,
        error: applicationsError
    } = await window.supabaseClient
        .from("character_applications")
        .select("*")
        .eq("player_id", session.user.id)
        .order("id", {
            ascending: false
        });

    if (applicationsError) {
        console.error(applicationsError);
        showCharacterError(
            container,
            applicationsError.message
        );
        return;
    }

    const approvedApplications = applications.filter(
        application =>
            application.status === "approved" &&
            application.character_id
    );

    const pendingApplication =
        applications.find(
            application =>
                application.status === "pending"
        );

    const rejectedApplications = applications.filter(
        application => application.status === "rejected"
    );

    // Если игрок обновил страницу во время создания новой анкеты,
    // приоритет у этого экрана, а не у сохранённого активного персонажа/RP.
    if (sessionStorage.getItem("lorgus_character_creation_mode") === "1") {
        window.activeCharacterId = null;
        window.activeCharacter = null;
        window.activeTitle = null;
        await renderCharacterApplicationForm(container);
        return;
    }

    /*
        Восстанавливаем выбранного персонажа после перезагрузки.
        sessionStorage хранит только ID, поэтому самого персонажа
        и его RP-присутствие нужно заново загрузить из Supabase.
        Одновременно проверяем, что этот персонаж действительно
        относится к одобренной заявке текущего пользователя.
    */
    const savedCharacterId =
        sessionStorage.getItem("lorgus_active_character_id") ||
        localStorage.getItem("lorgus_active_character_id");

    if (!forceCharacterSelection && savedCharacterId) {
        const savedApplication = approvedApplications.find(
            application =>
                String(application.character_id) === String(savedCharacterId)
        );

        if (savedApplication) {
            const characterResult = await window.supabaseClient
                .from("characters")
                .select("*")
                .eq("id", savedCharacterId)
                .single();

            const savedCharacter = characterResult.data;
            const savedCharacterStatus =
                String(savedCharacter?.status || "ACTIVE").toUpperCase();

            if (
                !characterResult.error &&
                savedCharacter &&
                savedCharacterStatus === "ACTIVE"
            ) {
                window.activeCharacterId = savedCharacter.id;
                window.activeCharacter = savedCharacter;
                window.activeTitle = await loadCharacterTitle(savedCharacter.id);

                sessionStorage.setItem(
                    "lorgus_active_character_id",
                    savedCharacter.id
                );
                localStorage.setItem(
                    "lorgus_active_character_id",
                    savedCharacter.id
                );

                await initializeRpPresence(savedCharacter);

                /*
                    При прямом открытии SPA-маршрута сам router
                    отвечает за первый экран. Не рендерим поверх него
                    старый legacy-экран персонажа/RP, иначе появляется
                    лишний промежуточный кадр.
                */
                if (
                    window.lorgusRouter &&
                    window.lorgusRouter.currentPath !== "/"
                ) {
                    return;
                }

                /*
                    Для корневого входа сохраняем прежнее поведение:
                    восстанавливаем последнее RP-пространство.
                */
                const restoredPresence = window.activeRpPresence;

                // После входа не оставляем игровой экран на корневом URL:
                // восстанавливаем конкретный RP-маршрут либо главную страницу.
                if (window.lorgusRouter && window.lorgusRouter.currentPath === "/") {
                    if (restoredPresence?.type === "location") {
                        window.lorgusNavigateChat?.(
                            restoredPresence.region,
                            restoredPresence.location,
                            { replace: true }
                        );
                    } else if (restoredPresence?.type === "road") {
                        window.lorgusNavigateRoadChat?.(restoredPresence, { replace: true });
                    } else {
                        window.lorgusNavigate?.("/main-page", { replace: true });
                    }
                    return;
                }

                if (restoredPresence?.type === "location") {
                    await renderLocationChats(
                        restoredPresence.location,
                        restoredPresence.region,
                        true
                    );
                } else if (restoredPresence?.type === "road") {
                    renderRoadChat(restoredPresence);
                } else {
                    renderCharacter(container, savedCharacter);
                }

                return;
            }

            console.error(
                "Не удалось восстановить выбранного персонажа:",
                characterResult.error || "персонаж недоступен"
            );
        }

        sessionStorage.removeItem("lorgus_active_character_id");
        localStorage.removeItem("lorgus_active_character_id");
    }

    window.activeCharacterId = null;
    window.activeCharacter = null;
    window.activeTitle = null;

    if (approvedApplications.length > 0) {
        await renderCharacterSelection(
            container,
            approvedApplications,
            pendingApplication,
            rejectedApplications
        );
        return;
    }

    if (pendingApplication) {
        renderPendingApplication(
            container,
            pendingApplication
        );
        return;
    }

    if (rejectedApplications.length > 0) {
        await renderCharacterSelection(container, [], null, rejectedApplications);
        return;
    }

    renderCharacterApplicationForm(container);
}

/* =========================================================
   ВЫБОР ПЕРСОНАЖА
   ========================================================= */

window.renderCabinet = renderCabinet;
window.loadPlayerState = loadPlayerState;

