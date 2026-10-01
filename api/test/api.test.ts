import { createExecutionContext, env, waitOnExecutionContext } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { collect } from "../src/collect";
import worker from "../src/index";
import { fakeNbt, NOW } from "./helpers";

async function call(path: string, init: RequestInit = {}, bindings = env) {
  const ctx = createExecutionContext();
  const response = await worker.fetch(new Request(`https://api.example${path}`, init), bindings, ctx);
  await waitOnExecutionContext(ctx);
  return response;
}

describe("before any collection", () => {
  it("latest rates answer 503 instead of empty numbers", async () => {
    expect((await call("/api/rates/latest")).status).toBe(503);
  });

  it("health reports stale data and no bot", async () => {
    expect(await (await call("/api/health")).json()).toMatchObject({ latestDate: null, stale: true, bot: false });
  });
});

describe("with collected data", () => {
  beforeEach(async () => {
    await collect(env, NOW, fakeNbt({ historyDays: 120 }).fetchFn);
  });

  it("serves latest rates with the previous date and source", async () => {
    const response = await call("/api/rates/latest");
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("max-age");
    const body = await response.json<{ date: string; previousDate: string; source: string; rates: { code: string }[] }>();
    expect(body).toMatchObject({ date: "2026-10-01", previousDate: "2026-09-30", source: "nbt.tj" });
    expect(body.rates.map((r) => r.code)).toContain("KGS");
  });

  it("serves history for a tracked currency", async () => {
    const body = await (await call("/api/history?code=usd&days=30")).json<{ code: string; points: unknown[] }>();
    expect(body.code).toBe("USD");
    expect(body.points.length).toBeGreaterThan(0);
  });

  it.each([
    ["/api/history?code=XYZ", 400],
    ["/api/history?code=USD&days=1", 400],
    ["/api/history?code=USD&days=5000", 400],
    ["/api/history?code=USD&days=abc", 400],
    ["/api/banks?currency=CNY", 400],
    ["/api/nope", 404],
  ])("rejects %s with %i", async (path, status) => {
    expect((await call(path)).status).toBe(status);
  });

  it("serves bank rates with short names and the NBT update time", async () => {
    const body = await (await call("/api/banks?currency=USD")).json<{ updated: string; banks: { name: string; bank: string }[] }>();
    expect(body.updated).toBe("2026-09-24T16:09");
    expect(body.banks.find((b) => b.name === "Алиф Бонк")?.bank).toBe('ҶСК "Алиф Бонк"');
  });

  it("health reports the latest date and the last run", async () => {
    expect(await (await call("/api/health")).json()).toMatchObject({ latestDate: "2026-10-01", lastRun: { ok: true } });
  });
});

describe("CORS and headers", () => {
  it("allows the site origin", async () => {
    const response = await call("/api/health", { headers: { Origin: "https://kursi-tojik.pages.dev" } });
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://kursi-tojik.pages.dev");
  });

  it("does not allow other origins", async () => {
    const response = await call("/api/health", { headers: { Origin: "https://evil.example" } });
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("sends security headers", async () => {
    const response = await call("/api/health");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Strict-Transport-Security")).toContain("max-age");
  });
});

describe("admin and webhook protection", () => {
  it("admin needs the token", async () => {
    expect((await call("/admin/collect", { method: "POST" })).status).toBe(401);
    expect((await call("/admin/collect", { method: "POST", headers: { Authorization: "Bearer wrong" } })).status).toBe(401);
  });

  it("webhook answers 503 while the bot token is not set", async () => {
    expect((await call("/telegram/webhook", { method: "POST", body: "{}" })).status).toBe(503);
  });

  it("webhook rejects calls without the secret header", async () => {
    const withBot = { ...env, TELEGRAM_BOT_TOKEN: "123:abc" };
    expect((await call("/telegram/webhook", { method: "POST", body: "{}" }, withBot)).status).toBe(401);
    const ok = await call("/telegram/webhook", { method: "POST", body: "not json", headers: { "X-Telegram-Bot-Api-Secret-Token": "test-secret" } }, withBot);
    expect(ok.status).toBe(200);
  });
});
