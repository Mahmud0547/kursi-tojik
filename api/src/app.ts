/** HTTP routes. Reads come from D1 only, so the site keeps working when nbt.tj is down. */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { handleUpdate, type Update } from "./bot/handle";
import { setupBot, telegramSender } from "./bot/telegram";
import { BANK_CURRENCIES, backfill, collect, TRACKED } from "./collect";
import { bankRates, history, lastRun, latestRates, previousDate } from "./db";
import type { Env } from "./env";

/** Data older than this is reported as stale by /api/health. */
const STALE_AFTER_DAYS = 4;

export const app = new Hono<{ Bindings: Env }>();

app.use("*", secureHeaders({ crossOriginResourcePolicy: "cross-origin" }));
app.use(
  "/api/*",
  cors({
    origin: (origin, c) => (c.env.ALLOWED_ORIGINS.split(",").map((o: string) => o.trim()).includes(origin) ? origin : null),
    allowMethods: ["GET"],
    maxAge: 86400,
  }),
);

const cacheFor = (seconds: number) => ({ "Cache-Control": `public, max-age=${seconds}` });

/** Constant-time comparison for secrets. */
function sameSecret(given: string | undefined, expected: string | undefined): boolean {
  if (!given || !expected) return false;
  const a = new TextEncoder().encode(given);
  const b = new TextEncoder().encode(expected);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

app.get("/", (c) =>
  c.json({
    service: "kursi-tojik-api",
    source: "National Bank of Tajikistan, https://www.nbt.tj",
    endpoints: ["/api/rates/latest", "/api/history?code=USD&days=30", "/api/banks?currency=USD", "/api/health"],
  }),
);

app.get("/api/rates/latest", async (c) => {
  const latest = await latestRates(c.env.DB);
  if (!latest) return c.json({ error: "No data collected yet" }, 503);
  return c.json(
    {
      date: latest.date,
      previousDate: await previousDate(c.env.DB, latest.date),
      source: "nbt.tj",
      rates: latest.rates,
    },
    200,
    cacheFor(300),
  );
});

app.get("/api/history", async (c) => {
  const code = (c.req.query("code") ?? "").toUpperCase();
  if (!(TRACKED as readonly string[]).includes(code)) {
    return c.json({ error: `Unsupported currency. Use one of: ${TRACKED.join(", ")}` }, 400);
  }
  const days = Number.parseInt(c.req.query("days") ?? "30", 10);
  if (!Number.isInteger(days) || days < 2 || days > 400) return c.json({ error: "days must be between 2 and 400" }, 400);
  const from = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const points = await history(c.env.DB, code, from);
  return c.json({ code, days, source: "nbt.tj", points }, 200, cacheFor(900));
});

app.get("/api/banks", async (c) => {
  const currency = (c.req.query("currency") ?? "USD").toUpperCase();
  if (!(BANK_CURRENCIES as readonly string[]).includes(currency)) {
    return c.json({ error: `Unsupported currency. Use one of: ${BANK_CURRENCIES.join(", ")}` }, 400);
  }
  const banks = await bankRates(c.env.DB, currency);
  const updated = banks.map((b) => b.updated).sort().at(-1) ?? null;
  return c.json({ currency, updated, source: "nbt.tj", banks }, 200, cacheFor(900));
});

app.get("/api/health", async (c) => {
  const latest = await latestRates(c.env.DB);
  const run = await lastRun(c.env.DB);
  const ageDays = latest ? (Date.now() - Date.parse(`${latest.date}T00:00:00Z`)) / 86_400_000 : null;
  return c.json({
    latestDate: latest?.date ?? null,
    stale: ageDays === null || ageDays > STALE_AFTER_DAYS,
    lastRun: run ? { at: run.ranAt, ok: run.ok === 1 } : null,
    bot: Boolean(c.env.TELEGRAM_BOT_TOKEN && c.env.TELEGRAM_WEBHOOK_SECRET),
  });
});

// --- owner-only maintenance -------------------------------------------------

app.use("/admin/*", async (c, next) => {
  const token = c.req.header("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!sameSecret(token, c.env.ADMIN_TOKEN)) return c.json({ error: "Unauthorized" }, 401);
  await next();
});

app.post("/admin/collect", async (c) => {
  const days = Number.parseInt(c.req.query("backfill") ?? "0", 10);
  const notes = days > 0 ? await backfill(c.env, Math.min(days, 400), new Date()) : [];
  const result = await collect(c.env, new Date());
  return c.json({ ok: result.ok, notes: [...notes, ...result.notes] });
});

app.post("/admin/telegram/setup", async (c) => {
  if (!c.env.TELEGRAM_BOT_TOKEN || !c.env.TELEGRAM_WEBHOOK_SECRET) return c.json({ error: "Bot token or webhook secret is not set" }, 503);
  await setupBot(c.env.TELEGRAM_BOT_TOKEN, new URL("/telegram/webhook", c.req.url).toString(), c.env.TELEGRAM_WEBHOOK_SECRET);
  return c.json({ ok: true });
});

// --- Telegram ----------------------------------------------------------------

app.post("/telegram/webhook", async (c) => {
  if (!c.env.TELEGRAM_BOT_TOKEN || !c.env.TELEGRAM_WEBHOOK_SECRET) return c.json({ error: "Bot is not configured" }, 503);
  if (!sameSecret(c.req.header("X-Telegram-Bot-Api-Secret-Token"), c.env.TELEGRAM_WEBHOOK_SECRET)) return c.json({ error: "Unauthorized" }, 401);
  let update: Update;
  try {
    update = await c.req.json<Update>();
  } catch {
    return c.json({ ok: true }); // malformed updates are dropped; Telegram must not retry them
  }
  const send = telegramSender(c.env.TELEGRAM_BOT_TOKEN);
  c.executionCtx.waitUntil(handleUpdate(c.env, update, new Date(), send).catch((error) => console.error("bot update failed", error)));
  return c.json({ ok: true });
});

app.notFound((c) => c.json({ error: "Not found" }, 404));
app.onError((error, c) => {
  console.error(error);
  return c.json({ error: "Internal error" }, 500);
});
