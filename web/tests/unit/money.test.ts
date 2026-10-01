import { describe, expect, it } from "vitest";
import { changePercent, convert, parseAmount } from "../../src/money";

const rates = { USD: { nominal: 1, value: 9.2201 }, UZS: { nominal: 100, value: 0.0781 } };

describe("convert", () => {
  it("goes through TJS and respects nominals", () => {
    expect(convert(100, "USD", "TJS", rates)).toBeCloseTo(922.01, 2);
    expect(convert(100000, "UZS", "TJS", rates)).toBeCloseTo(78.1, 2);
    expect(convert(1, "USD", "UZS", rates)).toBeCloseTo(9.2201 / 0.000781, 2);
  });

  it("is null for a missing currency", () => {
    expect(convert(1, "XYZ", "TJS", rates)).toBeNull();
  });
});

describe("parseAmount", () => {
  it.each([["100", 100], ["1 250,50", 1250.5], ["1 250,50", 1250.5], ["2.5", 2.5]])("reads %j", (text, value) => {
    expect(parseAmount(text)).toBe(value);
  });
  it.each(["", "-1", "abc", "1,2,3", "99999999999"])("rejects %j", (text) => {
    expect(parseAmount(text)).toBeNull();
  });
});

describe("changePercent", () => {
  it("compares with the previous rate", () => {
    expect(changePercent(9.2201, 9.235)).toBeCloseTo(-0.1613, 3);
    expect(changePercent(1, null)).toBeNull();
  });
});
