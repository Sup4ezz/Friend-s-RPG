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
                { label: "СЕКРЕТНО · Вальдр и восстание (только автор)", file: "НПС/Королевские семьи/Дом Кальери (Ксандр)/СЕКРЕТНЫЙ КАНОН — Вальдр и восстание.md" },
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
            { label: "История Лоргуса — рабочий каркас", file: "Лорбук/Хронология Лоргуса — рабочий каркас.md" },
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
        if (!/^(НПС\/Королевские семьи|Лорбук\/Пантеон Богов|Церковники)\/.+\.md$/i.test(file)) return;
        const imageMatch = markdown.match(/^\s*image:\s*(.+?)\s*$/m);
        const originalPath = imageMatch ? imageMatch[1].trim() : "";
        let imageUrl = originalPath
            ? "https://raw.githubusercontent.com/Sup4ezz/Friend-s-RPG/main/" + encodePath("Obsidian Vault/Obsidian Vault/" + originalPath)
            : "";
        const client = window.supabaseClient;
        let actor = null;
        if (client) {
            try {
                const result = await client.rpc("admin_get_lore_actor", { p_note_path: file });
                if (!result.error && Array.isArray(result.data) && result.data[0]) {
                    actor = result.data[0];
                    if (actor.photo_path) {
                        const signed = await client.storage.from("character-applications").createSignedUrl(actor.photo_path, 3600);
                        if (!signed.error && signed.data?.signedUrl) imageUrl = signed.data.signedUrl;
                    }
                }
            } catch (error) {
                console.warn("Не удалось получить RP-привязку персонажа", error);
            }
        }

        const panel = document.createElement("section");
        panel.className = "lorgus-lore-rp-panel";
        const avatar = document.createElement("div");
        avatar.className = "lorgus-lore-portrait-avatar";
        if (imageUrl) {
            const img = document.createElement("img");
            img.src = imageUrl;
            img.alt = "Портрет персонажа";
            avatar.appendChild(img);
        } else {
            avatar.innerHTML = "<span>✦</span>";
        }

        const tools = document.createElement("div");
        tools.className = "lorgus-lore-portrait-tools";
        const info = document.createElement("div");
        const title = doc.querySelector(".lorgus-lore-document-head h2")?.textContent || file.split("/").pop().replace(/\.md$/i, "");
        info.innerHTML = "<strong>RP-ПЕРСОНАЖ</strong><small>" +
            (actor ? (actor.is_active ? "Подключён к RP и доступен для публикации" : "Персонаж связан с записью") :
            "Запись лора пока не подключена к RP") +
            (originalPath ? "<br>Исходная иллюстрация: " + esc(originalPath) : "") + "</small>";

        const actions = document.createElement("div");
        actions.className = "lorgus-lore-rp-actions";
        const useButton = document.createElement("button");
        useButton.type = "button";
        useButton.className = "lorgus-lore-rp-use";
        useButton.textContent = actor ? "Выбрать для поста" : "Подключить к RP и выбрать";
        const uploadLabel = document.createElement("label");
        uploadLabel.className = "lorgus-lore-portrait-upload";
        uploadLabel.textContent = actor?.photo_path ? "Заменить портрет" : "Загрузить фото в кружок";
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/png,image/jpeg,image/webp,image/avif";
        input.hidden = true;
        uploadLabel.appendChild(input);
        const status = document.createElement("small");
        status.className = "lorgus-lore-portrait-status";
        status.textContent = "Аватар будет круглым и появится рядом с сообщениями персонажа.";
        actions.append(useButton, uploadLabel);
        tools.append(info, actions, status);
        panel.append(avatar, tools);
        const body = doc.querySelector(".lorgus-lore-document-body");
        if (body) doc.insertBefore(panel, body);
        else doc.appendChild(panel);

        const registerActor = async () => {
            if (actor?.character_id) return actor;
            if (!client) throw new Error("Не подключено хранилище LORGUS.");
            status.textContent = "Подключаю персонажа к RP…";
            const result = await client.rpc("admin_register_lore_actor", { p_note_path: file, p_name: title });
            if (result.error) throw result.error;
            actor = Array.isArray(result.data) ? result.data[0] : result.data;
            if (!actor?.character_id) throw new Error("Сервер не вернул ID персонажа.");
            useButton.textContent = "Выбрать для поста";
            uploadLabel.textContent = "Загрузить фото в кружок";
            uploadLabel.appendChild(input);
            info.innerHTML = "<strong>RP-ПЕРСОНАЖ</strong><small>Подключён к RP и доступен для публикации</small>";
            return actor;
        };

        useButton.addEventListener("click", async () => {
            useButton.disabled = true;
            try {
                const linked = await registerActor();
                const selected = await window.lorgusSelectRpCharacter?.(linked.character_id);
                status.textContent = selected
                    ? "Персонаж выбран в форме публикации. Можно писать пост."
                    : "Персонаж подключён. Открой «Ролевая · контрольная комната» — он будет выбран в форме публикации.";
            } catch (error) {
                status.textContent = "Не удалось подключить персонажа: " + (error.message || error);
            } finally {
                useButton.disabled = false;
            }
        });

        input.addEventListener("change", async () => {
            const selected = input.files?.[0];
            if (!selected) return;
            if (!/^image\/(png|jpeg|webp|avif)$/.test(selected.type) || selected.size > 8 * 1024 * 1024) {
                status.textContent = "Выбери PNG, JPG, WebP или AVIF размером не более 8 МБ.";
                input.value = "";
                return;
            }
            if (typeof window.lorgusEditPortraitImage !== "function") {
                status.textContent = "Редактор портрета ещё не загрузился. Обнови страницу.";
                input.value = "";
                return;
            }
            uploadLabel.style.pointerEvents = "none";
            status.textContent = "Открой редактор и настрой кадрирование…";
            try {
                const linked = await registerActor();
                const cropped = await window.lorgusEditPortraitImage(selected);
                if (!cropped) {
                    status.textContent = "Загрузка отменена.";
                    return;
                }
                status.textContent = "Сохраняю прямоугольный портрет…";
                const path = "rp-characters/" + linked.character_id + "/" + Date.now() + "-portrait.png";
                const uploaded = await client.storage.from("character-applications").upload(path, cropped, {
                    cacheControl: "3600", upsert: false, contentType: "image/png"
                });
                if (uploaded.error) throw uploaded.error;
                const saved = await client.rpc("admin_set_rp_character_photo", {
                    p_character_id: linked.character_id,
                    p_photo_path: path
                });
                if (saved.error) throw saved.error;
                const signed = await client.storage.from("character-applications").createSignedUrl(path, 3600);
                if (signed.error) throw signed.error;
                actor.photo_path = path;
                avatar.innerHTML = "";
                const img = document.createElement("img");
                img.src = signed.data.signedUrl;
                img.alt = "Портрет персонажа";
                avatar.appendChild(img);
                uploadLabel.textContent = "Заменить портрет";
                uploadLabel.appendChild(input);
                status.textContent = "Готово: прямоугольный портрет сохранён и привязан к персонажу RP.";
                window.rpCharacterPhotoCache = window.rpCharacterPhotoCache || {};
                delete window.rpCharacterPhotoCache[String(linked.character_id)];
            } catch (error) {
                console.error("Не удалось сохранить круглый портрет:", error);
                status.textContent = "Не удалось сохранить фото: " + (error.message || error);
            } finally {
                uploadLabel.style.pointerEvents = "";
                input.value = "";
            }
        });
    }

    function renderInline(value) {
        const source = String(value ?? "");
        const output = [];
        const pattern = /(!?\[[^\]]*\]\([^)]+\)|\[\[[^\]]+\]\]|\x60[^\x60]+\x60|\*\*[\s\S]+?\*\*|__[\s\S]+?__|~~[\s\S]+?~~|\*[^*\n]+\*|_[^_\n]+_)/g;
        let cursor = 0;
        let match;
        const safeUrl = raw => {
            try {
                const url = new URL(raw, window.location.href);
                return /^(https?:|mailto:)$/.test(url.protocol) ? url.href : "";
            } catch (_) { return ""; }
        };
        while ((match = pattern.exec(source))) {
            if (match.index > cursor) output.push(esc(source.slice(cursor, match.index)));
            const token = match[0];
            if (token.startsWith("[[")) {
                const parts = token.slice(2, -2).split("|");
                output.push('<span class="lorgus-wikilink">' + esc(parts[1] || parts[0]) + '</span>');
            } else if (token.startsWith("![") || token.startsWith("[")) {
                const link = token.match(/^(!?)\[([^\]]*)\]\(([^)]+)\)$/);
                const href = link && safeUrl(link[3].trim());
                if (link && href && link[1]) {
                    output.push('<img class="lorgus-lore-inline-image" src="' + esc(href) + '" alt="' + esc(link[2]) + '" loading="lazy">');
                } else if (link && href) {
                    output.push('<a href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + renderInline(link[2]) + '</a>');
                } else output.push(esc(token));
            } else if (token.charCodeAt(0) === 96) {
                output.push("<code>" + esc(token.slice(1, -1)) + "</code>");
            } else if (token.startsWith("**") || token.startsWith("__")) {
                output.push("<strong>" + renderInline(token.slice(2, -2)) + "</strong>");
            } else if (token.startsWith("~~")) {
                output.push("<del>" + renderInline(token.slice(2, -2)) + "</del>");
            } else {
                output.push("<em>" + renderInline(token.slice(1, -1)) + "</em>");
            }
            cursor = pattern.lastIndex;
        }
        if (cursor < source.length) output.push(esc(source.slice(cursor)));
        return output.join("");
    }

    function renderMarkdown(source) {
        const lines = String(source ?? "").replace(/\r\n?/g, "\n").split("\n");
        const blocks = [];
        const tag = (name, content, attrs = "") => "<" + name + attrs + ">" + content + "</" + name + ">";
        const isFence = line => /^(\x60{3,}|~{3,})/.test(line.trim());
        const startsBlock = line => {
            const s = line.trim();
            return /^(#{1,6}\s|>\s?|[-*+]\s+|\d+[.)]\s+|(?:[-*_]\s*){3,}$|\|.*\|$)/.test(s) || isFence(s);
        };
        const splitTableRow = line => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(cell => cell.trim().replace(/\\\|/g, "|"));
        const renderList = (from, ordered, depth = 0) => {
            const listTag = ordered ? "ol" : "ul";
            const first = lines[from].trim().match(ordered ? /^(\d+)[.)]\s+/ : /^[-*+]\s+/);
            let i = from;
            const items = [];
            while (i < lines.length) {
                const s = lines[i].trim();
                const itemMatch = s.match(ordered ? /^(\d+)[.)]\s+(.+)$/ : /^[-*+]\s+(.+)$/);
                if (!itemMatch) break;
                const itemText = itemMatch[2];
                const task = itemText.match(/^\[([ xX])\]\s+(.*)$/);
                let content;
                if (task) {
                    content = '<input type="checkbox" disabled' + (task[1].toLowerCase() === "x" ? " checked" : "") + '> ' + renderInline(task[2]);
                } else content = renderInline(itemText);
                const nested = [];
                i++;
                while (i < lines.length && (/^\s{2,}([-*+]|\d+[.)])\s+/.test(lines[i]) || /^\s*$/.test(lines[i]))) {
                    if (/^\s*$/.test(lines[i])) {
                        if (i + 1 < lines.length && /^\s{2,}([-*+]|\d+[.)])\s+/.test(lines[i + 1])) { nested.push(""); i++; continue; }
                        break;
                    }
                    nested.push(lines[i].replace(/^\s{2,}/, ""));
                    i++;
                }
                if (nested.some(line => line.trim())) {
                    const nestedHtml = renderMarkdown(nested.join("\n"));
                    content += nestedHtml;
                }
                items.push(tag("li", content));
                if (i < lines.length && !/^\s*$/.test(lines[i]) && (ordered ? /^\d+[.)]\s+/.test(lines[i].trim()) : /^[-*+]\s+/.test(lines[i].trim()))) continue;
                break;
            }
            const attrs = ordered && first ? ' start="' + Number(first[1]) + '"' : "";
            return { html: tag(listTag, items.join(""), attrs), next: i };
        };
        let i = 0;
        while (i < lines.length) {
            const raw = lines[i];
            const s = raw.trim();
            if (!s) { i++; continue; }

            if (isFence(s)) {
                const fence = s.match(/^(\x60{3,}|~{3,})/)[1];
                const language = s.slice(fence.length).trim().split(/\s+/)[0].replace(/[^\w+-]/g, "");
                const body = [];
                i++;
                while (i < lines.length && !lines[i].trim().startsWith(fence)) body.push(lines[i++]);
                if (i < lines.length) i++;
                blocks.push('<pre><code' + (language ? ' class="language-' + esc(language) + '"' : "") + '>' + esc(body.join("\n")) + "</code></pre>");
                continue;
            }

            const heading = s.match(/^(#{1,6})\s+(.+?)\s*#*$/);
            if (heading) {
                const level = heading[1].length;
                blocks.push(tag("h" + level, renderInline(heading[2])));
                i++;
                continue;
            }

            if (/^(---+|\*\s*\*\s*\*|_\s*_\s*_)$/.test(s)) {
                blocks.push("<hr>");
                i++;
                continue;
            }

            if (/^>\s?/.test(s)) {
                const quoteLines = [];
                while (i < lines.length && /^\s*>/.test(lines[i])) quoteLines.push(lines[i++].trim().replace(/^>\s?/, ""));
                const callout = quoteLines[0]?.match(/^\[!([\w-]+)\]([+-])?\s*(.*)$/);
                if (callout) {
                    const kind = callout[1].toLowerCase().replace(/[^\w-]/g, "");
                    const title = callout[3] || callout[1].replace(/-/g, " ");
                    const bodyLines = quoteLines.slice(1);
                    const bodyHtml = renderMarkdown(bodyLines.join("\n"));
                    blocks.push('<aside class="lorgus-lore-callout lorgus-lore-callout-' + esc(kind) + '"><h3>' + renderInline(title) + '</h3><div>' + bodyHtml + '</div></aside>');
                } else {
                    blocks.push(tag("blockquote", renderMarkdown(quoteLines.join("\n"))));
                }
                continue;
            }

            const ordered = /^\d+[.)]\s+/.test(s);
            const unordered = /^[-*+]\s+/.test(s);
            if (ordered || unordered) {
                const result = renderList(i, ordered);
                blocks.push(result.html);
                i = Math.max(i + 1, result.next);
                continue;
            }

            if (s.includes("|") && i + 1 < lines.length && /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[i + 1].trim())) {
                const headers = splitTableRow(s);
                const alignments = splitTableRow(lines[i + 1]).map(cell => cell.startsWith(":") && cell.endsWith(":") ? "center" : cell.endsWith(":") ? "right" : cell.startsWith(":") ? "left" : "");
                let table = "<table><thead><tr>";
                headers.forEach((cell, index) => {
                    table += "<th" + (alignments[index] ? ' style="text-align:' + alignments[index] + '"' : "") + ">" + renderInline(cell) + "</th>";
                });
                table += "</tr></thead><tbody>";
                i += 2;
                while (i < lines.length && lines[i].trim() && lines[i].includes("|")) {
                    const cells = splitTableRow(lines[i++]);
                    table += "<tr>";
                    headers.forEach((_, index) => {
                        table += "<td" + (alignments[index] ? ' style="text-align:' + alignments[index] + '"' : "") + ">" + renderInline(cells[index] || "") + "</td>";
                    });
                    table += "</tr>";
                }
                table += "</tbody></table>";
                blocks.push(table);
                continue;
            }

            const paragraph = [s.replace(/\\\s*$/, "")];
            i++;
            while (i < lines.length && lines[i].trim() && !startsBlock(lines[i])) {
                paragraph.push(lines[i].trim().replace(/\\\s*$/, ""));
                i++;
            }
            blocks.push(tag("p", paragraph.map(renderInline).join(" ")));
        }
        return blocks.join("\n");
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
                // Всегда читаем исходный Markdown из GitHub: статическая копия в деплое
                // может отставать, потому что Obsidian Vault исключён из deploy workflow.
                const rawUrl = "https://raw.githubusercontent.com/Sup4ezz/Friend-s-RPG/main/" + encodePath("Obsidian Vault/Obsidian Vault/" + file);
                const response = await fetch(rawUrl, { cache: "no-store" });
                if (!response.ok) throw new Error("Не удалось загрузить файл из GitHub: HTTP " + response.status);
                const markdown = await response.text();
                if (/^\s*<\s*!doctype\s+html|^\s*<html[\s>]/i.test(markdown.slice(0, 500))) {
                    throw new Error("Вместо Markdown получен HTML");
                }
                doc.innerHTML = '<div class="lorgus-lore-document-head"><span>ЛОРГУС · ЛЕТОПИСЬ</span><h2>' + esc(button.querySelector(".lorgus-lore-node-label")?.textContent || "Запись") + '</h2><small>' + esc(file.replace(/\.md$/i, "").replaceAll("/", " / ")) + '</small></div><div class="lorgus-lore-document-body">' + renderMarkdown(markdown.replace(new RegExp(String.fromCharCode(96).repeat(3) + "moc[\\s\\S]*?" + String.fromCharCode(96).repeat(3), "gi"), "")) + '</div>';
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
