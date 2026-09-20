import "./style.css";
import { fetchHistory } from "./api";
import { RateChart } from "./chart";
import { createConverter, type RateMap } from "./converter";
import { renderBanksTable, createBankComparator, loadBanksData } from "./banks";
import { createTransferCalculator } from "./transfers";
import { TRACKED_CURRENCIES, type HistoryResponse, type TrackedCurrency } from "./types";
import { formatFullDate, formatPercent, formatRate } from "./format";
import { getLang, setLang, t, currencyLabel, type Lang } from "./i18n";
import { getTheme, toggleTheme } from "./theme";
import transfersDataRaw from "./data/transfers.json";
import type { TransfersFile } from "./types";

const transfersData = transfersDataRaw as TransfersFile;

const todayEl = document.getElementById("today-date")!;
const statusEl = document.getElementById("update-status")!;

/** Проставляет переведённые тексты на статичные элементы разметки. */
function applyStaticTexts() {
  todayEl.textContent = formatFullDate(new Date().toISOString().slice(0, 10));
  document.getElementById("hero-heading")!.textContent = t("hero.title");
  document.getElementById("hero-unit")!.textContent = t("hero.unit");
  document.getElementById("converter-heading")!.textContent = t("converter.title");
  document.getElementById("chart-heading")!.textContent = t("chart.title");
  document.getElementById("chart-currency-tabs")!.setAttribute("aria-label", t("chart.currencyTabs"));
  document.getElementById("chart-range-tabs")!.setAttribute("aria-label", t("chart.rangeTabs"));
  document.getElementById("banks-heading")!.textContent = t("banks.title");
  document.getElementById("transfers-heading")!.textContent = t("transfers.title");
  document.getElementById("chart-status")!.textContent = t("chart.loading");

  const rangeLabels: Record<string, string> = { "7": t("chart.range.7"), "30": t("chart.range.30"), "90": t("chart.range.90") };
  document.querySelectorAll<HTMLButtonElement>("#chart-range-tabs button[data-range]").forEach((btn) => {
    btn.textContent = rangeLabels[btn.dataset.range!];
  });

  document.getElementById("footer-official")!.innerHTML =
    `${t("footer.official")} (<a href="https://www.nbt.tj" target="_blank" rel="noopener noreferrer">nbt.tj</a>). ${t("footer.disclaimer")}`;
  document.getElementById("footer-about")!.textContent = t("footer.about");

  const langBtn = document.getElementById("lang-toggle")!;
  langBtn.textContent = t("lang.toggle");
  const themeBtn = document.getElementById("theme-toggle")!;
  themeBtn.setAttribute("aria-label", t("theme.toggle"));
  themeBtn.textContent = getTheme() === "dark" ? "☀" : "☾";
}

function setupHeaderControls() {
  document.getElementById("lang-toggle")!.addEventListener("click", () => {
    const next: Lang = getLang() === "tj" ? "ru" : "tj";
    setLang(next);
    location.reload();
  });
  document.getElementById("theme-toggle")!.addEventListener("click", () => {
    toggleTheme();
    document.getElementById("theme-toggle")!.textContent = getTheme() === "dark" ? "☀" : "☾";
  });
}

function dayChange(history: HistoryResponse): { latest: number; prevPct: number; dir: "up" | "down" | "flat" } {
  const rates = history.rates;
  const latestPoint = rates[rates.length - 1];
  const latest = latestPoint.value / latestPoint.nominal;
  const prevPoint = rates.length > 1 ? rates[rates.length - 2] : latestPoint;
  const prev = prevPoint.value / prevPoint.nominal;
  const pct = prev === 0 ? 0 : ((latest - prev) / prev) * 100;
  const dir = pct > 0.0005 ? "up" : pct < -0.0005 ? "down" : "flat";
  return { latest, prevPct: pct, dir };
}

/** Загружает курсы банков через воркер и рендерит таблицу либо заглушку об ошибке. */
async function loadBanks() {
  const noteEl = document.getElementById("banks-note")!;
  const tableEl = document.getElementById("banks-table") as HTMLTableElement;
  const comparatorEl = document.getElementById("bank-comparator")!;

  noteEl.textContent = t("banks.loading");

  try {
    const banksData = await loadBanksData();
    renderBanksTable(tableEl, noteEl, banksData);
    createBankComparator(comparatorEl, banksData);
  } catch (err) {
    console.error(err);
    noteEl.textContent = t("banks.error");
    tableEl.innerHTML = "";
    comparatorEl.innerHTML = "";
  }
}

