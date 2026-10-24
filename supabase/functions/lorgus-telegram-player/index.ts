import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const DEFAULTS = {
  application_status: true,
  items: true,
  currency: true,
  rp_replies: true,
  mentions: true,
  updates: true,
  system: true,
  rp_posts: false,
};
const ALLOWED_ORIGINS = new Set([
  "https://friend-s-rpg.staskarr23.workers.dev",
  "https://friend-s-rpg.layero.app",
]);

function responseJson(data: unknown, status = 200, origin = "") {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "vary": "Origin",
  });
  if (ALLOWED_ORIGINS.has(origin)) {
    headers.set("access-control-allow-origin", origin);
    headers.set("access-control-allow-headers", "authorization, apikey, content-type");
    headers.set("access-control-allow-methods", "POST, OPTIONS");
  }
  return new Response(JSON.stringify(data), { status, headers });
}
function safeText(value: unknown, max = 100) {
  return String(value ?? "").replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max);
}
function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function constantTimeEqual(a: string, b: string) {
  if (!a || a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}
async function verifyTelegramInitData(initData: string, botToken: string) {
  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash") || "";
  const authDate = Number(params.get("auth_date") || 0);
  if (!receivedHash || !Number.isFinite(authDate) || authDate <= 0) throw new Error("TELEGRAM_INIT_DATA_INVALID");
  const now = Date.now() / 1000;
  if (now - authDate > 24 * 60 * 60 || authDate - now > 60) throw new Error("TELEGRAM_INIT_DATA_EXPIRED");
  params.delete("hash");
  params.delete("signature");
  const dataCheckString = [...params.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => key + "=" + value).join("\n");
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey("raw", encoder.encode("WebAppData"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const secret = await crypto.subtle.sign("HMAC", baseKey, encoder.encode(botToken));
  const signingKey = await crypto.subtle.importKey("raw", secret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const calculated = hex(await crypto.subtle.sign("HMAC", signingKey, encoder.encode(dataCheckString)));
  if (!constantTimeEqual(calculated, receivedHash.toLowerCase())) throw new Error("TELEGRAM_INIT_DATA_INVALID");
  const userRaw = params.get("user");
  if (!userRaw) throw new Error("TELEGRAM_USER_MISSING");
  const user = JSON.parse(userRaw);
  if (!user?.id || !Number.isSafeInteger(Number(user.id))) throw new Error("TELEGRAM_USER_INVALID");
  return { id: String(user.id), username: safeText(user.username || "", 64) || null, firstName: safeText(user.first_name || "", 100) };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "";
  if (req.method === "OPTIONS") { const headers = new Headers({ "cache-control": "no-store", "vary": "Origin" }); if (ALLOWED_ORIGINS.has(origin)) { headers.set("access-control-allow-origin", origin); headers.set("access-control-allow-headers", "authorization, apikey, content-type"); headers.set("access-control-allow-methods", "POST, OPTIONS"); } return new Response(null, { status: 204, headers }); }
  if (req.method !== "POST") return responseJson({ error: "METHOD_NOT_ALLOWED" }, 405, origin);

  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!botToken || !supabaseUrl || !serviceKey) return responseJson({ error: "SERVER_NOT_CONFIGURED" }, 503, origin);

  let body: any;
  try { body = await req.json(); } catch { return responseJson({ error: "INVALID_JSON" }, 400, origin); }
  const initData = typeof body?.initData === "string" ? body.initData : "";
  if (!initData) return responseJson({ error: "OPEN_FROM_TELEGRAM" }, 400, origin);

  const authHeader = req.headers.get("authorization") || "";
  const jwt = authHeader.match(/^Bearer\s+(.+)$/i)?.[1] || "";
  if (!jwt) return responseJson({ error: "LORGUS_LOGIN_REQUIRED" }, 401, origin);

  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await db.auth.getUser(jwt);
  if (authError || !authData?.user?.id) return responseJson({ error: "LORGUS_SESSION_INVALID" }, 401, origin);

  let telegram;
  try { telegram = await verifyTelegramInitData(initData, botToken); }
  catch (error) {
    const code = safeText((error as Error)?.message || "", 80);
    return responseJson({ error: code || "TELEGRAM_VERIFICATION_FAILED" }, 401, origin);
  }

  const userId = authData.user.id;
  const action = safeText(body?.action || "status", 24);
  const { data: existing, error: lookupError } = await db.from("lorgus_telegram_player_links")
    .select("user_id,telegram_user_id,telegram_username,preferences,linked_at")
    .eq("user_id", userId).maybeSingle();
  if (lookupError) return responseJson({ error: "LINK_LOOKUP_FAILED" }, 500, origin);

  if (action === "status") {
    return responseJson({
      linked: !!existing && String(existing.telegram_user_id) === telegram.id,
      linkedToAnotherTelegram: !!existing && String(existing.telegram_user_id) !== telegram.id,
      preferences: { ...DEFAULTS, ...(existing?.preferences || {}) },
      telegram: { username: telegram.username, firstName: telegram.firstName },
    }, 200, origin);
  }

  if (action === "link") {
    if (existing && String(existing.telegram_user_id) !== telegram.id) {
      return responseJson({ error: "ACCOUNT_ALREADY_LINKED_ELSEWHERE" }, 409, origin);
    }
    const { data: other, error: otherError } = await db.from("lorgus_telegram_player_links")
      .select("user_id").eq("telegram_user_id", telegram.id).maybeSingle();
    if (otherError) return responseJson({ error: "LINK_LOOKUP_FAILED" }, 500, origin);
    if (other && other.user_id !== userId) return responseJson({ error: "TELEGRAM_ALREADY_LINKED" }, 409, origin);
    const { error } = await db.from("lorgus_telegram_player_links").upsert({
      user_id: userId,
      telegram_user_id: telegram.id,
      telegram_username: telegram.username,
      preferences: { ...DEFAULTS, ...(existing?.preferences || {}) },
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (error) return responseJson({ error: "LINK_SAVE_FAILED" }, 500, origin);
    try {
      const text = "𓆩 <b>L O R G U S</b> 𓆪\n\n🕯️ <b>ВЕСТНИК ПРИВЯЗАН</b>\nТвой аккаунт LORGUS связан с этим Telegram. Настрой, какие вести получать, в мини-приложении.";
      await fetch("https://api.telegram.org/bot" + botToken + "/sendMessage", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: telegram.id, text, parse_mode: "HTML", disable_web_page_preview: true }),
      });
    } catch (_) {}
    return responseJson({ ok: true, linked: true, preferences: { ...DEFAULTS, ...(existing?.preferences || {}) } }, 200, origin);
  }

  if (!existing || String(existing.telegram_user_id) !== telegram.id) {
    return responseJson({ error: "TELEGRAM_NOT_LINKED" }, 403, origin);
  }

  if (action === "save") {
    const incoming = body?.preferences;
    if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) return responseJson({ error: "INVALID_PREFERENCES" }, 400, origin);
    const preferences: Record<string, boolean> = {};
    for (const key of Object.keys(DEFAULTS)) preferences[key] = typeof incoming[key] === "boolean" ? incoming[key] : DEFAULTS[key as keyof typeof DEFAULTS];
    const { error } = await db.from("lorgus_telegram_player_links").update({
      preferences, telegram_username: telegram.username, updated_at: new Date().toISOString(),
    }).eq("user_id", userId);
    if (error) return responseJson({ error: "PREFERENCES_SAVE_FAILED" }, 500, origin);
    return responseJson({ ok: true, preferences }, 200, origin);
  }

  if (action === "unlink") {
    const { error } = await db.from("lorgus_telegram_player_links").delete().eq("user_id", userId);
    if (error) return responseJson({ error: "UNLINK_FAILED" }, 500, origin);
    return responseJson({ ok: true, linked: false }, 200, origin);
  }
  return responseJson({ error: "UNKNOWN_ACTION" }, 400, origin);
});
