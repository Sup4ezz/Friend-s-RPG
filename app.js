import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

async function loadSupabase() {
    const response = await fetch("/api/config");

    if (!response.ok) {
        throw new Error("Не удалось получить конфигурацию Supabase");
    }

    const config = await response.json();

    if (!config.supabaseUrl || !config.supabasePublishableKey) {
        throw new Error("Cloudflare не вернул данные Supabase");
    }

    const supabase = createClient(
        config.supabaseUrl,
        config.supabasePublishableKey
    );

    window.supabaseClient = supabase;

    await testSupabase(supabase);
}

async function testSupabase(supabase) {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
        throw error;
    }

    console.log("Supabase Auth работает:", data);

    renderApp(data.session);
}

function renderApp(session) {
    document.getElementById("root").innerHTML = `
        <h1>Friends RPG</h1>
        <p>Supabase подключён.</p>
        <p>Auth работает.</p>
        <p>
            Сессия:
            ${session ? "есть" : "нет"}
        </p>
    `;
}

loadSupabase().catch(error => {
    console.error("Ошибка:", error);

    document.getElementById("root").innerHTML = `
        <h1>Ошибка</h1>
        <p>${error.message}</p>
    `;
});
