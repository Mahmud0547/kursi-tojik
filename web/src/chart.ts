import type { RatePoint } from "./types";
import { formatDateLabel, formatFullDate, formatRate } from "./format";

const SVG_NS = "http://www.w3.org/2000/svg";
const HEIGHT = 220;
const PAD = { top: 16, right: 12, bottom: 28, left: 12 };

function el<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, tag);
}

/** Renders a hand-built line chart (no charting library) for one currency's rate history. */
export class RateChart {
  private container: HTMLElement;
  private svg: SVGSVGElement;
  private guide: SVGLineElement;
  private dot: SVGCircleElement;
  private tooltip: HTMLDivElement;
  private points: RatePoint[] = [];
  private ro: ResizeObserver;

  constructor(container: HTMLElement) {
    this.container = container;
    this.svg = el("svg");
    this.svg.setAttribute("class", "chart-svg");
    this.guide = el("line");
    this.guide.setAttribute("class", "chart-guide");
    this.dot = el("circle");
    this.dot.setAttribute("r", "4.5");
    this.dot.setAttribute("class", "chart-dot");

    this.tooltip = document.createElement("div");
    this.tooltip.className = "chart-tooltip";
    this.tooltip.hidden = true;

    container.innerHTML = "";
    container.appendChild(this.svg);
    container.appendChild(this.tooltip);

    this.svg.addEventListener("pointermove", (e) => this.onMove(e));
    this.svg.addEventListener("pointerleave", () => this.hideCursor());

    this.ro = new ResizeObserver(() => this.render());
    this.ro.observe(container);
  }

  setData(points: RatePoint[]) {
    this.points = points;
    this.render();
  }

  private scale() {
    const width = Math.max(this.container.clientWidth, 240);
    const values = this.points.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || max * 0.01 || 1;
    const vPad = span * 0.15;

    const x = (i: number) =>
      PAD.left + (i / Math.max(this.points.length - 1, 1)) * (width - PAD.left - PAD.right);
    const y = (v: number) =>
      PAD.top +
      (1 - (v - (min - vPad)) / (span + vPad * 2)) * (HEIGHT - PAD.top - PAD.bottom);

    return { width, x, y, min, max };
  }

  private render() {
    if (this.points.length < 2) return;
    const { width, x, y, min, max } = this.scale();

    this.svg.setAttribute("viewBox", `0 0 ${width} ${HEIGHT}`);
    this.svg.setAttribute("width", "100%");
    this.svg.setAttribute("height", String(HEIGHT));
    this.svg.querySelectorAll("[data-generated]").forEach((n) => n.remove());

    const line = this.points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)},${y(p.value).toFixed(2)}`).join(" ");
    const areaBottom = HEIGHT - PAD.bottom;
    const area = `${line} L${x(this.points.length - 1).toFixed(2)},${areaBottom} L${x(0).toFixed(2)},${areaBottom} Z`;

    const gradId = "chart-fill-gradient";
    let defs = this.svg.querySelector("defs");
    if (!defs) {
      defs = el("defs");
      const gradient = el("linearGradient");
      gradient.id = gradId;
      gradient.setAttribute("x1", "0");
      gradient.setAttribute("y1", "0");
      gradient.setAttribute("x2", "0");
      gradient.setAttribute("y2", "1");
      const stop1 = el("stop");
      stop1.setAttribute("offset", "0%");
      stop1.setAttribute("class", "chart-gradient-start");
      const stop2 = el("stop");
      stop2.setAttribute("offset", "100%");
      stop2.setAttribute("class", "chart-gradient-end");
      gradient.appendChild(stop1);
      gradient.appendChild(stop2);
      defs.appendChild(gradient);
      this.svg.appendChild(defs);
    }

    const areaPath = el("path");
    areaPath.setAttribute("d", area);
    areaPath.setAttribute("fill", `url(#${gradId})`);
    areaPath.setAttribute("data-generated", "1");
    this.svg.appendChild(areaPath);

    const linePath = el("path");
    linePath.setAttribute("d", line);
    linePath.setAttribute("class", "chart-line");
    linePath.setAttribute("fill", "none");
    linePath.setAttribute("data-generated", "1");
    this.svg.appendChild(linePath);

    // Axis: first date, last date, min/max value
    const firstLabel = el("text");
    firstLabel.setAttribute("x", String(x(0)));
    firstLabel.setAttribute("y", String(HEIGHT - 8));
    firstLabel.setAttribute("class", "chart-axis-label");
    firstLabel.setAttribute("text-anchor", "start");
    firstLabel.setAttribute("data-generated", "1");
    firstLabel.textContent = formatDateLabel(this.points[0].date);
    this.svg.appendChild(firstLabel);

    const lastLabel = el("text");
    lastLabel.setAttribute("x", String(x(this.points.length - 1)));
    lastLabel.setAttribute("y", String(HEIGHT - 8));
    lastLabel.setAttribute("class", "chart-axis-label");
    lastLabel.setAttribute("text-anchor", "end");
    lastLabel.setAttribute("data-generated", "1");
    lastLabel.textContent = formatDateLabel(this.points[this.points.length - 1].date);
    this.svg.appendChild(lastLabel);

    const maxLabel = el("text");
    maxLabel.setAttribute("x", String(width - PAD.right));
    maxLabel.setAttribute("y", String(PAD.top + 4));
    maxLabel.setAttribute("class", "chart-axis-label chart-axis-label--value");
    maxLabel.setAttribute("text-anchor", "end");
    maxLabel.setAttribute("data-generated", "1");
    maxLabel.textContent = formatRate(max);
    this.svg.appendChild(maxLabel);

    const minLabel = el("text");
    minLabel.setAttribute("x", String(width - PAD.right));
    minLabel.setAttribute("y", String(HEIGHT - PAD.bottom - 4));
    minLabel.setAttribute("class", "chart-axis-label chart-axis-label--value");
    minLabel.setAttribute("text-anchor", "end");
    minLabel.setAttribute("data-generated", "1");
    minLabel.textContent = formatRate(min);
    this.svg.appendChild(minLabel);

    this.guide.remove();
    this.dot.remove();
    this.svg.appendChild(this.guide);
    this.svg.appendChild(this.dot);
    this.hideCursor();
  }

  private onMove(e: PointerEvent) {
    if (this.points.length < 2) return;
    const { width, x, y } = this.scale();
    const rect = this.svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    const ratio = (relX - PAD.left) / (width - PAD.left - PAD.right);
    const i = Math.round(ratio * (this.points.length - 1));
    const clamped = Math.min(Math.max(i, 0), this.points.length - 1);
    const p = this.points[clamped];

    this.guide.setAttribute("x1", String(x(clamped)));
    this.guide.setAttribute("x2", String(x(clamped)));
    this.guide.setAttribute("y1", String(PAD.top));
    this.guide.setAttribute("y2", String(HEIGHT - PAD.bottom));
    this.guide.style.display = "";

    this.dot.setAttribute("cx", String(x(clamped)));
    this.dot.setAttribute("cy", String(y(p.value)));
    this.dot.style.display = "";

    this.tooltip.hidden = false;
    this.tooltip.style.left = `${(x(clamped) / width) * 100}%`;
    this.tooltip.innerHTML = `<strong>${formatRate(p.value)}</strong><span>${formatFullDate(p.date)}</span>`;
  }

  private hideCursor() {
    this.guide.style.display = "none";
    this.dot.style.display = "none";
    this.tooltip.hidden = true;
  }

  destroy() {
    this.ro.disconnect();
  }
}
