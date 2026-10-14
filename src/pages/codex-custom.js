/* Public player-facing lore entries created in the admin lore editor. */
(() => {
  const db = () => window.supabaseClient;
  const publicUrl = path => path ? db()?.storage.from("lorgus-lore-images").getPublicUrl(path).data?.publicUrl || "" : "";
  const imageByTitle = new Map();
  const normalizeTitle = value => String(value || "").toLocaleLowerCase("ru-RU").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/\\.md$/i, "").replace(/[^\\p{L}\\p{N}]+/gu, " ").trim();
  const rememberImage = (title, url) => {
    if (!title || !url) return;
    const key = normalizeTitle(title);
    if (key) imageByTitle.set(key, url);
    const stripped = key.replace(/^(король|королева|профессор|архивариус|доктор|мастер|наставник|дом|граф|графиня|князь|княгиня)\\s+/, "");
    if (stripped && stripped !== key) imageByTitle.set(stripped, url);
  };
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
      imageByTitle.clear();
      const mediaResult = await client.from("lorgus_lore_media").select("note_path,image_path");
      if (!mediaResult.error) (mediaResult.data || []).forEach(media => {
        const url = publicUrl(media.image_path);
        const basename = String(media.note_path || "").split("/").pop().replace(/\\.md$/i, "");
        rememberImage(basename, url);
        const parts = String(media.note_path || "").split("/").filter(Boolean);
        if (parts.length > 1) rememberImage(parts[parts.length - 2] + " " + basename, url);
      });
      const kids = new Map();
      rows.forEach(row => { const key = row.parent_id || ""; if (!kids.has(key)) kids.set(key, []); kids.get(key).push(row); });
      const toEntry = row => {
        const childRows = kids.get(row.id) || [];
        const entry = [row.title, row.kind === "tree" ? "Древо Лоргуса" : "Сущность", row.subtitle || "", row.body || "", "", childRows.map(toEntry)];
        const url = publicUrl(row.image_path);
        if (url) rememberImage(row.title, url);
        entry.push(url || "");
        return entry;
      };
      const sections = window.LORGUS_CODEX_SECTIONS || [];
      for (let i = sections.length - 1; i >= 0; i--) if (String(sections[i].id || "").startsWith("custom-lore-")) sections.splice(i, 1);
      const roots = rows.filter(row => row.kind === "tree" && !row.parent_id);
      roots.forEach(root => {
        const children = kids.get(root.id) || [];
        const entries = children.map(toEntry);
        if (children.length && (root.body || root.image_path)) {
          const intro = [root.title, "Описание древа", root.subtitle || "", root.body || "", "", [], publicUrl(root.image_path)];
          if (root.image_path) rememberImage(root.title, publicUrl(root.image_path));
          entries.unshift(intro);
        }
        const section = {
          id: "custom-lore-" + root.id,
          title: root.title,
          icon: "✧",
          desc: root.subtitle || "Дополнительные знания мира Лоргуса",
          entries: entries.length ? entries : [toEntry(root)]
        };
        if (root.image_path) rememberImage(root.title, publicUrl(root.image_path));
        if (!sections.some(existing => existing.id === section.id)) sections.push(section);
      });
      window.LORGUS_CODEX_IMAGE_BY_TITLE = imageByTitle;
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
        const key = normalizeTitle(title);
        const url = (title && (imageByTitle.get(key) || imageByTitle.get(key.replace(/^(король|королева|профессор|архивариус|доктор|мастер|наставник|дом|граф|графиня|князь|княгиня)\\s+/, "")))) || "";
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
