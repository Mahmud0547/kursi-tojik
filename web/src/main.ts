import "./style.css";
import { fetchHistory } from "./api";
import { RateChart } from "./chart";
import { createConverter, type RateMap } from "./converter";
import { renderBanksTable, createBankComparator, loadBanksData } from "./banks";
import { createTransferCalculator } from "./transfers";
import { CURRENCY_NAMES, TRACKED_CURRENCIES, type HistoryResponse, type TrackedCurrency } from "./types";
import { formatFullDate, formatPercent, formatRate } from "./format";
import transfersDataRaw from "./data/transfers.json";
import type { TransfersFile } from "./types";

const transfersData = transfersDataRaw as TransfersFile;

const todayEl = document.getElementById("today-date")!;
const statusEl = document.getElementById("update-status")!;
todayEl.textContent = formatFullDate(new Date().toISOString().slice(0, 10));

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

  noteEl.textContent = "Загружаем курсы банков…";

  try {
    const banksData = await loadBanksData();
    renderBanksTable(tableEl, noteEl, banksData);
    createBankComparator(comparatorEl, banksData);
  } catch (err) {
    console.error(err);
    noteEl.textContent = "Курсы временно недоступны";
    tableEl.innerHTML = "";
    comparatorEl.innerHTML = "";
  }
}

async function main() {
  const heroValueEl = document.getElementById("hero-value")!;
  const heroChangeEl = document.getElementById("hero-change")!;
  const boardEl = document.getElementById("board-row")!;
  const chartStatusEl = document.getElementById("chart-status")!;
  const chartContainer = document.getElementById("chart-container")!;
  const currencyTabsEl = document.getElementById("chart-currency-tabs")!;
  const rangeTabsEl = document.getElementById("chart-range-tabs")!;
  const converterEl = document.getElementById("converter")!;

  loadBanks();

  const settled = await Promise.allSettled(
    TRACKED_CURRENCIES.map((c) => fetchHistory(c, 95).then((h) => [c, h] as const)),
  );

  const histories = new Map<TrackedCurrency, HistoryResponse>();
  for (const r of settled) {
    if (r.status === "fulfilled") histories.set(r.value[0], r.value[1]);
  }

  if (histories.size === 0) {
    statusEl.textContent = "нет соединения";
    heroValueEl.textContent = "нет данных";
    chartStatusEl.textContent =
      "Не удалось загрузить курс НБТ. Проверьте, что Cloudflare Worker развёрнут и VITE_WORKER_URL указан верно.";
    createTransferCalculator(
      document.getElementById("transfer-calc")!,
      document.getElementById("transfers-note")!,
      transfersData,
      { USD: 0, RUB: 0 },
    );
    return;
  }

  statusEl.textContent = `обновлено ${formatFullDate(
    [...histories.values()][0].rates.slice(-1)[0].date,
  )}`;

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
      <span class="board-cell__code" title="${CURRENCY_NAMES[code]}">${code}</span>
      <span class="board-cell__value mono">${formatRate(latest)}</span>
      <span class="board-cell__change mono" data-dir="${dir}">${arrow} ${formatPercent(prevPct)}</span>
    `;
    boardEl.appendChild(cell);
  }

  // --- converter ---
  if (Object.keys(latestRates).length === TRACKED_CURRENCIES.length) {
    createConverter(converterEl, latestRates as RateMap);
  } else {
    converterEl.innerHTML = `<p class="panel-note">Конвертер недоступен: часть курсов не загрузилась.</p>`;
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
  statusEl.textContent = "ошибка загрузки";
});
