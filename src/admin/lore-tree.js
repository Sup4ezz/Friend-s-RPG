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

    async function hydrateFamilyTree(nav) {
        try {
            const response = await fetch("https://api.github.com/repos/Sup4ezz/Friend-s-RPG/git/trees/main?recursive=1", { cache: "no-cache" });
            if (!response.ok) throw new Error("GitHub tree HTTP " + response.status);
            const payload = await response.json();
            const prefix = "Obsidian Vault/Obsidian Vault/НПС/Королевские семьи/";
            const files = (payload.tree || []).filter(item => item.type === "blob" && item.path.startsWith(prefix) && item.path.endsWith(".md"));
            const grouped = new Map();
            for (const item of files) {
                const relative = item.path.slice(prefix.length);
                const slash = relative.indexOf("/");
                if (slash < 0) continue;
                const folder = relative.slice(0, slash);
                const filename = relative.slice(slash + 1);
                if (!grouped.has(folder)) grouped.set(folder, []);
                grouped.get(folder).push({
                    label: filename.replace(/\.md$/i, ""),
                    file: "НПС/Королевские семьи/" + relative,
                    overview: /^Дом .+\.md$/i.test(filename)
                });
            }
            const kingdomOrder = ["Атэрон", "Морвейн", "Лирэн", "Ксандр", "Каэлор"];
            const families = [...grouped.entries()].map(([folder, entries]) => {
                const match = folder.match(/^(.+?)\s*\(([^)]+)\)$/);
                const family = match ? match[1] : folder;
                const kingdom = match ? match[2] : "";
                entries.sort((a, b) => Number(b.overview) - Number(a.overview) || a.label.localeCompare(b.label, "ru"));
                return { label: (kingdom ? kingdom + " · " : "") + family, kingdom, children: entries };
            }).sort((a, b) => {
                const ai = kingdomOrder.indexOf(a.kingdom);
                const bi = kingdomOrder.indexOf(b.kingdom);
                return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi) || a.label.localeCompare(b.label, "ru");
            });
            if (families.length) {
                tree[0].children = families;
                nav.innerHTML = tree.map(node => nodeMarkup(node)).join("");
            }
        } catch (error) {
            console.warn("Не удалось обновить список семей через GitHub API; оставлено встроенное дерево.", error);
        }
    }

    async function renderLorePortrait(file, markdown, doc) {
        const imageMatch = markdown.match(/^\s*image:\s*(.+?)\s*$/m);
        const originalPath = imageMatch ? imageMatch[1].trim() : "";
        let imageUrl = originalPath
            ? "https://raw.githubusercontent.com/Sup4ezz/Friend-s-RPG/main/" + encodePath("Obsidian Vault/Obsidian Vault/" + originalPath)
            : "";
        const client = window.supabaseClient;
        if (client && file.startsWith("НПС/Королевские семьи/")) {
            try {
                const result = await client.rpc("admin_get_lore_portrait", { p_note_path: file });
                if (!result.error && result.data) {
                    const signed = await client.storage.from("character-applications").createSignedUrl(result.data, 3600);
                    if (!signed.error && signed.data && signed.data.signedUrl) imageUrl = signed.data.signedUrl;
                }
            } catch (error) {
                console.warn("Не удалось загрузить пользовательский портрет лора", error);
            }
        }
        const panel = document.createElement("section");
        panel.className = "lorgus-lore-portrait-panel";
        const preview = document.createElement("div");
        preview.className = "lorgus-lore-portrait-preview";
        if (imageUrl) {
            const img = document.createElement("img");
            img.src = imageUrl;
            img.alt = "Иллюстрация записи";
            preview.appendChild(img);
        } else {
            preview.innerHTML = "<span>✧</span><small>Иллюстрации пока нет</small>";
        }
        const tools = document.createElement("div");
        tools.className = "lorgus-lore-portrait-tools";
        const info = document.createElement("div");
        info.innerHTML = "<strong>Иллюстрация записи</strong><small>" + (originalPath ? "Источник: " + esc(originalPath) : "Фото не указано в заметке") + "</small>";
        const label = document.createElement("label");
        label.className = "lorgus-lore-portrait-upload";
        label.appendChild(document.createTextNode("Загрузить / заменить фото"));
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/png,image/jpeg,image/webp";
        input.hidden = true;
        label.appendChild(input);
        const status = document.createElement("small");
        status.className = "lorgus-lore-portrait-status";
        status.textContent = "Фото сохраняется в хранилище LORGUS отдельно от Markdown.";
        tools.append(info, label, status);
        panel.append(preview, tools);
        const body = doc.querySelector(".lorgus-lore-document-body");
        if (body) doc.insertBefore(panel, body);
        else doc.appendChild(panel);
        input.addEventListener("change", async () => {
            const selected = input.files && input.files[0];
            if (!selected) return;
            if (!/^image\/(png|jpeg|webp)$/.test(selected.type)) {
                status.textContent = "Поддерживаются PNG, JPG и WebP.";
                input.value = "";
                return;
            }
            if (selected.size > 10 * 1024 * 1024) {
                status.textContent = "Файл слишком большой. Максимум — 10 МБ.";
                input.value = "";
                return;
            }
            if (!client) {
                status.textContent = "Не подключено хранилище LORGUS.";
                return;
            }
            status.textContent = "Загружаю изображение…";
            const safeName = selected.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-90) || "portrait.webp";
            const storagePath = "lore-portraits/" + Date.now() + "-" + safeName;
            try {
                const uploaded = await client.storage.from("character-applications").upload(storagePath, selected, {
                    cacheControl: "3600", upsert: false, contentType: selected.type
                });
                if (uploaded.error) throw uploaded.error;
                const saved = await client.rpc("admin_set_lore_portrait", { p_note_path: file, p_photo_path: storagePath });
                if (saved.error) throw saved.error;
                const signed = await client.storage.from("character-applications").createSignedUrl(storagePath, 3600);
                if (signed.error) throw signed.error;
                preview.innerHTML = "";
                const img = document.createElement("img");
                img.src = signed.data.signedUrl;
                img.alt = "Иллюстрация записи";
                preview.appendChild(img);
                status.textContent = "Фото сохранено. Оно останется после обновления страницы.";
            } catch (error) {
                console.error("Не удалось сохранить портрет лора", error);
                status.textContent = "Не удалось сохранить фото: " + (error.message || "проверь доступ администратора");
            } finally {
                input.value = "";
            }
        });
    }

    function renderInline(value) {
        let html = esc(value);
        html = html.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '<span class="lorgus-wikilink">$2</span>');
        html = html.replace(/\[\[([^\]]+)\]\]/g, '<span class="lorgus-wikilink">$1</span>');
        html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
        html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");
        html = html.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
        html = html.replace(/(^|[^_])_([^_\n]+)_(?!_)/g, "$1<em>$2</em>");
        html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");
        return html;
    }

    function renderMarkdown(source) {
        const lines = String(source || "").replace(/\r/g, "").split("\n");
        const blocks = [];
        let paragraph = [];
        let list = [];
        let code = [];
        let inCode = false;
        const fence = String.fromCharCode(96).repeat(3);
        const flushParagraph = () => {
            if (paragraph.length) {
                blocks.push("<p>" + paragraph.map(renderInline).join("<br>") + "</p>");
                paragraph = [];
            }
        };
        const flushList = () => {
            if (list.length) {
                blocks.push("<ul>" + list.map(item => "<li>" + renderInline(item) + "</li>").join("") + "</ul>");
                list = [];
            }
        };
        const flushCode = () => {
            blocks.push("<pre><code>" + esc(code.join("\n")) + "</code></pre>");
            code = [];
        };
        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();
            if (trimmed.startsWith(fence)) {
                flushParagraph(); flushList();
                if (inCode) { flushCode(); inCode = false; }
                else { inCode = true; }
                continue;
            }
            if (inCode) { code.push(lines[i]); continue; }
            if (!trimmed) { flushParagraph(); flushList(); continue; }

            const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
            if (heading) {
                flushParagraph(); flushList();
                const level = heading[1].length;
                blocks.push("<h" + level + ">" + renderInline(heading[2]) + "</h" + level + ">");
                continue;
            }
            if (/^>\s?/.test(trimmed)) {
                flushParagraph(); flushList();
                const quoteLines = [];
                while (i < lines.length && /^\s*>/.test(lines[i])) {
                    quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
                    i++;
                }
                i--;
                const callout = quoteLines[0]?.match(/^\[!([\w-]+)\]([+-])?\s*(.*)$/);
                if (callout) {
                    const kind = callout[1].toLowerCase();
                    const title = callout[3] || "Запись";
                    const bodyLines = quoteLines.slice(1);
                    const body = [];
                    let quoteList = [];
                    const flushQuoteList = () => {
                        if (quoteList.length) {
                            body.push("<ul>" + quoteList.map(item => "<li>" + renderInline(item) + "</li>").join("") + "</ul>");
                            quoteList = [];
                        }
                    };
                    for (const bodyLine of bodyLines) {
                        const item = bodyLine.match(/^[-*+]\s+(.+)$/);
                        if (item) quoteList.push(item[1]);
                        else {
                            flushQuoteList();
                            if (bodyLine.trim()) body.push("<p>" + renderInline(bodyLine) + "</p>");
                        }
                    }
                    flushQuoteList();
                    blocks.push('<section class="lorgus-lore-callout lorgus-lore-callout-' + esc(kind) + '"><h3>' + renderInline(title) + '</h3><div>' + body.join("") + '</div></section>');
                } else {
                    blocks.push("<blockquote>" + quoteLines.map(renderInline).join("<br>") + "</blockquote>");
                }
                continue;
            }
            if (/^[-*+]\s+/.test(trimmed)) {
                flushParagraph();
                list.push(trimmed.replace(/^[-*+]\s+/, ""));
                continue;
            }
            if (/^---+$/.test(trimmed)) {
                flushParagraph(); flushList(); blocks.push("<hr>");
                continue;
            }
            flushList();
            paragraph.push(trimmed.replace(/\\\s*$/, ""));
        }
        flushParagraph(); flushList();
        if (inCode) flushCode();
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
        hydrateFamilyTree(nav);

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
                await renderLorePortrait(file, markdown, doc);
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
