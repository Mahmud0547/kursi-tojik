// Generates one HTML page per language from template.html and messages/*.json:
//   index.html (Tajik, default), ru/index.html, en/index.html.
// Run before `vite` and `vite build`; the generated files are git-ignored.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { API_URL, SITE_URL } from "./config.mjs";

const languages = [
  { code: "tj", htmlLang: "tg", ogLocale: "tg_TJ", path: "/", file: "index.html" },
  { code: "ru", htmlLang: "ru", ogLocale: "ru_RU", path: "/ru/", file: "ru/index.html" },
  { code: "en", htmlLang: "en", ogLocale: "en_US", path: "/en/", file: "en/index.html" },
];

const escapeHtml = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const lookup = (object, path) => path.split(".").reduce((value, key) => value?.[key], object);

const template = readFileSync("template.html", "utf8");

for (const lang of languages) {
  const messages = JSON.parse(readFileSync(`messages/${lang.code}.json`, "utf8"));
  const values = {
    htmlLang: lang.htmlLang,
    ogLocale: lang.ogLocale,
    path: lang.path,
    siteUrl: SITE_URL,
    apiUrl: API_URL,
    "current.tj": lang.code === "tj" ? 'aria-current="page"' : "",
    "current.ru": lang.code === "ru" ? 'aria-current="page"' : "",
    "current.en": lang.code === "en" ? 'aria-current="page"' : "",
  };
  const html = template.replace(/\{\{([\w.]+)\}\}/g, (match, key) => {
    if (key in values) return values[key];
    const text = lookup(messages, key);
    if (typeof text !== "string") throw new Error(`messages/${lang.code}.json has no "${key}"`);
    return escapeHtml(text);
  });
  if (lang.file.includes("/")) mkdirSync(lang.file.split("/")[0], { recursive: true });
  writeFileSync(lang.file, html);
}
console.log(`pages: ${languages.map((l) => l.file).join(", ")}`);
