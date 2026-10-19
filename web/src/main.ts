import "@fontsource-variable/inter/wght.css";
import "./style.css";
import { setupAllRates } from "./all-rates";
import { getHealth, getLatest } from "./api";
import { setupExchange } from "./banks";
import { renderBoard } from "./board";
import { setupConverter } from "./converter";
import { byId, prefersReducedMotion } from "./dom";
import { formatDate, formatMoney, formatRate } from "./format";
import { renderHero } from "./hero";
import { setupHistory } from "./history";
import { pageLang, translate } from "./i18n";
import { convert } from "./money";
import { setStatus, toast } from "./notify";
import { applyLook, prefs } from "./prefs";
import { setupSettings } from "./settings";
import { shareText } from "./share";
import { setupTabs } from "./tabs";
import type { Latest } from "./types";

applyLook();
document.documentElement.classList.add("js");

const lang = pageLang();
const t = (key: string, vars?: Record<string, string>) => translate(lang, key, vars);

/** When the app comes back from the background after this long, the rates are loaded again. */
const RELOAD_AFTER_MS = 15 * 60_000;

let latest: Latest | null = null;
let loadedAt = 0;
let heroCode = prefs.heroCode();
let pins = prefs.pins();

const converter = setupConverter(lang);
const allRates = setupAllRates(lang, togglePin);
const exchange = setupExchange(lang, (code) => latest?.rates.find((r) => r.code === code));
let history: ReturnType<typeof setupHistory> | null = null;

function renderRates(): void {
  if (!latest) return;
  renderHero(latest, heroCode, lang);
  byId("board-source").textContent = t("board.source", { date: formatDate(latest.date, lang) });
  renderBoard(byId("board"), latest.rates, lang, pins, heroCode, selectHero);
  allRates.update(latest.rates, pins);
}

function selectHero(code: string): void {
  heroCode = code;
  prefs.setHeroCode(code);
  renderRates();
  window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
}

function togglePin(code: string): void {
  pins = pins.includes(code) ? pins.filter((c) => c !== code) : [...pins, code];
  prefs.setPins(pins);
  renderRates();
}

function showFreshness(): void {
  if (!latest) return;
  if (!navigator.onLine) setStatus(t("status.offline", { date: formatDate(latest.date, lang) }), true);
  else setStatus(t("status.updated", { time: new Date(loadedAt).toTimeString().slice(0, 5) }));
}

/** Loads today's rates and redraws everything that depends on them. False when the API did not answer. */
async function load(): Promise<boolean> {
  try {
    latest = await getLatest();
  } catch {
    if (!latest) {
      byId("hero-error").hidden = false;
      byId("hero-badge").textContent = "—";
    }
    return false;
  }
  loadedAt = Date.now();
  byId("hero-error").hidden = true;
  renderRates();
  converter.setRates(latest.rates);
  exchange.redraw();
  history ??= setupHistory(latest, lang);
  showFreshness();
  return true;
}

async function refresh(manual: boolean): Promise<void> {
  const button = byId("refresh");
  button.classList.add("is-spinning");
  const ok = await load();
  if (ok) {
    void exchange.reload();
    void history?.reload();
  }
  button.classList.remove("is-spinning");
  if (manual) toast(t(ok ? "status.refreshed" : "status.refreshFailed"));
}

async function shareRate(): Promise<void> {
  const rate = latest?.rates.find((r) => r.code === heroCode) ?? latest?.rates.find((r) => r.code === "USD");
  if (!latest || !rate) return;
  const text = t("share.text", { date: formatDate(latest.date, lang), amount: String(rate.nominal), code: rate.code, rate: formatRate(rate.value, lang) });
  if ((await shareText(text, location.origin + location.pathname)) === "copied") toast(t("share.copied"));
}

async function setupBot(rates: Latest["rates"]): Promise<void> {
  const health = await getHealth().catch(() => null);
  if (!health?.bot || !health.botUsername) return;
  byId<HTMLAnchorElement>("bot-link").href = `https://t.me/${encodeURIComponent(health.botUsername)}`;
  const tjs = convert(100, "USD", "TJS", Object.fromEntries(rates.map((r) => [r.code, r])));
  if (tjs !== null) byId("bot-example").textContent = `100 USD = ${formatMoney(tjs, lang)} TJS`;
  byId("bot").hidden = false;
}

setupTabs();
setupSettings(lang, () => {
  heroCode = prefs.heroCode();
  pins = prefs.pins();
  renderRates();
});
byId("refresh").addEventListener("click", () => void refresh(true));
byId("share").addEventListener("click", () => void shareRate());
window.addEventListener("online", showFreshness);
window.addEventListener("offline", showFreshness);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && loadedAt && Date.now() - loadedAt > RELOAD_AFTER_MS) void refresh(false);
});

void load().then((ok) => {
  if (ok && latest) void setupBot(latest.rates);
});

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => void navigator.serviceWorker.register("/sw.js"));
}
