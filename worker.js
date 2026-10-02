export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (url.pathname === "/api/config") {
            return new Response(
                JSON.stringify({
                    supabaseUrl: "https://dxdxnttpznoekaiecrlv.supabase.co",
                    supabasePublishableKey: "sb_publishable_LlRg71tECimoRn2zuzxqlQ_OeCupPLe"
                }),
                {
                    headers: {
                        "Content-Type": "application/json",
                        "Cache-Control": "no-store"
                    }
                }
            );
        }

        const response = await env.ASSETS.fetch(request);

        if (
            url.pathname === "/" ||
            url.pathname === "/index.html" ||
            url.pathname === "/app.js" ||
            url.pathname === "/style.css"
        ) {
            const headers = new Headers(response.headers);

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

            return new Response(
                response.body,
                {
                    status: response.status,
                    statusText: response.statusText,
                    headers
                }
            );
        }

        return response;
    }
};
```
