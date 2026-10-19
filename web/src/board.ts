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

/** The main currencies plus the ones the visitor pinned. */
export function boardCodes(pins: string[]): string[] {
  return [...TRACKED, ...pins.filter((code) => !(TRACKED as readonly string[]).includes(code))];
}

/**
 * One card per currency. A card is a button: pressing it puts that currency in the big number at the top.
 * `selected` is the currency shown there now.
 */
export function renderBoard(list: HTMLElement, rates: LatestRate[], lang: Lang, pins: string[], selected: string, onSelect: (code: string) => void): void {
  const items = boardCodes(pins).flatMap((code) => {
    const rate = rates.find((r) => r.code === code);
    if (!rate) return [];
    const change = changeView(rate, lang);
    const button = h("button", { class: "board__item", attrs: { type: "button", "aria-pressed": String(code === selected) } }, [
      h("span", { class: "board__code", text: `${rate.nominal} ${rate.code}` }),
      h("span", { class: "board__name", text: currencyName(lang, code, rate.name) }),
      h("span", { class: "board__value num", text: formatRate(rate.value, lang) }),
      change ? h("span", { class: `change change--${change.dir}`, text: change.text }) : h("span", { class: "change", text: " " }),
    ]);
    button.addEventListener("click", () => onSelect(code));
    return [h("li", {}, [button])];
  });
  list.replaceChildren(...items);
}
