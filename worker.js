// LORGUS deployment marker: 2026-10-05 asset binding fix
export default {
    async fetch(request, env) {
        const url = new URL(request.url);


        // Proxy signed Storage images through the Worker when direct browser-to-Supabase
        // connections are reset. Only signed URLs for this project's image bucket are allowed.
        if (url.pathname === "/api/storage-proxy") {
            if (request.method !== "GET" && request.method !== "HEAD") {
                return new Response("Method not allowed", { status: 405, headers: { "Allow": "GET, HEAD" } });
            }
            let target;
            try {
                target = new URL(url.searchParams.get("url") || "");
            } catch (_) {
                return new Response("Invalid image URL", { status: 400 });
            }
            const supabaseOrigin = new URL(env.SUPABASE_URL).origin;
            if (
                target.origin !== supabaseOrigin ||
                !target.pathname.startsWith("/storage/v1/object/sign/character-applications/") ||
                !target.searchParams.has("token")
            ) {
                return new Response("Forbidden", { status: 403 });
            }
            const upstream = await fetch(target.toString(), {
                method: request.method,
                headers: request.headers.get("Range") ? { "Range": request.headers.get("Range") } : undefined,
                redirect: "error"
            });
            const responseHeaders = new Headers(upstream.headers);
            responseHeaders.set("X-Content-Type-Options", "nosniff");
            responseHeaders.set("Cache-Control", "private, max-age=60");
            responseHeaders.delete("set-cookie");
            return new Response(upstream.body, {
                status: upstream.status,
                statusText: upstream.statusText,
                headers: responseHeaders
            });
        }

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
        const response = await env.ASSETS.fetch(new Request(request, {
            headers: new Headers(request.headers)
        }));

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
                "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0"
            );
            headers.set("CDN-Cache-Control", "no-store");
            headers.set("Cloudflare-CDN-Cache-Control", "no-store");

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
