import { describe, expect, it } from "vitest";
import { decodeNbt, parseBanks, parseDaily, parseHistory, shortBankName } from "../src/nbt";
import banksHtml from "./fixtures/banks-usd.html?raw";
import dailyXml from "./fixtures/daily-2026-10-01.xml?raw";
import historyXml from "./fixtures/history-kzt.xml?raw";

describe("parseDaily", () => {
  const daily = parseDaily(dailyXml);

  it("reads the rate date and every published currency", () => {
    expect(daily.date).toBe("2026-10-01");
    expect(daily.rates).toHaveLength(36);
  });

  it("keeps values and nominals exactly as published", () => {
    expect(daily.rates.find((r) => r.code === "USD")).toEqual({ code: "USD", nominal: 1, value: 9.2201, name: "US Dollar" });
    expect(daily.rates.find((r) => r.code === "UZS")).toMatchObject({ nominal: 100, value: 0.0781 });
    expect(daily.rates.find((r) => r.code === "KZT")).toMatchObject({ nominal: 10, value: 0.2091 });
  });

  it("rejects a document without a date", () => {
    expect(() => parseDaily("<html>maintenance</html>")).toThrow(/date/);
  });

  it("skips entries with broken values", () => {
    const xml = `<ValCurs Date="2026-10-01"><Valute><CharCode>USD</CharCode><Nominal>1</Nominal><Name>US Dollar</Name><Value>abc</Value></Valute></ValCurs>`;
    expect(parseDaily(xml).rates).toEqual([]);
  });
});

describe("parseHistory", () => {
  it("reads dated records in order", () => {
    const records = parseHistory(historyXml);
    expect(records[0]).toEqual({ date: "2026-09-20", code: "KZT", nominal: 10, value: 0.207 });
    expect(records.map((r) => r.date)).toEqual([...records.map((r) => r.date)].sort());
    expect(records.length).toBeGreaterThanOrEqual(10);
  });
});

describe("decodeNbt", () => {
  it("decodes windows-1251 bytes", () => {
    const bytes = new Uint8Array([0xc4, 0xee, 0xeb, 0xeb, 0xe0, 0xf0]); // "Доллар" in windows-1251
    expect(decodeNbt(bytes.buffer, "windows-1251")).toBe("Доллар");
  });
});

describe("parseBanks", () => {
  const { banks } = parseBanks(banksHtml);

  it("reads every bank row and skips the header", () => {
    expect(banks).toHaveLength(22);
    expect(banks[0]).toMatchObject({ bank: 'ҶСК "Алиф Бонк"', cashBuy: 9.18, cashSell: 9.28, updated: "2026-09-24T16:09" });
  });

  it("turns a published 0.0000 into null (not offered)", () => {
    const freedom = banks.find((b) => b.bank.includes("Фридом"))!;
    expect(freedom.cardBuy).toBe(9.16);
    expect(banks.every((b) => b.cashBuy === null || b.cashBuy > 0)).toBe(true);
  });

  it("returns nothing for a page without the table", () => {
    expect(parseBanks("<html></html>").banks).toEqual([]);
  });
});

describe("shortBankName", () => {
  it.each([
    ['ҶСК "Алиф Бонк"', "Алиф Бонк"],
    ["ҶСП “Фридом Бонк Тоҷикистон”", "Фридом Бонк Тоҷикистон"],
    ["Ориёнбонк", "Ориёнбонк"],
  ])("%s → %s", (full, short) => {
    expect(shortBankName(full)).toBe(short);
  });
});
