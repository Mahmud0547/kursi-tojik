import { getLocale } from "./i18n";

export function formatRate(value: number): string {
  return value.toLocaleString(getLocale(), { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

export function formatMoney(value: number, fractionDigits = 2): string {
  return value.toLocaleString(getLocale(), {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString(getLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

export function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat(getLocale(), { day: "2-digit", month: "short" }).format(date);
}

export function formatFullDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat(getLocale(), { day: "numeric", month: "long", year: "numeric" }).format(date);
}
