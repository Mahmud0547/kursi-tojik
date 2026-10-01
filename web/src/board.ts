import { h } from "./dom";
import { formatPercent, formatRate } from "./format";
import { currencyName, translate, type Lang } from "./i18n";
import { changePercent, perUnit } from "./money";
import type { LatestRate } from "./types";

/** Currencies on the board and the chart, in display order (the same list as the API's TRACKED). */
export const TRACKED = ["USD", "EUR", "RUB", "CNY", "KZT", "KGS", "UZS", "GBP"] as const;

/** Change direction with an arrow, so it never depends on colour alone. */
export function changeView(rate: LatestRate, lang: Lang): { text: string; dir: "up" | "down" | "flat" } | null {
  const change = changePercent(perUnit(rate), rate.previousPerUnit);
  if (change === null) return null;
  if (Math.abs(change) < 0.005) return { text: `• ${translate(lang, "board.unchanged")}`, dir: "flat" };
  return { text: `${change > 0 ? "▲" : "▼"} ${formatPercent(Math.abs(change), lang, true)}`, dir: change > 0 ? "up" : "down" };
}

export function renderBoard(list: HTMLElement, rates: LatestRate[], lang: Lang): void {
  const items = TRACKED.flatMap((code) => {
    const rate = rates.find((r) => r.code === code);
    if (!rate) return [];
    const change = changeView(rate, lang);
    return [
      h("li", { class: "board__item" }, [
        h("p", { class: "board__code", text: `${rate.nominal} ${rate.code}`, attrs: { title: currencyName(lang, code, rate.name) } }),
        h("p", { class: "board__value num", text: formatRate(rate.value, lang) }),
        change ? h("p", { class: `change change--${change.dir}`, text: change.text }) : h("p", { class: "change", text: " " }),
      ]),
    ];
  });
  list.replaceChildren(...items);
}
