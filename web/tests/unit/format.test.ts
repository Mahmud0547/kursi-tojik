import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatMoney, formatPercent, formatRate } from "../../src/format";

describe("formatRate", () => {
  it("keeps four decimals with the local separator", () => {
    expect(formatRate(9.2201, "tj")).toBe("9,2201");
    expect(formatRate(9.2201, "en")).toBe("9.2201");
  });
});

describe("formatMoney", () => {
  it("groups thousands", () => {
    expect(formatMoney(12500.5, "ru")).toBe("12 500,50");
    expect(formatMoney(12500.5, "en")).toBe("12,500.50");
  });
});

describe("formatPercent", () => {
  it("is signed by default", () => {
    expect(formatPercent(-0.16, "ru")).toBe("−0,16%");
    expect(formatPercent(0.16, "en")).toBe("+0.16%");
  });

  it("has no sign when an arrow shows the direction", () => {
    expect(formatPercent(0.16, "tj", true)).toBe("0,16%");
  });
});

describe("dates", () => {
  it("formats per language", () => {
    expect(formatDate("2026-10-01", "tj")).toBe("01.10.2026");
    expect(formatDate("2026-10-01", "en")).toBe("Oct 1, 2026");
    expect(formatDateTime("2026-09-24T16:09", "ru")).toBe("24.09.2026 16:09");
  });
});
