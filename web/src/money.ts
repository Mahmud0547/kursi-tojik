/** Conversion maths; the same rules as api/src/money.ts. Every currency goes through TJS. */

export interface Rate {
  nominal: number;
  value: number;
}

export const MAX_AMOUNT = 1_000_000_000;

export const perUnit = (rate: Rate) => rate.value / rate.nominal;

export function convert(amount: number, from: string, to: string, rates: Record<string, Rate>): number | null {
  const tjsPer = (code: string) => (code === "TJS" ? 1 : rates[code] ? perUnit(rates[code]) : null);
  const fromRate = tjsPer(from);
  const toRate = tjsPer(to);
  if (fromRate === null || toRate === null) return null;
  return (amount * fromRate) / toRate;
}

/** Reads "100", "1 250,50", "2.75". Null for anything else, negative or absurdly large. */
export function parseAmount(text: string): number | null {
  const clean = text.trim().replace(/[\s\u00a0\u202f]/g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(clean)) return null;
  const value = Number(clean);
  return Number.isFinite(value) && value <= MAX_AMOUNT ? value : null;
}

export function changePercent(current: number, previous: number | null): number | null {
  if (previous === null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}
