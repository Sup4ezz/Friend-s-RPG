async function loadSupabase() {
    const response = await fetch("/api/config");

    if (!response.ok) {
        throw new Error("Не удалось получить конфигурацию Supabase");
    }

    const config = await response.json();

    if (!config.supabaseUrl || !config.supabasePublishableKey) {
        throw new Error("Cloudflare не вернул данные Supabase");
    }

    if (!window.supabase) {
        throw new Error("Библиотека Supabase не загрузилась");
    }

    window.supabaseClient = window.supabase.createClient(
        config.supabaseUrl,
        config.supabasePublishableKey
    );

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
