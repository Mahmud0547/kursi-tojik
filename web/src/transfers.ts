import type { TransferSystem, TransfersFile } from "./types";
import { formatMoney } from "./format";

function feeFor(system: TransferSystem, amount: number): number {
  const tier =
    system.tiers.find((t) => t.upTo !== null && amount <= t.upTo) ?? system.tiers[system.tiers.length - 1];
  return Math.max(tier.minFee, (amount * tier.feePercent) / 100);
}

/** Wires up the remittance-fee comparison calculator into `container`. */
export function createTransferCalculator(
  container: HTMLElement,
  noteEl: HTMLElement,
  data: TransfersFile,
  tjsPerSendCurrency: Record<"USD" | "RUB", number>,
) {
  noteEl.textContent = data.note;

  container.innerHTML = `
    <div class="transfer-inputs">
      <input type="number" id="tr-amount" class="mono" value="200" min="0" step="any" inputmode="decimal" aria-label="Сумма перевода" />
      <select id="tr-currency" aria-label="Валюта перевода">
        <option value="USD">USD</option>
        <option value="RUB">RUB</option>
      </select>
      <span class="panel-note" style="margin:0">Комиссия и сумма к получению — оценка</span>
    </div>
    <div class="transfer-results" id="tr-results"></div>
  `;

  const amountInput = container.querySelector<HTMLInputElement>("#tr-amount")!;
  const currencySelect = container.querySelector<HTMLSelectElement>("#tr-currency")!;
  const results = container.querySelector<HTMLDivElement>("#tr-results")!;

  function render() {
    const amount = parseFloat(amountInput.value);
    const currency = currencySelect.value as "USD" | "RUB";
    results.innerHTML = "";

    if (!Number.isFinite(amount) || amount <= 0) return;

    const computed = data.systems
      .map((system) => {
        const fee = feeFor(system, amount);
        const net = amount - fee;
        const payoutTJS = net * tjsPerSendCurrency[currency];
        return { system, fee, net, payoutTJS };
      })
      .sort((a, b) => b.payoutTJS - a.payoutTJS);

    computed.forEach(({ system, fee, net, payoutTJS }, i) => {
      const card = document.createElement("div");
      card.className = "transfer-card" + (i === 0 ? " transfer-card--best" : "");
      card.innerHTML = `
        <div class="transfer-card__head">
          <span class="transfer-card__name"><a href="${system.url}" target="_blank" rel="noopener noreferrer">${system.name}</a></span>
          ${i === 0 ? `<span class="transfer-card__badge">Выгоднее всего</span>` : ""}
        </div>
        <div class="transfer-card__row"><span>Комиссия</span><strong>${formatMoney(fee, 2)} ${currency}</strong></div>
        <div class="transfer-card__row"><span>Получатель получит</span><strong>${formatMoney(net, 2)} ${currency}</strong></div>
        <div class="transfer-card__payout">≈ ${formatMoney(payoutTJS, 2)} TJS</div>
      `;
      results.appendChild(card);
    });
  }

  amountInput.addEventListener("input", render);
  currencySelect.addEventListener("change", render);
  render();
}
