import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fakeApi } from "./fake-api";

for (const path of ["/", "/ru/", "/en/"]) {
  test(`no WCAG A/AA violations on ${path}`, async ({ page }) => {
    await fakeApi(page, { bot: true });
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });

  test(`no horizontal scroll at 320px on ${path}`, async ({ page }) => {
    await fakeApi(page, { bot: true });
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });
}

test("the site works under its own Content-Security-Policy", async ({ page }) => {
  const csp = readFileSync("dist/_headers", "utf8").match(/Content-Security-Policy: (.+)/)![1]!;
  const violations: string[] = [];
  page.on("console", (m) => /Content Security Policy|Refused to/i.test(m.text()) && violations.push(m.text()));
  page.on("pageerror", (e) => violations.push(e.message));
  await fakeApi(page, { bot: true });
  await page.route("http://localhost:4173/**", async (route) => {
    if (route.request().resourceType() !== "document") return route.fallback();
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), "content-security-policy": csp } });
  });
  await page.goto("/");
  await expect(page.locator("#hero-value")).toHaveText("9,2201");
  await expect(page.locator("#chart path.chart__line")).toHaveCount(1);
  expect(violations).toEqual([]);
});

test("the page makes no requests except to itself and the API", async ({ page }) => {
  const foreign: string[] = [];
  page.on("request", (r) => {
    const url = r.url();
    if (!url.startsWith("http://localhost:4173") && !url.startsWith("https://kursi-tojik-api.simorgh-dev.workers.dev")) foreign.push(url);
  });
  await fakeApi(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  expect(foreign).toEqual([]);
});
