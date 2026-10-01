/** Conversion maths shared by the API and the bot. Every currency goes through TJS. */

export interface Rate {
  nominal: number;
  /** TJS per `nominal` units. */
  value: number;
}

/** Largest amount accepted from people: enough for any real exchange, small enough to stay precise. */
export const MAX_AMOUNT = 1_000_000_000;

export const perUnit = (rate: Rate) => rate.value / rate.nominal;

/** Converts `amount` between two codes (TJS included). Null when a rate is missing. */
export function convert(amount: number, from: string, to: string, rates: Record<string, Rate>): number | null {
  const tjsPer = (code: string) => (code === "TJS" ? 1 : rates[code] ? perUnit(rates[code]) : null);
  const fromRate = tjsPer(from);
  const toRate = tjsPer(to);
  if (fromRate === null || toRate === null) return null;
  return (amount * fromRate) / toRate;
}

/** Reads amounts the way people type them: "1 000,50", "1,5", "2.75". Null for anything else. */
export function parseAmount(text: string): number | null {
  const clean = text.trim().replace(/[\s\u00a0]/g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(clean)) return null;
  const value = Number(clean);
  return Number.isFinite(value) && value <= MAX_AMOUNT ? value : null;
}

/** Signed change in percent against the previous rate, or null when there is none. */
export function changePercent(current: number, previous: number | null): number | null {
  if (previous === null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}
