import "@fontsource-variable/inter/wght.css";
import "./style.css";
import { getBanks, getHealth, getHistory, getLatest } from "./api";
import { renderBanks } from "./banks";
import { changeView, renderBoard, TRACKED } from "./board";
import { RateChart } from "./chart";
import { setupConverter } from "./converter";
import { byId, h, segmented } from "./dom";
import { formatDate, formatMoney, formatRate } from "./format";
import { pageLang, translate } from "./i18n";
import { convert } from "./money";
import type { Banks, Latest } from "./types";

const lang = pageLang();
const t = (key: string, vars?: Record<string, string>) => translate(lang, key, vars);

function renderHero(latest: Latest): void {
  const usd = latest.rates.find((r) => r.code === "USD");
  byId("hero-badge").textContent = t("hero.badge", { date: formatDate(latest.date, lang) });
  if (!usd) return;
  byId("hero-value").textContent = formatRate(usd.value / usd.nominal, lang);
  const change = changeView(usd, lang);
  const pill = byId("hero-change");
  if (change && latest.previousDate) {
    pill.textContent = change.text;
    pill.className = `change change--${change.dir}`;
    pill.hidden = false;
    byId("hero-change-text").textContent = `${t("hero.change", { date: formatDate(latest.previousDate, lang) })} · ${t("hero.unit")}`;
  }
}

function setupChart(latest: Latest): void {
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
      const values = points.map((p) => p.value / p.nominal);
      summary.textContent = points.length
        ? t("chart.summary", {
            code,
            from: formatRate(Math.min(...values), lang),
            to: formatRate(Math.max(...values), lang),
            start: formatDate(points[0]!.date, lang),
            end: formatDate(points[points.length - 1]!.date, lang),
          })
        : "";
    } catch {
      if (id === request) summary.textContent = t("chart.error");
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
}

function setupBanks(): void {
  let request = 0;
  let current: Banks | null = null;
  let expanded = false;
  async function load(currency: string) {
    const id = ++request;
    try {
      const data = await getBanks(currency);
      if (id !== request) return;
      current = data;
      renderBanks(data, lang, expanded);
    } catch {
      if (id === request) byId("banks-updated").textContent = t("banks.error");
    }
  }
  byId("banks-toggle").addEventListener("click", () => {
    expanded = !expanded;
    if (current) renderBanks(current, lang, expanded);
  });
  segmented(byId("banks-currency"), (button) => void load(button.dataset.code ?? "USD"));
  void load("USD");
}

async function setupBot(latest: Latest): Promise<void> {
  const health = await getHealth().catch(() => null);
  if (!health?.bot || !health.botUsername) return;
  byId<HTMLAnchorElement>("bot-link").href = `https://t.me/${encodeURIComponent(health.botUsername)}`;
  const rates = Object.fromEntries(latest.rates.map((r) => [r.code, r]));
  const tjs = convert(100, "USD", "TJS", rates);
  if (tjs !== null) byId("bot-example").textContent = `100 USD = ${formatMoney(tjs, lang)} TJS`;
  byId("bot").hidden = false;
}

async function main(): Promise<void> {
  setupBanks();
  let latest: Latest;
  try {
    latest = await getLatest();
  } catch {
    byId("hero-error").hidden = false;
    byId("hero-badge").textContent = "—";
    return;
  }
  renderHero(latest);
  byId("board-source").textContent = t("board.source", { date: formatDate(latest.date, lang) });
  renderBoard(byId("board"), latest.rates, lang);
  setupConverter(latest.rates, lang);
  setupChart(latest);
  void setupBot(latest);
}

void main();

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => void navigator.serviceWorker.register("/sw.js"));
}
