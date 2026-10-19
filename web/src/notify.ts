/** Short messages at the bottom of the screen ("Copied", "Rates updated") and the status line in the header. */

import { byId } from "./dom";

let hideTimer: ReturnType<typeof setTimeout> | undefined;

export function toast(text: string): void {
  const element = byId("toast");
  element.textContent = text;
  element.hidden = false;
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    element.hidden = true;
  }, 2600);
}

export function setStatus(text: string, offline = false): void {
  const element = byId("status");
  element.textContent = text;
  element.classList.toggle("status--offline", offline);
  element.hidden = text === "";
}
