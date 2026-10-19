/**
 * Phone layout works like an app: one section at a time, switched by the bottom tabs.
 * The section comes from the address (#convert, #exchange…), so the back button and shared links work.
 * On wide screens every section is visible and the same links simply scroll to it (see style.css).
 */

import { prefersReducedMotion } from "./dom";

export const VIEWS = ["rates", "convert", "exchange", "history"] as const;
export type View = (typeof VIEWS)[number];

const isView = (id: string): id is View => (VIEWS as readonly string[]).includes(id);
const isPhone = () => window.matchMedia("(max-width: 959px)").matches;

export function setupTabs(): void {
  const tabs = [...document.querySelectorAll<HTMLAnchorElement>(".tabs a")];
  let current: View = "rates";

  function apply(view: View) {
    current = view;
    for (const id of VIEWS) document.getElementById(id)?.classList.toggle("is-active", id === view);
    for (const tab of tabs) {
      if (tab.dataset.view === view) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    }
  }

  function show(animate: boolean) {
    const id = location.hash.slice(1);
    // Other anchors (like the "skip to content" link) keep the current section.
    const view = isView(id) ? id : id ? current : "rates";
    if (view === current && animate) return;
    const startTransition = (document as Document & { startViewTransition?: (update: () => void) => unknown }).startViewTransition;
    if (animate && isPhone() && startTransition && !prefersReducedMotion()) startTransition.call(document, () => apply(view));
    else apply(view);
    if (animate && isPhone()) window.scrollTo({ top: 0 });
  }

  window.addEventListener("hashchange", () => show(true));
  show(false);
}
