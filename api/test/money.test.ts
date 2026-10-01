import { describe, expect, it } from "vitest";
import { changePercent, convert, parseAmount, perUnit } from "../src/money";

const rates = { USD: { nominal: 1, value: 9.2201 }, EUR: { nominal: 1, value: 10.4731 }, KZT: { nominal: 10, value: 0.2091 } };

describe("perUnit", () => {
  it("divides by the nominal", () => {
    expect(perUnit({ nominal: 10, value: 0.2091 })).toBeCloseTo(0.02091, 6);
  });
});

describe("convert", () => {
  it("converts to and from TJS", () => {
    expect(convert(100, "USD", "TJS", rates)).toBeCloseTo(922.01, 2);
    expect(convert(922.01, "TJS", "USD", rates)).toBeCloseTo(100, 2);
  });

  it("crosses two currencies through TJS", () => {
    expect(convert(100, "EUR", "USD", rates)).toBeCloseTo((100 * 10.4731) / 9.2201, 6);
  });

  it("respects nominals", () => {
    expect(convert(1000, "KZT", "TJS", rates)).toBeCloseTo(20.91, 2);
  });

  it("returns null for an unknown currency", () => {
    expect(convert(1, "XYZ", "TJS", rates)).toBeNull();
  });
});

describe("parseAmount", () => {
  it.each([
    ["100", 100],
    ["1 000,50", 1000.5],
    ["1,5", 1.5],
    ["2.75", 2.75],
    ["  42  ", 42],
  ])("reads %j", (text, value) => {
    expect(parseAmount(text)).toBe(value);
  });

  it.each(["", "abc", "-5", "1e400", "1000000000000"])("rejects %j", (text) => {
    expect(parseAmount(text)).toBeNull();
  });
});

describe("changePercent", () => {
  it("is signed and relative to the previous rate", () => {
    expect(changePercent(10.1, 10)).toBeCloseTo(1, 6);
    expect(changePercent(9.9, 10)).toBeCloseTo(-1, 6);
  });

  it("is null without a previous rate", () => {
    expect(changePercent(10, null)).toBeNull();
  });
});
