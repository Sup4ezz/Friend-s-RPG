async function loadSupabase() {
    const response = await fetch("/api/config");

    if (!response.ok) {
        throw new Error("Не удалось получить конфигурацию Supabase");
    }

    const config = await response.json();

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.onload = () => {
        window.supabaseClient = window.supabase.createClient(
            config.supabaseUrl,
            config.supabasePublishableKey
        );

        renderApp();
    };

    script.onerror = () => {
        document.getElementById("root").innerHTML = `
            <h1>Ошибка</h1>
            <p>Не удалось загрузить Supabase.</p>
        `;
    };

    document.head.appendChild(script);
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
