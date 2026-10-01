/** Number and date formatting. Tajik and Russian use a decimal comma and a space between thousands. */

import type { Lang } from "./i18n";

function grouped(value: number, minDigits: number, maxDigits: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: minDigits, maximumFractionDigits: maxDigits });
}

function localize(text: string, lang: Lang): string {
  if (lang === "en") return text;
  return text.replace(/,/g, " ").replace(".", ",");
}

/** Official rates keep NBT's four decimals: 9,2201. */
export const formatRate = (value: number, lang: Lang) => localize(grouped(value, 4, 4), lang);

/** Money amounts: 922,01 or 1 250,50. */
export const formatMoney = (value: number, lang: Lang) => localize(grouped(value, 2, 2), lang);

/** Signed percent (+0,16% / −0,16%); pass `unsigned` when an arrow already shows the direction. */
export function formatPercent(value: number, lang: Lang, unsigned = false): string {
  const sign = unsigned ? "" : value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${localize(grouped(Math.abs(value), 2, 2), lang)}%`;
}

const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-01" → 01.10.2026 (tj, ru) or Oct 1, 2026 (en). */
export function formatDate(iso: string, lang: Lang): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (lang === "en") return `${EN_MONTHS[Number(m) - 1]} ${Number(d)}, ${y}`;
  return `${d}.${m}.${y}`;
}

/** "2026-09-24T16:09" → 24.09.2026 16:09. */
export function formatDateTime(iso: string, lang: Lang): string {
  return `${formatDate(iso, lang)} ${iso.slice(11, 16)}`;
}

/** Short axis label: 01.10 or Oct 1. */
export function formatDay(iso: string, lang: Lang): string {
  const [, m, d] = iso.slice(0, 10).split("-");
  return lang === "en" ? `${EN_MONTHS[Number(m) - 1]} ${Number(d)}` : `${d}.${m}`;
}
