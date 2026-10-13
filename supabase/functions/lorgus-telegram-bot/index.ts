import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

function safeText(value: unknown, max = 500): string {
  return String(value ?? "").replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max);
}
function constantTimeEqual(a: string, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
async function send(token: string, chatId: string, text: string): Promise<void> {
  const response = await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result?.ok !== true) throw new Error("Telegram send failed");
}
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("LORGUS Telegram webhook", { status: 200 });
  const expected = Deno.env.get("TELEGRAM_INCOMING_WEBHOOK_SECRET") || "";
  const provided = req.headers.get("x-telegram-bot-api-secret-token") || "";
  if (!constantTimeEqual(expected, provided)) return new Response("Unauthorized", { status: 401 });
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
  const adminChatId = Deno.env.get("TELEGRAM_CHAT_ID") || "";
  const dbUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!token || !adminChatId || !dbUrl || !serviceKey) return new Response("Not configured", { status: 503 });
  let update: any;
  try { update = await req.json(); } catch { return new Response("Bad JSON", { status: 400 }); }
  const message = update?.message;
  if (!message?.chat || String(message.chat.id) !== adminChatId) return Response.json({ ok: true });
  const incoming = safeText(message.text, 1000);
  if (!incoming.startsWith("/")) return Response.json({ ok: true });
  const command = incoming.split(/\s+/)[0].split("@")[0].toLowerCase();
  let reply = "";
  if (command === "/start" || command === "/help") {
    reply = [
      "𓆩 <b>L O R G U S</b> 𓆪", "", "🕯️ <b>ВЕСТНИК АДМИНИСТРАЦИИ</b>",
      "━━━━━━━━━━━━━━", "", "<b>/help</b> — список команд",
      "<b>/status</b> — состояние доставки уведомлений",
      "<b>/summary</b> — сводка событий за последние 24 часа", "",
      "<i>Доступны только безопасные команды просмотра. Игровые данные через Telegram не изменяются.</i>",
      "", "━━━━━━━━━━━━━━", "<i>LORGUS · Канцелярия</i>"
    ].join("\n");
  } else if (command === "/status") {
    const db = createClient(dbUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await db.from("lorgus_telegram_outbox")
      .select("id, sent_at, last_error").order("id", { ascending: false }).limit(500);
    if (error || !data) {
      reply = "𓆩 <b>L O R G U S</b> 𓆪\n\n⚠️ <b>СВОДКА НЕДОСТУПНА</b>\nНе удалось прочитать очередь уведомлений.";
    } else {
      const pending = data.filter((row: any) => !row.sent_at && !row.last_error).length;
      const failed = data.filter((row: any) => !row.sent_at && !!row.last_error).length;
      const sent = data.filter((row: any) => !!row.sent_at).length;
      const lastError = data.find((row: any) => !row.sent_at && row.last_error);
      reply = [
        "𓆩 <b>L O R G U S</b> 𓆪", "", "📯 <b>СОСТОЯНИЕ ВЕСТНИКА</b>",
        "━━━━━━━━━━━━━━", "", "🟢 Доставлено: <b>" + sent + "</b>",
        "🕰️ Ожидает: <b>" + pending + "</b>", "🔴 Ошибок доставки: <b>" + failed + "</b>",
        "<i>Последние " + data.length + " событий очереди.</i>",
        ...(lastError ? ["", "Последняя ошибка: " + safeText(lastError.last_error, 180)] : []),
        "", "━━━━━━━━━━━━━━", "<i>LORGUS · Состояние системы</i>"
      ].join("\n");
    }
  } else if (command === "/summary") {
    const db = createClient(dbUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await db.from("lorgus_telegram_outbox")
      .select("event_type, sent_at, last_error, created_at")
      .gte("created_at", since).order("created_at", { ascending: false }).limit(1000);
    if (error || !data) {
      reply = "𓆩 <b>L O R G U S</b> 𓆪\\n\\n⚠️ <b>ЛЕТОПИСЬ НЕДОСТУПНА</b>\\nНе удалось собрать сводку за сутки.";
    } else {
      const labels: Record<string, string> = {
        character_application: "Заявки персонажей",
        application_review: "Решения по заявкам",
        rp_post: "Записи в летописи",
        rp_item_use: "Использование предметов",
        item_transfer: "Передачи предметов",
        currency_transfer: "Передачи валюты",
        lootbox_reward: "Награды сундуков",
        rp_post_reverted: "Отменённые записи"
      };
      const counts = new Map<string, number>();
      for (const row of data) {
        const key = safeText(row.event_type, 80) || "other";
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      const lines = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
        .map(([key, count]) => "· " + safeText(labels[key] || key, 80) + ": <b>" + count + "</b>");
      const failed = data.filter((row: any) => !row.sent_at && !!row.last_error).length;
      const pending = data.filter((row: any) => !row.sent_at && !row.last_error).length;
      reply = [
        "𓆩 <b>L O R G U S</b> 𓆪", "", "📜 <b>ЛЕТОПИСЬ ЗА 24 ЧАСА</b>",
        "━━━━━━━━━━━━━━", "", "Всего событий: <b>" + data.length + "</b>",
        ...(lines.length ? ["", ...lines] : ["", "<i>За последние 24 часа событий не было.</i>"]),
        "", "━━━━━━━━━━━━━━", "🕰️ В очереди: <b>" + pending + "</b>",
        "🔴 Ошибок доставки: <b>" + failed + "</b>",
        "", "<i>LORGUS · Суточная сводка по запросу</i>"
      ].join("\\n");
    }
  } else {
    reply = "𓆩 <b>L O R G U S</b> 𓆪\\n\\nНеизвестная команда. Напиши /help.";
  }
  try { await send(token, adminChatId, reply); }
  catch { return new Response("Reply failed", { status: 502 }); }
  return Response.json({ ok: true });
});
