import banksHtml from "./fixtures/banks-usd.html?raw";
import dailyXml from "./fixtures/daily-2026-10-01.xml?raw";

/** History XML for one currency: `days` daily records ending on 2026-09-30, value rising by 0.001 a day. */
export function historyXml(code: string, days: number, start = 9.0, nominal = 1): string {
  const end = Date.UTC(2026, 8, 30);
  const records = Array.from({ length: days }, (_, i) => {
    const d = new Date(end - (days - 1 - i) * 86_400_000);
    const date = `${String(d.getUTCDate()).padStart(2, "0")}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${d.getUTCFullYear()}`;
    return `<Record Date="${date}" Id="1"><CharCode>${code}</CharCode><Nominal>${nominal}</Nominal><Value>${(start + i * 0.001).toFixed(4)}</Value></Record>`;
  });
  return `<?xml version="1.0" encoding="windows-1251" ?><ValCurs>${records.join("")}</ValCurs>`;
}

/** A stand-in for nbt.tj that serves saved responses. `down` makes every request fail. */
export function fakeNbt({ down = false, historyDays = 60 } = {}) {
  const calls: string[] = [];
  const fetchFn = (async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    if (down) return new Response("unavailable", { status: 503 });
    if (url.includes("export_xml_dynamic")) {
      const code = new URL(url).searchParams.get("cs") ?? "USD";
      return new Response(historyXml(code, historyDays, code === "USD" ? 9.2 : 1));
    }
    if (url.includes("export_xml.php")) return new Response(dailyXml);
    if (url.includes("kurs_kommer_bank")) return new Response(banksHtml);
    return new Response("not found", { status: 404 });
  }) as typeof fetch;
  return { fetchFn, calls };
}

export const NOW = new Date("2026-10-01T06:00:00Z"); // 11:00 in Dushanbe
