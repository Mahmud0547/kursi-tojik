/** Every currency the National Bank publishes, with a search box and a star to pin a currency to the board. */

import { byId, h } from "./dom";
import { formatRate } from "./format";
import { currencyName, translate, type Lang } from "./i18n";
import type { LatestRate } from "./types";

/** Rows shown before "Show all" is pressed (search always looks through everything). */
const COLLAPSED_ROWS = 8;

/** Case-insensitive match on the code or any of the names. */
export function matches(query: string, code: string, names: string[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [code, ...names].some((text) => text.toLowerCase().includes(q));
}

export function setupAllRates(lang: Lang, onPin: (code: string) => void) {
  const list = byId("all-rates");
  const search = byId<HTMLInputElement>("search");
  const toggle = byId<HTMLButtonElement>("all-toggle");
  const empty = byId("all-empty");
  const t = (key: string, vars?: Record<string, string>) => translate(lang, key, vars);

  let rates: LatestRate[] = [];
  let pins: string[] = [];
  let expanded = false;

  function render() {
    const query = search.value;
    const found = rates.filter((r) => matches(query, r.code, [r.name, currencyName(lang, r.code, r.name)]));
    const rows = query || expanded ? found : found.slice(0, COLLAPSED_ROWS);

    list.replaceChildren(
      ...rows.map((rate) => {
        const pinned = pins.includes(rate.code);
        const star = h("button", {
          class: "star",
          text: pinned ? "★" : "☆",
          attrs: { type: "button", "aria-pressed": String(pinned), "aria-label": t(pinned ? "all.unpin" : "all.pin", { code: rate.code }) },
        });
        star.addEventListener("click", () => onPin(rate.code));
        return h("li", { class: "all__row" }, [
          h("span", { class: "all__code", text: rate.code }),
          h("span", { class: "all__name", text: currencyName(lang, rate.code, rate.name) }),
          h("span", { class: "all__value num" }, [formatRate(rate.value, lang), h("small", { text: ` / ${rate.nominal}` })]),
          star,
        ]);
      }),
    );
    empty.hidden = found.length > 0;
    toggle.hidden = Boolean(query) || found.length <= COLLAPSED_ROWS;
    toggle.setAttribute("aria-expanded", String(expanded));
    toggle.textContent = expanded ? t("all.showLess") : t("all.showAll", { count: String(found.length) });
    byId("all-count").textContent = t("all.count", { count: String(rates.length) });
  }

  search.addEventListener("input", render);
  toggle.addEventListener("click", () => {
    expanded = !expanded;
    render();
  });

  return {
    update(newRates: LatestRate[], newPins: string[]) {
      rates = [...newRates].sort((a, b) => a.code.localeCompare(b.code));
      pins = newPins;
      render();
    },
  };
}
