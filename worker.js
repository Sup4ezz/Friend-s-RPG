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

        return env.ASSETS.fetch(request);
    }
};
