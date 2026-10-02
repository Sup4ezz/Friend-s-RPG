export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (url.pathname === "/api/config") {
            return new Response(
                JSON.stringify({
                    supabaseUrl: env.SUPABASE_URL,
                    supabasePublishableKey: env.SUPABASE_PUBLISHABLE_KEY
                }),
                {
                    headers: {
                        "Content-Type": "application/json",
                        "Cache-Control": "no-store"
                    }
                }
            );
        }

        return env.ASSETS.fetch(request);
    }
};
