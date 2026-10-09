/* Public LORGUS codex. Markdown is rendered with DOM nodes; source text is never injected as HTML. */
(() => {
    const PREFIX = "https://raw.githubusercontent.com/Sup4ezz/Friend-s-RPG/main/";
    const VAULT = "Obsidian Vault/Obsidian Vault/Публичный Лор/";
    const topics = [
        ["Справочник мира", "00 — Справочник мира.md", "Пять королевств и нейтральные земли."],
        ["Боевая система и школы меча", "01 — Боевая система и школы меча.md", "Правила боя и шесть школ."],
        ["Магия и магические школы", "02 — Магия и магические школы.md", "Направления магии и академии."],
        ["Церкви и духовные ордена", "03 — Церкви и духовные ордена.md", "Духовная власть и ордена."],
        ["Армии и военная служба", "04 — Армии и военная служба.md", "Звания и военные традиции."],
        ["Графства и владения", "05 — Графства и владения.md", "Земли и местное управление."],
        ["Известные люди Лоргуса", "06 — Известные люди Лоргуса.md", "Учёные, мастера, маги и военные."]
    ];
    const encodePath = value => value.split("/").map(encodeURIComponent).join("/");
    const make = (tag, cls, text) => {
        const node = document.createElement(tag);
        if (cls) node.className = cls;
        if (text !== undefined) node.textContent = text;
        return node;
    };
    function addInline(parent, raw) {
        const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|\x60[^\x60]+\x60|\[\[[^\]]+\]\])/g;
        let cursor = 0, match;
        const value = String(raw || "");
        while ((match = pattern.exec(value))) {
            if (match.index > cursor) parent.appendChild(document.createTextNode(value.slice(cursor, match.index)));
            const token = match[0];
            if (token.startsWith("**")) parent.appendChild(make("strong", "", token.slice(2, -2)));
            else if (token.startsWith("*")) parent.appendChild(make("em", "", token.slice(1, -1)));
            else if (token.startsWith("\x60")) parent.appendChild(make("code", "", token.slice(1, -1)));
            else {
                const inner = token.slice(2, -2);
                const label = inner.includes("|") ? inner.split("|").slice(-1)[0] : inner;
                parent.appendChild(document.createTextNode(label));
            }
            cursor = match.index + token.length;
        }
        if (cursor < value.length) parent.appendChild(document.createTextNode(value.slice(cursor)));
    }
    function renderMarkdown(parent, source) {
        parent.replaceChildren();
        const lines = String(source || "").replace(/\r/g, "").split("\n");
        let paragraph = [], list = null;
        const flushParagraph = () => {
            if (!paragraph.length) return;
            const p = make("p");
            addInline(p, paragraph.join(" "));
            parent.appendChild(p);
            paragraph = [];
        };
        const flushList = () => {
            if (!list) return;
            parent.appendChild(list);
            list = null;
        };
        for (const line of lines) {
            const value = line.trim();
            if (!value) { flushParagraph(); flushList(); continue; }
            const heading = value.match(/^(#{1,4})\s+(.+)$/);
            if (heading) {
                flushParagraph(); flushList();
                const level = Math.min(heading[1].length + 1, 5);
                const h = make("h" + level);
                addInline(h, heading[2]);
                parent.appendChild(h);
                continue;
            }
            if (/^---+$/.test(value)) {
                flushParagraph(); flushList(); parent.appendChild(document.createElement("hr")); continue;
            }
            if (/^>\s?/.test(value)) {
                flushParagraph(); flushList();
                const quote = make("blockquote");
                addInline(quote, value.replace(/^>\s?/, ""));
                parent.appendChild(quote);
                continue;
            }
            if (/^[-*+]\s+/.test(value)) {
                flushParagraph();
                if (!list) list = document.createElement("ul");
                const li = document.createElement("li");
                addInline(li, value.replace(/^[-*+]\s+/, ""));
                list.appendChild(li);
                continue;
            }
            flushList();
            paragraph.push(value);
        }
        flushParagraph();
        flushList();
    }
    async function render() {
        const container = document.getElementById("cabinet-content");
        if (!container) return;
        container.className = "lorgus-codex-page";
        container.replaceChildren();
        const header = make("header", "lorgus-codex-header");
        header.append(make("span", "", "ЛОРГУС · ОТКРЫТАЯ ЛЕТОПИСЬ"));
        header.append(make("h1", "", "Справочник мира"));
        header.append(make("p", "", "Знания, доступные путешественникам и жителям пяти королевств."));
        container.appendChild(header);

        const layout = make("div", "lorgus-codex-layout");
        const nav = make("nav", "lorgus-codex-nav");
        nav.setAttribute("aria-label", "Разделы справочника");
        const article = make("article", "lorgus-codex-article");
        layout.append(nav, article);
        container.appendChild(layout);

        const back = make("button", "lorgus-codex-back", "← Вернуться к миру");
        back.type = "button";
        back.addEventListener("click", () => window.lorgusNavigate?.("/world"));
        container.appendChild(back);

        const buttons = topics.map((topic, index) => {
            const button = make("button", "lorgus-codex-topic");
            button.type = "button";
            button.dataset.topic = String(index);
            button.append(make("strong", "", topic[0]), make("small", "", topic[2]));
            button.addEventListener("click", () => loadTopic(index));
            nav.appendChild(button);
            return button;
        });

        async function loadTopic(index) {
            const topic = topics[index];
            buttons.forEach((button, i) => button.classList.toggle("active", i === index));
            article.replaceChildren(make("div", "lorgus-codex-loading", "Открываем летопись…"));
            try {
                const response = await fetch(PREFIX + encodePath(VAULT + topic[1]), { cache: "no-cache" });
                if (!response.ok) throw new Error("HTTP " + response.status);
                const source = await response.text();
                if (/^\s*<!doctype html/i.test(source)) throw new Error("Получен HTML вместо текста");
                renderMarkdown(article, source);
                article.scrollTop = 0;
            } catch (error) {
                console.error("Не удалось загрузить справочник:", error);
                article.replaceChildren();
                article.append(make("h2", "", "Летопись недоступна"));
                article.append(make("p", "", "Не удалось загрузить раздел. Попробуй ещё раз позже."));
            }
        }
        await loadTopic(0);
    }
    window.renderLorgusCodex = render;
    window.LORGUS_PAGES = window.LORGUS_PAGES || {};
    window.LORGUS_PAGES.codex = { render };
})();