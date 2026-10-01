import { expect, test } from "@playwright/test";
import { fakeApi } from "./fake-api";

for (const [path, lang, h1] of [["/", "tg", "Қурби сомонӣ имрӯз"], ["/ru/", "ru", "Курс сомони сегодня"], ["/en/", "en", "Somoni rate today"]] as const) {
  test(`${path} is a complete page in its language`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await fakeApi(page);
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", lang);
    await expect(page.locator("h1")).toHaveText(h1);
    await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(4);
    await expect(page.locator(`.langs a[aria-current="page"]`)).toHaveAttribute("href", path);
    await expect(page.locator("#board li")).toHaveCount(8);
    expect(errors).toEqual([]);
  });
}

test("hero shows today's USD rate, its date and the change with an arrow", async ({ page }) => {
  await fakeApi(page);
  await page.goto("/en/");
  await expect(page.locator("#hero-value")).toHaveText("9.2201");
  await expect(page.locator("#hero-badge")).toContainText("Oct 1, 2026");
  await expect(page.locator("#hero-change")).toHaveText("▼ 0.16%");
  await expect(page.locator("#hero-change-text")).toContainText("Sep 30, 2026");
});

test("board shows nominals as published", async ({ page }) => {
  await fakeApi(page);
  await page.goto("/ru/");
  await expect(page.locator("#board")).toContainText("10 KZT");
  await expect(page.locator("#board")).toContainText("100 UZS");
  await expect(page.locator("#board")).toContainText("0,0781");
});

test("converter converts, swaps and rejects bad input", async ({ page }) => {
  await fakeApi(page);
  await page.goto("/en/");
  const result = page.locator("#result");
  await expect(result).toHaveText("922.01");
  await page.fill("#amount", "1 000,5");
  await expect(result).toHaveText("9,224.71");
  await page.click("#swap");
  await expect(page.locator("#from")).toHaveValue("TJS");
  await page.fill("#amount", "922.01");
  await expect(result).toHaveText("100.00");
  await page.fill("#amount", "abc");
  await expect(page.locator("#amount-error")).toBeVisible();
  await expect(result).toHaveText("—");
  await expect(page.locator("#from option")).toHaveCount(10); // TJS + 8 tracked + TRY
});

test("converter remembers the chosen currencies", async ({ page }) => {
  await fakeApi(page);
  await page.goto("/en/");
  await page.selectOption("#from", "EUR");
  await page.reload();
  await expect(page.locator("#from")).toHaveValue("EUR");
});

test("chart loads the chosen currency and period", async ({ page }) => {
  const calls: string[] = [];
  await fakeApi(page, { calls });
  await page.goto("/en/");
  await expect(page.locator("#chart path.chart__line")).toHaveCount(1);
  await page.click('#chart-currency button[data-code="EUR"]');
  await page.click('#chart-range button[data-days="90"]');
  await expect.poll(() => calls).toContain("/api/history?code=EUR&days=90");
  await expect(page.locator('#chart-range button[data-days="90"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#chart-summary")).toContainText("EUR");
});

test("bank table marks the best rates in words and can show all banks", async ({ page }) => {
  await fakeApi(page);
  await page.goto("/en/");
  const rows = page.locator("#banks-body tr");
  await expect(rows).toHaveCount(8);
  await expect(rows.first()).toContainText("Спитамен Бонк"); // best buy (9.21) comes first
  await expect(page.locator("#banks-body .best__tag")).toHaveCount(2);
  await expect(page.locator("#banks-updated")).toContainText("Sep 24, 2026 16:09");
  await page.click("#banks-toggle");
  await expect(rows).toHaveCount(9); // the bank with no cash rates is not listed
  await expect(page.locator("#banks-toggle")).toHaveAttribute("aria-expanded", "true");
});

test("API down: a clear message, no fake numbers, no script errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await fakeApi(page, { down: true });
  await page.goto("/");
  await expect(page.locator("#hero-error")).toBeVisible();
  await expect(page.locator("#hero-value")).toHaveText("—");
  await expect(page.locator("#board li")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("malformed API data is treated as unavailable", async ({ page }) => {
  await fakeApi(page, { malformed: true });
  await page.goto("/");
  await expect(page.locator("#hero-error")).toBeVisible();
});

test("bot section stays hidden until the bot is configured", async ({ page }) => {
  await fakeApi(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("#bot")).toBeHidden();
});

test("bot section links to the bot when it is configured", async ({ page }) => {
  await fakeApi(page, { bot: true });
  await page.goto("/ru/");
  await expect(page.locator("#bot")).toBeVisible();
  await expect(page.locator("#bot-link")).toHaveAttribute("href", "https://t.me/kursi_tojik_bot");
  await expect(page.locator("#bot-example")).toHaveText("100 USD = 922,01 TJS");
});
