import { formatDate, formatDay, formatRate } from "./format";
import type { Lang } from "./i18n";
import type { HistoryPoint } from "./types";

const SVG = "http://www.w3.org/2000/svg";
const PAD = { top: 12, right: 8, bottom: 26, left: 8 };

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG, tag);
  for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, String(value));
  return element;
}

/** A hand-built SVG line chart (no chart library): line, light grid, first/last date labels and a pointer tooltip. */
export class RateChart {
  private points: { date: string; perUnit: number }[] = [];
  private readonly tooltip: HTMLDivElement;

  constructor(private readonly container: HTMLElement, private readonly lang: Lang) {
    this.tooltip = document.createElement("div");
    this.tooltip.className = "chart__tooltip";
    this.tooltip.hidden = true;
    new ResizeObserver(() => this.render()).observe(container);
  }

  setData(history: HistoryPoint[]): void {
    this.points = history.map((p) => ({ date: p.date, perUnit: p.value / p.nominal }));
    this.render();
  }

  private render(): void {
    const width = Math.max(this.container.clientWidth, 200);
    const height = this.container.clientHeight || 220;
    const root = svg("svg", { viewBox: `0 0 ${width} ${height}`, width, height, class: "chart__svg", "aria-hidden": "true" });
    this.container.replaceChildren(root, this.tooltip);
    if (this.points.length < 2) return;

    const values = this.points.map((p) => p.perUnit);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || max * 0.001;
    const x = (i: number) => PAD.left + (i / (this.points.length - 1)) * (width - PAD.left - PAD.right);
    const y = (v: number) => PAD.top + (1 - (v - min) / span) * (height - PAD.top - PAD.bottom);

    for (let i = 0; i <= 3; i++) {
      const gy = PAD.top + (i / 3) * (height - PAD.top - PAD.bottom);
      root.append(svg("line", { x1: PAD.left, x2: width - PAD.right, y1: gy, y2: gy, class: "chart__grid" }));
    }
    const path = this.points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.perUnit).toFixed(1)}`).join(" ");
    root.append(svg("path", { d: `${path} L${x(this.points.length - 1)},${height - PAD.bottom} L${x(0)},${height - PAD.bottom} Z`, class: "chart__area" }));
    root.append(svg("path", { d: path, class: "chart__line" }));

    const first = this.points[0]!;
    const last = this.points[this.points.length - 1]!;
    const label = (text: string, lx: number, anchor: string) => {
      const t = svg("text", { x: lx, y: height - 6, "text-anchor": anchor, class: "chart__label" });
      t.textContent = text;
      root.append(t);
    };
    label(formatDay(first.date, this.lang), PAD.left, "start");
    label(formatDay(last.date, this.lang), width - PAD.right, "end");

    const guide = svg("line", { y1: PAD.top, y2: height - PAD.bottom, class: "chart__guide", visibility: "hidden" });
    const dot = svg("circle", { r: 4.5, class: "chart__dot", visibility: "hidden" });
    root.append(guide, dot);

    const hide = () => {
      guide.setAttribute("visibility", "hidden");
      dot.setAttribute("visibility", "hidden");
      this.tooltip.hidden = true;
    };
    root.addEventListener("pointerleave", hide);
    root.addEventListener("pointermove", (event) => {
      const box = root.getBoundingClientRect();
      const ratio = (event.clientX - box.left - PAD.left) / (box.width - PAD.left - PAD.right);
      const i = Math.min(this.points.length - 1, Math.max(0, Math.round(ratio * (this.points.length - 1))));
      const p = this.points[i]!;
      for (const [el, attrs] of [[guide, { x1: x(i), x2: x(i) }], [dot, { cx: x(i), cy: y(p.perUnit) }]] as const) {
        for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
        el.setAttribute("visibility", "visible");
      }
      this.tooltip.textContent = `${formatDate(p.date, this.lang)} · ${formatRate(p.perUnit, this.lang)}`;
      this.tooltip.hidden = false;
      this.tooltip.classList.toggle("chart__tooltip--left", x(i) > width / 2);
    });
  }
}
