import type { BanksFile } from "./types";
import { formatMoney, formatFullDate } from "./format";

const CURRENCIES = ["USD", "EUR", "RUB"] as const;

export function renderBanksTable(table: HTMLTableElement, noteEl: HTMLElement, data: BanksFile) {
  noteEl.textContent = data.note;

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  headRow.innerHTML = `<th>Банк</th>` + CURRENCIES.map((c) => `<th class="mono" colspan="2">${c}</th>`).join("");
  thead.appendChild(headRow);

  const subRow = document.createElement("tr");
  subRow.innerHTML =
    `<th></th>` + CURRENCIES.map(() => `<th class="mono">покупка</th><th class="mono">продажа</th>`).join("");
  thead.appendChild(subRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  for (const bank of data.banks) {
    const tr = document.createElement("tr");
    const nameCell = document.createElement("td");
    nameCell.innerHTML = `
      <div class="bank-name">
        <span>${bank.name}</span>
        ${bank.verified ? "" : `<span class="bank-name__unverified">пример · обновлено ${formatFullDate(bank.updated)}</span>`}
      </div>
    `;
    tr.appendChild(nameCell);

    for (const code of CURRENCIES) {
      const entry = bank.rates[code];
      const buyCell = document.createElement("td");
      const sellCell = document.createElement("td");
      buyCell.className = "mono";
      sellCell.className = "mono";
      buyCell.textContent = entry ? formatMoney(entry.buy, 4) : "—";
      sellCell.textContent = entry ? formatMoney(entry.sell, 4) : "—";
      tr.appendChild(buyCell);
      tr.appendChild(sellCell);
    }

    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
}
