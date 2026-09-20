import type { Bank, BankRateEntry, BanksFile } from "./types";
import { formatMoney, formatFullDate } from "./format";
import { fetchBanks, type BankCurrency } from "./api";
import { t } from "./i18n";

const CURRENCIES = ["USD", "EUR", "RUB"] as const satisfies readonly BankCurrency[];

/** Загружает курсы банков (наличные) для USD/EUR/RUB через воркер и собирает их в BanksFile. */
export async function loadBanksData(): Promise<BanksFile> {
  const responses = await Promise.all(CURRENCIES.map((code) => fetchBanks(code)));

  const byName = new Map<string, Bank>();
  let updated = "";
  for (let i = 0; i < CURRENCIES.length; i++) {
    const code = CURRENCIES[i];
    const response = responses[i];
    updated = response.updated || updated;
    for (const entry of response.banks) {
      const bank = byName.get(entry.name) ?? {
        id: entry.name,
        name: entry.name,
        updated: response.updated,
        verified: true,
        rates: {},
      };
      bank.rates[code] = { buy: entry.cash_buy, sell: entry.cash_sell };
      byName.set(entry.name, bank);
    }
  }

  return { note: t("banks.note", { date: updated || "—" }), banks: [...byName.values()] };
}

/** Для каждой валюты находит лучшую цену покупки (макс.) и продажи (мин.) среди банков. */
function bestRates(banks: Bank[]): { buy: Partial<Record<BankCurrency, number>>; sell: Partial<Record<BankCurrency, number>> } {
  const buy: Partial<Record<BankCurrency, number>> = {};
  const sell: Partial<Record<BankCurrency, number>> = {};
  for (const code of CURRENCIES) {
    const entries = banks.map((b) => b.rates[code]).filter((e): e is BankRateEntry => !!e);
    if (entries.length === 0) continue;
    buy[code] = Math.max(...entries.map((e) => e.buy));
    sell[code] = Math.min(...entries.map((e) => e.sell));
  }
  return { buy, sell };
}

export function renderBanksTable(table: HTMLTableElement, noteEl: HTMLElement, data: BanksFile) {
  noteEl.textContent = data.note;

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  headRow.innerHTML =
    `<th>${t("banks.table.bank")}</th>` + CURRENCIES.map((c) => `<th class="mono" colspan="2">${c}</th>`).join("");
  thead.appendChild(headRow);

  const subRow = document.createElement("tr");
  subRow.innerHTML =
    `<th></th>` +
    CURRENCIES.map(() => `<th class="mono">${t("banks.table.buy")}</th><th class="mono">${t("banks.table.sell")}</th>`).join("");
  thead.appendChild(subRow);
  table.appendChild(thead);

  const best = bestRates(data.banks);

  const tbody = document.createElement("tbody");
  for (const bank of data.banks) {
    const tr = document.createElement("tr");
    const nameCell = document.createElement("td");
    nameCell.innerHTML = `
      <div class="bank-name">
        <span>${bank.name}</span>
        ${bank.verified ? "" : `<span class="bank-name__unverified">${t("banks.unverified", { date: formatFullDate(bank.updated) })}</span>`}
      </div>
    `;
    tr.appendChild(nameCell);

    for (const code of CURRENCIES) {
      const entry = bank.rates[code];
      const buyCell = document.createElement("td");
      const sellCell = document.createElement("td");
      buyCell.className = "mono" + (entry && entry.buy === best.buy[code] ? " best" : "");
      sellCell.className = "mono" + (entry && entry.sell === best.sell[code] ? " best" : "");
      buyCell.textContent = entry ? formatMoney(entry.buy, 4) : "—";
      sellCell.textContent = entry ? formatMoney(entry.sell, 4) : "—";
      tr.appendChild(buyCell);
      tr.appendChild(sellCell);
    }

    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
}

/** Сравнивает банки по выгоде для выбранной операции (купить/продать валюту) и сумме. */
export function createBankComparator(container: HTMLElement, data: BanksFile) {
  container.innerHTML = `
    <div class="transfer-inputs">
      <select id="cmp-direction" aria-label="${t("banks.comparator.direction")}">
        <option value="buy">${t("banks.comparator.buy")}</option>
        <option value="sell">${t("banks.comparator.sell")}</option>
      </select>
      <select id="cmp-currency" aria-label="${t("banks.comparator.currency")}">
        ${CURRENCIES.map((c) => `<option value="${c}">${c}</option>`).join("")}
      </select>
      <input type="number" id="cmp-amount" class="mono" value="100" min="0" step="any" inputmode="decimal" aria-label="${t("banks.comparator.amount")}" />
      <span class="panel-note" style="margin:0">${t("banks.comparator.hint")}</span>
    </div>
    <div class="transfer-results" id="cmp-results"></div>
  `;

  const directionSelect = container.querySelector<HTMLSelectElement>("#cmp-direction")!;
  const currencySelect = container.querySelector<HTMLSelectElement>("#cmp-currency")!;
  const amountInput = container.querySelector<HTMLInputElement>("#cmp-amount")!;
  const results = container.querySelector<HTMLDivElement>("#cmp-results")!;

  function render() {
    const direction = directionSelect.value as "buy" | "sell";
    const currency = currencySelect.value as BankCurrency;
    const amount = parseFloat(amountInput.value);
    results.innerHTML = "";
    if (!Number.isFinite(amount) || amount <= 0) return;

    const rows = data.banks
      .map((bank) => ({ bank, entry: bank.rates[currency] }))
      .filter((r): r is { bank: Bank; entry: BankRateEntry } => !!r.entry)
      .map(({ bank, entry }) => ({
        bank,
        rate: direction === "buy" ? entry.sell : entry.buy,
        totalTJS: direction === "buy" ? amount * entry.sell : amount * entry.buy,
      }))
      .sort((a, b) => (direction === "buy" ? a.rate - b.rate : b.rate - a.rate));

    rows.forEach(({ bank, rate, totalTJS }, i) => {
      const card = document.createElement("div");
      card.className = "transfer-card" + (i === 0 ? " transfer-card--best" : "");
      card.innerHTML = `
        <div class="transfer-card__head">
          <span class="transfer-card__name">${bank.name}</span>
          ${i === 0 ? `<span class="transfer-card__badge">${t("banks.comparator.best")}</span>` : ""}
        </div>
        <div class="transfer-card__row"><span>${t("banks.comparator.rate")}</span><strong>${formatMoney(rate, 4)}</strong></div>
        <div class="transfer-card__payout">≈ ${formatMoney(totalTJS, 2)} TJS</div>
      `;
      results.appendChild(card);
    });
  }

  directionSelect.addEventListener("change", render);
  currencySelect.addEventListener("change", render);
  amountInput.addEventListener("input", render);
  render();
}
