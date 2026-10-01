// Renders public/favicon.svg into the PNG icons (favicon, Apple touch icon, PWA icons) and the 1200×630 link preview.
// Run after changing the logo: node scripts/icons.mjs
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const svg = readFileSync("public/favicon.svg", "utf8");
const browser = await chromium.launch();
const page = await browser.newPage();

for (const [file, size] of [["public/favicon-32.png", 32], ["public/apple-touch-icon.png", 180], ["public/icons/icon-192.png", 192], ["public/icons/icon-512.png", 512]]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0}svg{width:${size}px;height:${size}px;display:block}</style>${svg}`);
  await page.screenshot({ path: file, omitBackground: true });
}

await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(`<style>
  body{margin:0;width:1200px;height:630px;background:#0b3d2e;color:#fff;font-family:Inter,system-ui,sans-serif;display:flex;flex-direction:column;justify-content:space-between;padding:72px 80px;box-sizing:border-box}
  .brand{display:flex;align-items:center;gap:16px;font-size:34px;font-weight:700} .brand svg{width:56px;height:56px}
  h1{font-size:72px;line-height:1.05;margin:0;letter-spacing:-2px} p{font-size:28px;color:#b8d3c6;margin:0}
</style><div class="brand">${svg}Kursi Tojik</div><h1>Қурби расмии сомонӣ<br>Official somoni rates</h1><p>National Bank of Tajikistan · converter · history · bank rates · Telegram bot</p>`);
await page.screenshot({ path: "public/og.png" });
await browser.close();
console.log("icons and og.png written");
