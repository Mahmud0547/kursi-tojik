/** Builds the bot's replies from the database. Sending is injected so this is testable without Telegram. */

import { TRACKED } from "../collect";
import { bankRates, botUser, latestRates, saveBotUser, setSubscribed, subscribers, type BotLang } from "../db";
import type { Env } from "../env";
import { changePercent, convert, perUnit, type Rate } from "../money";
import { parseCommand } from "./commands";
import type { Send } from "./telegram";
import { dmy, langFromTelegram, number, say } from "./texts";

/** The parts of a Telegram update the bot reads. */
export interface Update {
  message?: { chat: { id: number }; text?: string; from?: { language_code?: string } };
}

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function rateBoard(env: Env, lang: BotLang, only: string | null, titleKey: "rateTitle" | "digestTitle"): Promise<string> {
  const latest = await latestRates(env.DB);
  if (!latest) return say(lang, "noData");
  const codes = only ? [only] : [...TRACKED];
  const lines = codes.flatMap((code) => {
    const r = latest.rates.find((x) => x.code === code);
    if (!r) return [];
    const change = changePercent(perUnit(r), r.previousPerUnit);
    const arrow = change === null || Math.abs(change) < 0.005 ? "•" : change > 0 ? "▲" : "▼";
    const pct = change === null ? "" : ` ${arrow} ${number(Math.abs(change), lang, 2)}%`;
    return [`<b>${r.nominal} ${r.code}</b> = ${number(r.value, lang)} TJS${pct}`];
  });
  if (lines.length === 0) return say(lang, "unknownCurrency");
  return `${say(lang, titleKey, { date: dmy(latest.date) })}\n\n${lines.join("\n")}`;
}

async function conversion(env: Env, lang: BotLang, amount: number, from: string, to: string): Promise<string> {
  const latest = await latestRates(env.DB);
  if (!latest) return say(lang, "noData");
  const rates: Record<string, Rate> = Object.fromEntries(latest.rates.map((r) => [r.code, r]));
  const result = convert(amount, from, to, rates);
  if (result === null) return say(lang, "unknownCurrency");
  return `<b>${number(amount, lang, 2)} ${from} = ${number(result, lang, 2)} ${to}</b>\n${say(lang, "convertSource", { date: dmy(latest.date) })}`;
}

async function banks(env: Env, lang: BotLang, code: string): Promise<string> {
  if (!["USD", "EUR", "RUB"].includes(code)) return say(lang, "banksUnknown");
  const list = (await bankRates(env.DB, code)).filter((b) => b.cashBuy !== null && b.cashSell !== null);
  if (list.length === 0) return say(lang, "noData");
  const bestBuy = list.reduce((a, b) => (b.cashBuy! > a.cashBuy! ? b : a)); // the bank pays most for your currency
  const bestSell = list.reduce((a, b) => (b.cashSell! < a.cashSell! ? b : a)); // the bank sells it cheapest
  const updated = list.map((b) => b.updated).sort().at(-1) ?? "";
  return [
    `<b>${say(lang, "banksTitle", { code })}</b>`,
    "",
    say(lang, "banksSellTo", { code, bank: escape(bestBuy.name), rate: number(bestBuy.cashBuy!, lang) }),
    say(lang, "banksBuyFrom", { code, bank: escape(bestSell.name), rate: number(bestSell.cashSell!, lang) }),
    "",
    say(lang, "banksSource", { updated: `${dmy(updated)} ${updated.slice(11, 16)}` }),
  ].join("\n");
}

/** Handles one update and sends exactly one reply. Unknown updates are ignored. */
export async function handleUpdate(env: Env, update: Update, now: Date, send: Send): Promise<void> {
  const message = update.message;
  if (!message?.text) return;
  const chatId = message.chat.id;
  const known = await botUser(env.DB, chatId);
  let lang: BotLang = known?.lang ?? langFromTelegram(message.from?.language_code);
  if (!known) await saveBotUser(env.DB, chatId, lang, now.toISOString());

  const command = parseCommand(message.text);
  let reply: string;
  switch (command.kind) {
    case "start":
      reply = say(lang, "start");
      break;
    case "rate":
      reply = await rateBoard(env, lang, command.code, "rateTitle");
      break;
    case "convert":
      reply = await conversion(env, lang, command.amount, command.from, command.to);
      break;
    case "banks":
      reply = await banks(env, lang, command.code);
      break;
    case "subscribe":
      await setSubscribed(env.DB, chatId, true);
      reply = say(lang, "subscribed");
      break;
    case "unsubscribe":
      await setSubscribed(env.DB, chatId, false);
      reply = say(lang, "unsubscribed");
      break;
    case "lang":
      if (command.lang) {
        lang = command.lang;
        await saveBotUser(env.DB, chatId, lang, now.toISOString());
        reply = say(lang, "langSet");
      } else {
        reply = say(lang, "langChoose");
      }
      break;
    case "badAmount":
      reply = say(lang, "badAmount");
      break;
    case "unknownCurrency":
      reply = say(lang, "unknownCurrency");
      break;
    default:
      reply = say(lang, "help");
  }
  await send(chatId, reply);
}

/** Sends today's board to every subscriber. One failed chat (e.g. the user blocked the bot) does not stop the rest. */
export async function sendDigest(env: Env, send: Send): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (const user of await subscribers(env.DB)) {
    try {
      await send(user.chatId, await rateBoard(env, user.lang, null, "digestTitle"));
      sent++;
    } catch {
      failed++;
    }
  }
  return { sent, failed };
}
