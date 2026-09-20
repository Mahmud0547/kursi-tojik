import { CURRENCY_NAMES, TRACKED_CURRENCIES, type TrackedCurrency } from "./types";
import { formatRate } from "./format";

/** Plain period-decimal formatting suitable for an <input type="number"> value. */
function toInputValue(n: number): string {
  return (Math.round(n * 10000) / 10000).toString();
}

export type RateMap = Record<TrackedCurrency, { value: number; nominal: number }>;

const ALL_CODES = ["TJS", ...TRACKED_CURRENCIES] as const;
type Code = (typeof ALL_CODES)[number];

function tjsPerUnit(code: Code, rates: RateMap): number {
  if (code === "TJS") return 1;
  const r = rates[code];
  return r.value / r.nominal;
}

function label(code: Code): string {
  if (code === "TJS") return "Сомони";
  return CURRENCY_NAMES[code];
}

/** Wires up a two-way currency converter into `container` using the latest fetched rates. */
export function createConverter(container: HTMLElement, rates: RateMap) {
  container.innerHTML = `
    <div class="converter-row">
      <input type="number" id="amt-a" class="mono" value="1" min="0" step="any" inputmode="decimal" aria-label="Сумма" />
      <select id="cur-a" aria-label="Из валюты"></select>
    </div>
    <button type="button" class="converter-swap" id="conv-swap" aria-label="Поменять валюты местами">⇅</button>
    <div class="converter-row">
      <input type="number" id="amt-b" class="mono" min="0" step="any" inputmode="decimal" aria-label="Результат" />
      <select id="cur-b" aria-label="В валюту"></select>
    </div>
    <p class="converter-rate" id="conv-rate-line"></p>
  `;

  const amtA = container.querySelector<HTMLInputElement>("#amt-a")!;
  const amtB = container.querySelector<HTMLInputElement>("#amt-b")!;
  const curA = container.querySelector<HTMLSelectElement>("#cur-a")!;
  const curB = container.querySelector<HTMLSelectElement>("#cur-b")!;
  const swapBtn = container.querySelector<HTMLButtonElement>("#conv-swap")!;
  const rateLine = container.querySelector<HTMLParagraphElement>("#conv-rate-line")!;

  for (const code of ALL_CODES) {
    const optA = document.createElement("option");
    optA.value = code;
    optA.textContent = `${code} — ${label(code)}`;
    curA.appendChild(optA);

    const optB = document.createElement("option");
    optB.value = code;
    optB.textContent = `${code} — ${label(code)}`;
    curB.appendChild(optB);
  }
  curA.value = "USD";
  curB.value = "TJS";

  function recompute(from: "a" | "b") {
    const a = curA.value as Code;
    const b = curB.value as Code;
    const rateA = tjsPerUnit(a, rates);
    const rateB = tjsPerUnit(b, rates);

    if (from === "a") {
      const val = parseFloat(amtA.value);
      amtB.value = Number.isFinite(val) ? toInputValue((val * rateA) / rateB) : "";
    } else {
      const val = parseFloat(amtB.value);
      amtA.value = Number.isFinite(val) ? toInputValue((val * rateB) / rateA) : "";
    }

    rateLine.textContent = `1 ${a} = ${formatRate((rateA / rateB))} ${b}`;
  }

  amtA.addEventListener("input", () => recompute("a"));
  amtB.addEventListener("input", () => recompute("b"));
  curA.addEventListener("change", () => recompute("a"));
  curB.addEventListener("change", () => recompute("a"));
  swapBtn.addEventListener("click", () => {
    const a = curA.value;
    curA.value = curB.value;
    curB.value = a;
    recompute("a");
  });

  recompute("a");
}
