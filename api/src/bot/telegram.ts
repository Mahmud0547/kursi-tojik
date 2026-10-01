/** Minimal Telegram Bot API client: only the three methods the bot needs. */

const API = "https://api.telegram.org";

export type Send = (chatId: number, text: string) => Promise<void>;

async function call(token: string, method: string, body: unknown, fetchFn: typeof fetch): Promise<void> {
  const response = await fetchFn(`${API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Telegram ${method} failed with ${response.status}`);
}

export function telegramSender(token: string, fetchFn: typeof fetch = fetch): Send {
  return (chatId, text) => call(token, "sendMessage", { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }, fetchFn);
}

/** Points Telegram at our webhook and publishes the command list. Run once after the token is set. */
export async function setupBot(token: string, webhookUrl: string, secret: string, fetchFn: typeof fetch = fetch): Promise<void> {
  await call(token, "setWebhook", { url: webhookUrl, secret_token: secret, allowed_updates: ["message"], drop_pending_updates: true }, fetchFn);
  const commands = {
    tj: [["rate", "Қурбҳои имрӯза"], ["banks", "Қурби беҳтарини бонкҳо"], ["subscribe", "Қурб ҳар саҳар"], ["unsubscribe", "Бекор кардани обуна"], ["lang", "Забон"]],
    ru: [["rate", "Курсы на сегодня"], ["banks", "Лучшие курсы банков"], ["subscribe", "Курс каждое утро"], ["unsubscribe", "Отменить подписку"], ["lang", "Язык"]],
    en: [["rate", "Today's rates"], ["banks", "Best bank rates"], ["subscribe", "Rate every morning"], ["unsubscribe", "Stop the digest"], ["lang", "Language"]],
  };
  for (const [lang, list] of Object.entries(commands)) {
    const payload = { commands: list.map(([command, description]) => ({ command, description })) };
    await call(token, "setMyCommands", lang === "tj" ? payload : { ...payload, language_code: lang }, fetchFn);
  }
}
