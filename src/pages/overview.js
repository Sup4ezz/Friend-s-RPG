window.LORGUS_PAGES = window.LORGUS_PAGES || {};
window.LORGUS_PAGES.overview = {
    render() {
        window.renderLorgusOverview?.();
        const grid = document.querySelector(".lorgus-command-grid");
        if (!grid || grid.querySelector("[data-lorgus-codex-card]")) return;
        const card = document.createElement("article");
        card.className = "lorgus-command-card";
        card.dataset.lorgusCodexCard = "1";
        const label = document.createElement("span");
        label.textContent = "ЗНАНИЯ МИРА";
        const title = document.createElement("strong");
        title.textContent = "Справочник Лоргуса";
        const description = document.createElement("small");
        description.textContent = "Школы меча и магии, церкви, армии, графства и известные жители.";
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "Открыть справочник →";
        button.addEventListener("click", () => window.lorgusNavigate?.("/codex"));
        card.append(label, title, description, button);
        grid.appendChild(card);
    }
};
