/** The visitor's choices, kept in localStorage. Every read falls back to a safe default. */

import { storage } from "./dom";

export type Theme = "auto" | "light" | "dark";
export type TextSize = "normal" | "large";

const KEYS = { theme: "theme", size: "text-size", hero: "hero-currency", pins: "pinned" } as const;

export const prefs = {
  theme(): Theme {
    const value = storage.get(KEYS.theme);
    return value === "light" || value === "dark" ? value : "auto";
  },
  setTheme(theme: Theme): void {
    storage.set(KEYS.theme, theme);
  },

  size(): TextSize {
    return storage.get(KEYS.size) === "large" ? "large" : "normal";
  },
  setSize(size: TextSize): void {
    storage.set(KEYS.size, size);
  },

  /** The currency shown in the big number at the top. */
  heroCode(): string {
    const value = storage.get(KEYS.hero);
    return value && /^[A-Z]{3}$/.test(value) ? value : "USD";
  },
  setHeroCode(code: string): void {
    storage.set(KEYS.hero, code);
  },

  /** Extra currencies the visitor pinned to the board, in the order they were added. */
  pins(): string[] {
    return (storage.get(KEYS.pins) ?? "").split(",").filter((code) => /^[A-Z]{3}$/.test(code));
  },
  setPins(codes: string[]): void {
    storage.set(KEYS.pins, codes.join(","));
  },

  reset(): void {
    for (const key of Object.values(KEYS)) storage.remove(key);
  },
};

/** Puts the theme and text size on <html>, where the CSS reads them. */
export function applyLook(theme: Theme = prefs.theme(), size: TextSize = prefs.size()): void {
  const root = document.documentElement;
  if (theme === "auto") delete root.dataset.theme;
  else root.dataset.theme = theme;
  if (size === "large") root.dataset.size = "large";
  else delete root.dataset.size;
}
