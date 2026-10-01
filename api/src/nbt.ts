/**
 * National Bank of Tajikistan (nbt.tj) — the only data source of Kursi Tojik.
 *
 * Three documents are used:
 * - daily XML: every official rate for one date;
 * - history XML: one currency over a date range (windows-1251 encoded);
 * - commercial bank rates: an HTML table, one per currency.
 * Parsers are pure functions over text so they can be tested on saved responses in test/fixtures.
 */

export const NBT_HOST = "https://www.nbt.tj";
const UPSTREAM_TIMEOUT_MS = 15_000;

export interface OfficialRate {
  code: string;
  nominal: number;
  /** TJS per `nominal` units, as published. */
  value: number;
  /** English name as NBT publishes it. */
  name: string;
}

export interface HistoryRecord {
  date: string; // YYYY-MM-DD
  code: string;
  nominal: number;
  value: number;
}

export interface BankRate {
  /** Full legal name as published, e.g. ҶСК "Алиф Бонк". */
  bank: string;
  cashBuy: number | null;
  cashSell: number | null;
  noncashBuy: number | null;
  noncashSell: number | null;
  cardBuy: number | null;
  cardSell: number | null;
  /** NBT timestamp in Dushanbe time, YYYY-MM-DDTHH:MM. */
  updated: string;
}

const tag = (body: string, name: string) => new RegExp(`<${name}>\\s*([^<]*?)\\s*</${name}>`).exec(body)?.[1];
const positive = (text: string | undefined) => {
  const value = Number.parseFloat((text ?? "").replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : null;
};

/** Parses the daily XML (`export_xml.php?date=…`). Throws when the document has no rate date. */
export function parseDaily(xml: string): { date: string; rates: OfficialRate[] } {
  const date = /<ValCurs[^>]*\sDate="(\d{4}-\d{2}-\d{2})"/.exec(xml)?.[1];
  if (!date) throw new Error("NBT daily document has no rate date");
  const rates: OfficialRate[] = [];
  for (const [, body = ""] of xml.matchAll(/<Valute[^>]*>([\s\S]*?)<\/Valute>/g)) {
    const code = tag(body, "CharCode");
    const value = positive(tag(body, "Value"));
    const nominal = Number.parseInt(tag(body, "Nominal") ?? "1", 10);
    if (!code || !/^[A-Z]{3}$/.test(code) || value === null || !(nominal > 0)) continue;
    rates.push({ code, nominal, value, name: tag(body, "Name") ?? code });
  }
  return { date, rates };
}

/** Parses the history XML (`export_xml_dynamic.php`). Records come back sorted by date. */
export function parseHistory(xml: string): HistoryRecord[] {
  const records: HistoryRecord[] = [];
  for (const [, dd, mm, yyyy, body = ""] of xml.matchAll(/<Record\s+Date="(\d{2})\.(\d{2})\.(\d{4})"[^>]*>([\s\S]*?)<\/Record>/g)) {
    const code = tag(body, "CharCode");
    const value = positive(tag(body, "Value"));
    const nominal = Number.parseInt(tag(body, "Nominal") ?? "1", 10);
    if (!code || value === null || !(nominal > 0)) continue;
    records.push({ date: `${yyyy}-${mm}-${dd}`, code, nominal, value });
  }
  return records.sort((a, b) => a.date.localeCompare(b.date));
}

const cellText = (html: string) =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .trim();

/** "24.09.2026 16:09" → "2026-09-24T16:09". */
function nbtTimestamp(text: string): string | null {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})$/.exec(text);
  return m ? `${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}` : null;
}

/**
 * Parses the commercial bank table. Columns after the bank name come in buy/sell pairs:
 * interbank, cash, non-cash, e-wallet, cards, money transfers; the last column is the update time.
 * A published 0.0000 means the bank does not offer that operation, so it becomes null.
 */
export function parseBanks(html: string): { banks: BankRate[] } {
  const table = /<table>([\s\S]*?)<\/table>/.exec(html)?.[1] ?? "";
  const banks: BankRate[] = [];
  for (const [row] of table.matchAll(/<tr>[\s\S]*?<\/tr>/g)) {
    const cells = [...row.matchAll(/<td>([\s\S]*?)<\/td>/g)].map((m) => cellText(m[1] ?? ""));
    if (cells.length < 14) continue; // the header row uses <th>
    const updated = nbtTimestamp(cells[13] ?? "");
    const bank = cells[0];
    if (!bank || !updated) continue;
    const n = (i: number) => positive(cells[i]);
    const rate: BankRate = {
      bank,
      cashBuy: n(3),
      cashSell: n(4),
      noncashBuy: n(5),
      noncashSell: n(6),
      cardBuy: n(9),
      cardSell: n(10),
      updated,
    };
    if ([rate.cashBuy, rate.cashSell, rate.noncashBuy, rate.noncashSell, rate.cardBuy, rate.cardSell].every((v) => v === null)) continue;
    banks.push(rate);
  }
  return { banks };
}

/** The name inside quotes ("Алиф Бонк"), or the whole name when it has no legal-form prefix. */
export function shortBankName(full: string): string {
  return /["“«]([^"”»]+)["”»]/.exec(full)?.[1]?.trim() ?? full.trim();
}

/** NBT history exports are windows-1251; other documents are UTF-8. */
export function decodeNbt(buffer: ArrayBuffer, encoding: "windows-1251" | "utf-8"): string {
  return new TextDecoder(encoding).decode(buffer);
}

type Fetch = typeof fetch;

async function get(url: string, fetchFn: Fetch): Promise<ArrayBuffer> {
  const response = await fetchFn(url, { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`nbt.tj answered ${response.status} for ${url}`);
  return response.arrayBuffer();
}

export async function fetchDaily(date: string, fetchFn: Fetch = fetch) {
  const xml = decodeNbt(await get(`${NBT_HOST}/en/kurs/export_xml.php?date=${date}&export=xmlout`, fetchFn), "utf-8");
  return parseDaily(xml);
}

export async function fetchHistory(code: string, from: string, to: string, fetchFn: Fetch = fetch) {
  const url = `${NBT_HOST}/en/kurs/export_xml_dynamic.php?d1=${from}&d2=${to}&cs=${code}&export=xml`;
  return parseHistory(decodeNbt(await get(url, fetchFn), "windows-1251"));
}

export async function fetchBanks(currency: string, fetchFn: Fetch = fetch) {
  const html = decodeNbt(await get(`${NBT_HOST}/tj/kurs/kurs_kommer_bank.php?currency=${currency}`, fetchFn), "utf-8");
  return parseBanks(html);
}