async function main() {
  applyStaticTexts();
  setupHeaderControls();

  const heroValueEl = document.getElementById("hero-value")!;
  const heroChangeEl = document.getElementById("hero-change")!;
  const boardEl = document.getElementById("board-row")!;
  const chartStatusEl = document.getElementById("chart-status")!;
  const chartContainer = document.getElementById("chart-container")!;
  const currencyTabsEl = document.getElementById("chart-currency-tabs")!;
  const rangeTabsEl = document.getElementById("chart-range-tabs")!;
  const converterEl = document.getElementById("converter")!;

  statusEl.textContent = t("header.status.loading");
  loadBanks();

  const settled = await Promise.allSettled(
    TRACKED_CURRENCIES.map((c) => fetchHistory(c, 95).then((h) => [c, h] as const)),
  );

  const histories = new Map<TrackedCurrency, HistoryResponse>();
  for (const r of settled) {
    if (r.status === "fulfilled") histories.set(r.value[0], r.value[1]);
  }

  if (histories.size === 0) {
    statusEl.textContent = t("header.status.offline");
    heroValueEl.textContent = t("hero.noData");
    chartStatusEl.textContent = t("chart.error");
    createTransferCalculator(
      document.getElementById("transfer-calc")!,
      document.getElementById("transfers-note")!,
      transfersData,
      { USD: 0, RUB: 0 },
    );
    return;
  }

  statusEl.textContent = t("header.status.updated", {
    date: formatFullDate([...histories.values()][0].rates.slice(-1)[0].date),
  });

  // --- hero (USD) ---
  const usdHistory = histories.get("USD");
  if (usdHistory) {
    const { latest, prevPct, dir } = dayChange(usdHistory);
    heroValueEl.textContent = formatRate(latest);
    heroChangeEl.textContent = formatPercent(prevPct);
    heroChangeEl.dataset.dir = dir;
  }

  // --- exchange board row ---
  boardEl.innerHTML = "";
  const latestRates: Partial<RateMap> = {};
  for (const code of TRACKED_CURRENCIES) {
    const history = histories.get(code);
    const cell = document.createElement("div");
    cell.className = "board-cell";
    cell.setAttribute("role", "listitem");

    if (!history) {
      cell.innerHTML = `<span class="board-cell__code">${code}</span><span class="board-cell__value">—</span>`;
      boardEl.appendChild(cell);
      continue;
    }

    const last = history.rates[history.rates.length - 1];
    latestRates[code] = { value: last.value, nominal: last.nominal };
    const { latest, prevPct, dir } = dayChange(history);
    const arrow = dir === "up" ? "▲" : dir === "down" ? "▼" : "•";

    cell.innerHTML = `
      <span class="board-cell__code" title="${currencyLabel(code)}">${code}</span>
      <span class="board-cell__value mono">${formatRate(latest)}</span>
      <span class="board-cell__change mono" data-dir="${dir}">${arrow} ${formatPercent(prevPct)}</span>
    `;
    boardEl.appendChild(cell);
  }

  // --- converter ---
  if (Object.keys(latestRates).length === TRACKED_CURRENCIES.length) {
    createConverter(converterEl, latestRates as RateMap);
  } else {
    converterEl.innerHTML = `<p class="panel-note">${t("converter.unavailable")}</p>`;
  }

  // --- chart ---
  let activeCurrency: TrackedCurrency = histories.has("USD") ? "USD" : ([...histories.keys()][0] as TrackedCurrency);
  let activeRange = 30;
  let chart: RateChart | null = null;

  currencyTabsEl.innerHTML = "";
  for (const code of TRACKED_CURRENCIES) {
    if (!histories.has(code)) continue;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = code;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", String(code === activeCurrency));
    btn.addEventListener("click", () => {
      activeCurrency = code;
      currencyTabsEl.querySelectorAll("button").forEach((b) => b.setAttribute("aria-selected", "false"));
      btn.setAttribute("aria-selected", "true");
      drawChart();
    });
    currencyTabsEl.appendChild(btn);
  }

  rangeTabsEl.querySelectorAll<HTMLButtonElement>("button[data-range]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeRange = parseInt(btn.dataset.range!, 10);
      rangeTabsEl.querySelectorAll("button").forEach((b) => b.setAttribute("aria-selected", "false"));
      btn.setAttribute("aria-selected", "true");
      drawChart();
    });
  });

  function drawChart() {
    const history = histories.get(activeCurrency);
    if (!history) return;
    chartStatusEl.remove();
    if (!chart) chart = new RateChart(chartContainer);
    const slice = history.rates.slice(-activeRange).map((r) => ({ ...r, value: r.value / r.nominal }));
    chart.setData(slice);
  }

  if (histories.size > 0) drawChart();

  // --- transfer calculator ---
  const usdRate = latestRates.USD ? latestRates.USD.value / latestRates.USD.nominal : 0;
  const rubRate = latestRates.RUB ? latestRates.RUB.value / latestRates.RUB.nominal : 0;
  createTransferCalculator(
    document.getElementById("transfer-calc")!,
    document.getElementById("transfers-note")!,
    transfersData,
    { USD: usdRate, RUB: rubRate },
  );
}

main().catch((err) => {
  console.error(err);
  statusEl.textContent = t("header.status.offline");
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => console.error("SW registration failed", err));
  });
}
