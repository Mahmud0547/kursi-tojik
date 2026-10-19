/** The settings sheet: theme, text size, language and how to install the site as an app. */

import { byId } from "./dom";
import { translate, type Lang } from "./i18n";
import { toast } from "./notify";
import { applyLook, prefs, type TextSize, type Theme } from "./prefs";

const isInstalled = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export function setupSettings(lang: Lang, onReset: () => void): void {
  const dialog = byId<HTMLDialogElement>("settings");
  const form = dialog.querySelector("form")!;

  const check = (name: string, value: string) => {
    const input = form.querySelector<HTMLInputElement>(`input[name="${name}"][value="${value}"]`);
    if (input) input.checked = true;
  };
  const syncForm = () => {
    check("theme", prefs.theme());
    check("size", prefs.size());
  };

  byId("settings-open").addEventListener("click", () => {
    syncForm();
    if (isInstalled()) byId("install-text").textContent = translate(lang, "settings.installed");
    dialog.showModal();
  });
  // A tap on the dark area around the sheet closes it, like on phones.
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  form.addEventListener("change", (event) => {
    const input = event.target as HTMLInputElement;
    if (input.name === "theme") prefs.setTheme(input.value as Theme);
    if (input.name === "size") prefs.setSize(input.value as TextSize);
    applyLook();
  });

  byId("settings-reset").addEventListener("click", () => {
    prefs.reset();
    applyLook();
    syncForm();
    onReset();
    toast(translate(lang, "settings.resetDone"));
  });
}
