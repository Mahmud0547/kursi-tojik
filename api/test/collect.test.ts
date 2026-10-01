import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { collect, dushanbeDate } from "../src/collect";
import { bankRates, history, lastRun, latestRates } from "../src/db";
import { fakeNbt, NOW } from "./helpers";

describe("dushanbeDate", () => {
  it("uses UTC+5", () => {
    expect(dushanbeDate(new Date("2026-09-30T19:30:00Z"))).toBe("2026-10-01");
    expect(dushanbeDate(new Date("2026-09-30T18:59:00Z"))).toBe("2026-09-30");
  });
});

describe("collect", () => {
  it("backfills history on the first run and stores today's rates and bank rates", async () => {
    const nbt = fakeNbt();
    const result = await collect(env, NOW, nbt.fetchFn);
    expect(result.ok).toBe(true);

    const latest = await latestRates(env.DB);
    expect(latest?.date).toBe("2026-10-01");
    const usd = latest?.rates.find((r) => r.code === "USD");
    expect(usd).toMatchObject({ value: 9.2201, nominal: 1, name: "US Dollar" });
    expect(usd?.previousPerUnit).toBeCloseTo(9.2 + 59 * 0.001, 6);

    expect((await history(env.DB, "USD", "2026-01-01")).length).toBe(61);
    const banks = await bankRates(env.DB, "USD");
    expect(banks.find((b) => b.name === "Алиф Бонк")).toMatchObject({ cashBuy: 9.18, cashSell: 9.28 });
    expect((await lastRun(env.DB))?.ok).toBe(1);
  });

  it("does not backfill again once history exists", async () => {
    await collect(env, NOW, fakeNbt().fetchFn);
    const second = fakeNbt();
    await collect(env, NOW, second.fetchFn);
    expect(second.calls.some((u) => u.includes("export_xml_dynamic"))).toBe(false);
  });

  it("keeps stored data and records a failed run when nbt.tj is down", async () => {
    await collect(env, NOW, fakeNbt().fetchFn);
    const result = await collect(env, new Date("2026-10-01T09:00:00Z"), fakeNbt({ down: true }).fetchFn);
    expect(result.ok).toBe(false);
    expect((await latestRates(env.DB))?.date).toBe("2026-10-01");
    expect((await bankRates(env.DB, "USD")).length).toBe(22);
    expect((await lastRun(env.DB))?.ok).toBe(0);
  });
});
