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
    cabinet.style.opacity = "0";
    cabinet.style.pointerEvents = "none";
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

    await loadPlayerState(session, forceCharacterSelection);

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

    const {
        data: isAdmin,
        error: adminError
    } = await window.supabaseClient.rpc("is_admin");

    if (adminError) {
        console.error(
            "Ошибка проверки администратора:",
            adminError
        );
    } else if (isAdmin) {
        await window.loadAdminPanel(container);
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
                    Если игрок обновил страницу прямо внутри RP,
                    восстанавливаем не только персонажа, но и
                    последнее RP-пространство.
                */
                const restoredPresence = window.activeRpPresence;

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
            pendingApplication
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

    renderCharacterApplicationForm(container);
}

/* =========================================================
   ВЫБОР ПЕРСОНАЖА
   ========================================================= */

async

window.renderCabinet = renderCabinet;
window.loadPlayerState = loadPlayerState;

