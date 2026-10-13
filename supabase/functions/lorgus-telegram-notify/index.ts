import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function clean(value: unknown, max = 800): string {
  return String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
}

function formatEvent(type: string, payload: Record<string, unknown>): string {
  const name = clean(payload.character_name || payload.name || "Неизвестно", 120);
  const place = [payload.region, payload.location].map(v => clean(v, 100)).filter(Boolean).join(" / ");
  const lines: string[] = [];
  switch (type) {
    case "character_application":
      lines.push("🆕 НОВАЯ ЗАЯВКА LORGUS", "", "Персонаж: " + name);
      if (payload.race) lines.push("Раса: " + clean(payload.race, 80));
      if (payload.age) lines.push("Возраст: " + clean(payload.age, 20));
      if (payload.homeland) lines.push("Родина: " + clean(payload.homeland, 100));
      if (payload.occupation) lines.push("Занятие: " + clean(payload.occupation, 120));
      lines.push("ID заявки: " + clean(payload.application_id, 50));
      break;
    case "rp_message":
      lines.push("💬 НОВОЕ RP-СООБЩЕНИЕ", "", "Персонаж: " + name);
      if (place) lines.push("Место: " + place);
      lines.push("", clean(payload.body, 2800));
      lines.push("", "Пост #" + clean(payload.message_id, 40));
      break;
    case "item_used":
      lines.push("🧪 ПРЕДМЕТ ИСПОЛЬЗОВАН В RP", "", "Персонаж: " + name);
      lines.push("Предмет: " + clean(payload.item_name || "Неизвестный предмет", 150) + " ×" + clean(payload.quantity || 1, 10));
      if (place) lines.push("Место: " + place);
      if (payload.message_id) lines.push("Пост #" + clean(payload.message_id, 40));
      if (payload.message_excerpt) lines.push("", clean(payload.message_excerpt, 700));
      break;
    case "item_transfer":
      lines.push("🎒 ПЕРЕДАЧА ПРЕДМЕТА", "", "Получатель: " + name);
      lines.push("Предмет: " + clean(payload.item_name || "Неизвестный предмет", 150) + " ×" + clean(payload.quantity || 1, 10));
      if (payload.sender_name) lines.push("Отправитель: " + clean(payload.sender_name, 120));
      break;
    case "currency_transfer": {
      const data = payload.data && typeof payload.data === "object" ? payload.data as Record<string, unknown> : {};
      lines.push("🪙 ПЕРЕДАЧА ВАЛЮТЫ", "");
      if (data.sender_name) lines.push("Отправитель: " + clean(data.sender_name, 120));
      if (name !== "Неизвестно") lines.push("Получатель: " + name);
      if (data.amount != null || data.currency_code) {
        lines.push("Сумма: " + clean(data.amount ?? "", 30) + " " + clean(data.currency_name || data.currency_code || "", 60));
      } else {
        lines.push(clean(payload.body || "Получена передача валюты", 700));
      }
      break;
    }
    case "lootbox_reward": {
      const rarity = clean(payload.rarity || "", 40);
      const rarityNames: Record<string, string> = {
        common: "Обычная", uncommon: "Необычная", rare: "Редкая",
        epic: "Эпическая", legendary: "Легендарная", mythic: "Мифическая", unique: "Уникальная"
      };
      const icons: Record<string, string> = {
        common: "▫️", uncommon: "🟩", rare: "🟦", epic: "🟪",
        legendary: "🟨", mythic: "💠", unique: "🌟"
      };
      lines.push((icons[rarity] || "🎁") + " ЛУТБОКС ОТКРЫТ", "", "Персонаж: " + name);
      const rewardType = clean(payload.reward_type || "", 40);
      if (rewardType === "currency") {
        lines.push("Награда: " + clean(payload.amount ?? "", 30) + " " + clean(payload.currency_code || "", 40));
      } else {
        lines.push("Награда: " + clean(payload.reward_name || "Неизвестно", 200));
      }
      if (rarity) lines.push("Редкость: " + (rarityNames[rarity] || rarity));
      if (payload.description) lines.push(clean(payload.description, 700));
      if (payload.source_lootbox_name) lines.push("Сундук: " + clean(payload.source_lootbox_name, 120));
      break;
    }
    case "application_review":
      lines.push("⚖️ ИЗМЕНЁН СТАТУС ЗАЯВКИ", "", "Персонаж: " + name);
      lines.push("Статус: " + clean(payload.status, 40));
      if (payload.review_notes) lines.push("Комментарий: " + clean(payload.review_notes, 500));
      break;
    case "rp_message_reverted":
      lines.push("↩️ RP-ПОСТ ОТМЕНЁН", "", "Персонаж: " + name);
      lines.push("Пост #" + clean(payload.message_id, 40));
      if (payload.revert_reason) lines.push("Причина: " + clean(payload.revert_reason, 500));
      if (payload.body) lines.push("", clean(payload.body, 800));
      break;
    default:
      lines.push("🔔 LORGUS · " + clean(type, 80), "", clean(JSON.stringify(payload), 2000));
  }
  return lines.join("\n").slice(0, 3900);
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const expectedSecret = Deno.env.get("LORGUS_TELEGRAM_WEBHOOK_SECRET") || "";
  const providedSecret = req.headers.get("x-lorgus-webhook-secret") || "";
  if (!expectedSecret || !constantTimeEqual(providedSecret, expectedSecret)) {
    return new Response("Unauthorized", { status: 401 });
  }

  let event: { id?: number; event_type?: string; payload?: Record<string, unknown> };
  try {
    event = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  if (!Number.isSafeInteger(event.id) || !event.event_type || !event.payload || typeof event.payload !== "object") {
    return new Response("Invalid event", { status: 400 });
  }

  const token = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!token || !chatId || !supabaseUrl || !serviceKey) {
    return new Response("Telegram notifier secrets are not configured", { status: 503 });
  }

  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: row, error: rowError } = await db
    .from("lorgus_telegram_outbox")
    .select("id, sent_at")
    .eq("id", event.id)
    .maybeSingle();
  if (rowError || !row) return new Response("Event not found", { status: 404 });
  if (row.sent_at) return Response.json({ ok: true, duplicate: true });

  const response = await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: formatEvent(clean(event.event_type, 80), event.payload),
      disable_web_page_preview: true,
    }),
  });
  const telegramResult = await response.json().catch(() => ({}));
  if (!response.ok || telegramResult?.ok !== true) {
    const reason = clean(telegramResult?.description || "Telegram API error: " + response.status, 500);
    await db.from("lorgus_telegram_outbox").update({ last_error: reason }).eq("id", event.id).is("sent_at", null);
    return new Response("Telegram delivery failed: " + reason, { status: 502 });
  }

  const { error: updateError } = await db.from("lorgus_telegram_outbox").update({
    sent_at: new Date().toISOString(),
    last_error: null,
  }).eq("id", event.id).is("sent_at", null);
  if (updateError) return new Response("Message sent but outbox status update failed", { status: 500 });
  return Response.json({ ok: true });
});
