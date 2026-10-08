/* LORGUS RP, travel, presence and local chat */
async function renderWorldCharacterTracker() {
    const container = document.getElementById("cabinet-content");
    if (!container) return;

    container.className = "lorgus-world-page lorgus-people-page";
    container.innerHTML = `
        <div class="lorgus-world-shell lorgus-people-shell">
            <aside class="lorgus-world-sidebar lorgus-people-sidebar">
                <div class="lorgus-world-sidebar-symbol">✦</div>
                <div class="lorgus-world-sidebar-label">ЛОРГУС · СВЯЗИ</div>
                <div class="lorgus-world-sidebar-name">Люди рядом</div>
                <p class="lorgus-world-sidebar-meta">Персонажи, чьё местоположение открыто миру.</p>
                <button class="character-secondary-button lorgus-world-sidebar-button" type="button" onclick="returnToGame()">
                    ← Вернуться к миру
                </button>
            </aside>

            <main class="lorgus-world-browser lorgus-people-browser">
                <header class="lorgus-world-header lorgus-people-header">
                    <span class="lorgus-world-kicker">ЖИВОЙ МИР</span>
                    <h1>Люди рядом</h1>
                    <p>Персонажи, которые сейчас находятся в открытых локациях или путешествуют по дорогам.</p>
                    <div class="lorgus-people-header-line">
                        <span><i></i> ПУБЛИЧНЫЕ ПЕРСОНАЖИ</span>
                        <b id="lorgus-people-count">—</b>
                    </div>
                </header>

                <section class="lorgus-world-section lorgus-people-section">
                    <div class="lorgus-world-section-title">СЕЙЧАС В МИРЕ</div>
                    <div id="lorgus-character-tracker" class="lorgus-people-grid">
                        <div class="lorgus-people-loading">
                            <span class="lorgus-people-loading-ring"></span>
                            <strong>Считываем присутствие…</strong>
                            <small>Загружаем персонажей и их портреты</small>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    `;

    const tracker = document.getElementById("lorgus-character-tracker");
    const { data, error } = await window.supabaseClient
        .from("rp_presence")
        .select("character_id, presence_type, region, location, from_region, from_location, to_region, to_location, updated_at, characters(name, race)")
        .eq("visibility", "public")
        .gte("updated_at", new Date(Date.now() - 90000).toISOString())
        .order("updated_at", { ascending: false });

    if (error) {
        tracker.innerHTML = `<div class="lorgus-people-empty"><span>!</span><strong>Не удалось загрузить людей</strong><p>${escapeHtml(error.message)}</p></div>`;
        return;
    }

    const rows = (data || []).filter(row =>
        row.character_id &&
        row.character_id !== window.activeCharacterId
    );
    if (!rows.length) {
        tracker.innerHTML = `<div class="lorgus-people-empty"><span>✦</span><strong>Пока никого нет</strong><p>Когда персонажи войдут в мир и откроют своё местоположение, они появятся здесь.</p></div>`;
        return;
    }

    const uniqueRows = [];
    const seen = new Set();
    rows.forEach(row => {
        const key = String(row.character_id);
        if (!seen.has(key)) {
            seen.add(key);
            uniqueRows.push(row);
        }
    });

    const trackerIds = uniqueRows.map(row => row.character_id);
    const { data: trackerCharacters } = await window.supabaseClient
        .from("characters")
        .select("id, active_title_id")
        .in("id", trackerIds);

    const trackerTitleIds = [...new Set((trackerCharacters || []).map(row => row.active_title_id).filter(Boolean))];
    const { data: trackerTitles } = trackerTitleIds.length
        ? await window.supabaseClient.from("titles").select("*").in("id", trackerTitleIds)
        : { data: [] };

    const trackerTitleMap = Object.fromEntries((trackerTitles || []).map(t => [String(t.id), t]));
    const trackerActiveMap = Object.fromEntries(
        (trackerCharacters || []).map(row => [
            String(row.id),
            trackerTitleMap[String(row.active_title_id)] || null
        ])
    );

    const photos = await Promise.all(
        uniqueRows.map(row => getRpCharacterPhoto(row.character_id))
    );

    tracker.innerHTML = uniqueRows.map((row, index) => {
        const character = row.characters || {};
        const isSelf = row.character_id === window.activeCharacterId;
        const photo = photos[index];

        let place;
        let status;
        let modeLabel;

        if (row.presence_type === "road") {
            place = `${escapeHtml(row.from_location || "Неизвестно")} <span class="lorgus-people-route-arrow">→</span> ${escapeHtml(row.to_location || "Неизвестно")}`;
            status = `${escapeHtml(row.from_region || "Неизвестный край")} → ${escapeHtml(row.to_region || "Неизвестный край")}`;
            modeLabel = "В ПУТИ";
        } else {
            place = escapeHtml(row.location || "Неизвестно");
            status = escapeHtml(row.region || "Неизвестный край");
            modeLabel = "В ЛОКАЦИИ";
        }

        return `
            <article class="lorgus-person-card ${isSelf ? "is-self" : ""}">
                <div class="lorgus-person-photo">
                    ${photo
                        ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(character.name || "Персонаж")}" loading="lazy" decoding="async">`
                        : `<div class="lorgus-person-photo-missing"><span>✦</span><small>ПОРТРЕТ НЕ ДОСТУПЕН</small></div>`
                    }
                    <span class="lorgus-person-presence-dot"></span>
                </div>

                <div class="lorgus-person-body">
                    <div class="lorgus-person-topline">
                        <span class="lorgus-person-mode">${modeLabel}</span>
                        ${isSelf ? '<span class="lorgus-person-self">ВЫ</span>' : ""}
                    </div>

                    <h2>${escapeHtml(character.name || "Без имени")}</h2>
                    ${renderTitleBadge(trackerActiveMap[String(row.character_id)], "lorgus-public-title")}
                    <div class="lorgus-person-race">${escapeHtml(character.race || "Персонаж")}</div>

                    <div class="lorgus-person-place">
                        <span class="lorgus-person-place-mark">⌖</span>
                        <div>
                            <strong>${place}</strong>
                            <small>${status}</small>
                        </div>
                    </div>
                </div>
            </article>
        `;
    }).join("");

    const count = document.getElementById("lorgus-people-count");
    if (count) count.textContent = String(uniqueRows.length);
}

function renderKingdomLocations(regionName) {
    if (
        window.lorgusRouter?.parseRpChatPath &&
        window.lorgusRouter.parseRpChatPath(window.lorgusRouter.currentPath)
    ) {
        window.lorgusRouter.navigate("/world");
        return;
    }

    const container = document.getElementById("cabinet-content");
    const region = LORGUS_LOCATIONS[regionName];
    if (!container || !region) return;

    container.className = "lorgus-world-page";
    const character = window.activeCharacter;
    const name = escapeHtml(character?.name || "Без имени");

    const currentPresence = window.activeRpPresence;
    const hasPresence = Boolean(currentPresence);
    const locationCards = region.locations.length
        ? region.locations.map(([title, subtitle, description]) => {
            const isCurrent =
                currentPresence?.type === "location" &&
                currentPresence.location === title &&
                currentPresence.region === regionName;

            const isOnRoad = currentPresence?.type === "road";

            return `
                <button class="lorgus-location-card ${isCurrent ? "current" : (hasPresence ? "locked" : "")}" type="button"
                    data-rp-location="${escapeHtml(title)}"
                    onclick="enterLocationRp('${escapeHtml(title)}', '${escapeHtml(regionName)}')">
                    <span class="lorgus-location-card-mark" aria-hidden="true">
                        <span class="lorgus-location-card-glyph ${isCurrent ? "is-current" : (hasPresence ? "is-closed" : "")}"></span>
                    </span>
                    <strong>${escapeHtml(title)}</strong>
                    <small>${escapeHtml(subtitle)}</small>
                    <p>${escapeHtml(description)}</p>
                    <span class="lorgus-location-card-access">
                        ${isCurrent ? "Вы здесь · открыть RP-чат" : (isOnRoad ? "Персонаж в пути · чат закрыт" : (!hasPresence ? "Открыть RP-чат · первое сообщение закрепит место" : "Не здесь · перейти через дорогу"))}
                    </span>
                </button>
            `;
        }).join("")
        : `
            <div class="lorgus-empty-location">
                <span>✦</span>
                <h2>Локации ещё не добавлены</h2>
                <p>Здесь появятся конкретные места и RP-сцены, когда они будут определены в мире ЛОРГУС.</p>
            </div>
        `;

    container.innerHTML = `
        <div class="lorgus-world-shell">
            <aside class="lorgus-world-sidebar">
                <div class="lorgus-world-sidebar-symbol">✦</div>
                <div class="lorgus-world-sidebar-label">ПЕРСОНАЖ</div>
                <div class="lorgus-world-sidebar-name">${name}</div>
                <button class="character-secondary-button lorgus-world-sidebar-button" type="button" onclick="renderCharacter(document.getElementById('cabinet-content'), window.activeCharacter)">
                    ← Вернуться к миру
                </button>
            </aside>

            <main class="lorgus-world-browser">
                <header class="lorgus-world-header">
                    <span class="lorgus-world-kicker">РЕГИОН</span>
                    <h1>${escapeHtml(regionName)}</h1>
                    <p>${escapeHtml(region.description)}</p>
                </header>

                <section class="lorgus-world-section">
                    <div class="lorgus-world-section-title">${escapeHtml(region.subtitle)}</div>
                    <div class="lorgus-location-grid">
                        ${locationCards}
                    </div>
                </section>
            </main>
        </div>
    `;
}

async function getRpPresence() {
    const characterId = window.activeCharacterId;
    if (!characterId || !window.supabaseClient) return null;

    const { data, error } = await window.supabaseClient
        .from("rp_presence")
        .select("*")
        .eq("character_id", characterId)
        .maybeSingle();

    if (error) {
        console.error("Не удалось получить RP-присутствие:", error);
        return null;
    }

    const presence = data ? mapServerPresence(data) : null;
    window.activeRpPresence = presence;
    return presence;
}

function mapServerPresence(row) {
    if (!row) return null;

    if (row.presence_type === "road") {
        return {
            type: "road",
            fromLocation: row.from_location,
            fromRegion: row.from_region,
            toLocation: row.to_location,
            toRegion: row.to_region,
            startedAt: row.started_at,
            visibility: row.visibility
        };
    }

    return {
        type: "location",
        location: row.location,
        region: row.region,
        enteredAt: row.entered_at,
        visibility: row.visibility
    };
}

async function saveRpPresence(presence) {
    if (!window.activeCharacterId || !window.supabaseClient) return null;

    const { data, error } = await window.supabaseClient.rpc("set_lorgus_rp_presence", {
        p_character_id: window.activeCharacterId,
        p_presence_type: presence.type,
        p_region: presence.type === "location" ? presence.region : null,
        p_location: presence.type === "location" ? presence.location : null,
        p_from_region: presence.type === "road" ? presence.fromRegion : null,
        p_from_location: presence.type === "road" ? presence.fromLocation : null,
        p_to_region: presence.type === "road" ? presence.toRegion : null,
        p_to_location: presence.type === "road" ? presence.toLocation : null,
        p_visibility: presence.visibility || "public"
    });

    if (error) {
        console.error("Не удалось сохранить RP-присутствие:", error);
        throw error;
    }

    const row = Array.isArray(data) ? data[0] : data;
    const mapped = mapServerPresence(row);
    window.activeRpPresence = mapped;
    return mapped;
}

async function initializeRpPresence(character) {
    if (!character?.id) return;
    window.activeCharacterId = character.id;

    // Presence is "online", not permanent: refresh the heartbeat while the
    // character is actually active in LORGUS. Stale rows are ignored by the
    // people-nearby screen.
    if (window.rpPresenceHeartbeat) {
        clearInterval(window.rpPresenceHeartbeat);
        window.rpPresenceHeartbeat = null;
    }

    if (window.rpPresenceChannel) {
        await window.supabaseClient.removeChannel(window.rpPresenceChannel);
    }

    window.rpPresenceChannel = window.supabaseClient
        .channel("lorgus-rp-presence")
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "rp_presence"
            },
            async () => {
                window.activeRpPresence = await getRpPresence();
                await renderLocationParticipantsIfVisible();
            }
        )
        .subscribe();

    const currentPresence = await getRpPresence();

    if (currentPresence?.visibility === "public") {
        await touchRpPresenceHeartbeat();

        window.rpPresenceHeartbeat = setInterval(() => {
            touchRpPresenceHeartbeat();
        }, 30000);
    }
}

async function touchRpPresenceHeartbeat() {
    if (!window.activeCharacterId || !window.supabaseClient) return;

    const { data, error } = await window.supabaseClient
        .rpc("touch_lorgus_rp_presence", {
            p_character_id: window.activeCharacterId
        });

    if (error) {
        console.error("Не удалось обновить RP heartbeat:", error);
        return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (row) {
        window.activeRpPresence = mapServerPresence(row);
    }
}

async function renderLocationParticipantsIfVisible() {
    const presence = window.activeRpPresence;
    if (!presence || presence.type !== "location") return;

    const box = document.getElementById("lorgus-rp-participants");
    if (!box) return;

    await renderLocationParticipants(
        presence.location,
        presence.region
    );
}

async function clearRpPresence() {
    if (!window.activeCharacterId || !window.supabaseClient) return;

    const { error } = await window.supabaseClient.rpc("clear_lorgus_rp_presence", {
        p_character_id: window.activeCharacterId
    });

    if (error) console.error("Не удалось очистить RP-присутствие:", error);
    window.activeRpPresence = null;
}

const LORGUS_ROUTES = [
    ["Каэлор", "Атэрон", "land"],
    ["Атэрон", "Морвейн", "land"],
    ["Атэрон", "Ксандр", "land"],
    ["Ксандр", "Святые Земли", "land"],
    ["Ксандр", "Морвейн", "land"],
    ["Святые Земли", "Спорные Земли", "land"],
    ["Святые Земли", "Лирэн", "land"],
    ["Лирэн", "Ксандр", "sea"],
    ["Ксандр", "Каэлор", "sea"],
    ["Морвейн", "Спорные Земли", "sea"]
];

function getRouteBetweenRegions(fromRegion, toRegion) {
    return LORGUS_ROUTES.find(([from, to]) =>
        (from === fromRegion && to === toRegion) ||
        (from === toRegion && to === fromRegion)
    ) || null;
}

async function getAvailableTravelDestinations(regionName, locationName) {
    const destinations = [];

    for (const [region, data] of Object.entries(LORGUS_LOCATIONS)) {
        if (region === regionName) continue;

        const route = getRouteBetweenRegions(regionName, region);
        if (!route) continue;

        for (const [location] of data.locations || []) {
            destinations.push({
                region,
                location,
                travelType: route[2]
            });
        }
    }

    return destinations;
}

async function enterLocationRp(locationName, regionName) {
    const presence = await getRpPresence();

    if (presence?.type === "road") {
        renderRoadChat(presence);
        return;
    }

    if (presence?.type === "location" &&
        presence.location === locationName &&
        presence.region === regionName) {
        await renderLocationChats(locationName, regionName, true);
        return;
    }

    if (presence?.type === "road") {
        await renderRoadChat(presence);
        return;
    }

    if (presence?.type === "location") {
        renderTravelScreen(presence.location, presence.region, locationName, regionName);
        return;
    }

    // До первого RP-поста физического местоположения нет.
    // Любую локацию можно открыть и читать; первое сообщение
    // атомарно закрепит персонажа именно здесь через RPC.
    await renderLocationChats(locationName, regionName, false);
}

async function startTravel(fromLocation, fromRegion, toLocation, toRegion) {
    const presence = await getRpPresence();

    if (presence?.type === "road") {
        renderRoadChat(presence);
        return;
    }

    if (presence?.type === "location" &&
        (presence.location !== fromLocation || presence.region !== fromRegion)) {
        renderTravelScreen(presence.location, presence.region, toLocation, toRegion);
        return;
    }

    const route = getRouteBetweenRegions(fromRegion, toRegion);
    const destinationExists = LORGUS_LOCATIONS[toRegion]?.locations
        ?.some(([location]) => location === toLocation);

    if (!route || !destinationExists) {
        alert("Прямого канонического маршрута сюда нет.");
        return;
    }

    const road = await saveRpPresence({
        type: "road",
        fromLocation,
        fromRegion,
        toLocation,
        toRegion,
        visibility: "public"
    });

    if (road) renderRoadChat(road);
}

async function arriveAtDestination() {
    const presence = await getRpPresence();
    if (!presence || presence.type !== "road") return;

    const destination = await saveRpPresence({
        type: "location",
        location: presence.toLocation,
        region: presence.toRegion,
        enteredAt: new Date().toISOString(),
        visibility: presence.visibility || "public"
    });

    if (destination) {
        renderLocationChats(
            destination.location,
            destination.region,
            true
        );
    }
}

async function renderTravelScreen(fromLocation, fromRegion, toLocation, toRegion) {
    const container = document.getElementById("cabinet-content");
    if (!container) return;

    const destinations = await getAvailableTravelDestinations(fromRegion, fromLocation);
    const hasRequestedDestination = Boolean(toLocation && toRegion);
    const requested = hasRequestedDestination
        ? destinations.find(item => item.location === toLocation && item.region === toRegion)
        : null;

    const choices = requested
        ? [requested, ...destinations.filter(item =>
            item.location !== requested.location || item.region !== requested.region
        )]
        : destinations;

    container.className = "lorgus-road-page";
    container.innerHTML = `
        <div class="lorgus-road-shell">
            <header class="lorgus-road-header">
                <span class="lorgus-rp-overline">ПЕРЕМЕЩЕНИЕ</span>
                <h1>Дороги мира</h1>
                <p>
                    ${escapeHtml(fromLocation)}, ${escapeHtml(fromRegion)}
                    · выбери место, куда направляется персонаж.
                </p>
            </header>

            <section class="lorgus-road-panel">
                <div class="lorgus-road-current">
                    <span>СЕЙЧАС</span>
                    <strong>${escapeHtml(fromLocation)}</strong>
                    <small>${escapeHtml(fromRegion)}</small>
                </div>
                <div class="lorgus-road-arrow">→</div>
                <div class="lorgus-road-current">
                    <span>НАЗНАЧЕНИЕ</span>
                    <strong>${hasRequestedDestination ? escapeHtml(toLocation) : "Выбери направление"}</strong>
                    <small>${hasRequestedDestination ? escapeHtml(toRegion) : "Доступные канонические пути"}</small>
                </div>
            </section>

            <section class="lorgus-road-destinations">
                <div class="lorgus-world-section-title">ДОСТУПНЫЕ НАПРАВЛЕНИЯ</div>
                <div class="lorgus-road-destination-grid">
                    ${choices.slice(0, 12).map(item => {
                        const regionData = LORGUS_LOCATIONS[item.region];
                        const locationData = (regionData?.locations || []).find(([name]) => name === item.location);
                        const description = locationData?.[2] || "Описание этой локации ещё не добавлено.";
                        const subtitle = locationData?.[1] || regionData?.subtitle || item.region;
                        const art = window.getLorgusRpLocationArt?.(item.location) || "";
                        return `
                        <button class="lorgus-road-destination ${item.location === toLocation && item.region === toRegion ? "selected" : ""}" type="button"
                            onclick="startTravel('${escapeHtml(fromLocation)}','${escapeHtml(fromRegion)}','${escapeHtml(item.location)}','${escapeHtml(item.region)}')">
                            <span class="lorgus-road-destination-art"${art ? ` style="background-image:url('${art}')"` : ""}></span>
                            <span class="lorgus-road-destination-content">
                                <span class="lorgus-road-destination-kicker">${escapeHtml(item.travelType === "sea" ? "МОРСКОЙ ПУТЬ" : "СУХОПУТНЫЙ ПУТЬ")}</span>
                                <strong>${escapeHtml(item.location)}</strong>
                                <small>${escapeHtml(subtitle)}</small>
                                <p>${escapeHtml(description)}</p>
                            </span>
                        </button>
                    `;
                    }).join("")}
                </div>
            </section>

            <div class="lorgus-road-actions">
                <button class="character-secondary-button" type="button"
                    onclick="renderKingdomLocations('${escapeHtml(fromRegion)}')">
                    ← Остаться здесь
                </button>
${hasRequestedDestination ? `<button class="gold-button" type="button"
                    onclick="startTravel('${escapeHtml(fromLocation)}','${escapeHtml(fromRegion)}','${escapeHtml(toLocation)}','${escapeHtml(toRegion)}')">
                    Выйти на дорогу
                </button>` : ""}
            </div>
        </div>
    `;
}

async function renderRoadChat(presence) {
    window.activeRpChatSpace = presence;
    const container = document.getElementById("cabinet-content");
    if (!container) return;

    const character = window.activeCharacter;
    const name = escapeHtml(character?.name || "Без имени");

    container.className = "lorgus-rp-page lorgus-road-page";
    container.innerHTML = `
        <div class="lorgus-messenger-shell lorgus-road-chat-shell" data-rp-region="${escapeHtml(presence.fromRegion)}" data-rp-location="${escapeHtml(presence.fromLocation)}">
            <aside class="lorgus-messenger-sidebar">
                <div class="lorgus-messenger-sidebar-head">
                    <button class="lorgus-messenger-back" type="button" onclick="window.renderLorgusRpHub?.()">‹ Ролевая</button>
                    <div class="lorgus-messenger-search">⌕ <span>Поиск в LORGUS</span></div>
                </div>

                <div class="lorgus-messenger-chat-card active">
                    <div class="lorgus-messenger-chat-photo road-photo">→</div>
                    <div class="lorgus-messenger-chat-info">
                        <strong>${escapeHtml(presence.fromLocation)} → ${escapeHtml(presence.toLocation)}</strong>
                        <small>${escapeHtml(presence.fromRegion)} → ${escapeHtml(presence.toRegion)}</small>
                        <em>Живая дорожная сцена</em>
                    </div>
                </div>

                <div class="lorgus-messenger-section-title">В ПУТИ</div>
                <div class="lorgus-messenger-participants" id="lorgus-rp-participants">
                    <div class="lorgus-messenger-loading">Загрузка участников…</div>
                </div>

                <div class="lorgus-messenger-my-card">
                    <div class="lorgus-messenger-avatar large">
                        <span>✦</span><i></i>
                    </div>
                    <div>
                        <small>ТЫ ИГРАЕШЬ ЗА</small>
                        <strong>${name}</strong>
                    </div>
                </div>
            </aside>

            <main class="lorgus-messenger-main" data-rp-region="${escapeHtml(presence.fromRegion)}" data-rp-location="${escapeHtml(presence.fromLocation)}">
                <header class="lorgus-messenger-header">
                    <div class="lorgus-messenger-header-photo road-photo">→</div>
                    <div class="lorgus-messenger-header-info">
                        <h1>${escapeHtml(presence.fromLocation)} → ${escapeHtml(presence.toLocation)}</h1>
                        <p><span class="online-dot"></span> Путь · <b id="lorgus-rp-online-count">1</b> участник</p>
                    </div>
                    <div class="lorgus-messenger-header-actions">
                        <button type="button" title="Участники" onclick="document.querySelector('.lorgus-messenger-sidebar')?.classList.toggle('mobile-open')">☷</button>
                        <button type="button" title="Обновить" onclick="renderRoadChat(window.activeRpPresence)">↻</button>
                    </div>
                </header>

                <section class="lorgus-messenger-feed" id="lorgus-rp-feed">
                    <div class="lorgus-messenger-start">
                        <div class="lorgus-messenger-start-mark">→</div>
                        <strong>Ты вышел в путь</strong>
                        <span>${escapeHtml(presence.fromLocation)} → ${escapeHtml(presence.toLocation)}</span>
                        <p>Дорога — самостоятельное RP-пространство. Здесь можно встретить других путников и продолжать историю во время путешествия.</p>
                    </div>
                </section>

                <section class="lorgus-messenger-composer">
                    <div class="lorgus-messenger-composer-tools">
                        <button type="button" onclick="openRpItemPicker()" title="Предмет">＋</button>
                        <button type="button" onclick="openRpTransferPicker()" title="Передать предмет">◈</button>
                        <button type="button" onclick="openRpCurrencyTransferPicker()" title="Передать валюту">₿</button>
                    </div>
                    <div class="lorgus-messenger-input-wrap">
                        <textarea id="lorgus-rp-input" placeholder="Сообщение от имени ${name}…" rows="1"></textarea>
                        <span id="lorgus-rp-item-selection" class="lorgus-messenger-item-selection"></span>
                    </div>
                    <button class="lorgus-messenger-send" type="button" onclick="sendLocalRpMessage()" title="Отправить">➤</button>
                </section>

                <footer class="lorgus-messenger-footer">
                    <span>RP · ДОРОГА</span>
                    <button class="gold-button lorgus-road-arrival-button" type="button" onclick="arriveAtDestination()">Прибыть в ${escapeHtml(presence.toLocation)}</button>
                </footer>
            </main>
        </div>
    `;

    const input = document.getElementById("lorgus-rp-input");
    if (input) {
        input.addEventListener("input", () => {
            input.style.height = "auto";
            input.style.height = Math.min(input.scrollHeight, 180) + "px";
        });
        input.addEventListener("keydown", event => {
            if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendLocalRpMessage();
            }
        });
    }

    const participants = await loadRpChatParticipants(presence);
    const box = document.getElementById("lorgus-rp-participants");
    if (box) {
        if (!participants.length) {
            box.innerHTML = '<div class="lorgus-messenger-empty-participants">Пока никого больше нет</div>';
        } else {
            const photos = await Promise.all(participants.map(row => getRpCharacterPhoto(row.character_id)));
            box.innerHTML = participants.map((row,index) => `
                <div class="lorgus-messenger-participant">
                    <div class="lorgus-messenger-avatar">
                        ${photos[index] ? `<img src="${escapeHtml(photos[index])}" alt="">` : "<span>✦</span>"}<i></i>
                    </div>
                    <div class="lorgus-messenger-participant-info">
                        <strong>${escapeHtml(row.characters?.name || "Без имени")}</strong>
                        <small>${escapeHtml(row.characters?.race || "Путник")}</small>
                    </div>
                </div>
            `).join("");
            const count = document.getElementById("lorgus-rp-online-count");
            if (count) count.textContent = String(participants.length + 1);
        }
    }

    const currentPresence = await getRpPresence();
    await loadRpMessages(currentPresence);
    await subscribeToRpMessages(currentPresence);
}

function renderFloodChat() {
    const container = document.getElementById("cabinet-content");
    if (!container) return;

    const character = window.activeCharacter;
    const name = escapeHtml(character?.name || "Без имени");

    container.className = "lorgus-flood-page";
    container.innerHTML = `
        <div class="lorgus-flood-shell">
            <header class="lorgus-flood-header">
                <div>
                    <span class="lorgus-rp-overline">ОБЩИЙ КАНАЛ</span>
                    <h1>Флуд</h1>
                    <p>Свободное общение игроков. Флуд не считается RP-присутствием.</p>
                </div>
                <button class="character-secondary-button" type="button" onclick="returnToGame()">← К миру</button>
            </header>

            <section class="lorgus-flood-feed" id="lorgus-flood-feed">
                <div class="lorgus-rp-empty">
                    <div class="lorgus-rp-symbol">✧</div>
                    <span class="lorgus-rp-stage-kicker">ФЛУД</span>
                    <h3>Общий разговор ещё пуст.</h3>
                    <p>Здесь можно общаться вне роли, не покидая своё текущее RP-пространство.</p>
                </div>
            </section>

            <section class="lorgus-rp-composer">
                <div class="lorgus-rp-composer-top">
                    <span>АККАУНТ: <strong>${name}</strong></span>
                    <span>НЕ ВЛИЯЕТ НА ПЕРЕМЕЩЕНИЕ</span>
                </div>
                <textarea id="lorgus-flood-input" placeholder="Напиши сообщение во флуд..." rows="3"></textarea>
                <div class="lorgus-rp-composer-bottom">
                    <span class="lorgus-rp-mention">Флуд доступен независимо от RP-присутствия.</span>
                    <button class="gold-button lorgus-rp-send" type="button" onclick="sendLocalFloodMessage()">Отправить</button>
                </div>
            </section>
        </div>
    `;
}

function renderLocationEntryLock(locationName, regionName) {
    const container = document.getElementById("cabinet-content");
    if (!container) return;

    container.className = "lorgus-world-page";
    container.innerHTML = `
        <div class="lorgus-world-shell">
            <aside class="lorgus-world-sidebar">
                <div class="lorgus-world-sidebar-symbol">🔒</div>
                <div class="lorgus-world-sidebar-label">RP-ЧАТ ЗАКРЫТ</div>
                <div class="lorgus-world-sidebar-name">${escapeHtml(locationName)}</div>
                <p class="lorgus-world-sidebar-meta">${escapeHtml(regionName)}</p>
                <button class="character-secondary-button lorgus-world-sidebar-button" type="button"
                    onclick="renderKingdomLocations('${escapeHtml(regionName)}')">
                    ← К локациям
                </button>
            </aside>

            <main class="lorgus-world-browser">
                <header class="lorgus-world-header">
                    <span class="lorgus-world-kicker">ФИЗИЧЕСКОЕ ПРИСУТСТВИЕ</span>
                    <h1>${escapeHtml(locationName)}</h1>
                    <p>Персонаж не находится здесь. Читать и писать в этом RP-чате нельзя.</p>
                </header>

                <section class="lorgus-world-section">
                    <div class="lorgus-empty-location">
                        <span>🔒</span>
                        <h2>Чат недоступен</h2>
                        <p>Чтобы попасть сюда, персонаж должен физически прибыть в эту локацию через систему перемещения.</p>
                    </div>
                </section>
            </main>
        </div>
    `;
}

async function renderLocationParticipants(locationName, regionName) {
    const box = document.getElementById("lorgus-rp-participants");
    if (!box) return;

    const { data, error } = await window.supabaseClient
        .from("rp_presence")
        .select("character_id, presence_type, location, region, visibility, characters(name, race)")
        .eq("visibility", "public")
        .eq("presence_type", "location")
        .eq("region", regionName)
        .eq("location", locationName);

    if (error) {
        console.error("Не удалось загрузить участников:", error);
        return;
    }

    const participants = data || [];
    const countNode = document.getElementById("lorgus-rp-online-count");
    if (countNode) countNode.textContent = String(participants.length || 1);

    if (!participants.length) {
        box.innerHTML = '<div class="lorgus-messenger-empty-participants">Сцена пока пуста</div>';
        return;
    }

    const participantIds = [...new Set(participants.map(row => row.character_id).filter(Boolean))];
    const { data: participantCharacters } = participantIds.length
        ? await window.supabaseClient.from("characters").select("id, active_title_id").in("id", participantIds)
        : { data: [] };
    const participantTitleIds = [...new Set((participantCharacters || []).map(row => row.active_title_id).filter(Boolean))];
    const { data: participantTitles } = participantTitleIds.length
        ? await window.supabaseClient.from("titles").select("*").in("id", participantTitleIds)
        : { data: [] };
    const participantTitleMap = Object.fromEntries((participantTitles || []).map(t => [String(t.id), t]));
    const participantActiveMap = Object.fromEntries((participantCharacters || []).map(row => [String(row.id), participantTitleMap[String(row.active_title_id)] || null]));
    const photos = await Promise.all(participantIds.map(id => getRpCharacterPhoto(id)));
    const photoMap = Object.fromEntries(participantIds.map((id, index) => [String(id), photos[index]]));

    box.innerHTML = participants.map(row => {
        const character = row.characters || {};
        const id = String(row.character_id);
        const isCurrent = id === String(window.activeCharacterId);
        const photo = photoMap[id];
        return `
            <div class="lorgus-messenger-participant ${isCurrent ? "active" : ""}">
                <div class="lorgus-messenger-avatar">
                    ${photo ? `<img src="${escapeHtml(photo)}" alt="">` : "<span>✦</span>"}
                    <i></i>
                </div>
                <div class="lorgus-messenger-participant-info">
                    <strong>${escapeHtml(character.name || "Без имени")}</strong>
                    <small>${isCurrent ? "Вы · сейчас здесь" : escapeHtml(character.race || "Персонаж")}</small>
                </div>
                ${renderTitleBadge(participantActiveMap[id], "lorgus-public-title")}
            </div>
        `;
    }).join("");

    box.querySelectorAll(".lorgus-messenger-participant").forEach((node, index) => {
        const row = participants[index];
        if (!row) return;
        node.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            openRpCharacterQuickCard(row.character_id, node);
        });
    });
}

function sendLocalFloodMessage() {
    const input = document.getElementById("lorgus-flood-input");
    const feed = document.getElementById("lorgus-flood-feed");
    const character = window.activeCharacter;
    if (!input || !feed || !character) return;

    const text = input.value.trim();
    if (!text) return;

    const presence = getRpPresence();
    if (!presence || (presence.type !== "location" && presence.type !== "road")) {
        alert("Персонаж не находится ни в одном RP-пространстве.");
        return;
    }

    const empty = feed.querySelector(".lorgus-rp-empty");
    if (empty) empty.remove();

    const message = document.createElement("article");
    message.className = "lorgus-rp-message";
    message.innerHTML = `
        <div class="lorgus-rp-message-avatar">✧</div>
        <div class="lorgus-rp-message-body">
            <div class="lorgus-rp-message-meta">
                <strong>${escapeHtml(character.name || "Без имени")}</strong>
                <span>флуд · сейчас</span>
            </div>
            <p>${escapeHtml(text)}</p>
        </div>
    `;
    feed.appendChild(message);
    input.value = "";
    feed.scrollTop = feed.scrollHeight;
}

async function getRpCharacterPhoto(characterId) {
    if (!characterId) return null;
    window.rpCharacterPhotoCache = window.rpCharacterPhotoCache || {};
    const key = String(characterId);
    if (Object.prototype.hasOwnProperty.call(window.rpCharacterPhotoCache, key)) {
        return window.rpCharacterPhotoCache[key];
    }

    const { data, error } = await window.supabaseClient
        .from("character_applications")
        .select("photo_path")
        .eq("character_id", characterId)
        .eq("status", "approved")
        .limit(1)
        .maybeSingle();

    if (error || !data?.photo_path) {
        window.rpCharacterPhotoCache[key] = null;
        return null;
    }

    const { data: photoData, error: photoError } = await window.supabaseClient
        .storage
        .from("character-applications")
        .createSignedUrl(data.photo_path, 60 * 60);

    const url = !photoError ? (photoData?.signedUrl || null) : null;
    window.rpCharacterPhotoCache[key] = url;
    return url;
}

async function openRpCharacterQuickCard(characterId, anchorElement = null) {
    const id = String(characterId || "").trim();
    if (!id || !window.supabaseClient) return;
    document.querySelector(".lorgus-rp-character-card-overlay")?.remove();

    const overlay = document.createElement("div");
    overlay.className = "lorgus-rp-character-card-overlay";
    overlay.innerHTML = '<div class="lorgus-rp-character-card-backdrop"></div><article class="lorgus-rp-character-card"><button type="button" class="lorgus-rp-character-card-close" aria-label="Закрыть">×</button><div>Загрузка записи…</div></article>';
    document.body.appendChild(overlay);

    const panel = overlay.querySelector(".lorgus-rp-character-card");
    const close = () => overlay.remove();
    overlay.querySelector(".lorgus-rp-character-card-close").addEventListener("click", close);
    overlay.querySelector(".lorgus-rp-character-card-backdrop").addEventListener("click", close);

    const { data: character, error } = await window.supabaseClient
        .from("characters")
        .select("id,name,race,age,homeland,occupation,personality,kingdom,location,active_title_id")
        .eq("id", id)
        .maybeSingle();

    if (error || !character) {
        panel.innerHTML = '<button type="button" class="lorgus-rp-character-card-close" aria-label="Закрыть">×</button><div>Карточка персонажа недоступна.</div>';
        panel.querySelector(".lorgus-rp-character-card-close").addEventListener("click", close);
        return;
    }

    let title = null;
    if (character.active_title_id) {
        const titleResult = await window.supabaseClient
            .from("titles")
            .select("id,name,icon,color,rarity")
            .eq("id", character.active_title_id)
            .maybeSingle();
        title = titleResult.data || null;
    }

    const photo = await getRpCharacterPhoto(character.id);
    const esc = value => escapeHtml(value ?? "—");
    const titleHtml = title
        ? '<div class="lorgus-rp-character-card-title">' + renderTitleBadge(title, "lorgus-public-title") + '</div>'
        : "";

    panel.innerHTML =
        '<button type="button" class="lorgus-rp-character-card-close" aria-label="Закрыть">×</button>' +
        '<div class="lorgus-rp-character-card-head">' +
            '<div class="lorgus-rp-character-card-avatar">' + (photo ? '<img src="' + esc(photo) + '" alt="">' : '<span>✦</span>') + '</div>' +
            '<div><small>ПЕРСОНАЖ ЛОРГУСА</small><h2>' + esc(character.name) + '</h2><p>' + esc(character.race || "Раса не указана") + (character.kingdom ? " · " + esc(character.kingdom) : "") + '</p>' + titleHtml + '</div>' +
        '</div>' +
        '<div class="lorgus-rp-character-card-facts">' +
            '<div><small>ВОЗРАСТ</small><strong>' + esc(character.age ? character.age + " лет" : "—") + '</strong></div>' +
            '<div><small>ЗАНЯТИЕ</small><strong>' + esc(character.occupation) + '</strong></div>' +
            '<div><small>РОДИНА</small><strong>' + esc(character.homeland) + '</strong></div>' +
            '<div><small>МЕСТО</small><strong>' + esc(character.location) + '</strong></div>' +
        '</div>' +
        (character.personality ? '<div class="lorgus-rp-character-card-story"><small>ХАРАКТЕР</small><p>' + esc(character.personality) + '</p></div>' : "");

    panel.querySelector(".lorgus-rp-character-card-close").addEventListener("click", close);

    const rect = anchorElement?.getBoundingClientRect?.();
    if (rect && window.innerWidth > 600) {
        const width = Math.min(360, window.innerWidth - 28);
        const left = Math.max(14, Math.min(rect.left, window.innerWidth - width - 14));
        const top = rect.bottom + 10 + 390 <= window.innerHeight ? rect.bottom + 10 : Math.max(14, rect.top - 390);
        panel.style.left = left + "px";
        panel.style.top = top + "px";
    } else if (window.innerWidth > 600) {
        panel.style.left = "50%";
        panel.style.top = "50%";
        panel.style.transform = "translate(-50%,-50%)";
    }

    requestAnimationFrame(() => panel.classList.add("open"));
}

async function renderLocationChats(locationName, regionName, alreadyPresent = false, fromRoute = false) {
    if (!fromRoute && window.lorgusNavigateChat) {
        const navigated = window.lorgusNavigateChat(regionName, locationName);
        if (navigated) return;
    }
    const container = document.getElementById("cabinet-content");
    if (!container) return;

    const presence = await getRpPresence();
    const hasPresence = Boolean(presence);

    if (presence) {
        if (presence.type === "road") {
            await renderRoadChat(presence);
            return;
        }

        if (presence.type !== "location" || presence.location !== locationName || presence.region !== regionName) {
            renderTravelScreen(presence.location, presence.region, locationName, regionName);
            return;
        }
    }

    window.activeRpChatSpace = {
        type: "location",
        location: locationName,
        region: regionName,
        visibility: "public"
    };

    const character = window.activeCharacter;
    const name = escapeHtml(character?.name || "Без имени");
    const location = escapeHtml(locationName);
    const region = escapeHtml(regionName);
    const myPhoto = await getRpCharacterPhoto(window.activeCharacterId);
    const sceneArt = getLorgusRpLocationArt(locationName);

    container.className = "lorgus-rp-page";
    container.innerHTML = `
        <div class="lorgus-messenger-shell" data-rp-region="${region}" data-rp-location="${location}">
            <aside class="lorgus-messenger-sidebar">
                <div class="lorgus-messenger-sidebar-head">
                    <button class="lorgus-messenger-back" type="button" onclick="renderKingdomLocations('${region}')">‹ Мир</button>
                    <div class="lorgus-messenger-search">⌕ <span>Поиск в LORGUS</span></div>
                </div>

                <div class="lorgus-messenger-chat-card active">
                    <div class="lorgus-messenger-chat-photo scene-photo">${sceneArt ? `<img src="${sceneArt}" alt="">` : "<span>✦</span>"}</div>
                    <div class="lorgus-messenger-chat-info">
                        <strong>${location}</strong>
                        <small>${region}</small>
                        <em>Живая RP-сцена</em>
                    </div>
                </div>

                <div class="lorgus-messenger-section-title">В СЦЕНЕ</div>
                <div class="lorgus-messenger-participants" id="lorgus-rp-participants">
                    <div class="lorgus-messenger-loading">Загрузка участников…</div>
                </div>

                <div class="lorgus-messenger-my-card">
                    <div class="lorgus-messenger-avatar large">
                        ${myPhoto ? `<img src="${escapeHtml(myPhoto)}" alt="">` : '<span>✦</span>'}
                        <i></i>
                    </div>
                    <div>
                        <small>ТЫ ИГРАЕШЬ ЗА</small>
                        <strong>${name}</strong>
                    </div>
                </div>
            </aside>

            <main class="lorgus-messenger-main" data-rp-region="${region}" data-rp-location="${location}">
                <header class="lorgus-messenger-header">
                    <div class="lorgus-messenger-header-photo scene-photo">${sceneArt ? `<img src="${sceneArt}" alt="">` : "<span>✦</span>"}</div>
                    <div class="lorgus-messenger-header-info">
                        <h1>${location}</h1>
                        <p><span class="online-dot"></span> ${region} · <b id="lorgus-rp-online-count">1</b> участник</p>
                    </div>
                    <div class="lorgus-messenger-header-actions">
                        <button type="button" title="Участники" onclick="document.querySelector('.lorgus-messenger-sidebar')?.classList.toggle('mobile-open')">☷</button>
                        <button type="button" title="Обновить" onclick="renderLocationChats('${locationName.replace(/'/g, "\\'")}','${regionName.replace(/'/g, "\\'")}',true)">↻</button>
                    </div>
                </header>

                <section class="lorgus-messenger-feed" id="lorgus-rp-feed">
                    <div class="lorgus-messenger-start">
                        <div class="lorgus-messenger-start-mark">✦</div>
                        <strong>Ты вошёл в ${location}</strong>
                        <span>${region} · RP-пространство</span>
                        <p>Здесь начинается история. Пиши действия, реплики и мысли своего персонажа — остальные увидят их в реальном времени.</p>
                    </div>
                </section>

                <section class="lorgus-messenger-composer">
                    <div class="lorgus-messenger-composer-tools">
                        <button type="button" onclick="openRpItemPicker()" title="Предмет">＋</button>
                        <button type="button" onclick="openRpTransferPicker()" title="Передать предмет">◈</button>
                        <button type="button" onclick="openRpCurrencyTransferPicker()" title="Передать валюту">₿</button>
                    </div>
                    <div class="lorgus-messenger-input-wrap">
                        <textarea id="lorgus-rp-input" placeholder="Сообщение от имени ${name}…" rows="1"></textarea>
                        <span id="lorgus-rp-item-selection" class="lorgus-messenger-item-selection"></span>
                    </div>
                    <button class="lorgus-messenger-send" type="button" onclick="sendLocalRpMessage()" title="Отправить">➤</button>
                </section>

                <footer class="lorgus-messenger-footer">
                    <span>RP · ${region}</span>
                    <button type="button" onclick="renderFloodChat()">Флуд</button>
                </footer>
            </main>
        </div>
    `;

    const input = document.getElementById("lorgus-rp-input");
    if (input) {
        input.addEventListener("input", () => {
            input.style.height = "auto";
            input.style.height = Math.min(input.scrollHeight, 180) + "px";
        });
        input.addEventListener("keydown", event => {
            if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendLocalRpMessage();
            }
        });
    }

    await renderLocationParticipants(locationName, regionName);

    const chatSpace = window.activeRpChatSpace;
    if (chatSpace) {
        await loadRpMessages(chatSpace);
        await subscribeToRpMessages(chatSpace);
    }
}

async function loadRpMessages(presence) {
    const feed = document.getElementById("lorgus-rp-feed");
    if (!feed || !presence) return;

    let query = window.supabaseClient
        .from("rp_messages")
        .select("id, character_id, body, created_at, status, reverted_at, revert_reason, characters(name)")
        .eq("presence_type", presence.type)
        .order("created_at", { ascending: true })
        .limit(200);

    if (presence.type === "location") {
        query = query.eq("region", presence.region).eq("location", presence.location);
    } else {
        query = query.eq("from_region", presence.fromRegion)
            .eq("from_location", presence.fromLocation)
            .eq("to_region", presence.toRegion)
            .eq("to_location", presence.toLocation);
    }

    const { data, error } = await query;
    if (error) {
        console.error("Не удалось загрузить RP-сообщения:", error);
        return;
    }

    feed.innerHTML = "";
    if (!data?.length) {
        feed.innerHTML = '<div class="lorgus-messenger-start"><div class="lorgus-messenger-start-mark">✦</div><strong>История ещё не началась</strong><span>Первое сообщение создаст сцену.</span><p>Пиши свободно. Действия, реплики и мысли персонажа будут появляться здесь как настоящая переписка.</p></div>';
        return;
    }

    const ids = [...new Set(data.map(row => row.character_id).filter(Boolean))];
    await Promise.all(ids.map(id => getRpCharacterPhoto(id)));
    for (const message of data) await appendRpMessage(message);
    feed.scrollTop = feed.scrollHeight;
}

async function subscribeToRpMessages(presence) {
    if (!window.supabaseClient || !presence) return;

    if (window.rpMessagesChannel) {
        await window.supabaseClient.removeChannel(window.rpMessagesChannel);
    }

    window.rpMessagesChannel = window.supabaseClient
        .channel("lorgus-rp-messages-" + window.activeCharacterId)
        .on("postgres_changes", {
            event: "INSERT",
            schema: "public",
            table: "rp_messages"
        }, async payload => {
            const row = payload.new;
            const sameLocation = presence.type === "location" &&
                row.presence_type === "location" &&
                row.region === presence.region &&
                row.location === presence.location;

            const sameRoad = presence.type === "road" &&
                row.presence_type === "road" &&
                row.from_region === presence.fromRegion &&
                row.from_location === presence.fromLocation &&
                row.to_region === presence.toRegion &&
                row.to_location === presence.toLocation;

            if (!sameLocation && !sameRoad) return;

            const { data: character } = await window.supabaseClient
                .from("characters")
                .select("name")
                .eq("id", row.character_id)
                .single();

            appendRpMessage({ ...row, characters: character });
        })
        .subscribe();
}

async function sendLocalRpMessage() {
    const input = document.getElementById("lorgus-rp-input");
    if (!input || !window.activeCharacterId) return;

    const body = input.value.trim();
    if (!body) return;

    const chat = window.activeRpChatSpace;
    if (!chat) {
        alert("RP-пространство не выбрано.");
        return;
    }

    const itemIds = Array.from(window.pendingRpItemIds || []);
    const { error } = await window.supabaseClient.rpc(
        "send_lorgus_rp_message_with_items",
        {
            p_character_id: window.activeCharacterId,
            p_presence_type: chat.type,
            p_region: chat.type === "location" ? chat.region : null,
            p_location: chat.type === "location" ? chat.location : null,
            p_from_region: chat.type === "road" ? chat.fromRegion : null,
            p_from_location: chat.type === "road" ? chat.fromLocation : null,
            p_to_region: chat.type === "road" ? chat.toRegion : null,
            p_to_location: chat.type === "road" ? chat.toLocation : null,
            p_body: body,
            p_visibility: chat.visibility || "public",
            p_inventory_ids: itemIds
        }
    );

    if (error) {
        console.error("Не удалось отправить RP-сообщение:", error);
        alert("Не удалось отправить сообщение: " + error.message);
        return;
    }

    input.value = "";
    window.pendingRpItemIds = [];
    updateRpItemUseButton();
    window.activeRpPresence = await getRpPresence();

    if (window.activeRpPresence) {
        window.activeRpChatSpace = window.activeRpPresence;
        await loadRpMessages(window.activeRpPresence);
        await subscribeToRpMessages(window.activeRpPresence);
        await renderLocationParticipantsIfVisible();
    } else {
        await loadRpMessages(chat);
        await subscribeToRpMessages(chat);
    }
}


/* =========================================================
   ИНВЕНТАРЬ И ИСПОЛЬЗОВАНИЕ ПРЕДМЕТОВ
   ========================================================= */

const lorgusCurrencies = {
    aur: { name: "Аур", kingdom: "Атэрон", icon: "◈", goldRate: "1,00" },
    lira: { name: "Лира", kingdom: "Лирэн", icon: "✿", goldRate: "0,90" },
    kald: { name: "Кальд", kingdom: "Ксандр", icon: "◆", goldRate: "1,10" },
    dorn: { name: "Дорн", kingdom: "Каэлор", icon: "⬢", goldRate: "1,20" },
    fin: { name: "Фин", kingdom: "Морвейн", icon: "✧", goldRate: "0,80" }
};

function updateRpItemUseButton() {
    const label = document.getElementById("lorgus-rp-item-selection"); if (!label) return;
    const ids = Array.from(window.pendingRpItemIds || []);
    label.textContent = ids.length ? "Выбрано предметов: " + ids.length : "";
}


async function loadCharacterCurrency(characterId) {
    const { data, error } = await window.supabaseClient.from("character_currency")
        .select("currency_code, amount")
        .eq("character_id", characterId)
        .order("currency_code");
    if (error) console.error("Не удалось загрузить валюту:", error);
    return { data: data || [], error };
}

async function loadRpChatParticipants(chat = window.activeRpChatSpace) {
    if (!chat) return [];
    let query = window.supabaseClient
        .from("rp_presence")
        .select("character_id, presence_type, region, location, from_region, from_location, to_region, to_location, characters(id,name,race)")
        .eq("visibility", "public")
        .eq("presence_type", chat.type);

    if (chat.type === "location") {
        query = query.eq("region", chat.region).eq("location", chat.location);
    } else {
        query = query
            .eq("from_region", chat.fromRegion)
            .eq("from_location", chat.fromLocation)
            .eq("to_region", chat.toRegion)
            .eq("to_location", chat.toLocation);
    }

    const { data, error } = await query;
    if (error) {
        console.error("Не удалось загрузить участников чата:", error);
        return [];
    }
    return (data || []).filter(row => row.character_id && row.character_id !== window.activeCharacterId);
}

async function loadNearbyRpParticipants() {
    const presence = window.activeRpPresence || await getRpPresence();
    if (!presence || presence.type !== "location") return [];
    const { data, error } = await window.supabaseClient
        .from("rp_presence")
        .select("character_id, characters(id,name,race)")
        .eq("visibility", "public")
        .eq("presence_type", "location")
        .eq("region", presence.region)
        .eq("location", presence.location);
    if (error) {
        console.error("Не удалось загрузить игроков рядом:", error);
        return [];
    }
    return (data || []).filter(row => row.character_id && row.character_id !== window.activeCharacterId);
}

function transferErrorMessage(error) {
    const map = {
        PLAYERS_NOT_IN_SAME_LOCATION: "Игроки должны находиться в одной локации.",
        PLAYERS_NOT_IN_SAME_CHAT: "Получатель не состоит в этом RP-чате.",
        ITEM_MUST_BE_UNEQUIPPED: "Сначала сними предмет с персонажа.",
        INSUFFICIENT_ITEM_QUANTITY: "Недостаточно предметов.",
        RECIPIENT_STACK_FULL: "У получателя нет места в стопке этого предмета.",
        NON_STACKABLE_ITEM: "Этот предмет нельзя передать в таком количестве.",
        INSUFFICIENT_CURRENCY: "Недостаточно валюты.",
        INVALID_AMOUNT: "Укажи корректную сумму.",
        TRANSFER_SELF: "Нельзя передать это самому себе."
    };
    return map[error?.message] || error?.message || "Не удалось выполнить передачу.";
}

async function openRpTransferPicker() {
    const existing = document.querySelector(".lorgus-rp-transfer-overlay"); if (existing) existing.remove();
    const participants = await loadNearbyRpParticipants();
    const { data: inventory, error } = await loadCharacterInventory(window.activeCharacterId);
    if (error) { alert("Не удалось открыть инвентарь:\n\n" + error.message); return; }
    const usable = (inventory || []).filter(row => row.quantity > 0 && !row.equipped_slot);
    const overlay = document.createElement("div"); overlay.className = "lorgus-rp-transfer-overlay";
    overlay.innerHTML = '<div class="lorgus-rp-item-backdrop"></div><article class="lorgus-rp-transfer-panel"><button type="button" class="lorgus-rp-item-close">×</button><span class="lorgus-command-kicker">RP · ПЕРЕДАЧА</span><h2>Передать предмет</h2><p>Передача доступна только персонажу, который сейчас находится рядом с тобой.</p>' +
        '<label>Кому<select class="lorgus-transfer-target"><option value="">Выбери персонажа...</option>' + (participants.length ? participants.map(row => '<option value="' + escapeHtml(row.character_id) + '">' + escapeHtml(row.characters?.name || "Без имени") + (row.characters?.race ? ' · ' + escapeHtml(row.characters.race) : '') + '</option>').join("") : '') + '</select></label>' +
        '<label>Предмет<select class="lorgus-transfer-item"><option value="">Выбери предмет...</option>' + usable.map(row => '<option value="' + escapeHtml(row.id) + '">' + escapeHtml(row.items?.icon || "◆") + ' ' + escapeHtml(row.items?.name || "Предмет") + ' · ' + escapeHtml(inventoryRarityLabel(row.items?.rarity)) + ' · ×' + escapeHtml(String(row.quantity)) + '</option>').join("") + '</select></label>' +
        '<label>Количество<input class="lorgus-transfer-quantity" type="number" min="1" value="1"></label>' +
        '<button type="button" class="gold-button lorgus-transfer-confirm">Передать</button></article>';
    document.body.appendChild(overlay); requestAnimationFrame(() => overlay.classList.add("open"));
    const close=()=>overlay.remove(); overlay.querySelector(".lorgus-rp-item-close").addEventListener("click",close); overlay.querySelector(".lorgus-rp-item-backdrop").addEventListener("click",close);
    const itemSelect=overlay.querySelector(".lorgus-transfer-item"), qty=overlay.querySelector(".lorgus-transfer-quantity");
    itemSelect.addEventListener("change",()=>{ const row=usable.find(x=>x.id===itemSelect.value); qty.max=String(row?.quantity||1); qty.value="1"; });
    overlay.querySelector(".lorgus-transfer-confirm").addEventListener("click",async()=>{
        const target=overlay.querySelector(".lorgus-transfer-target").value, itemId=itemSelect.value, amount=Math.max(1,Number.parseInt(qty.value,10)||1);
        if(!target||!itemId){ alert("Выбери персонажа и предмет."); return; }
        const row=usable.find(x=>x.id===itemId);
        if(!row || amount>row.quantity){ alert("Недостаточно предметов."); return; }
        const { error }=await window.supabaseClient.rpc("lorgus_transfer_character_item",{p_sender_character_id:window.activeCharacterId,p_recipient_character_id:target,p_inventory_id:itemId,p_quantity:amount});
        if(error){ console.error(error); alert(transferErrorMessage(error)); return; }
        close(); await renderLocationParticipantsIfVisible(); alert("Предмет передан.");
    });
}

async function openRpCurrencyTransferPicker() {
    const existing = document.querySelector(".lorgus-rp-transfer-overlay"); if (existing) existing.remove();
    const participants = await loadRpChatParticipants(window.activeRpChatSpace);
    const { data: balances, error } = await loadCharacterCurrency(window.activeCharacterId);
    if (error) { alert("Не удалось открыть кошелёк:\n\n" + error.message); return; }
    const usable = (balances || []).filter(row => row.amount > 0);
    const overlay = document.createElement("div"); overlay.className = "lorgus-rp-transfer-overlay";
    overlay.innerHTML = '<div class="lorgus-rp-item-backdrop"></div><article class="lorgus-rp-transfer-panel"><button type="button" class="lorgus-rp-item-close">×</button><span class="lorgus-command-kicker">RP · ОБМЕН</span><h2>Передать валюту</h2><p>Передача доступна только персонажу, который сейчас состоит в этом RP-чате.</p>' +
        '<label>Кому<select class="lorgus-transfer-target"><option value="">Выбери персонажа...</option>' + participants.map(row => '<option value="' + escapeHtml(row.character_id) + '">' + escapeHtml(row.characters?.name || "Без имени") + '</option>').join("") + '</select></label>' +
        '<label>Валюта<select class="lorgus-transfer-currency">' + (usable.length ? usable.map(row => '<option value="' + escapeHtml(row.currency_code) + '">' + escapeHtml(lorgusCurrencies[row.currency_code]?.icon || "◆") + ' ' + escapeHtml(lorgusCurrencyLabel(row.currency_code)) + ' · доступно ' + escapeHtml(formatLorgusCurrencyAmount(row.amount)) + '</option>').join("") : '<option value="">Нет валюты</option>') + '</select></label>' +
        '<div class="lorgus-transfer-denominations"><label>Золотые<input class="lorgus-transfer-gold" type="number" min="0" value="0"></label><label>Серебряные<input class="lorgus-transfer-silver" type="number" min="0" value="0"></label><label>Медные<input class="lorgus-transfer-copper" type="number" min="0" value="1"></label></div>' +
        '<button type="button" class="gold-button lorgus-transfer-confirm">Передать</button></article>';
    document.body.appendChild(overlay); requestAnimationFrame(() => overlay.classList.add("open"));
    const close=()=>overlay.remove(); overlay.querySelector(".lorgus-rp-item-close").addEventListener("click",close); overlay.querySelector(".lorgus-rp-item-backdrop").addEventListener("click",close);
    overlay.querySelector(".lorgus-transfer-confirm").addEventListener("click",async()=>{
        const target=overlay.querySelector(".lorgus-transfer-target").value, code=overlay.querySelector(".lorgus-transfer-currency").value;
        const gold=Math.max(0,Number.parseInt(overlay.querySelector(".lorgus-transfer-gold").value,10)||0);
        const silver=Math.max(0,Number.parseInt(overlay.querySelector(".lorgus-transfer-silver").value,10)||0);
        const copper=Math.max(0,Number.parseInt(overlay.querySelector(".lorgus-transfer-copper").value,10)||0);
        const amount=gold*10000+silver*100+copper;
        if(!target||!code){ alert("Выбери персонажа и валюту."); return; }
        if(amount<1){ alert("Укажи сумму передачи."); return; }
        const balance=usable.find(x=>x.currency_code===code)?.amount||0;
        if(amount>balance){ alert("Недостаточно валюты."); return; }
        const chat = window.activeRpChatSpace;
        const { error }=await window.supabaseClient.rpc("lorgus_transfer_character_currency_in_chat",{
            p_sender_character_id:window.activeCharacterId,
            p_recipient_character_id:target,
            p_currency_code:code,
            p_amount:amount,
            p_presence_type:chat?.type || null,
            p_region:chat?.type === "location" ? chat.region : null,
            p_location:chat?.type === "location" ? chat.location : null,
            p_from_region:chat?.type === "road" ? chat.fromRegion : null,
            p_from_location:chat?.type === "road" ? chat.fromLocation : null,
            p_to_region:chat?.type === "road" ? chat.toRegion : null,
            p_to_location:chat?.type === "road" ? chat.toLocation : null
        });
        if(error){ console.error(error); alert(transferErrorMessage(error)); return; }
        close(); alert("Валюта передана.");
    });
}

async function openRpItemPicker() {
    const existing = document.querySelector(".lorgus-rp-item-overlay"); if (existing) existing.remove();
    const { data, error } = await loadCharacterInventory(window.activeCharacterId);
    if (error) { alert("Не удалось открыть инвентарь:\n\n" + error.message); return; }
    const usable = (data || []).filter(row => row.quantity > 0);
    const overlay = document.createElement("div"); overlay.className = "lorgus-rp-item-overlay";
    overlay.innerHTML = '<div class="lorgus-rp-item-backdrop"></div><article class="lorgus-rp-item-picker"><button type="button" class="lorgus-rp-item-close">×</button><span class="lorgus-command-kicker">RP · ИНВЕНТАРЬ</span><h2>Использовать предмет</h2><p>Выбери предметы, которые будут зафиксированы в этом посте.</p><div class="lorgus-rp-item-picker-list">' +
        (usable.length ? usable.map(row => '<button type="button" class="lorgus-rp-item-choice" data-inventory-id="' + escapeHtml(row.id) + '" style="--item-color:' + escapeHtml(row.items?.color || "#d6b36a") + '"><span class="lorgus-rp-item-choice-icon">' + escapeHtml(row.items?.icon || "◆") + '</span><span><strong>' + escapeHtml(row.items?.name || "Предмет") + '</strong><small>' + escapeHtml(inventoryRarityLabel(row.items?.rarity)) + ' · ' + escapeHtml(inventoryTypeLabel(row.items || {})) + ' · осталось ' + escapeHtml(String(row.quantity)) + '</small></span><i>Добавить</i></button>').join("") : '<div class="lorgus-inventory-empty">Используемых предметов нет.</div>') +
        '</div><div class="lorgus-rp-item-picker-footer"><span class="lorgus-rp-item-picked"></span><button type="button" class="gold-button lorgus-rp-item-confirm">Добавить в пост</button></div></article>';
    document.body.appendChild(overlay); requestAnimationFrame(() => overlay.classList.add("open"));
    const close = () => overlay.remove();
    overlay.querySelector(".lorgus-rp-item-close").addEventListener("click", close);
    overlay.querySelector(".lorgus-rp-item-backdrop").addEventListener("click", close);
    const selected = new Set(window.pendingRpItemIds || []); const picked = overlay.querySelector(".lorgus-rp-item-picked");
    const update = () => { picked.textContent = selected.size ? "Выбрано: " + selected.size : "Ничего не выбрано"; overlay.querySelectorAll(".lorgus-rp-item-choice").forEach(btn => btn.classList.toggle("selected", selected.has(btn.dataset.inventoryId))); };
    overlay.querySelectorAll(".lorgus-rp-item-choice").forEach(btn => btn.addEventListener("click", () => { const id=btn.dataset.inventoryId; if(selected.has(id)) selected.delete(id); else selected.add(id); update(); }));
    overlay.querySelector(".lorgus-rp-item-confirm").addEventListener("click", () => { window.pendingRpItemIds=Array.from(selected); updateRpItemUseButton(); close(); });
    update();
}

async function openAdminCharacterInventory(application, container) {
    const characterId = application.character_id;
    if (!characterId) return;

    const { data: inventory, error: inventoryError } = await window.supabaseClient
        .from("character_inventory")
        .select("id,character_id,item_id,quantity,equipped_slot,acquired_at,source_note,items(*)")
        .eq("character_id", characterId)
        .order("acquired_at", { ascending: true });

    if (inventoryError) {
        alert("Не удалось загрузить инвентарь:\n\n" + inventoryError.message);
        return;
    }

    const itemTypes = [
        ["helmet","Шлем / голова","equipment"],
        ["armor","Броня / тело","equipment"],
        ["gloves","Перчатки","equipment"],
        ["pants","Штаны / ноги","equipment"],
        ["boots","Обувь","equipment"],
        ["sword","Меч","equipment"],
        ["spear","Копьё","equipment"],
        ["axe","Топор","equipment"],
        ["staff","Посох","equipment"],
        ["bow","Лук","equipment"],
        ["crossbow","Арбалет","equipment"],
        ["shield","Щит","equipment"],
        ["chain","Цепочка","equipment"],
        ["ring","Кольцо","equipment"],
        ["bracelet","Браслет","equipment"],
        ["potion","Зелье","consumable"],
        ["scroll","Свиток","consumable"],
        ["food","Еда","consumable"],
        ["quest_item","Квестовый предмет","quest"],
        ["material","Материал","material"],
        ["misc","Прочее","misc"]
    ];

    const rarities = [
        ["common","Обычный"],
        ["uncommon","Необычный"],
        ["rare","Редкий"],
        ["epic","Эпический"],
        ["legendary","Легендарный"],
        ["mythic","Мифический"],
        ["unique","Уникальный"]
    ];

    const typeLabel = Object.fromEntries(itemTypes.map(([value,label]) => [value,label]));

    const overlay = document.createElement("div");
    overlay.className = "lorgus-admin-inventory-overlay";

    const panel = document.createElement("article");
    panel.className = "lorgus-admin-inventory-panel";
    panel.innerHTML =
        '<button type="button" class="lorgus-admin-inventory-close">×</button>' +
        '<span class="lorgus-command-kicker">АДМИНИСТРАЦИЯ · ИНВЕНТАРЬ</span>' +
        '<h2>' + escapeHtml(application.name || "Персонаж") + '</h2>' +
        '<p>Выдача персонажу. Предметов может быть сколько угодно — здесь нет каталога заранее заданных вещей.</p>' +
        '<div class="lorgus-admin-inventory-grant">' +
            '<input class="lorgus-admin-inventory-name" placeholder="Название предмета">' +
            '<select class="lorgus-admin-inventory-type">' +
                itemTypes.map(([value,label]) => '<option value="' + value + '">' + label + '</option>').join("") +
            '</select>' +
            '<select class="lorgus-admin-inventory-rarity">' +
                rarities.map(([value,label]) => '<option value="' + value + '">' + label + '</option>').join("") +
            '</select>' +
            '<input class="lorgus-admin-inventory-qty" type="number" min="1" value="1" placeholder="Количество">' +
            '<button type="button" class="lorgus-admin-inventory-grant-btn">Выдать</button>' +
        '</div>' +
        '<div class="lorgus-admin-currency-grant">' +
            '<span>КОШЕЛЁК</span>' +
            '<select class="lorgus-admin-currency-code">' +
                Object.entries(lorgusCurrencies).map(([code,c]) => '<option value="' + code + '">' + c.name + ' · ' + c.kingdom + '</option>').join("") +
            '</select>' +
            '<div class="lorgus-admin-currency-denominations">' +
                '<label>Золотые<input class="lorgus-admin-currency-gold" type="number" min="0" step="1" value="0"></label>' +
                '<label>Серебряные<input class="lorgus-admin-currency-silver" type="number" min="0" step="1" value="0"></label>' +
                '<label>Бронзовые<input class="lorgus-admin-currency-bronze" type="number" min="0" step="1" value="100"></label>' +
            '</div>' +
            '<button type="button" class="lorgus-admin-currency-btn">Выдать валюту</button>' +
        '</div>' +
        '<div class="lorgus-admin-currency-list"></div>' +
        '<div class="lorgus-admin-inventory-list"></div>';

    const currencyList = panel.querySelector(".lorgus-admin-currency-list");
    const refreshCurrency = async () => {
        const { data, error } = await loadCharacterCurrency(characterId);
        if (error) { currencyList.innerHTML = '<div class="lorgus-inventory-empty">' + escapeHtml(error.message) + '</div>'; return; }

        const currencies = Object.entries(lorgusCurrencies).map(([code,c]) => {
            const row=(data||[]).find(x=>x.currency_code===code);
            const copper = Math.max(0, Number(row?.amount) || 0);
            return {
                code,
                name: c.name,
                kingdom: c.kingdom,
                icon: c.icon,
                gold: Math.floor(copper / 10000),
                silver: Math.floor((copper % 10000) / 100),
                bronze: copper % 100
            };
        });

        currencyList.innerHTML =
            '<div class="lorgus-admin-currency-table">' +
                '<div class="lorgus-admin-currency-header">' +
                    '<div class="lorgus-admin-currency-label"></div>' +
                    currencies.map(c => '<div class="lorgus-admin-currency-name"><span>' + escapeHtml(c.icon) + '</span><strong>' + escapeHtml(c.name) + '</strong><small>' + escapeHtml(c.kingdom) + '</small></div>').join('') +
                '</div>' +
                '<div class="lorgus-admin-currency-line gold">' +
                    '<strong>Золото</strong>' +
                    currencies.map(c => '<div>' + c.gold + '</div>').join('') +
                '</div>' +
                '<div class="lorgus-admin-currency-line silver">' +
                    '<strong>Серебро</strong>' +
                    currencies.map(c => '<div>' + c.silver + '</div>').join('') +
                '</div>' +
                '<div class="lorgus-admin-currency-line bronze">' +
                    '<strong>Медь</strong>' +
                    currencies.map(c => '<div>' + c.bronze + '</div>').join('') +
                '</div>' +
            '</div>';
    };

    const list = panel.querySelector(".lorgus-admin-inventory-list");

    const refreshInventory = async () => {
        const { data: fresh, error } = await window.supabaseClient
            .from("character_inventory")
            .select("id,character_id,item_id,quantity,equipped_slot,acquired_at,source_note,items(*)")
            .eq("character_id", characterId)
            .order("acquired_at", { ascending: true });

        if (error) {
            alert("Не удалось обновить инвентарь:\n\n" + error.message);
            return;
        }

        renderInventory(fresh || []);
    };

    const renderInventory = rows => {
        list.innerHTML = rows.length
            ? rows.map(row => {
                const item = row.items || {};
                const slot = row.equipped_slot
                    ? " · " + (inventorySlotLabels[row.equipped_slot] || row.equipped_slot)
                    : "";
                const subtype = typeLabel[item.item_subtype] || item.item_subtype || item.item_type || "Предмет";

                return (
                    '<div class="lorgus-admin-inventory-row">' +
                        '<span class="lorgus-admin-inventory-row-icon" style="--item-color:' + escapeHtml(item.color || "#b8a27a") + '">' +
                            escapeHtml(item.icon || "◆") +
                        '</span>' +
                        '<div>' +
                            '<strong>' + escapeHtml(item.name || "Предмет") + '</strong>' +
                            '<small>' + escapeHtml(inventoryRarityLabel(item.rarity)) + ' · ' + escapeHtml(subtype) + ' · ×' + escapeHtml(String(row.quantity)) + escapeHtml(slot) + '</small>' +
                        '</div>' +
                        '<button type="button" data-id="' + escapeHtml(row.id) + '">Забрать</button>' +
                    '</div>'
                );
            }).join("")
            : '<div class="lorgus-inventory-empty">Инвентарь пуст.</div>';

        list.querySelectorAll("button[data-id]").forEach(button => {
            button.addEventListener("click", async () => {
                if (!confirm("Забрать этот предмет?")) return;

                const { error } = await window.supabaseClient.rpc("admin_revoke_character_item", {
                    p_inventory_id: button.dataset.id,
                    p_quantity: null
                });

                if (error) {
                    alert("Не удалось забрать предмет:\n\n" + error.message);
                    return;
                }

                await refreshInventory();
            });
        });
    };

    renderInventory(inventory || []);
    await refreshCurrency();
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("open"));

    const close = () => overlay.remove();
    panel.querySelector(".lorgus-admin-inventory-close").addEventListener("click", close);

    panel.querySelector(".lorgus-admin-currency-btn").addEventListener("click", async () => {
        const code=panel.querySelector(".lorgus-admin-currency-code").value;
        const gold=Number.parseInt(panel.querySelector(".lorgus-admin-currency-gold").value,10) || 0;
        const silver=Number.parseInt(panel.querySelector(".lorgus-admin-currency-silver").value,10) || 0;
        const bronze=Number.parseInt(panel.querySelector(".lorgus-admin-currency-bronze").value,10) || 0;
        if(gold<0 || silver<0 || bronze<0 || (gold===0 && silver===0 && bronze===0)){ alert("Укажи хотя бы одну ненулевую монету."); return; }
        const amount=(gold*10000)+(silver*100)+bronze;
        const { error }=await window.supabaseClient.rpc("admin_grant_character_currency",{p_character_id:characterId,p_currency_code:code,p_amount:amount});
        if(error){ alert("Не удалось изменить валюту:\n\n"+error.message); return; }
        await refreshCurrency();
        panel.querySelector(".lorgus-admin-currency-gold").value="0";
        panel.querySelector(".lorgus-admin-currency-silver").value="0";
        panel.querySelector(".lorgus-admin-currency-bronze").value="0";
    });

    panel.querySelector(".lorgus-admin-inventory-grant-btn").addEventListener("click", async () => {
        const nameInput = panel.querySelector(".lorgus-admin-inventory-name");
        const typeInput = panel.querySelector(".lorgus-admin-inventory-type");
        const rarityInput = panel.querySelector(".lorgus-admin-inventory-rarity");
        const quantityInput = panel.querySelector(".lorgus-admin-inventory-qty");
        const name = nameInput.value.trim();
        const subtype = typeInput.value;
        const rarity = rarityInput.value;
        const quantity = Math.max(1, Number(quantityInput.value) || 1);

        if (!name) {
            alert("Укажи название предмета.");
            nameInput.focus();
            return;
        }

        const { error } = await window.supabaseClient.rpc("admin_create_and_grant_character_item", {
            p_character_id: characterId,
            p_name: name,
            p_type: subtype,
            p_quantity: quantity,
            p_rarity: rarity,
            p_subtype: subtype
        });

        if (error) {
            alert("Не удалось выдать предмет:\n\n" + error.message);
            return;
        }

        nameInput.value = "";
        rarityInput.value = "common";
        quantityInput.value = "1";
        await refreshInventory();
    });
}
async function loadAdminItemUseLog(container) {
    const box=container.querySelector("#admin-item-use-log"); if(!box)return;
    const {data,error}=await window.supabaseClient.from("rp_message_item_uses").select("id,message_id,character_id,item_id,quantity,consumed,status,used_at,reverted_at,revert_reason,items(name,icon,color,rarity),characters(name),rp_messages(body,created_at,status)").order("used_at",{ascending:false}).limit(200);
    if(error){box.innerHTML='<div class="admin-empty"><h2>Журнал недоступен</h2><p>'+escapeHtml(error.message)+'</p></div>';return;}
    box.innerHTML=data?.length?data.map(row=>{const item=row.items||{},char=row.characters||{},post=row.rp_messages||{};return '<article class="admin-item-use-entry '+(row.status==="reverted"?"reverted":"")+'"><div class="admin-item-use-icon" style="--item-color:'+escapeHtml(item.color||"#d6b36a")+'">'+escapeHtml(item.icon||"◆")+'</div><div class="admin-item-use-body"><strong>'+escapeHtml(item.name||"Предмет")+'</strong><span>'+escapeHtml(char.name||"Персонаж")+' · пост #'+escapeHtml(String(row.message_id))+' · '+escapeHtml(new Date(row.used_at).toLocaleString("ru-RU"))+'</span><p>'+escapeHtml(post.body||"")+'</p><small>'+(row.consumed?"Предмет расходуется":"Предмет не расходуется")+(row.status==="reverted"?" · ОТКАТ ВЫПОЛНЕН":"")+'</small></div><div class="admin-item-use-action">'+(row.status==="active"?'<button type="button" data-message-id="'+escapeHtml(String(row.message_id))+'">Отменить пост</button>':'<span>Отменено</span>')+'</div></article>';}).join(""):'<div class="admin-empty"><h2>Использований пока нет</h2><p>Когда игрок применит предмет в RP-посте, запись появится здесь.</p></div>';
    box.querySelectorAll("button[data-message-id]").forEach(button=>button.addEventListener("click",async()=>{const reason=prompt("Почему пост и использование предмета отменяются?","");if(reason===null)return;button.disabled=true;const {error}=await window.supabaseClient.rpc("admin_revert_rp_message",{p_message_id:Number(button.dataset.messageId),p_reason:reason.trim()});if(error){alert("Не удалось отменить пост:\n\n"+error.message);button.disabled=false;return;}await loadAdminItemUseLog(container);}));
}

/* =========================================================
   ПИСЬМА И ГОЛУБИНАЯ ПОЧТА
   ========================================================= */

/* =========================================================
   ПРОФИЛЬ И СМЕНА ПЕРСОНАЖА
   ========================================================= */

function openActiveCharacterProfile() {
    const character = window.activeCharacter;

    if (!character) {
        showCharacterError(
            document.getElementById("cabinet-content"),
            "Активный персонаж не выбран."
        );
        return;
    }

    const container = document.getElementById("cabinet-content");
    if (!container) return;

    container.className = "character-profile-page";

    container.innerHTML = `
        <div class="character-profile-header">
            <div class="welcome-symbol">✦</div>
            <h1>${escapeHtml(character.name || "Без имени")}</h1>
            <p>${escapeHtml(character.race || "Раса не указана")}</p>
        </div>

        <div class="character-profile-grid">
            <div class="character-profile-field">
                <span>Возраст</span>
                <strong>${escapeHtml(character.age ?? "Не указан")}</strong>
            </div>
            <div class="character-profile-field">
                <span>Родина</span>
                <strong>${escapeHtml(character.homeland || "Не указана")}</strong>
            </div>
            <div class="character-profile-field">
                <span>Род занятий</span>
                <strong>${escapeHtml(character.occupation || "Не указан")}</strong>
            </div>
            <div class="character-profile-field">
                <span>Состояние</span>
                <strong>Готов к игре</strong>
            </div>
            <div class="character-profile-field full">
                <span>Характер</span>
                <p>${escapeHtml(character.personality || "Не указан")}</p>
            </div>
            <div class="character-profile-field full">
                <span>Предыстория</span>
                <p>${escapeHtml(character.backstory || "Не указана")}</p>
            </div>
            <div class="character-profile-field full">
                <span>Особые навыки</span>
                <p>${escapeHtml(character.special_skills || "Не указаны")}</p>
            </div>
        </div>

        <div class="character-game-actions">
            <button class="gold-button" type="button" onclick="returnToGame()">
                Вернуться к игре
            </button>
            <button class="character-secondary-button" type="button" onclick="switchCharacter()">
                Сменить персонажа
            </button>
        </div>
    `;
}

async function switchCharacter() {
    const container = document.getElementById("cabinet-content");
    if (!container) return;

    sessionStorage.removeItem("lorgus_active_character_id");
    localStorage.removeItem("lorgus_active_character_id");
    window.activeCharacterId = null;
    window.activeCharacter = null;

    await loadPlayerState({
        user: (await window.supabaseClient.auth.getUser()).data.user
    });
}

function returnToGame() {
    const container = document.getElementById("cabinet-content");
    if (!container || !window.activeCharacter) return;
    renderCharacter(container, window.activeCharacter);
}

/* =========================================================
   ОШИБКА ПЕРСОНАЖА
   ========================================================= */

function showCharacterError(
    container,
    message
) {
    container.className = "welcome-panel";

    container.innerHTML = `
        <div class="welcome-symbol">!</div>

        <h1>
            Не удалось загрузить персонажа
        </h1>

        <p>
            ${escapeHtml(message)}
        </p>
    `;
}

/* =========================================================
   СООБЩЕНИЯ ЗАЯВКИ
   ========================================================= */

function setCharacterMessage(
    text,
    type
) {
    const element =
        document.getElementById(
            "character-message"
        );

    if (!element) return;

    element.className =
        `character-message ${type}`;

    element.textContent = text;
}

/* =========================================================
   ВЫХОД
   ========================================================= */

async function logout() {
    await window.supabaseClient.auth.signOut();
}

/* =========================================================
   СООБЩЕНИЯ АВТОРИЗАЦИИ
   ========================================================= */

function setMessage(
    text,
    type
) {
    const element =
        document.getElementById(
            "auth-message"
        );

    if (!element) return;

    element.className =
        `auth-message ${type}`;

    element.textContent = text;
}

/* =========================================================
   РАСШИРЕНИЕ ФАЙЛА
   ========================================================= */

function getFileExtension(
    filename
) {
    const parts =
        filename.split(".");

    if (parts.length < 2) {
        return "jpg";
    }

    const extension =
        parts.pop().toLowerCase();

    if (
        extension === "jpeg" ||
        extension === "jpg"
    ) {
        return "jpg";
    }

    if (extension === "png") {
        return "png";
    }

    if (extension === "webp") {
        return "webp";
    }

    return "jpg";
}

/* =========================================================
   GLOBAL
   ========================================================= */

window.logout = logout;
window.openActiveCharacterProfile = openActiveCharacterProfile;
window.switchCharacter = switchCharacter;
window.returnToGame = returnToGame;
window.renderKingdomLocations = renderKingdomLocations;
window.renderLocationChats = renderLocationChats;
window.enterLocationRp = enterLocationRp;
window.sendLocalRpMessage = sendLocalRpMessage;
window.renderFloodChat = renderFloodChat;
window.sendLocalFloodMessage = sendLocalFloodMessage;
window.renderRoadChat = renderRoadChat;
window.startTravel = startTravel;
window.arriveAtDestination = arriveAtDestination;
window.getRpPresence = getRpPresence;
window.renderWorldCharacterTracker = renderWorldCharacterTracker;
window.openRpCharacterQuickCard = openRpCharacterQuickCard;



/* =========================================================
   LORGUS 2.1 — CINEMATIC WORLD MAP
   Карта остаётся исходным PNG. Игровые элементы лежат
   отдельным слоем поверх неё.
   ========================================================= */

window.renderWorldCharacterTracker = renderWorldCharacterTracker;
window.renderKingdomLocations = renderKingdomLocations;
window.getRpPresence = getRpPresence;
window.mapServerPresence = mapServerPresence;
window.saveRpPresence = saveRpPresence;
window.initializeRpPresence = initializeRpPresence;
window.renderLocationParticipantsIfVisible = renderLocationParticipantsIfVisible;
window.clearRpPresence = clearRpPresence;
window.getRouteBetweenRegions = getRouteBetweenRegions;
window.getAvailableTravelDestinations = getAvailableTravelDestinations;
window.enterLocationRp = enterLocationRp;
window.startTravel = startTravel;
window.arriveAtDestination = arriveAtDestination;
window.renderTravelScreen = renderTravelScreen;
window.renderRoadChat = renderRoadChat;
window.renderFloodChat = renderFloodChat;
window.renderLocationEntryLock = renderLocationEntryLock;
window.renderLocationParticipants = renderLocationParticipants;
window.sendLocalFloodMessage = sendLocalFloodMessage;
window.getRpCharacterPhoto = getRpCharacterPhoto;
window.renderLocationChats = renderLocationChats;
window.loadRpMessages = loadRpMessages;
window.subscribeToRpMessages = subscribeToRpMessages;
window.sendLocalRpMessage = sendLocalRpMessage;
window.updateRpItemUseButton = updateRpItemUseButton;
window.loadCharacterCurrency = loadCharacterCurrency;
window.loadRpChatParticipants = loadRpChatParticipants;
window.loadNearbyRpParticipants = loadNearbyRpParticipants;
window.transferErrorMessage = transferErrorMessage;
window.openRpTransferPicker = openRpTransferPicker;
window.openRpCurrencyTransferPicker = openRpCurrencyTransferPicker;
window.openRpItemPicker = openRpItemPicker;
window.openAdminCharacterInventory = openAdminCharacterInventory;
window.loadAdminItemUseLog = loadAdminItemUseLog;
window.openActiveCharacterProfile = openActiveCharacterProfile;
window.switchCharacter = switchCharacter;
window.returnToGame = returnToGame;
window.showCharacterError = showCharacterError;
window.setCharacterMessage = setCharacterMessage;
window.logout = logout;
window.setMessage = setMessage;
window.getFileExtension = getFileExtension;


/* =========================================================
   LORGUS — LOCAL RASTER CHAT ART
   PPM is a real raster asset; decode it to a browser image
   without external stock/CDN dependencies.
   ========================================================= */
async function loadLorgusPpmBackgrounds() {
    const locations = {
        "Примум": "assets/rp-locations/primum.ppm"
    };

    const decodePpm = async (url) => {
        const response = await fetch(url, { cache: "force-cache" });
        if (!response.ok) throw new Error("PPM " + response.status);
        const text = await response.text();
        const tokens = text
            .replace(/#[^\n\r]*/g, "")
            .trim()
            .split(/\s+/);

        if (tokens[0] !== "P3") {
            throw new Error("Unsupported PPM");
        }

        const width = Number(tokens[1]);
        const height = Number(tokens[2]);
        const max = Number(tokens[3]);
        if (!width || !height || !max) throw new Error("Invalid PPM");

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d", { alpha: false });
        const image = ctx.createImageData(width, height);
        let p = 4;

        for (let i = 0; i < image.data.length; i += 4) {
            const r = Number(tokens[p++]);
            const g = Number(tokens[p++]);
            const b = Number(tokens[p++]);

            image.data[i] = Math.round(r * 255 / max);
            image.data[i + 1] = Math.round(g * 255 / max);
            image.data[i + 2] = Math.round(b * 255 / max);
            image.data[i + 3] = 255;
        }

        ctx.putImageData(image, 0, 0);
        return canvas.toDataURL("image/png");
    };

    for (const [location, path] of Object.entries(locations)) {
        try {
            const dataUrl = await decodePpm(path);
            document
                .querySelectorAll(
                    '.lorgus-messenger-main[data-rp-location="' +
                    CSS.escape(location) +
                    '"]'
                )
                .forEach((main) => {
                    main.style.setProperty(
                        "--lorgus-raster-bg",
                        'url("' + dataUrl + '")'
                    );
                });
        } catch (error) {
            console.warn(
                "[LORGUS] Не удалось загрузить локальный raster background:",
                location,
                error
            );
        }
    }
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        loadLorgusPpmBackgrounds,
        { once: true }
    );
} else {
    loadLorgusPpmBackgrounds();
}


/* =========================================================
   LORGUS RP LOCATION ART
   ========================================================= */
const LORGUS_RP_LOCATION_ART = {
    "Примум": "/assets/rp-locations/primum.svg",
    "Хелион": "/assets/rp-locations/helion.svg",
    "Древнее Пламя": "/assets/rp-locations/ancient-flame.svg",
    "Арджент": "/assets/rp-locations/argent.svg",
    "Меридиан": "/assets/rp-locations/meridian.svg",
    "Валькрофт": "/assets/rp-locations/valcroft.svg",
    "Солмир": "/assets/rp-locations/solmir.svg",
    "Аврора": "/assets/rp-locations/aurora.svg",
    "Элвэйн": "/assets/rp-locations/elwain.svg",
    "Таллирион": "/assets/rp-locations/tallirion.svg",
    "Эстерваль": "/assets/rp-locations/esterval.svg",
    "Фин": "/assets/rp-locations/fin.svg",
    "Святые Земли": "/assets/rp-locations/holy-lands.svg"
};

function getLorgusRpLocationArt(locationName) {
    return LORGUS_RP_LOCATION_ART[locationName] || null;
}
window.getLorgusRpLocationArt = getLorgusRpLocationArt;

async function openLorgusWorldRoads(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const container = document.getElementById("cabinet-content");
    if (!container) return false;

    container.className = "lorgus-road-page";
    container.innerHTML = `
        <div class="lorgus-road-shell lorgus-road-empty-state">
            <header class="lorgus-road-header">
                <span class="lorgus-rp-overline">ПЕРЕМЕЩЕНИЕ</span>
                <h1>Дороги мира</h1>
                <p>Определяем текущее положение персонажа…</p>
            </header>
            <section class="lorgus-road-panel">
                <div class="lorgus-road-current">
                    <span>СТАТУС</span>
                    <strong>Загрузка маршрутов</strong>
                    <small>Подготавливаем доступные направления.</small>
                </div>
            </section>
        </div>
    `;

    try {
        const presence = await getRpPresence();

        if (presence?.type === "road") {
            await renderRoadChat(presence);
            return false;
        }

        if (presence?.type === "location") {
            renderTravelScreen(presence.location, presence.region, null, null);
            return false;
        }

        container.innerHTML = `
            <div class="lorgus-road-shell lorgus-road-empty-state">
                <header class="lorgus-road-header">
                    <span class="lorgus-rp-overline">ПЕРЕМЕЩЕНИЕ</span>
                    <h1>Дороги мира</h1>
                    <p>Персонаж ещё не находится ни в одной локации.</p>
                </header>
                <section class="lorgus-road-panel">
                    <div class="lorgus-road-current">
                        <span>СТАТУС</span>
                        <strong>Путь не начат</strong>
                        <small>Сначала войди в любую RP-локацию.</small>
                    </div>
                </section>
                <div class="lorgus-road-actions">
                    <button class="character-secondary-button" type="button"
                        onclick="window.lorgusSubpageTransition?.('right', window.renderLorgusRpHub)">
                        ← Вернуться в ролевую
                    </button>
                </div>
            </div>
        `;
    } catch (error) {
        console.error("[LORGUS] Не удалось открыть «Дороги мира»:", error);
        container.innerHTML = `
            <div class="lorgus-road-shell lorgus-road-empty-state">
                <header class="lorgus-road-header">
                    <span class="lorgus-rp-overline">ПЕРЕМЕЩЕНИЕ</span>
                    <h1>Дороги мира</h1>
                    <p>Не удалось получить текущее положение персонажа.</p>
                </header>
                <section class="lorgus-road-panel">
                    <div class="lorgus-road-current">
                        <span>ОШИБКА</span>
                        <strong>Маршруты временно недоступны</strong>
                        <small>Причина записана в консоль.</small>
                    </div>
                </section>
            </div>
        `;
    }

    return false;
}
window.openLorgusWorldRoads = openLorgusWorldRoads;
