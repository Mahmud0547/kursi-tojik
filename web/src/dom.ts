/** Tiny DOM helpers. Text always goes through textContent, so data from the network can never become HTML. */

export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`#${id} is missing from the page`);
  return element as T;
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: { class?: string; text?: string; attrs?: Record<string, string> } = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (props.class) element.className = props.class;
  if (props.text !== undefined) element.textContent = props.text;
  for (const [name, value] of Object.entries(props.attrs ?? {})) element.setAttribute(name, value);
  element.append(...children);
  return element;
}

/** Wires a group of toggle buttons (aria-pressed); calls `onSelect` with the chosen button. */
export function segmented(group: HTMLElement, onSelect: (button: HTMLButtonElement) => void): void {
  group.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest("button");
    if (!button || !group.contains(button) || button.getAttribute("aria-pressed") === "true") return;
    for (const b of group.querySelectorAll("button")) b.setAttribute("aria-pressed", String(b === button));
    onSelect(button);
  });
}

export const storage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // private mode or blocked storage: the converter simply does not remember the choice
    }
  },
};
