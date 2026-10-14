/* Public player-facing lore entries created in the admin lore editor. */
(() => {
  const db = () => window.supabaseClient;
  const publicUrl = path => path ? db()?.storage.from("lorgus-lore-images").getPublicUrl(path).data?.publicUrl || "" : "";
  const imageByTitle = new Map();
  let loading = null;

  async function loadCustomLore() {
    if (loading) return loading;
    loading = (async () => {
      const client = db();
      if (!client) return;
      const result = await client.from("lorgus_lore_custom_entries")
        .select("id,parent_id,kind,title,subtitle,body,image_path,is_published,sort_order")
        .eq("is_published", true).order("sort_order").order("title");
      if (result.error) { console.warn("LORGUS custom lore unavailable:", result.error.message); return; }
      const rows = result.data || [];
      const byId = new Map(rows.map(row => [row.id, row]));
      const kids = new Map();
      rows.forEach(row => { const key = row.parent_id || ""; if (!kids.has(key)) kids.set(key, []); kids.get(key).push(row); });
      const toEntry = row => {
        const childRows = kids.get(row.id) || [];
        const entry = [row.title, row.kind === "tree" ? "Древо Лоргуса" : "Сущность", row.subtitle || "", row.body || "", "", childRows.map(toEntry)];
        const url = publicUrl(row.image_path);
        if (url) imageByTitle.set(row.title, url);
        return entry;
      };
      const sections = window.LORGUS_CODEX_SECTIONS || [];
      for (let i = sections.length - 1; i >= 0; i--) if (String(sections[i].id || "").startsWith("custom-lore-")) sections.splice(i, 1);
      const roots = rows.filter(row => row.kind === "tree" && !row.parent_id);
      roots.forEach(root => {
        const children = kids.get(root.id) || [];
        const section = {
          id: "custom-lore-" + root.id,
          title: root.title,
          icon: "✧",
          desc: root.subtitle || "Дополнительные знания мира Лоргуса",
          entries: children.length ? children.map(toEntry) : [toEntry(root)]
        };
        if (root.image_path) imageByTitle.set(root.title, publicUrl(root.image_path));
        if (!sections.some(existing => existing.id === section.id)) sections.push(section);
      });
      window.LORGUS_CODEX_SECTIONS = sections;
    })().finally(() => { loading = null; });
    return loading;
  }

  function installImageObserver() {
    const root = document.getElementById("cabinet-content");
    if (!root || root.dataset.customLoreImages === "1") return;
    root.dataset.customLoreImages = "1";
    const paint = () => {
      root.querySelectorAll(".codex-cosmos-detail").forEach(panel => {
        const body = panel.querySelector(".codex-detail-body");
        const heading = body?.querySelector("h2");
        const title = heading?.textContent?.trim();
        const url = title && imageByTitle.get(title);
        if (!body || !url) return;
        let img = body.querySelector(":scope > .codex-detail-illustration");
        if (img && img.dataset.source === url) return;
        if (!img) { img = document.createElement("img"); img.className = "codex-detail-illustration"; img.alt = "Иллюстрация: " + title; }
        img.dataset.source = url; img.src = url;
        const rule = body.querySelector(".codex-detail-rule");
        if (rule) body.insertBefore(img, rule); else body.insertBefore(img, body.firstChild);
      });
    };
    new MutationObserver(paint).observe(root, { childList: true, subtree: true });
    paint();
  }

  const original = window.renderLorgusCodex;
  if (typeof original === "function") {
    window.renderLorgusCodex = async function(startId) {
      await loadCustomLore();
      installImageObserver();
      return original(startId);
    };
    window.LORGUS_PAGES = window.LORGUS_PAGES || {};
    window.LORGUS_PAGES.codex = { render: () => window.renderLorgusCodex("atlas") };
  }
})();
