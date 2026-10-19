/** "Rate history": currency and period switches, the chart, and low / high / change for the period. */

import { getHistory } from "./api";
import { TRACKED } from "./board";
import { periodStats, RateChart } from "./chart";
import { byId, h, segmented } from "./dom";
import { formatDate, formatPercent, formatRate } from "./format";
import { translate, type Lang } from "./i18n";
import type { HistoryPoint, Latest } from "./types";

function renderStats(points: HistoryPoint[], lang: Lang) {
  const stats = periodStats(points);
  const t = (key: string) => translate(lang, key);
  const item = (label: string, value: string, className = "") =>
    h("div", { class: "stats__item" }, [h("dt", { text: label }), h("dd", { class: `num ${className}`, text: value })]);
  byId("chart-stats").replaceChildren(
    ...(stats
      ? [
          item(t("chart.low"), formatRate(stats.low, lang)),
          item(t("chart.high"), formatRate(stats.high, lang)),
          item(t("chart.change"), formatPercent(stats.change, lang), stats.change > 0 ? "change--up" : stats.change < 0 ? "change--down" : ""),
        ]
      : []),
  );
}

export function setupHistory(latest: Latest, lang: Lang) {
  const chart = new RateChart(byId("chart"), lang);
  const summary = byId("chart-summary");
  const currencyGroup = byId("chart-currency");
  const available = TRACKED.filter((code) => latest.rates.some((r) => r.code === code)).slice(0, 4);
  currencyGroup.replaceChildren(
    ...available.map((code, i) => h("button", { text: code, attrs: { type: "button", "data-code": code, "aria-pressed": String(i === 0) } })),
  );
  let code: string = available[0] ?? "USD";
  let days = 30;
  let request = 0;

  async function load() {
    const id = ++request;
    try {
      const points = await getHistory(code, days);
      if (id !== request) return; // a newer selection is already loading
      chart.setData(points);
      renderStats(points, lang);
      const values = points.map((p) => p.value / p.nominal);
      summary.textContent = points.length
        ? translate(lang, "chart.summary", {
            code,
            from: formatRate(Math.min(...values), lang),
            to: formatRate(Math.max(...values), lang),
            start: formatDate(points[0]!.date, lang),
            end: formatDate(points[points.length - 1]!.date, lang),
          })
        : "";
    } catch {
      if (id === request) summary.textContent = translate(lang, "chart.error");
    }
  }
  segmented(currencyGroup, (button) => {
    code = button.dataset.code ?? code;
    void load();
  });
  segmented(byId("chart-range"), (button) => {
    days = Number(button.dataset.days) || 30;
    void load();
  });
  void load();
  return { reload: load };
}
