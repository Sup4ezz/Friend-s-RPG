/* LORGUS admin lore tree: browse the existing Obsidian lore files from the admin panel. */
(() => {
    const ROOT = "/Obsidian Vault/Obsidian Vault/";
    const tree = [
        { label: "Королевские семьи", icon: "♜", children: [
            { label: "Атэрон · Дом Аркейн", children: [
                { label: "Дом Аркейн", file: "НПС/Королевские семьи/Дом Аркейн (Атэрон)/Дом Аркейн.md" },
                { label: "Эдмунд Аркейн IV", file: "НПС/Королевские семьи/Дом Аркейн (Атэрон)/Эдмунд Аркейн IV.md" },
                { label: "Лиандра Аркейн", file: "НПС/Королевские семьи/Дом Аркейн (Атэрон)/Лиандра Аркейн.md" },
                { label: "Кассиан Аркейн", file: "НПС/Королевские семьи/Дом Аркейн (Атэрон)/Кассиан Аркейн.md" },
                { label: "Адриан Аркейн", file: "НПС/Королевские семьи/Дом Аркейн (Атэрон)/Адриан Аркейн.md" },
                { label: "Селена Аркейн", file: "НПС/Королевские семьи/Дом Аркейн (Атэрон)/Селена Аркейн.md" }
            ]},
            { label: "Морвейн · Дом Вальмонт", children: [
                { label: "Дом Вальмонт", file: "НПС/Королевские семьи/Дом Вальмонт (Морвейн)/Дом Вальмонт (Морвейн).md" },
                { label: "Альдрен IV Вальмонт", file: "НПС/Королевские семьи/Дом Вальмонт (Морвейн)/Альдрен IV Вальмонт.md" },
                { label: "Элеонора Вальмонт", file: "НПС/Королевские семьи/Дом Вальмонт (Морвейн)/Элеонора Вальмонт.md" }
            ]},
            { label: "Лирэн · Дом Гринвельд", children: [
                { label: "Дом Гринвельд", file: "НПС/Королевские семьи/Дом Гринвельд (Лирэн)/Дом Гринвельд.md" },
                { label: "Селестра I Гринвельд", file: "НПС/Королевские семьи/Дом Гринвельд (Лирэн)/Селестра I Гринвельд.md" },
                { label: "Эдгар Гринвельд", file: "НПС/Королевские семьи/Дом Гринвельд (Лирэн)/Эдгар Гринвельд.md" },
                { label: "Эвелина Гринвельд", file: "НПС/Королевские семьи/Дом Гринвельд (Лирэн)/Эвелина Гринвельд.md" },
                { label: "Кайрен Гринвельд", file: "НПС/Королевские семьи/Дом Гринвельд (Лирэн)/Кайрен Гринвельд.md" },
                { label: "Леон Гринвельд", file: "НПС/Королевские семьи/Дом Гринвельд (Лирэн)/Леон Гринвельд.md" },
                { label: "Лиара Гринвельд", file: "НПС/Королевские семьи/Дом Гринвельд (Лирэн)/Лиара Гринвельд.md" },
                { label: "Мариэль Гринвельд", file: "НПС/Королевские семьи/Дом Гринвельд (Лирэн)/Мариэль Гринвельд.md" },
                { label: "Элиан Гринвельд", file: "НПС/Королевские семьи/Дом Гринвельд (Лирэн)/Элиан Гринвельд.md" }
            ]},
            { label: "Ксандр · Дом Кальери", children: [
                { label: "Дом Кальери", file: "НПС/Королевские семьи/Дом Кальери (Ксандр)/Дом Кальери.md" },
                { label: "Марцелл Кальери I «Собиратель»", file: "НПС/Королевские семьи/Дом Кальери (Ксандр)/Марцелл Кальери I «Собиратель».md" },
                { label: "Лукреция Кальери", file: "НПС/Королевские семьи/Дом Кальери (Ксандр)/Лукреция Кальери.md" },
                { label: "Виолетта Кальери", file: "НПС/Королевские семьи/Дом Кальери (Ксандр)/Виолетта Кальери.md" },
                { label: "Дамиан Кальери", file: "НПС/Королевские семьи/Дом Кальери (Ксандр)/Дамиан Кальери.md" }
            ]},
            { label: "Каэлор · Дом Фалькрейн", children: [
                { label: "Дом Фалькрейн", file: "НПС/Королевские семьи/Дом Фалькрейн (Каэлор)/Дом Фалькрейн (Каэлор).md" },
                { label: "Леонард I Фалькрейн", file: "НПС/Королевские семьи/Дом Фалькрейн (Каэлор)/Леонард I Фалькрейн.md" },
                { label: "Изольда Фалькрейн", file: "НПС/Королевские семьи/Дом Фалькрейн (Каэлор)/Изольда Фалькрейн.md" },
                { label: "Рейнар Фалькрейн", file: "НПС/Королевские семьи/Дом Фалькрейн (Каэлор)/Рейнар Фалькрейн.md" }
            ]}
        ]},
        { label: "Церковники", icon: "✦", children: [
            { label: "Папа Аурелий I «Беглец»", file: "Церковники/ЦЕРКОВЬ НЕЧТО ! Папа Аурелий I «Беглец».md" },
            { label: "Севериан I «Несущий Свет»", file: "Церковники/ЦЕРКОВЬ ВЕЧНОГО ПЛАМЕНИ ! Севериан I «Несущий Свет».md" },
            { label: "Мелисса I «Матерь Тысячи»", file: "Церковники/ЦЕРКОВЬ ПЛОДОРОДИЯ ! Мелисса I «Матерь Тысячи».md" },
            { label: "Эдриан I «Последний Свидетель»", file: "Церковники/ЦЕРКОВЬ ПОСЛЕДНЕГО ПУТИ ! Эдриан I «Последний Свидетель».md" },
            { label: "Неопознанная запись · Марцелл Кальери", file: "Церковники/ЦЕРКОВЬМарцелл Кальери I «Собиратель» 1.md" },
            { label: "Обзор церковников", file: "Церковники/Церковники.md" }
        ]},
        { label: "Боги", icon: "✧", children: [
            { label: "Пантеон богов", file: "Лорбук/Пантеон Богов/Пантеон Богов.md" },
            { label: "Аэрарис", file: "Лорбук/Пантеон Богов/АЭРАРИС.md" },
            { label: "Нечто", file: "Лорбук/Пантеон Богов/НЕЧТО.md" },
            { label: "Ничто", file: "Лорбук/Пантеон Богов/НИЧТО.md" },
            { label: "Солар", file: "Лорбук/Пантеон Богов/СОЛАР.md" },
            { label: "Лилит", file: "Лорбук/Пантеон Богов/ЛИЛИТ.md" },
            { label: "Вехаиэль", file: "Лорбук/Пантеон Богов/ВЕХАИЭЛЬ.md" },
            { label: "Малкхор", file: "Лорбук/Пантеон Богов/МАЛКХОР.md" }
        ]},
        { label: "Церкви", icon: "⌂", children: [
            { label: "Обзор церквей", file: "Церкви/Церкви.md" },
            { label: "Церковь Нечто", file: "Церкви/Церковь Нечто.md" },
            { label: "Церковь Вечного Пламени", file: "Церкви/Церковь Вечного Пламени.md" },
            { label: "Церковь Плодородия", file: "Церкви/Церковь Плодородия.md" },
            { label: "Церковь Последнего Пути", file: "Церкви/Церковь Последнего Пути.md" },
            { label: "Церковь Воздаяния", file: "Церкви/Церковь Воздаяния.md" }
        ]},
        { label: "Королевства и локации", icon: "⌖", children: [
            { label: "Континент Лоргуса", file: "Континент Лоргуса/Континент Лоргуса.md" },
            { label: "Атэрон", file: "Континент Лоргуса/Атэрон - Королевство Нечто.md" },
            { label: "Каэлор", file: "Континент Лоргуса/Каэлор — Королевство Вечного Пламени.md" },
            { label: "Ксандр", file: "Континент Лоргуса/Ксандр — Королевство Воздаяния.md" },
            { label: "Лирэн", file: "Континент Лоргуса/Лирэн — Королевство Плодородия.md" },
            { label: "Морвейн", file: "Континент Лоргуса/Морвейн — Королевство Последнего Пути.md" },
            { label: "Геена", file: "Континент Лоргуса/Геена.md" },
            { label: "Святые Земли", file: "Континент Лоргуса/Святые Земли.md" },
            { label: "Спорные Земли", file: "Континент Лоргуса/Спорные Земли.md" },
            { label: "Аврора", file: "Континент Лоргуса/Локации/Аврора.md" },
            { label: "Арджент", file: "Континент Лоргуса/Локации/Арджент.md" },
            { label: "Примум", file: "Континент Лоргуса/Локации/Примум.md" },
            { label: "Фин", file: "Континент Лоргуса/Локации/Фин.md" },
            { label: "Хелион", file: "Континент Лоргуса/Локации/Хелион.md" },
            { label: "Древнее Пламя", file: "Континент Лоргуса/Локации/Древнее Пламя.md" },
            { label: "Геена · локация", file: "Континент Лоргуса/Локации/Геена.md" }
        ]},
        { label: "Легенды", icon: "❖", children: [
            { label: "В начале было ничто", file: "Лорбук/Легенды/В начале было ничто.md" },
            { label: "Мать Жизни", file: "Лорбук/Легенды/Мать Жизни.md" },
            { label: "Первое пламя", file: "Лорбук/Легенды/Первое пламя.md" },
            { label: "Первый договор", file: "Лорбук/Легенды/Первый договор.md" },
            { label: "Последний Путь", file: "Лорбук/Легенды/Последний Путь.md" },
            { label: "Общий лорбук", file: "Лорбук/Лорбук.md" }
        ]}
    ];

    const esc = value => window.escapeHtml(String(value ?? ""));
    const encodePath = path => path.split("/").map(encodeURIComponent).join("/");

    function renderMarkdown(source) {
        const lines = String(source || "").replace(/\r/g, "").split("\n");
        const blocks = [];
        let paragraph = [];
        let list = [];
        const flushParagraph = () => {
            if (paragraph.length) {
                blocks.push("<p>" + paragraph.map(esc).join("<br>") + "</p>");
                paragraph = [];
            }
        };
        const flushList = () => {
            if (list.length) {
                blocks.push("<ul>" + list.map(item => "<li>" + esc(item) + "</li>").join("") + "</ul>");
                list = [];
            }
        };
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) { flushParagraph(); flushList(); continue; }
            const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
            if (heading) {
                flushParagraph(); flushList();
                const level = heading[1].length;
                blocks.push("<h" + level + ">" + esc(heading[2]) + "</h" + level + ">");
            } else if (/^[-*+]\s+/.test(trimmed)) {
                flushParagraph();
                list.push(trimmed.replace(/^[-*+]\s+/, ""));
            } else if (/^>\s?/.test(trimmed)) {
                flushParagraph(); flushList();
                blocks.push("<blockquote>" + esc(trimmed.replace(/^>\s?/, "")) + "</blockquote>");
            } else if (/^---+$/.test(trimmed)) {
                flushParagraph(); flushList(); blocks.push("<hr>");
            } else {
                flushList();
                paragraph.push(trimmed);
            }
        }
        flushParagraph(); flushList();
        return blocks.join("");
    }

    function nodeMarkup(node, depth = 0) {
        const hasChildren = Array.isArray(node.children) && node.children.length;
        const key = node.file ? "file" : "folder";
        return '<div class="lorgus-lore-node ' + (hasChildren ? "has-children" : "") + '" data-depth="' + depth + '">' +
            '<button type="button" class="lorgus-lore-node-button ' + (node.file ? "is-file" : "is-folder") + '"' +
                (node.file ? ' data-lore-file="' + esc(node.file) + '"' : ' data-lore-toggle="1"') +
                (node.file ? "" : ' aria-expanded="false"') + '>' +
                '<span class="lorgus-lore-node-icon">' + (hasChildren ? "▸" : node.icon || "·") + '</span>' +
                '<span class="lorgus-lore-node-label">' + esc(node.label) + '</span>' +
                (hasChildren ? '<span class="lorgus-lore-node-count">' + node.children.length + '</span>' : "") +
            '</button>' +
            (hasChildren ? '<div class="lorgus-lore-children" hidden>' + node.children.map(child => nodeMarkup(child, depth + 1)).join("") + '</div>' : "") +
        '</div>';
    }

    function mount(container) {
        if (!container || container.dataset.loreTreeReady === "1") return;
        container.dataset.loreTreeReady = "1";
        container.innerHTML =
            '<div class="lorgus-lore-tree-layout">' +
                '<aside class="lorgus-lore-tree-sidebar">' +
                    '<div class="lorgus-lore-tree-sidebar-head"><span>НАВИГАЦИЯ ПО МИРУ</span><small>ДРЕВО ЛОРГУСА</small></div>' +
                    '<label class="lorgus-lore-tree-search-label" for="lorgus-lore-tree-search">БЫСТРЫЙ ПОИСК</label>' +
                    '<input id="lorgus-lore-tree-search" class="lorgus-lore-tree-search" type="search" placeholder="Семья, бог, церковь…">' +
                    '<nav class="lorgus-lore-tree-nav" aria-label="Древо лора">' + tree.map(node => nodeMarkup(node)).join("") + '</nav>' +
                '</aside>' +
                '<article class="lorgus-lore-document" aria-live="polite">' +
                    '<div class="lorgus-lore-document-empty"><span>✧</span><h3>Выбери запись</h3><p>Раскрой раздел слева и открой семью, персонажа, бога или место.</p></div>' +
                '</article>' +
            '</div>';

        const doc = container.querySelector(".lorgus-lore-document");
        const search = container.querySelector(".lorgus-lore-tree-search");
        const nav = container.querySelector(".lorgus-lore-tree-nav");

        nav.addEventListener("click", async event => {
            const button = event.target.closest("button");
            if (!button) return;
            if (button.dataset.loreToggle) {
                const node = button.parentElement;
                const children = node.querySelector(":scope > .lorgus-lore-children");
                if (!children) return;
                const opening = children.hidden;
                children.hidden = !opening;
                button.setAttribute("aria-expanded", String(opening));
                const icon = button.querySelector(".lorgus-lore-node-icon");
                if (icon) icon.textContent = opening ? "▾" : "▸";
                node.classList.toggle("is-open", opening);
                return;
            }
            const file = button.dataset.loreFile;
            if (!file) return;
            nav.querySelectorAll(".is-selected").forEach(el => el.classList.remove("is-selected"));
            button.classList.add("is-selected");
            doc.innerHTML = '<div class="lorgus-lore-document-loading"><span class="lorgus-lore-spinner"></span><p>Открываю запись…</p></div>';
            try {
                let response = await fetch(encodePath(ROOT + file), { cache: "no-cache" });
                let markdown = "";
                if (response.ok) {
                    markdown = await response.text();
                }
                // SPA fallback can return index.html with HTTP 200 for missing .md assets.
                // Detect that case and retrieve the actual source from the public GitHub repo.
                if (!response.ok || /<\s*!doctype\s+html|<html[\s>]/i.test(markdown.slice(0, 500))) {
                    const rawUrl = "https://raw.githubusercontent.com/Sup4ezz/Friend-s-RPG/main/" + encodePath("Obsidian Vault/Obsidian Vault/" + file);
                    response = await fetch(rawUrl, { cache: "no-cache" });
                    if (!response.ok) throw new Error("Не удалось загрузить файл: HTTP " + response.status);
                    markdown = await response.text();
                    if (/^\s*<\s*!doctype\s+html|^\s*<html[\s>]/i.test(markdown.slice(0, 500))) {
                        throw new Error("Вместо Markdown получен HTML");
                    }
                }
                doc.innerHTML = '<div class="lorgus-lore-document-head"><span>ЛОРГУС · ЛЕТОПИСЬ</span><h2>' + esc(button.querySelector(".lorgus-lore-node-label")?.textContent || "Запись") + '</h2><small>' + esc(file.replace(/\.md$/i, "").replaceAll("/", " / ")) + '</small></div><div class="lorgus-lore-document-body">' + renderMarkdown(markdown) + '</div>';
            } catch (error) {
                console.error("Не удалось открыть запись лора:", file, error);
                doc.innerHTML = '<div class="lorgus-lore-document-empty is-error"><span>!</span><h3>Запись не загрузилась</h3><p>Не удалось получить файл из хранилища сайта. Путь: <code>' + esc(file) + '</code></p><p>Проверь наличие файла в распакованном хранилище и доступность статических ресурсов.</p></div>';
            }
        });

        search.addEventListener("input", () => {
            const query = search.value.trim().toLocaleLowerCase("ru");
            const nodes = Array.from(nav.querySelectorAll(".lorgus-lore-node"));
            nodes.forEach(node => {
                const label = node.querySelector(":scope > .lorgus-lore-node-button .lorgus-lore-node-label")?.textContent.toLocaleLowerCase("ru") || "";
                const match = !query || label.includes(query);
                const descendantMatch = Array.from(node.querySelectorAll(".lorgus-lore-node-button .lorgus-lore-node-label")).some(el => el.textContent.toLocaleLowerCase("ru").includes(query));
                node.hidden = Boolean(query) && !(match || descendantMatch);
                if (query && descendantMatch) {
                    const children = node.querySelector(":scope > .lorgus-lore-children");
                    const toggle = node.querySelector(":scope > .lorgus-lore-node-button");
                    if (children) children.hidden = false;
                    if (toggle && toggle.dataset.loreToggle) {
                        toggle.setAttribute("aria-expanded", "true");
                        toggle.querySelector(".lorgus-lore-node-icon").textContent = "▾";
                    }
                }
            });
        });
    }

    window.renderAdminLoreTree = mount;
})();
