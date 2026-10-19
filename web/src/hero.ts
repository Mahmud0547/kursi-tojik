/** The big number at the top: today's rate of the chosen currency, its change and date. */

import { changeView } from "./board";
import { byId, prefersReducedMotion } from "./dom";
import { formatDate, formatRate } from "./format";
import { translate, type Lang } from "./i18n";
import type { Latest, LatestRate } from "./types";

let shownValue: number | null = null;
let frame = 0;

/** Rolls the number from the old value to the new one, so a change of currency is easy to notice. */
function rollTo(element: HTMLElement, target: number, lang: Lang) {
  cancelAnimationFrame(frame);
  const start = shownValue ?? target * 0.96;
  shownValue = target;
  if (prefersReducedMotion() || start === target) {
    element.textContent = formatRate(target, lang);
    return;
  }
  const began = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - began) / 550);
    const eased = 1 - (1 - t) ** 3;
    element.textContent = formatRate(start + (target - start) * eased, lang);
    if (t < 1) frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
}

/** Shows `code`, or the US dollar when that currency is not in today's list. Returns the rate shown. */
export function renderHero(latest: Latest, code: string, lang: Lang): LatestRate | null {
  const t = (key: string, vars?: Record<string, string>) => translate(lang, key, vars);
  byId("hero-badge").textContent = t("hero.badge", { date: formatDate(latest.date, lang) });
  const rate = latest.rates.find((r) => r.code === code) ?? latest.rates.find((r) => r.code === "USD");
  if (!rate) return null;

  rollTo(byId("hero-value"), rate.value, lang);
  const unit = t("hero.unitFor", { amount: String(rate.nominal), code: rate.code });
  const change = changeView(rate, lang);
  const pill = byId("hero-change");
  if (change && latest.previousDate) {
    pill.textContent = change.text;
    pill.className = `change change--${change.dir}`;
    pill.hidden = false;
    byId("hero-change-text").textContent = `${t("hero.change", { date: formatDate(latest.previousDate, lang) })} · ${unit}`;
  } else {
    pill.hidden = true;
    byId("hero-change-text").textContent = unit;
  }
  return rate;
}
