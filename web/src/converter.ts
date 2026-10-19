import { TRACKED } from "./board";
import { byId, h, storage } from "./dom";
import { formatMoney } from "./format";
import { currencyName, translate, type Lang } from "./i18n";
import { convert, parseAmount, type Rate } from "./money";
import { toast } from "./notify";
import { copyText } from "./share";
import type { LatestRate } from "./types";

const STORAGE_KEY = "converter";

/**
 * Amount + two currencies → result, at the official rate. Also shows the same amount in the other
 * main currencies, offers quick amounts and copies the result. Call `setRates` again after a refresh.
 */
export function setupConverter(lang: Lang) {
  const amount = byId<HTMLInputElement>("amount");
  const from = byId<HTMLSelectElement>("from");
  const to = byId<HTMLSelectElement>("to");
  const result = byId<HTMLOutputElement>("result");
  const error = byId("amount-error");
  const multi = byId("multi");
  const t = (key: string, vars?: Record<string, string>) => translate(lang, key, vars);

  let byCode: Record<string, Rate> = {};
  let codes: string[] = [];

  function update() {
    const value = parseAmount(amount.value);
    error.hidden = value !== null || amount.value.trim() === "";
    amount.setAttribute("aria-invalid", String(!error.hidden));
    const converted = value === null ? null : convert(value, from.value, to.value, byCode);
    result.textContent = converted === null ? "—" : formatMoney(converted, lang);
    storage.set(STORAGE_KEY, `${from.value}:${to.value}`);
    renderOthers(value);
  }

  /** The same amount in TJS and the main currencies (except the two already chosen). */
  function renderOthers(value: number | null) {
    const title = byId("multi-title");
    if (value === null) {
      title.textContent = "";
      multi.replaceChildren();
      return;
    }
    title.textContent = t("converter.multi", { amount: formatMoney(value, lang), code: from.value });
    const targets = ["TJS", ...TRACKED].filter((code) => code !== from.value && code !== to.value && (code === "TJS" || byCode[code]));
    multi.replaceChildren(
      ...targets.map((code) => {
        const converted = convert(value, from.value, code, byCode);
        const row = h("button", { class: "multi__row", attrs: { type: "button" } }, [
          h("span", { class: "multi__name" }, [h("b", { text: code }), ` ${currencyName(lang, code, code)}`]),
          h("span", { class: "num", text: converted === null ? "—" : formatMoney(converted, lang) }),
        ]);
        row.addEventListener("click", () => {
          to.value = code;
          update();
        });
        return h("li", {}, [row]);
      }),
    );
  }

  amount.addEventListener("input", update);
  from.addEventListener("change", update);
  to.addEventListener("change", update);
  byId("swap").addEventListener("click", () => {
    [from.value, to.value] = [to.value, from.value];
    update();
  });
  byId("chips").addEventListener("click", (event) => {
    const chip = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-amount]");
    if (!chip) return;
    amount.value = chip.dataset.amount ?? "100";
    update();
  });
  byId("copy").addEventListener("click", async () => {
    if (result.textContent === "—") return;
    const text = `${amount.value.trim()} ${from.value} = ${result.textContent} ${to.value}`;
    if (await copyText(text)) toast(t("converter.copied", { text }));
  });

  return {
    setRates(rates: LatestRate[]) {
      byCode = Object.fromEntries(rates.map((r) => [r.code, r]));
      const others = rates.map((r) => r.code).filter((c) => !(TRACKED as readonly string[]).includes(c)).sort();
      codes = ["TJS", ...TRACKED.filter((c) => byCode[c]), ...others];
      const names = Object.fromEntries(rates.map((r) => [r.code, r.name]));
      const options = () => codes.map((code) => h("option", { text: `${code} · ${currencyName(lang, code, names[code] ?? code)}`, attrs: { value: code } }));

      // Keep the visitor's choice across refreshes and visits.
      const saved = (from.value ? `${from.value}:${to.value}` : storage.get(STORAGE_KEY))?.split(":");
      from.replaceChildren(...options());
      to.replaceChildren(...options());
      from.value = saved?.[0] && codes.includes(saved[0]) ? saved[0] : "USD";
      to.value = saved?.[1] && codes.includes(saved[1]) ? saved[1] : "TJS";
      update();
    },
  };
}
