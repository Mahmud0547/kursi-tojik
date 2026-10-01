/** Turns a chat message into a command. Pure function, no I/O. */

import type { BotLang } from "../db";
import { parseAmount } from "../money";

export type Command =
  | { kind: "start" }
  | { kind: "rate"; code: string | null }
  | { kind: "convert"; amount: number; from: string; to: string }
  | { kind: "banks"; code: string }
  | { kind: "subscribe" }
  | { kind: "unsubscribe" }
  | { kind: "lang"; lang: BotLang | null }
  | { kind: "badAmount" }
  | { kind: "unknownCurrency" }
  | { kind: "unknown" };

/** Words people use for currencies, mapped to codes. */
const ALIASES: Record<string, string> = {
  tjs: "TJS", сомони: "TJS", сомонӣ: "TJS", somoni: "TJS", смн: "TJS",
  usd: "USD", "$": "USD", доллар: "USD", долл: "USD", dollar: "USD",
  eur: "EUR", "€": "EUR", евро: "EUR", euro: "EUR",
  rub: "RUB", "₽": "RUB", рубль: "RUB", рубл: "RUB", руб: "RUB", ruble: "RUB",
  cny: "CNY", юань: "CNY", yuan: "CNY",
  kzt: "KZT", тенге: "KZT", tenge: "KZT",
  kgs: "KGS", сом: "KGS", som: "KGS",
  uzs: "UZS", сум: "UZS", sum: "UZS",
  gbp: "GBP", фунт: "GBP", pound: "GBP",
};

export function currencyCode(word: string | undefined): string | null {
  if (!word) return null;
  const w = word.toLowerCase();
  if (ALIASES[w]) return ALIASES[w];
  return /^[a-z]{3}$/.test(w) ? w.toUpperCase() : null;
}

export function parseCommand(text: string): Command {
  const clean = text.trim().replace(/@\w+/, ""); // "/rate@kursi_bot" in groups
  const [head = "", ...rest] = clean.split(/\s+/);
  const command = head.toLowerCase();

  switch (command) {
    case "/start":
    case "/help":
      return { kind: "start" };
    case "/rate":
      return { kind: "rate", code: currencyCode(rest[0]) };
    case "/banks":
      return { kind: "banks", code: currencyCode(rest[0]) ?? "USD" };
    case "/subscribe":
      return { kind: "subscribe" };
    case "/unsubscribe":
    case "/stop":
      return { kind: "unsubscribe" };
    case "/lang": {
      const lang = rest[0]?.toLowerCase();
      return { kind: "lang", lang: lang === "tj" || lang === "ru" || lang === "en" ? lang : null };
    }
    case "/convert":
      return parseConversion(rest.join(" "));
  }
  return parseConversion(clean);
}

/** "100 usd", "1 000,50 eur rub", "100 usd в eur", "100$" → convert; otherwise unknown. */
function parseConversion(text: string): Command {
  const m = /^([\d\s.,]+?)\s*([^\d\s.,]+)(?:\s+(?:в|to|ба|in)?\s*([^\d\s.,]+))?$/i.exec(text.trim());
  if (!m) return /^\d/.test(text.trim()) ? { kind: "badAmount" } : { kind: "unknown" };
  const amount = parseAmount(m[1] ?? "");
  const from = currencyCode(m[2]);
  if (from === null) return amount === null ? { kind: "unknown" } : { kind: "unknownCurrency" };
  if (amount === null) return { kind: "badAmount" };
  const to = m[3] ? currencyCode(m[3]) : from === "TJS" ? "USD" : "TJS";
  if (to === null) return { kind: "unknownCurrency" };
  return { kind: "convert", amount, from, to };
}
