import { describe, expect, it } from "vitest";
import { matches } from "../../src/all-rates";
import { boardCodes, TRACKED } from "../../src/board";
import { periodStats } from "../../src/chart";
import { rankOffers, saving } from "../../src/planner";
import type { BankRate } from "../../src/types";

const bank = (name: string, cashBuy: number | null, cashSell: number | null): BankRate => ({ name, bank: name, cashBuy, cashSell, updated: "" });
const banks = [bank("Alif", 9.18, 9.28), bank("Spitamen", 9.21, 9.27), bank("Arvand", 9.17, 9.26), bank("No cash", null, null)];

describe("rankOffers", () => {
  it("selling: the bank that pays the most somoni comes first", () => {
    const offers = rankOffers(banks, 100, "sell");
    expect(offers.map((o) => o.bank)).toEqual(["Spitamen", "Alif", "Arvand"]);
    expect(offers[0]!.total).toBeCloseTo(921, 2);
  });

  it("buying: the bank that charges the least comes first", () => {
    const offers = rankOffers(banks, 100, "buy");
    expect(offers.map((o) => o.bank)).toEqual(["Arvand", "Spitamen", "Alif"]);
    expect(offers[0]!.total).toBeCloseTo(926, 2);
  });

  it("leaves out banks without a cash price", () => {
    expect(rankOffers(banks, 1, "sell").some((o) => o.bank === "No cash")).toBe(false);
  });
});

describe("saving", () => {
  it("is the gap between the best and the worst bank", () => {
    expect(saving(rankOffers(banks, 100, "sell"))).toBeCloseTo(4, 2);
    expect(saving(rankOffers(banks, 100, "buy"))).toBeCloseTo(2, 2);
  });

  it("is zero with fewer than two banks", () => {
    expect(saving(rankOffers([banks[0]!], 100, "sell"))).toBe(0);
  });
});

describe("periodStats", () => {
  const point = (date: string, value: number, nominal = 1) => ({ date, value, nominal });

  it("finds low, high and the change from the first day to the last", () => {
    const stats = periodStats([point("2026-10-01", 10), point("2026-10-02", 9), point("2026-10-03", 11)])!;
    expect(stats.low).toBe(9);
    expect(stats.high).toBe(11);
    expect(stats.change).toBeCloseTo(10, 5);
  });

  it("counts per unit when the nominal is not 1", () => {
    expect(periodStats([point("2026-10-01", 2, 10), point("2026-10-02", 2.2, 10)])!.high).toBeCloseTo(0.22, 5);
  });

  it("needs at least two days", () => {
    expect(periodStats([point("2026-10-01", 10)])).toBeNull();
  });
});

describe("currency search", () => {
  it("matches the code or a name, ignoring case", () => {
    expect(matches("try", "TRY", ["Turkish Lira"])).toBe(true);
    expect(matches("лира", "TRY", ["Turkish Lira", "Турецкая лира"])).toBe(true);
    expect(matches("yen", "TRY", ["Turkish Lira"])).toBe(false);
    expect(matches("  ", "TRY", [])).toBe(true);
  });
});

describe("boardCodes", () => {
  it("adds pinned currencies after the main ones, without duplicates", () => {
    expect(boardCodes(["TRY", "USD"])).toEqual([...TRACKED, "TRY"]);
  });
});
