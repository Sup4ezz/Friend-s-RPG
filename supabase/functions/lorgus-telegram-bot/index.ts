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
async function send(token: string, chatId: string, text: string, replyMarkup?: unknown): Promise<void> {
  const response = await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true, ...(replyMarkup ? { reply_markup: replyMarkup } : {}) }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result?.ok !== true) throw new Error("Telegram send failed");
}
Deno.serve(async (req: Request) => {
  if (req.method === "GET") {
    const expected = Deno.env.get("TELEGRAM_INCOMING_WEBHOOK_SECRET") || "";
    const token = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
    if (!expected || !token) return new Response("Webhook NOT configured: missing Supabase secrets.", { status: 503, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
    const webhookUrl = "https://dxdxnttpznoekaiecrlv.supabase.co/functions/v1/lorgus-telegram-bot";
    const response = await fetch("https://api.telegram.org/bot" + token + "/setWebhook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: webhookUrl, secret_token: expected, allowed_updates: ["message", "callback_query"], drop_pending_updates: false })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result?.ok !== true) return new Response("Webhook registration failed: " + safeText(result?.description || "Telegram rejected request", 200), { status: 502, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
    return new Response("LORGUS Telegram webhook registered successfully.", { status: 200, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  }
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const expected = Deno.env.get("TELEGRAM_INCOMING_WEBHOOK_SECRET") || "";
  const setupSecret = req.headers.get("x-lorgus-setup-secret") || "";
  if (constantTimeEqual(expected, setupSecret) && expected) {
    let setup: any;
    try { setup = await req.json(); } catch { return new Response("Bad JSON", { status: 400 }); }
    if (setup?.action !== "register_webhook") return new Response("Unknown setup action", { status: 400 });
    const token = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
    if (!token) return new Response("Bot token missing", { status: 503 });
    const webhookUrl = "https://dxdxnttpznoekaiecrlv.supabase.co/functions/v1/lorgus-telegram-bot";
    const response = await fetch("https://api.telegram.org/bot" + token + "/setWebhook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: expected,
        allowed_updates: ["message", "callback_query"],
        drop_pending_updates: false
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result?.ok !== true) {
      return Response.json({ ok: false, description: safeText(result?.description || "Telegram rejected webhook setup", 250) }, { status: 502 });
    }
    return Response.json({ ok: true, description: "Webhook registered" });
  }
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
  if (!message?.chat) return Response.json({ ok: true });

  // Archive messages from groups/supergroups (including forum topics) for the admin console.
  // Private player conversations are deliberately not archived.
  const chat = message.chat;
  const archiveThisChat = chat.type === "group" || chat.type === "supergroup" || String(chat.id) === adminChatId;
  if (archiveThisChat) {
    try {
      const sentAt = new Date(Number(message.date || Math.floor(Date.now() / 1000)) * 1000).toISOString();
      const topicTitle = safeText(message.forum_topic_created?.name || message.forum_topic_edited?.name || "", 200) || null;
      const threadId = Number.isSafeInteger(Number(message.message_thread_id)) && Number(message.message_thread_id) > 0
        ? Number(message.message_thread_id) : null;
      const sender = message.from || message.sender_chat || {};
      const senderName = safeText(
        [sender.first_name, sender.last_name].filter(Boolean).join(" ") ||
        (sender.username ? "@" + sender.username : "") || sender.title || "Неизвестно", 160
      );
      let messageText = safeText(message.text || message.caption || "", 4096);
      if (!messageText) {
        if (message.photo) messageText = "[Фото]";
        else if (message.video) messageText = "[Видео]";
        else if (message.document) messageText = "[Документ: " + safeText(message.document.file_name || "файл", 120) + "]";
        else if (message.sticker) messageText = "[Стикер]";
        else if (message.voice) messageText = "[Голосовое сообщение]";
        else if (message.audio) messageText = "[Аудио]";
        else if (message.forum_topic_created) messageText = "[Создана тема: " + safeText(message.forum_topic_created.name, 200) + "]";
        else if (message.forum_topic_edited) messageText = "[Изменена тема: " + safeText(message.forum_topic_edited.name || "без названия", 200) + "]";
        else messageText = "[Сообщение без текста]";
      }
      const title = safeText(chat.title || [chat.first_name, chat.last_name].filter(Boolean).join(" ") || chat.username || String(chat.id), 250);
      const { error: chatError } = await db.from("lorgus_telegram_chats").upsert({
        chat_id: String(chat.id), title, chat_type: safeText(chat.type, 30),
        username: safeText(chat.username || "", 100) || null, last_message_at: sentAt, updated_at: new Date().toISOString()
      }, { onConflict: "chat_id" });
      if (chatError) console.error("Telegram chat archive: chat upsert failed");
      const { error: messageError } = await db.from("lorgus_telegram_messages").upsert({
        chat_id: String(chat.id), message_id: Number(message.message_id), thread_id: threadId,
        topic_title: topicTitle, sender_id: String(sender.id || ""), sender_name: senderName,
        text: messageText, sent_at: sentAt, is_outgoing: false
      }, { onConflict: "chat_id,message_id", ignoreDuplicates: true });
      if (messageError) console.error("Telegram chat archive: message insert failed");
    } catch {
      // Archiving must never interrupt existing bot commands or player notifications.
      console.error("Telegram chat archive failed");
    }
  }

  const incoming = safeText(message.text, 1000);
  if (!incoming.startsWith("/")) return Response.json({ ok: true });
  const command = incoming.split(/\s+/)[0].split("@")[0].toLowerCase();
  // /start and /help only show public help; status and summary remain restricted to the configured admin chat.
  if (command !== "/start" && command !== "/help" && String(message.chat.id) !== adminChatId) return Response.json({ ok: true });
  let reply = "";
  if (command === "/start" || command === "/help") {
    if (String(message.chat.id) === adminChatId) {
      reply = [
        "𓆩 <b>L O R G U S</b> 𓆪", "", "🕯️ <b>ВЕСТНИК LORGUS</b>",
        "━━━━━━━━━━━━━━", "",
        "🔔 Настрой личные уведомления в мини-приложении.",
        "<b>/status</b> — состояние доставки в административную группу",
        "<b>/summary</b> — сводка событий за последние 24 часа",
        "<b>/miniapp</b> — открыть административную канцелярию",
        "", "<i>Личные уведомления игроков и административная лента работают независимо.</i>",
        "", "━━━━━━━━━━━━━━", "<i>LORGUS · Вестник мира</i>"
      ].join("\n");
    } else {
      reply = [
        "𓆩 <b>L O R G U S</b> 𓆪", "", "🕯️ <b>ТВОЙ ЛИЧНЫЙ ВЕСТНИК</b>",
        "━━━━━━━━━━━━━━", "",
        "Привяжи аккаунт LORGUS и выбери, какие вести получать сюда в личные сообщения.",
        "", "Ты сможешь включать и отключать уведомления об анкетах, предметах, валюте, ответах на записи и обновлениях игры.",
        "", "<i>Для начала открой мини-приложение кнопкой ниже и войди в свой аккаунт LORGUS.</i>",
        "", "━━━━━━━━━━━━━━", "<i>LORGUS · Вестник мира</i>"
      ].join("\n");
    }
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
  } else if (command === "/miniapp") {
    const telegramUserId = String(message.from?.id || "");
    if (!telegramUserId || !message.from || message.from.is_bot) {
      reply = "Не удалось определить пользователя Telegram.";
    } else {
      const miniAppUrl = "https://friend-s-rpg.layero.app/admin.html";
      const response = await fetch("https://api.telegram.org/bot" + token + "/setChatMenuButton", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: Number(telegramUserId),
          menu_button: { type: "web_app", text: "Канцелярия", web_app: { url: miniAppUrl } }
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.ok !== true) {
        reply = "Не удалось добавить кнопку мини-приложения: " + safeText(result?.description || "ошибка Telegram", 180) + "\\nОткрой напрямую: " + miniAppUrl;
      } else {
        reply = "𓆩 <b>L O R G U S</b> 𓆪\\n\\n🗝️ <b>КАНЦЕЛЯРИЯ ПОДГОТОВЛЕНА</b>\\nКнопка «Канцелярия» добавлена в меню этого личного чата с ботом.\\n\\nДоступ внутри приложения всё равно проверяется через аккаунт LORGUS и серверную роль администратора.";
      }
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
  try { await send(token, String(message.chat.id), reply, (command === "/start" || command === "/help") ? { inline_keyboard: [[{ text: "🔔 Настроить уведомления", web_app: { url: "https://friend-s-rpg.staskarr23.workers.dev/player-notifications.html" } }]] } : undefined); }
  catch { return new Response("Reply failed", { status: 502 }); }
  return Response.json({ ok: true });
});
