import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import tj from "../../messages/tj.json";

function leaves(value: unknown, path = ""): [string, unknown][] {
  if (typeof value === "object" && value !== null) {
    return Object.entries(value).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  }
  return [[path, value]];
}
const placeholders = (text: unknown) => [...String(text).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const english = new Map(leaves(en));

describe.each([["tj", tj], ["ru", ru]])("messages/%s.json", (_name, dict) => {
  const entries = new Map(leaves(dict));
  it("has the same keys as English", () => {
    expect([...entries.keys()].sort()).toEqual([...english.keys()].sort());
  });
  it("keeps every placeholder", () => {
    for (const [key, text] of entries) expect(placeholders(text), key).toEqual(placeholders(english.get(key)));
  });
});

it("never calls the National Bank БМТ (that abbreviation means the UN in Tajik)", () => {
  for (const dict of [tj, ru]) expect(JSON.stringify(dict)).not.toMatch(/БМТ|НБТ/);
});
