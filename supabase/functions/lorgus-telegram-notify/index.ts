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

function escapeHtml(value: unknown, max = 800): string {
  const escaped = clean(value, max)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  // Clip the escaped output too, so repeated HTML metacharacters cannot
  // inflate a Telegram message past its limit or leave a broken entity.
  return escaped.slice(0, max).replace(/&(?:amp|lt|gt|quot|#\d*|#x[\da-f]*)?$/i, "");
}

function formatEvent(type: string, payload: Record<string, unknown>): string {
  const name = escapeHtml(payload.character_name || payload.name || "Неизвестно", 120);
  const place = [payload.region, payload.location].map(v => escapeHtml(v, 100)).filter(Boolean).join(" · ");
  const lines: string[] = [];
  const field = (label: string, value: unknown, max = 180) =>
    lines.push("<b>" + label + "</b> " + escapeHtml(value, max));
  const heading = (icon: string, title: string, subtitle = "") => {
    lines.push("𓆩 <b>L O R G U S</b> 𓆪", "", icon + " <b>" + title + "</b>");
    if (subtitle) lines.push("<i>" + subtitle + "</i>");
    lines.push("━━━━━━━━━━━━━━");
  };
  const footer = (label = "Весточка из мира") => {
    lines.push("", "━━━━━━━━━━━━━━", "<i>" + label + "</i>");
  };

  switch (type) {
    case "telegram_connection_test":
      heading("🕯️", "ВЕСТОЧКА ИЗ LORGUS", "Связь с миром установлена");
      lines.push("", escapeHtml(payload.body || "Телеграм-вестник исправен. Новые сообщения будут приходить в оформлении летописи.", 500));
      footer("LORGUS · Проверка связи");
      break;

    case "character_application":
      heading("📜", "НОВАЯ ЗАЯВКА", "На рассмотрение администрации");
      field("Персонаж:", name);
      if (payload.race) field("Раса:", payload.race, 80);
      if (payload.age) field("Возраст:", payload.age, 20);
      if (payload.homeland) field("Родина:", payload.homeland, 100);
      if (payload.occupation) field("Занятие:", payload.occupation, 120);
      field("Заявка:", "#" + clean(payload.application_id, 50));
      footer("LORGUS · Канцелярия");
      break;

    case "rp_message":
      heading("🕯️", "НОВАЯ ЗАПИСЬ В ЛЕТОПИСИ", name);
      if (place) field("Место:", place, 220);
      lines.push("", "<blockquote>" + escapeHtml(payload.body, 2800) + "</blockquote>");
      field("Запись:", "#" + clean(payload.message_id, 40));
      footer("LORGUS · Голоса мира");
      break;

    case "item_used":
      heading("⚔️", "ПРЕДМЕТ ИСПОЛЬЗОВАН", name);
      field("Реликвия:", clean(payload.item_name || "Неизвестный предмет", 150) + " ×" + clean(payload.quantity || 1, 10));
      if (place) field("Место:", place, 220);
      if (payload.message_id) field("Запись:", "#" + clean(payload.message_id, 40));
      if (payload.message_excerpt) lines.push("", "<blockquote>" + escapeHtml(payload.message_excerpt, 700) + "</blockquote>");
      footer("LORGUS · Движение вещей");
      break;

    case "item_transfer":
      heading("🎒", "ПЕРЕДАЧА ПРЕДМЕТА", "Из рук в руки");
      if (payload.sender_name) field("От кого:", payload.sender_name, 120);
      field("Кому:", name);
      field("Предмет:", clean(payload.item_name || "Неизвестный предмет", 150) + " ×" + clean(payload.quantity || 1, 10));
      footer("LORGUS · Торговые вести");
      break;

    case "currency_transfer": {
      const data = payload.data && typeof payload.data === "object" ? payload.data as Record<string, unknown> : {};
      heading("🪙", "ДВИЖЕНИЕ МОНЕТ", "Передача средств");
      if (data.sender_name) field("От кого:", data.sender_name, 120);
      if (name !== "Неизвестно") field("Кому:", name);
      if (data.amount != null || data.currency_code) {
        field("Сумма:", clean(data.amount ?? "", 30) + " " + clean(data.currency_name || data.currency_code || "", 60));
      } else {
        lines.push("", escapeHtml(payload.body || "Получена передача валюты", 700));
      }
      footer("LORGUS · Торговые вести");
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
      heading(icons[rarity] || "🎁", "СУНДУК РАСКРЫЛ ТАЙНУ", "Судьба улыбнулась персонажу");
      field("Персонаж:", name);
      const rewardType = clean(payload.reward_type || "", 40);
      if (rewardType === "currency") {
        field("Добыча:", clean(payload.amount ?? "", 30) + " " + clean(payload.currency_code || "", 40));
      } else {
        field("Добыча:", payload.reward_name || "Неизвестная награда", 200);
      }
      if (rarity) field("Редкость:", rarityNames[rarity] || rarity, 60);
      if (payload.description) lines.push("", "<blockquote>" + escapeHtml(payload.description, 700) + "</blockquote>");
      if (payload.source_lootbox_name) field("Сундук:", payload.source_lootbox_name, 120);
      footer("LORGUS · Дары судьбы");
      break;
    }

    case "application_review": {
      const status = clean(payload.status || "unknown", 40);
      const statusText: Record<string, string> = {
        approved: "Одобрена", revision: "Нужны исправления", rejected: "Отклонена", pending: "Ожидает рассмотрения"
      };
      const approved = status === "approved";
      const icon = approved ? "🟢" : status === "rejected" ? "🔴" : "⚖️";
      heading(icon, "РЕШЕНИЕ ПО ЗАЯВКЕ", name);
      field("Результат:", statusText[status] || status);
      if (payload.review_notes) {
        lines.push("", "<b>Комментарий администрации</b>", "<blockquote>" + escapeHtml(payload.review_notes, 500) + "</blockquote>");
      }
      footer("LORGUS · Канцелярия");
      break;
    }

    case "client_error_report": {
      heading("🚨", "ОШИБКА ПРИЛОЖЕНИЯ", clean(payload.route || "Неизвестный раздел", 160));
      field("Игрок:", payload.username || "Неизвестен", 120);
      field("Персонаж:", payload.character_name || "не указан", 120);
      field("Отчёт:", "#" + clean(payload.report_id || "", 40), 60);
      lines.push("", "<b>Ошибка</b>", "<blockquote>" + escapeHtml(payload.message || "Текст ошибки отсутствует", 1200) + "</blockquote>");
      if (payload.stack) lines.push("", "<b>Стек</b>", "<pre>" + escapeHtml(payload.stack, 1100) + "</pre>");
      if (payload.diagnostics) lines.push("", "<b>Диагностика</b>", "<pre>" + escapeHtml(typeof payload.diagnostics === "string" ? payload.diagnostics : JSON.stringify(payload.diagnostics, null, 2), 900) + "</pre>");
      if (payload.viewport) field("Экран:", payload.viewport, 100);
      if (payload.user_agent) field("Браузер:", payload.user_agent, 180);
      footer("LORGUS · Аварийные сообщения");
      break;
    }

    case "rp_message_reverted":
      heading("↩️", "ЗАПИСЬ ИСКЛЮЧЕНА ИЗ ЛЕТОПИСИ", name);
      field("Запись:", "#" + clean(payload.message_id, 40));
      if (payload.revert_reason) {
        lines.push("", "<b>Основание</b>", "<blockquote>" + escapeHtml(payload.revert_reason, 500) + "</blockquote>");
      }
      if (payload.body) lines.push("", "<b>Текст записи</b>", "<blockquote>" + escapeHtml(payload.body, 800) + "</blockquote>");
      footer("LORGUS · Действия администрации");
      break;

    default:
      heading("🔔", "СЛУЖЕБНАЯ ВЕСТЬ", clean(type, 80));
      lines.push("<pre>" + escapeHtml(JSON.stringify(payload, null, 2), 2000) + "</pre>");
      footer("LORGUS · Система оповещений");
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
      parse_mode: "HTML",
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
