/** All D1 queries live here; everything is parameterised. */

import type { BankRate, HistoryRecord, OfficialRate } from "./nbt";
import { shortBankName } from "./nbt";

export interface LatestRate {
  code: string;
  name: string;
  nominal: number;
  value: number;
  /** TJS per one unit on the previous NBT date, for the daily change. */
  previousPerUnit: number | null;
}

export async function saveDaily(db: D1Database, date: string, rates: OfficialRate[]): Promise<void> {
  if (rates.length === 0) return;
  await db.batch(
    rates.flatMap((r) => [
      db.prepare("INSERT INTO rates (date, code, nominal, value) VALUES (?1, ?2, ?3, ?4) ON CONFLICT (date, code) DO UPDATE SET nominal = ?3, value = ?4")
        .bind(date, r.code, r.nominal, r.value),
      db.prepare("INSERT INTO currencies (code, name_en) VALUES (?1, ?2) ON CONFLICT (code) DO UPDATE SET name_en = ?2").bind(r.code, r.name),
    ]),
  );
}

export async function saveHistory(db: D1Database, records: HistoryRecord[]): Promise<void> {
  // D1 limits statements per batch, so large backfills go in chunks.
  for (let i = 0; i < records.length; i += 200) {
    await db.batch(
      records.slice(i, i + 200).map((r) =>
        db.prepare("INSERT INTO rates (date, code, nominal, value) VALUES (?1, ?2, ?3, ?4) ON CONFLICT (date, code) DO NOTHING")
          .bind(r.date, r.code, r.nominal, r.value),
      ),
    );
  }
}

export async function latestRates(db: D1Database): Promise<{ date: string; rates: LatestRate[] } | null> {
  const row = await db.prepare("SELECT MAX(date) AS date FROM rates").first<{ date: string | null }>();
  if (!row?.date) return null;
  const { results } = await db
    .prepare(
      `SELECT r.code, COALESCE(c.name_en, r.code) AS name, r.nominal, r.value,
              (SELECT p.value * 1.0 / p.nominal FROM rates p WHERE p.code = r.code AND p.date < r.date ORDER BY p.date DESC LIMIT 1) AS previousPerUnit
         FROM rates r LEFT JOIN currencies c ON c.code = r.code
        WHERE r.date = ?1
        ORDER BY r.code`,
    )
    .bind(row.date)
    .all<LatestRate>();
  return { date: row.date, rates: results };
}

/** The NBT date before `date` (for "change since …" labels). */
export async function previousDate(db: D1Database, date: string): Promise<string | null> {
  const row = await db.prepare("SELECT MAX(date) AS date FROM rates WHERE date < ?1").bind(date).first<{ date: string | null }>();
  return row?.date ?? null;
}

export async function history(db: D1Database, code: string, fromDate: string) {
  const { results } = await db
    .prepare("SELECT date, nominal, value FROM rates WHERE code = ?1 AND date >= ?2 ORDER BY date")
    .bind(code, fromDate)
    .all<{ date: string; nominal: number; value: number }>();
  return results;
}

export async function countRates(db: D1Database, code: string): Promise<number> {
  const row = await db.prepare("SELECT COUNT(*) AS n FROM rates WHERE code = ?1").bind(code).first<{ n: number }>();
  return row?.n ?? 0;
}

export async function replaceBanks(db: D1Database, currency: string, banks: BankRate[], fetchedAt: string): Promise<void> {
  if (banks.length === 0) return; // keep the last good snapshot rather than an empty table
  await db.batch([
    db.prepare("DELETE FROM bank_rates WHERE currency = ?1").bind(currency),
    ...banks.map((b) =>
      db.prepare(
        `INSERT INTO bank_rates (currency, bank, cash_buy, cash_sell, noncash_buy, noncash_sell, card_buy, card_sell, updated, fetched_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
      ).bind(currency, b.bank, b.cashBuy, b.cashSell, b.noncashBuy, b.noncashSell, b.cardBuy, b.cardSell, b.updated, fetchedAt),
    ),
  ]);
}

export async function bankRates(db: D1Database, currency: string) {
  const { results } = await db
    .prepare(
      `SELECT bank, cash_buy AS cashBuy, cash_sell AS cashSell, noncash_buy AS noncashBuy, noncash_sell AS noncashSell,
              card_buy AS cardBuy, card_sell AS cardSell, updated, fetched_at AS fetchedAt
         FROM bank_rates WHERE currency = ?1 ORDER BY bank`,
    )
    .bind(currency)
    .all<BankRate & { fetchedAt: string }>();
  return results.map((r) => ({ ...r, name: shortBankName(r.bank) }));
}

export async function logRun(db: D1Database, ranAt: string, ok: boolean, detail: string): Promise<void> {
  await db.prepare("INSERT OR REPLACE INTO collect_runs (ran_at, ok, detail) VALUES (?1, ?2, ?3)").bind(ranAt, ok ? 1 : 0, detail).run();
  await db.prepare("DELETE FROM collect_runs WHERE ran_at < date(?1, '-30 days')").bind(ranAt).run();
}

export async function lastRun(db: D1Database) {
  return db.prepare("SELECT ran_at AS ranAt, ok, detail FROM collect_runs ORDER BY ran_at DESC LIMIT 1").first<{ ranAt: string; ok: number; detail: string }>();
}

export type BotLang = "tj" | "ru" | "en";

export async function botUser(db: D1Database, chatId: number) {
  return db.prepare("SELECT chat_id AS chatId, lang, subscribed FROM bot_users WHERE chat_id = ?1").bind(chatId)
    .first<{ chatId: number; lang: BotLang; subscribed: number }>();
}

export async function saveBotUser(db: D1Database, chatId: number, lang: BotLang, now: string): Promise<void> {
  await db.prepare("INSERT INTO bot_users (chat_id, lang, created_at) VALUES (?1, ?2, ?3) ON CONFLICT (chat_id) DO UPDATE SET lang = ?2")
    .bind(chatId, lang, now).run();
}

export async function setSubscribed(db: D1Database, chatId: number, subscribed: boolean): Promise<void> {
  await db.prepare("UPDATE bot_users SET subscribed = ?2 WHERE chat_id = ?1").bind(chatId, subscribed ? 1 : 0).run();
}

export async function subscribers(db: D1Database) {
  const { results } = await db.prepare("SELECT chat_id AS chatId, lang FROM bot_users WHERE subscribed = 1").all<{ chatId: number; lang: BotLang }>();
  return results;
}
