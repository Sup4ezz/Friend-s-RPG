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

    renderApp();
}

function renderApp() {
    document.getElementById("root").innerHTML = `
        <h1>Friends RPG</h1>
        <p>Supabase подключён.</p>
    `;
}

loadSupabase().catch(error => {
    console.error(error);

    document.getElementById("root").innerHTML = `
        <h1>Ошибка подключения</h1>
        <p>${error.message}</p>
    `;
});
