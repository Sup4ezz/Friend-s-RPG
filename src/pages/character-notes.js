/* Private, character-specific notes for the signed-in player. */
window.renderLorgusPlayerNotes = async function (characterId) {
    const panel = document.querySelector(".lorgus-notes-panel");
    const list = panel?.querySelector(".lorgus-notes-list");
    const feedback = panel?.querySelector(".lorgus-notes-feedback");
    const addButton = panel?.querySelector("[data-notes-add]");
    const db = window.supabaseClient;
    if (!panel || !list || !db || !characterId) return;

    const esc = window.escapeHtml || (value => String(value ?? ""));
    const setFeedback = (message, kind = "") => {
        if (!feedback) return;
        feedback.textContent = message;
        feedback.dataset.kind = kind;
    };

    let user;
    try {
        const auth = await db.auth.getUser();
        user = auth.data?.user;
        if (auth.error || !user) throw auth.error || new Error("Необходимо войти в аккаунт.");
    } catch (error) {
        list.innerHTML = '<p class="lorgus-notes-empty">Не удалось определить игрока. Обнови страницу и войди снова.</p>';
        return;
    }

    const load = async () => {
        list.innerHTML = '<div class="lorgus-ability-empty">Загрузка заметок…</div>';
        const { data, error } = await db.from("character_notes")
            .select("id,title,content,created_at,updated_at")
            .eq("character_id", characterId)
            .eq("player_id", user.id)
            .order("updated_at", { ascending: false });
        if (error) {
            console.error("LORGUS notes load:", error);
            list.innerHTML = '<p class="lorgus-notes-empty">Архив пока недоступен. Попробуй обновить страницу.</p>';
            return;
        }
        if (!data?.length) {
            list.innerHTML = '<p class="lorgus-notes-empty">Здесь пока пусто. Создай первую заметку, чтобы не потерять важные детали.</p>';
            return;
        }
        list.innerHTML = data.map(note => `
            <article class="lorgus-note" data-note-id="${esc(note.id)}">
                <label class="lorgus-note-label">ЗАГОЛОВОК
                    <input class="lorgus-note-title" maxlength="120" value="${esc(note.title)}" aria-label="Заголовок заметки">
                </label>
                <label class="lorgus-note-label">ЗАПИСЬ
                    <textarea class="lorgus-note-content" maxlength="20000" rows="5" placeholder="Запиши сюда всё, что важно не забыть…">${esc(note.content)}</textarea>
                </label>
                <footer class="lorgus-note-footer">
                    <span class="lorgus-note-date">Обновлено: ${new Date(note.updated_at).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}</span>
                    <div><button type="button" class="lorgus-note-delete" data-note-delete>Удалить</button><button type="button" class="lorgus-note-save" data-note-save>Сохранить</button></div>
                </footer>
            </article>`).join("");
    };

    addButton?.addEventListener("click", async () => {
        addButton.disabled = true;
        setFeedback("");
        const { data, error } = await db.from("character_notes").insert({
            player_id: user.id,
            character_id: characterId,
            title: "Новая заметка",
            content: ""
        }).select("id").single();
        addButton.disabled = false;
        if (error) {
            console.error("LORGUS notes create:", error);
            setFeedback("Не удалось создать заметку. Попробуй ещё раз.", "error");
            return;
        }
        await load();
        const created = data?.id ? list.querySelector(`[data-note-id="${CSS.escape(data.id)}"] .lorgus-note-title`) : null;
        created?.focus();
        setFeedback("Заметка создана.", "success");
    });

    list.addEventListener("click", async event => {
        const card = event.target.closest(".lorgus-note");
        if (!card) return;
        const id = card.dataset.noteId;
        if (event.target.closest("[data-note-save]")) {
            const titleInput = card.querySelector(".lorgus-note-title");
            const contentInput = card.querySelector(".lorgus-note-content");
            const title = titleInput.value.trim();
            if (!title) {
                setFeedback("Добавь заголовок заметки.", "error");
                titleInput.focus();
                return;
            }
            const button = card.querySelector("[data-note-save]");
            button.disabled = true;
            button.textContent = "Сохраняем…";
            const { data, error } = await db.from("character_notes")
                .update({ title, content: contentInput.value, updated_at: new Date().toISOString() })
                .eq("id", id).eq("character_id", characterId).eq("player_id", user.id)
                .select("id").maybeSingle();
            button.disabled = false;
            button.textContent = "Сохранить";
            if (error || !data) {
                console.error("LORGUS notes save:", error);
                setFeedback("Не удалось сохранить заметку. Проверь соединение и попробуй ещё раз.", "error");
                return;
            }
            setFeedback("Заметка сохранена.", "success");
            await load();
        } else if (event.target.closest("[data-note-delete]")) {
            if (!window.confirm("Удалить эту заметку без возможности восстановления?")) return;
            const button = card.querySelector("[data-note-delete]");
            button.disabled = true;
            const { data, error } = await db.from("character_notes")
                .delete().eq("id", id).eq("character_id", characterId).eq("player_id", user.id)
                .select("id").maybeSingle();
            if (error || !data) {
                button.disabled = false;
                console.error("LORGUS notes delete:", error);
                setFeedback("Не удалось удалить заметку.", "error");
                return;
            }
            setFeedback("Заметка удалена.", "success");
            await load();
        }
    });

    await load();
};
