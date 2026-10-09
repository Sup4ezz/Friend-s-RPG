window.LORGUS_PAGES = window.LORGUS_PAGES || {};
window.LORGUS_PAGES.world = {
    render() {
        window.renderLorgusWorldMapCurrent?.();
        const sidebar = document.querySelector(".lorgus-map-sidebar");
        if (!sidebar || sidebar.querySelector("[data-lorgus-codex-link]")) return;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "character-secondary-button lorgus-map-side-button";
        button.dataset.lorgusCodexLink = "1";
        button.textContent = "Справочник мира";
        button.addEventListener("click", () => window.lorgusNavigate?.("/codex"));
        const reference = sidebar.querySelector('button[onclick*="renderWorldCharacterTracker"]');
        if (reference?.nextSibling) sidebar.insertBefore(button, reference.nextSibling);
        else sidebar.appendChild(button);
    }
};
