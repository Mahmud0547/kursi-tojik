import { getBanks } from "./api";
import { byId, h, segmented } from "./dom";
import { formatDateTime, formatMoney, formatRate } from "./format";
import { translate, type Lang } from "./i18n";
import { parseAmount } from "./money";
import { rankOffers, saving, type Direction } from "./planner";
import type { Banks, LatestRate } from "./types";

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

/** The "Where to exchange" answer: best and worst bank for the amount, the difference and the official rate. */
function renderPlanner(data: Banks | null, official: LatestRate | undefined, lang: Lang, amountText: string, direction: Direction): void {
  const box = byId("planner-result");
  const t = (key: string, vars?: Record<string, string>) => translate(lang, key, vars);
  const amount = parseAmount(amountText);
  if (amount === null) {
    box.replaceChildren(h("p", { class: "error", text: t("planner.invalid") }));
    return;
  }
  const offers = data ? rankOffers(data.banks, amount, direction) : [];
  if (offers.length === 0) {
    box.replaceChildren(h("p", { class: "muted", text: t("planner.none") }));
    return;
  }
  const best = offers[0]!;
  const worst = offers[offers.length - 1]!;
  const verb = t(direction === "sell" ? "planner.youGet" : "planner.youPay");
  const offerCard = (label: string, offer: typeof best, kind: string) =>
    h("div", { class: `offer offer--${kind}` }, [
      h("p", { class: "offer__label", text: label }),
      h("p", { class: "offer__bank", text: offer.bank }),
      h("p", { class: "offer__total num" }, [`${verb} `, h("b", { text: `${formatMoney(offer.total, lang)} TJS` })]),
      h("p", { class: "offer__rate muted num", text: `1 ${data!.currency} = ${formatRate(offer.rate, lang)}` }),
    ]);

  const children = [h("div", { class: "offers" }, [offerCard(t("planner.best"), best, "best"), offerCard(t("planner.worst"), worst, "worst")])];
  const diff = saving(offers);
  if (diff > 0) {
    children.push(h("p", { class: "planner__saving", text: t(direction === "sell" ? "planner.saving" : "planner.savingBuy", { amount: formatMoney(diff, lang) }) }));
  }
  if (official) {
    children.push(h("p", { class: "muted", text: t("planner.official", { amount: formatMoney((amount * official.value) / official.nominal, lang) }) }));
  }
  box.replaceChildren(...children);
}

/** Bank table and the exchange planner share one currency switch and one download. */
export function setupExchange(lang: Lang, officialRate: (code: string) => LatestRate | undefined) {
  const amount = byId<HTMLInputElement>("planner-amount");
  let currency = "USD";
  let direction: Direction = "sell";
  let current: Banks | null = null;
  let expanded = false;
  let request = 0;

  const redrawPlanner = () => renderPlanner(current, officialRate(currency), lang, amount.value, direction);

  async function load() {
    const id = ++request;
    try {
      const data = await getBanks(currency);
      if (id !== request) return; // a newer choice is already loading
      current = data;
      renderBanks(data, lang, expanded);
    } catch {
      if (id !== request) return;
      current = null;
      byId("banks-updated").textContent = translate(lang, "banks.error");
    }
    redrawPlanner();
  }

  byId("banks-toggle").addEventListener("click", () => {
    expanded = !expanded;
    if (current) renderBanks(current, lang, expanded);
  });
  segmented(byId("banks-currency"), (button) => {
    currency = button.dataset.code ?? "USD";
    void load();
  });
  segmented(byId("planner-direction"), (button) => {
    direction = button.dataset.direction === "buy" ? "buy" : "sell";
    redrawPlanner();
  });
  amount.addEventListener("input", redrawPlanner);
  void load();

  return { reload: load, redraw: redrawPlanner };
}
