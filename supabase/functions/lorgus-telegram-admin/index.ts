import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const clean = (value: unknown, max = 500) => String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = req.headers.get("Authorization") || "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!jwt) return json({ error: "Войди в аккаунт LORGUS." }, 401);

  const url = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !serviceKey) return json({ error: "Сервер чатов не настроен." }, 503);

  // The publishable key is public; the user's JWT is what authenticates the request.
  const anonKey = "sb_publishable_LlRg71tECimoRn2zuzxqlQ_OeCupPLe";
  const userDb = createClient(url, anonKey, {
    global: { headers: { Authorization: "Bearer " + jwt } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: userData, error: userError } = await userDb.auth.getUser(jwt);
  if (userError || !userData?.user) return json({ error: "Сессия истекла. Войди снова." }, 401);
  const { data: isAdmin, error: adminError } = await userDb.rpc("is_admin");
  if (adminError || isAdmin !== true) return json({ error: "Доступ только для администратора LORGUS." }, 403);

  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Некорректный JSON." }, 400); }
  const action = clean(body.action, 40);

  if (action === "list_chats") {
    const { data, error } = await db.from("lorgus_telegram_chats")
      .select("chat_id,title,chat_type,username,last_message_at,updated_at")
      .order("last_message_at", { ascending: false, nullsFirst: false }).limit(100);
    if (error) return json({ error: "Не удалось загрузить список чатов." }, 500);
    return json({ chats: data || [] });
  }

  if (action === "list_messages") {
    const chatId = clean(body.chat_id, 80);
    if (!chatId) return json({ error: "Не выбран чат." }, 400);
    const { data: chat, error: chatError } = await db.from("lorgus_telegram_chats")
      .select("chat_id").eq("chat_id", chatId).maybeSingle();
    if (chatError || !chat) return json({ error: "Этот чат ещё не зарегистрирован webhook-ом бота." }, 404);
    const { data, error } = await db.from("lorgus_telegram_messages")
      .select("message_id,thread_id,topic_title,sender_id,sender_name,text,sent_at,is_outgoing")
      .eq("chat_id", chatId).order("sent_at", { ascending: false }).limit(300);
    if (error) return json({ error: "Не удалось загрузить сообщения." }, 500);
    return json({ messages: (data || []).reverse() });
  }

  if (action === "send_message") {
    const chatId = clean(body.chat_id, 80);
    const text = clean(body.text, 4096);
    const rawThread = body.thread_id;
    const threadId = rawThread === null || rawThread === undefined || rawThread === "" ? null : Number(rawThread);
    if (!chatId || !text) return json({ error: "Выбери чат и напиши текст сообщения." }, 400);
    if (text.length > 4096) return json({ error: "Сообщение длиннее 4096 символов." }, 400);
    if (threadId !== null && (!Number.isSafeInteger(threadId) || threadId < 1)) return json({ error: "Некорректная тема форума." }, 400);
    const { data: chat, error: chatError } = await db.from("lorgus_telegram_chats")
      .select("chat_id,title,chat_type").eq("chat_id", chatId).maybeSingle();
    if (chatError || !chat) return json({ error: "Отправка разрешена только в чаты, которые бот уже обнаружил." }, 404);
    const token = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
    if (!token) return json({ error: "Не настроен токен Telegram-бота." }, 503);
    const telegramBody: Record<string, unknown> = { chat_id: chatId, text, disable_web_page_preview: true };
    if (threadId !== null) telegramBody.message_thread_id = threadId;
    const response = await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(telegramBody)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result?.ok !== true || !result?.result) {
      return json({ error: clean(result?.description || "Telegram не принял сообщение.", 250) }, 502);
    }
    const sent = result.result;
    const topicTitle = threadId === null ? null : (await db.from("lorgus_telegram_messages")
      .select("topic_title").eq("chat_id", chatId).eq("thread_id", threadId).not("topic_title", "is", null)
      .order("sent_at", { ascending: false }).limit(1).maybeSingle()).data?.topic_title || null;
    const row = {
      chat_id: chatId, message_id: sent.message_id, thread_id: sent.message_thread_id ?? threadId,
      topic_title: topicTitle, sender_id: String(sent.from?.id || ""), sender_name: "Администрация",
      text: sent.text || text, sent_at: new Date(Number(sent.date || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
      is_outgoing: true
    };
    const { error: insertError } = await db.from("lorgus_telegram_messages").upsert(row, { onConflict: "chat_id,message_id", ignoreDuplicates: true });
    await db.from("lorgus_telegram_chats").update({ last_message_at: row.sent_at, updated_at: new Date().toISOString() }).eq("chat_id", chatId);
    if (insertError) return json({ sent: true, warning: "Сообщение отправлено, но не удалось добавить его в локальную историю." });
    return json({ sent: true });
  }

  return json({ error: "Неизвестное действие." }, 400);
});