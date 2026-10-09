/* LORGUS route manifest */
window.LORGUS_ROUTES = Object.freeze({
    "/overview": { page: "overview", render: "renderLorgusOverview", title: "Обзор" },
    "/world": { page: "world", render: "renderLorgusWorldMapCurrent", title: "Мир" },
    "/codex": { page: "codex", render: "renderLorgusCodex", title: "Справочник мира" },
    "/character": { page: "character", render: "renderLorgusCharacterHub", title: "Персонаж" },
    "/rp": { page: "rp", render: "renderLorgusRpHub", title: "Ролевая" },
    "/people": { page: "people", render: "renderWorldCharacterTracker", title: "Люди" },
    "/mail": { page: "mail", render: "renderMail", title: "Письма" },
    "/inventory": { page: "inventory", render: "renderLorgusInventory", title: "Инвентарь" }
});
