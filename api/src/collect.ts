/** Scheduled collection from nbt.tj into D1. Every step is independent: one failure does not stop the others. */

import { countRates, logRun, replaceBanks, saveDaily, saveHistory } from "./db";
import type { Env } from "./env";
import { fetchBanks, fetchDaily, fetchHistory } from "./nbt";

/** Currencies with history, a chart and a place on the board. Order is the display order. */
export const TRACKED = ["USD", "EUR", "RUB", "CNY", "KZT", "KGS", "UZS", "GBP"] as const;
/** Currencies NBT publishes commercial bank rates for. */
export const BANK_CURRENCIES = ["USD", "EUR", "RUB"] as const;
/** How much history the first run downloads. */
export const BACKFILL_DAYS = 400;

const DUSHANBE_OFFSET_MS = 5 * 60 * 60 * 1000; // UTC+5, no daylight saving

/** Calendar date in Dushanbe, YYYY-MM-DD. */
export function dushanbeDate(now: Date, minusDays = 0): string {
  return new Date(now.getTime() + DUSHANBE_OFFSET_MS - minusDays * 86_400_000).toISOString().slice(0, 10);
}

export async function backfill(env: Env, days: number, now: Date, fetchFn: typeof fetch = fetch): Promise<string[]> {
  const notes: string[] = [];
  for (const code of TRACKED) {
    try {
      const records = await fetchHistory(code, dushanbeDate(now, days), dushanbeDate(now), fetchFn);
      await saveHistory(env.DB, records);
      notes.push(`${code} history ${records.length}`);
    } catch (error) {
      notes.push(`${code} history failed: ${String(error)}`);
    }
  }
  return notes;
}

/** One collection run: today's official rates, bank rates, and history on the very first run. */
export async function collect(env: Env, now: Date, fetchFn: typeof fetch = fetch): Promise<{ ok: boolean; notes: string[] }> {
  const notes: string[] = [];
  let ok = true;

  if ((await countRates(env.DB, "USD")) < 30) notes.push(...(await backfill(env, BACKFILL_DAYS, now, fetchFn)));

  try {
    const daily = await fetchDaily(dushanbeDate(now), fetchFn);
    await saveDaily(env.DB, daily.date, daily.rates);
    notes.push(`daily ${daily.date}: ${daily.rates.length} rates`);
  } catch (error) {
    ok = false;
    notes.push(`daily failed: ${String(error)}`);
  }

  for (const currency of BANK_CURRENCIES) {
    try {
      const { banks } = await fetchBanks(currency, fetchFn);
      await replaceBanks(env.DB, currency, banks, now.toISOString());
      notes.push(`banks ${currency}: ${banks.length}`);
      if (banks.length === 0) ok = false;
    } catch (error) {
      ok = false;
      notes.push(`banks ${currency} failed: ${String(error)}`);
    }
  }

  await logRun(env.DB, now.toISOString(), ok, notes.join("; "));
  return { ok, notes };
}
