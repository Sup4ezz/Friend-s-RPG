/* LORGUS canonical route manifest: every major screen has a stable URL. */
window.LORGUS_ROUTES = Object.freeze({
    "/main-page": { page: "world", render: "renderLorgusWorldMapCurrent", title: "Главная" },
    "/ankets": { page: "applications", render: "renderCharacterApplicationForm", title: "Анкеты" },
    "/map": { page: "world", render: "renderLorgusWorldMapCurrent", title: "Карта" },
    "/lorblook": { page: "codex", render: "renderLorgusCodex", title: "Лорбук" },
    "/character": { page: "character", render: "renderLorgusCharacterHub", title: "Персонаж" },
    "/rp": { page: "rp", render: "renderLorgusRpHub", title: "Ролевая" },
    "/people": { page: "people", render: "renderWorldCharacterTracker", title: "Люди" },
    "/mail": { page: "mail", render: "renderMail", title: "Письма" },
    "/inventory": { page: "inventory", render: "renderLorgusInventory", title: "Инвентарь" },
    "/admin": { page: "admin", render: "loadAdminPanel", title: "Администрирование" }
});
