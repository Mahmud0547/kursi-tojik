import type { Page } from "@playwright/test";

export const API = "https://kursi-tojik-api.simorgh-dev.workers.dev";

const rate = (code: string, name: string, nominal: number, value: number, previousPerUnit: number | null) => ({ code, name, nominal, value, previousPerUnit });

export const latest = {
  date: "2026-10-01",
  previousDate: "2026-09-30",
  source: "nbt.tj",
  rates: [
    rate("USD", "US Dollar", 1, 9.2201, 9.235),
    rate("EUR", "EURO", 1, 10.4731, 10.4668),
    rate("RUB", "Russian Ruble", 1, 0.1109, 0.1093),
    rate("CNY", "Chinese Yuan", 1, 1.3749, 1.3772),
    rate("KZT", "Kazakhstan Tenge", 10, 0.2091, 0.02102),
    rate("KGS", "Kyrgyzstan Som", 10, 1.0543, 0.10561),
    rate("UZS", "Uzbekistan Sum", 100, 0.0781, 0.000782),
    rate("GBP", "British Pound", 1, 12.2507, 12.2311),
    rate("TRY", "Turkish Lira", 1, 0.2201, null),
  ],
};

export function history(code: string, days: number) {
  const points = Array.from({ length: Math.min(days, 30) }, (_, i) => ({
    date: `2026-09-${String(i + 1).padStart(2, "0")}`,
    nominal: 1,
    value: (code === "USD" ? 9.2 : 10.4) + i * 0.001,
  }));
  return { code, days, source: "nbt.tj", points };
}

const bank = (name: string, cashBuy: number | null, cashSell: number | null) => ({
  name,
  bank: `ҶСК "${name}"`,
  cashBuy,
  cashSell,
  updated: "2026-09-24T16:09",
});

export const banks = (currency: string) => ({
  currency,
  updated: "2026-09-24T16:09",
  source: "nbt.tj",
  banks: [
    bank("Алиф Бонк", 9.18, 9.28),
    bank("Эсхата", 9.2, 9.27),
    bank("Арванд", 9.18, 9.26),
    bank("Амонатбонк", 9.17, 9.27),
    bank("Ориёнбонк", 9.17, 9.28),
    bank("Спитамен Бонк", 9.21, 9.27),
    bank("Душанбе Сити", 9.18, 9.29),
    bank("Ҳумо", 9.17, 9.27),
    bank("Матин", 9.2, 9.28),
    bank("Без наличных", null, null),
  ],
});

export interface FakeApiOptions {
  down?: boolean;
  bot?: boolean;
  calls?: string[];
  malformed?: boolean;
}

/** Answers every API call from fixtures; nothing reaches the real API in tests. */
export async function fakeApi(page: Page, { down = false, bot = false, calls = [], malformed = false }: FakeApiOptions = {}) {
  await page.route(`${API}/**`, async (route) => {
    const url = new URL(route.request().url());
    calls.push(url.pathname + url.search);
    if (down) return route.fulfill({ status: 503, json: { error: "down" } });
    if (url.pathname === "/api/rates/latest") return route.fulfill({ json: malformed ? { date: "x", rates: "nope" } : latest });
    if (url.pathname === "/api/history") return route.fulfill({ json: history(url.searchParams.get("code") ?? "USD", Number(url.searchParams.get("days"))) });
    if (url.pathname === "/api/banks") return route.fulfill({ json: banks(url.searchParams.get("currency") ?? "USD") });
    if (url.pathname === "/api/health") return route.fulfill({ json: { bot, botUsername: bot ? "kursi_tojik_bot" : null } });
    return route.fulfill({ status: 404, json: {} });
  });
}
