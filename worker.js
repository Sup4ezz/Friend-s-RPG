// LORGUS deployment marker: 2026-10-05 asset binding fix
export default {
    async fetch(request, env) {
        const url = new URL(request.url);


        /*
            API CONFIG
            Клиент получает только публичные данные Supabase.
            Секреты здесь не используются.
        */
        if (url.pathname === "/api/config") {

            return new Response(
                JSON.stringify({
                    supabaseUrl: env.SUPABASE_URL,
                    supabasePublishableKey: env.SUPABASE_KEY
                }),
                {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json; charset=UTF-8",
                        "Cache-Control": "no-store",
                        "X-Content-Type-Options": "nosniff"
                    }
                }
            );
        }


        /*
            STATIC FILES
        */
        const response = await env.ASSETS.fetch(new Request(request, {\n            headers: new Headers(request.headers)\n        }));

        const headers = new Headers(response.headers);


        /*
            Не кешируем основу приложения.
            Чтобы после обновления JS/CSS
            пользователь всегда получал новую версию.
        */
        if (
            url.pathname === "/" ||
            url.pathname.endsWith(".html") ||
            url.pathname.endsWith(".js") ||
            url.pathname.endsWith(".css")
        ) {

            headers.set(
                "Cache-Control",
                "no-cache, no-store, must-revalidate"
            );

            headers.set(
                "Pragma",
                "no-cache"
            );

            headers.set(
                "Expires",
                "0"
            );
        }


        /*
            Защитные заголовки
        */

        headers.set(
            "X-Content-Type-Options",
            "nosniff"
        );

        headers.set(
            "X-Frame-Options",
            "DENY"
        );

        headers.set(
            "Referrer-Policy",
            "strict-origin-when-cross-origin"
        );


        return new Response(
            response.body,
            {
                status: response.status,
                statusText: response.statusText,
                headers
            }
        );
    }
};
