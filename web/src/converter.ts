import { byId, h, storage } from "./dom";
import { formatMoney } from "./format";
import { currencyName, type Lang } from "./i18n";
import { convert, parseAmount, type Rate } from "./money";
import { TRACKED } from "./board";
import type { LatestRate } from "./types";

const STORAGE_KEY = "converter";

/** Fills the converter selects (TJS and tracked currencies first) and keeps the result up to date. */
export function setupConverter(rates: LatestRate[], lang: Lang): void {
  const amount = byId<HTMLInputElement>("amount");
  const from = byId<HTMLSelectElement>("from");
  const to = byId<HTMLSelectElement>("to");
  const result = byId<HTMLOutputElement>("result");
  const error = byId("amount-error");

  const byCode: Record<string, Rate> = Object.fromEntries(rates.map((r) => [r.code, r]));
  const others = rates.map((r) => r.code).filter((c) => !(TRACKED as readonly string[]).includes(c)).sort();
  const codes = ["TJS", ...TRACKED.filter((c) => byCode[c]), ...others];
  const names = Object.fromEntries(rates.map((r) => [r.code, r.name]));
  const options = () => codes.map((code) => h("option", { text: `${code} · ${currencyName(lang, code, names[code] ?? code)}`, attrs: { value: code } }));
  from.replaceChildren(...options());
  to.replaceChildren(...options());

  const saved = storage.get(STORAGE_KEY)?.split(":");
  from.value = saved?.[0] && codes.includes(saved[0]) ? saved[0] : "USD";
  to.value = saved?.[1] && codes.includes(saved[1]) ? saved[1] : "TJS";

  function update() {
    const value = parseAmount(amount.value);
    error.hidden = value !== null || amount.value.trim() === "";
    amount.setAttribute("aria-invalid", String(!error.hidden));
    const converted = value === null ? null : convert(value, from.value, to.value, byCode);
    result.textContent = converted === null ? "—" : formatMoney(converted, lang);
    storage.set(STORAGE_KEY, `${from.value}:${to.value}`);
  }

  amount.addEventListener("input", update);
  from.addEventListener("change", update);
  to.addEventListener("change", update);
  byId("swap").addEventListener("click", () => {
    [from.value, to.value] = [to.value, from.value];
    update();
  });
  update();
}
