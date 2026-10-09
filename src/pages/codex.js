/* LORGUS public world codex */
(() => {
    const PREFIX = "https://raw.githubusercontent.com/Sup4ezz/Friend-s-RPG/main/";
    const VAULT = "Obsidian Vault/Obsidian Vault/Публичный Лор/";
    const topics = [
        { title: "Справочник мира", file: "00 — Справочник мира.md", summary: "Пять королевств и нейтральные земли." },
        { title: "Боевая система и школы меча", file: "01 — Боевая система и школы меча.md", summary: "Правила боя и шесть школ." },
        { title: "Магия и магические школы", file: "02 — Магия и магические школы.md", summary: "Направления магии и академии." },
        { title: "Церкви и духовные ордена", file: "03 — Церкви и духовные ордена.md", summary: "Духовная власть и ордена." },
        { title: "Армии и военная служба", file: "04 — Армии и военная служба.md", summary: "Звания и военные традиции." },
        { title: "Графства и владения", file: "05 — Графства и владения.md", summary: "Земли и местное управление." },
        { title: "Известные люди Лоргуса", file: "06 — Известные люди Лоргуса.md", summary: "Учёные, мастера, маги и военные." }
    ];
    const esc = value => window.escapeHtml ? window.escapeHtml(String(value ?? "")) : String(value ?? "").replace(/[&<>"]/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[ch]));
    const encodePath = value => value.split("/").map(encodeURIComponent).join("/");
    const slug = value => String(value || "").trim().toLocaleLowerCase("ru").replace(/\[[^\]]*\]/g, "").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
    function inline(value) {
        return esc(value)
            .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '<a class="lorgus-codex-wikilink" href="#" data-codex-target="$1">$2</a>')
            .replace(/\[\[([^\]]+)\]\]/g, '<a class="lorgus-codex-wikilink" href="#" data-codex-target="$1">$1</a>')
            .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
            .replace(/\*(.+?)\*/g, "<em>$1</em>")
            .replace(/\x60([^\x60]+)\x60/g, "<code>$1</code>");
    }

    function markdown(source) {
        const lines = String(source || "").replace(/\r/g, "").split("\n");
        const out = [];
        let paragraph = [], list = [];
        const flushP = () => { if (paragraph.length) out.push("<p>" + paragraph.map(inline).join(" ") + "</p>"); paragraph = []; };
        const flushL = () => { if (list.length) out.push("<ul>" + list.map(item => "<li>" + inline(item) + "</li>").join("") + "</ul>"); list = []; };
        for (const line of lines) {
            const t = line.trim();
            if (!t) { flushP(); flushL(); continue; }
            const heading = t.match(/^(#{1,4})\s+(.+)$/);
            if (heading) { flushP(); flushL(); const level = Math.min(heading[1].length + 1, 5); const id = slug(heading[2]); out.push('<h' + level + ' id="' + id + '">' + inline(heading[2]) + "</h" + level + ">"); continue; }
            if (/^---+$/.test(t)) { flushP(); flushL(); out.push("<hr>"); continue; }
            if (/^>\s?/.test(t)) { flushP(); flushL(); out.push("<blockquote>" + inline(t.replace(/^>\s?/, "")) + "</blockquote>"); continue; }
            if (/^[-*+]\s+/.test(t)) { flushP(); list.push(t.replace(/^[-*+]\s+/, "")); continue; }
            flushL(); paragraph.push(t);
        }
        flushP(); flushL();
        return out.join("");
    }
    async function render(topicIndex = 0) {
        const container = document.getElementById("cabinet-content");
        if (!container) return;
        container.className = "lorgus-codex-page";
        container.innerHTML = '<header class="lorgus-codex-header"><span>ЛОРГУС · ОТКРЫТАЯ ЛЕТОПИСЬ</span><h1>Справочник мира</h1><p>Знания, доступные путешественникам и жителям пяти королевств.</p></header><div class="lorgus-codex-layout"><nav class="lorgus-codex-nav" aria-label="Разделы справочника">' +
            topics.map((topic, i) => '<button type="button" class="lorgus-codex-topic' + (i === topicIndex ? ' active' : '') + '" data-topic="' + i + '"><strong>' + esc(topic.title) + '</strong><small>' + esc(topic.summary) + '</small></button>').join("") +
            '</nav><article class="lorgus-codex-article"><div class="lorgus-codex-loading">Открываем летопись…</div></article></div><button class="lorgus-codex-back" type="button" onclick="window.lorgusNavigate ? window.lorgusNavigate(\\'/world\\') : window.renderLorgusWorldMapCurrent?.()">← Вернуться к миру</button>';
        const article = container.querySelector(".lorgus-codex-article");
        const loadTopic = async index => {
            const topic = topics[index];
            if (!topic) return;
            container.querySelectorAll(".lorgus-codex-topic").forEach(button => button.classList.toggle("active", Number(button.dataset.topic) === index));
            article.innerHTML = '<div class="lorgus-codex-loading">Открываем летопись…</div>';
            try {
                const response = await fetch(PREFIX + encodePath(VAULT + topic.file), { cache: "no-cache" });
                if (!response.ok) throw new Error("HTTP " + response.status);
                const source = await response.text();
                if (/^\s*<!doctype html/i.test(source)) throw new Error("Получен HTML вместо текста летописи");
                article.innerHTML = markdown(source);
                article.querySelectorAll("[data-codex-target]").forEach(link => {
                    link.addEventListener("click", event => {
                        event.preventDefault();
                        const target = String(link.dataset.codexTarget || "").trim();
                        const parts = target.split("#");
                        const targetSlug = slug(parts[0]);
                        const anchorSlug = slug(parts[1] || "");
                        const anchor = anchorSlug
                            ? article.querySelector("#" + CSS.escape(anchorSlug))
                            : article.querySelector("#" + CSS.escape(targetSlug));
                        if (anchor) {
                            anchor.scrollIntoView({ behavior: "smooth", block: "start" });
                            return;
                        }
                        const topicIndex = topics.findIndex(item => {
                            const title = slug(item.title);
                            const file = slug(item.file.replace(/\.md$/i, ""));
                            return title === targetSlug || file === targetSlug;
                        });
                        if (topicIndex >= 0) void loadTopic(topicIndex);
                    });
                });
                article.scrollTop = 0;
            } catch (error) {
                console.error("Не удалось загрузить справочник:", error);
                article.innerHTML = '<div class="lorgus-codex-error"><h2>Летопись недоступна</h2><p>Не удалось загрузить раздел. Попробуй ещё раз позже.</p></div>';
            }
        };
        container.querySelectorAll(".lorgus-codex-topic").forEach(button => button.addEventListener("click", () => loadTopic(Number(button.dataset.topic))));
        await loadTopic(topicIndex);
    }
    window.renderLorgusCodex = render;
    window.LORGUS_PAGES = window.LORGUS_PAGES || {};
    window.LORGUS_PAGES.codex = { render: () => render(0) };
})();