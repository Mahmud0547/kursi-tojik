export function formatRate(value: number): string {
  return value.toLocaleString("ru-RU", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

export function formatMoney(value: number, fractionDigits = 2): string {
  return value.toLocaleString("ru-RU", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

export function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
}

export function formatFullDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}
