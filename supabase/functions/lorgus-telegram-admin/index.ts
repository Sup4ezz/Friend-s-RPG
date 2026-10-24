import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};
Deno.serve((req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  return new Response(JSON.stringify({
    error: "Этот endpoint не используется. РП-чаты LORGUS загружаются напрямую из игровых данных в админской Mini App."
  }), { status: 410, headers });
});