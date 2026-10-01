import { byId, h } from "./dom";
import { formatDateTime, formatRate } from "./format";
import { translate, type Lang } from "./i18n";
import type { Banks } from "./types";

/** Best for the visitor: the highest price a bank pays (buy) and the lowest it charges (sell). */
export function bestRates(data: Banks): { buy: number | null; sell: number | null } {
  const buys = data.banks.map((b) => b.cashBuy).filter((v): v is number => v !== null);
  const sells = data.banks.map((b) => b.cashSell).filter((v): v is number => v !== null);
  return { buy: buys.length ? Math.max(...buys) : null, sell: sells.length ? Math.min(...sells) : null };
}

/** Rows shown before "All banks" is pressed. */
export const COLLAPSED_ROWS = 8;

/** Banks with the best rates first, then the rest alphabetically. */
export function orderBanks(data: Banks): Banks["banks"] {
  const best = bestRates(data);
  const rank = (b: Banks["banks"][number]) => (b.cashBuy === best.buy ? 0 : b.cashSell === best.sell ? 1 : 2);
  return data.banks
    .filter((b) => b.cashBuy !== null || b.cashSell !== null)
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, "ru"));
}

export function renderBanks(data: Banks, lang: Lang, expanded = false): void {
  const body = byId("banks-body");
  const updated = byId("banks-updated");
  const toggle = byId<HTMLButtonElement>("banks-toggle");
  const all = orderBanks(data);
  const rows = expanded ? all : all.slice(0, COLLAPSED_ROWS);
  toggle.hidden = all.length <= COLLAPSED_ROWS;
  toggle.setAttribute("aria-expanded", String(expanded));
  toggle.textContent = expanded ? translate(lang, "banks.showLess") : translate(lang, "banks.showAll", { count: String(all.length) });
  updated.textContent = data.updated ? translate(lang, "banks.updated", { date: formatDateTime(data.updated, lang) }) : "";
  if (rows.length === 0) {
    body.replaceChildren(h("tr", {}, [h("td", { text: translate(lang, "banks.empty"), attrs: { colspan: "3" } })]));
    return;
  }
  const best = bestRates(data);
  const cell = (value: number | null, isBest: boolean) =>
    h("td", { class: `num-col num${isBest ? " best" : ""}` }, [
      value === null ? "—" : formatRate(value, lang),
      ...(isBest ? [h("span", { class: "best__tag", text: translate(lang, "banks.best") })] : []),
    ]);
  body.replaceChildren(
    ...rows.map((b) =>
      h("tr", {}, [
        h("th", { text: b.name, attrs: { scope: "row", title: b.bank } }),
        cell(b.cashBuy, b.cashBuy !== null && b.cashBuy === best.buy),
        cell(b.cashSell, b.cashSell !== null && b.cashSell === best.sell),
      ]),
    ),
  );
}
