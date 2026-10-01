/** Texts for the current page. The language comes from <html lang>, set when the page was generated. */

import en from "../messages/en.json";
import ru from "../messages/ru.json";
import tj from "../messages/tj.json";

export type Lang = "tj" | "ru" | "en";
export type Messages = typeof en;

const dictionaries: Record<Lang, Messages> = { tj, ru, en };

export function pageLang(): Lang {
  const lang = document.documentElement.lang;
  return lang === "ru" || lang === "en" ? lang : "tj";
}

/** Reads "section.key" from the dictionary and fills {placeholders}. */
export function translate(lang: Lang, key: string, vars: Record<string, string> = {}): string {
  const text = key.split(".").reduce<unknown>((value, part) => (value as Record<string, unknown> | undefined)?.[part], dictionaries[lang]);
  if (typeof text !== "string") return key;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => vars[name] ?? match);
}

export function currencyName(lang: Lang, code: string, fallback: string): string {
  return (dictionaries[lang].currency as Record<string, string>)[code] ?? fallback;
}
