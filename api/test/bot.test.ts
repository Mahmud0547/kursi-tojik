import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { parseCommand } from "../src/bot/commands";
import { handleUpdate, sendDigest } from "../src/bot/handle";
import { number } from "../src/bot/texts";
import { collect } from "../src/collect";
import { botUser } from "../src/db";
import { fakeNbt, NOW } from "./helpers";

describe("parseCommand", () => {
  it.each([
    ["100 usd", { kind: "convert", amount: 100, from: "USD", to: "TJS" }],
    ["1 000,50 EUR", { kind: "convert", amount: 1000.5, from: "EUR", to: "TJS" }],
    ["100 usd eur", { kind: "convert", amount: 100, from: "USD", to: "EUR" }],
    ["100 usd в rub", { kind: "convert", amount: 100, from: "USD", to: "RUB" }],
    ["100$", { kind: "convert", amount: 100, from: "USD", to: "TJS" }],
    ["500 сомонӣ", { kind: "convert", amount: 500, from: "TJS", to: "USD" }],
    ["/convert 5 доллар", { kind: "convert", amount: 5, from: "USD", to: "TJS" }],
    ["/rate", { kind: "rate", code: null }],
    ["/rate@kursi_bot eur", { kind: "rate", code: "EUR" }],
    ["/banks", { kind: "banks", code: "USD" }],
    ["/lang ru", { kind: "lang", lang: "ru" }],
    ["/lang xx", { kind: "lang", lang: null }],
    ["100 abcd", { kind: "unknownCurrency" }],
    ["hello", { kind: "unknown" }],
  ])("%s", (text, expected) => {
    expect(parseCommand(text)).toEqual(expected);
  });
});

describe("number", () => {
  it("uses a decimal comma for tj and ru, a dot for en", () => {
    expect(number(1234.5, "ru", 2)).toBe("1 234,50");
    expect(number(1234.5, "en", 2)).toBe("1,234.50");
  });
});

describe("handleUpdate", () => {
  const sent: { chatId: number; text: string }[] = [];
  const send = async (chatId: number, text: string) => {
    sent.push({ chatId, text });
  };
  const message = (text: string, language_code = "ru", id = 7) => ({ message: { chat: { id }, text, from: { language_code } } });

  beforeEach(async () => {
    sent.length = 0;
    await collect(env, NOW, fakeNbt().fetchFn);
  });

  it("converts at the official rate and names the date", async () => {
    await handleUpdate(env, message("100 usd"), NOW, send);
    expect(sent[0]?.text).toContain("100,00 USD = 922,01 TJS");
    expect(sent[0]?.text).toContain("01.10.2026");
  });

  it("answers in the user's Telegram language, Tajik by default", async () => {
    await handleUpdate(env, message("/start", "de", 8), NOW, send);
    expect(sent[0]?.text).toContain("Салом");
    expect((await botUser(env.DB, 8))?.lang).toBe("tj");
  });

  it("shows the board with nominals", async () => {
    await handleUpdate(env, message("/rate"), NOW, send);
    expect(sent[0]?.text).toContain("<b>10 KZT</b> = 0,2091 TJS");
  });

  it("names the best banks for buying and selling", async () => {
    await handleUpdate(env, message("/banks usd"), NOW, send);
    expect(sent[0]?.text).toMatch(/Продать USD выгоднее всего: .+ — 9,2/);
    expect(sent[0]?.text).toContain("24.09.2026 16:09");
  });

  it("remembers a language change", async () => {
    await handleUpdate(env, message("/lang en"), NOW, send);
    await handleUpdate(env, message("100 usd"), NOW, send);
    expect(sent[1]?.text).toContain("100.00 USD = 922.01 TJS");
  });

  it("subscribes and sends the digest only to subscribers", async () => {
    await handleUpdate(env, message("/subscribe", "ru", 1), NOW, send);
    await handleUpdate(env, message("/start", "ru", 2), NOW, send);
    sent.length = 0;
    expect(await sendDigest(env, send)).toEqual({ sent: 1, failed: 0 });
    expect(sent[0]?.chatId).toBe(1);
  });

  it("keeps sending the digest when one chat fails", async () => {
    await handleUpdate(env, message("/subscribe", "ru", 1), NOW, send);
    await handleUpdate(env, message("/subscribe", "ru", 2), NOW, send);
    const flaky = async (chatId: number) => {
      if (chatId === 1) throw new Error("blocked");
    };
    expect(await sendDigest(env, flaky)).toEqual({ sent: 1, failed: 1 });
  });

  it("ignores updates without text", async () => {
    await handleUpdate(env, { message: { chat: { id: 9 } } }, NOW, send);
    expect(sent).toEqual([]);
  });
});
