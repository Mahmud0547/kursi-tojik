/**
 * Курси Точик — NBT proxy worker.
 *
 * The National Bank of Tajikistan does not send CORS headers on its XML
 * export endpoints, and its history export is windows-1251 encoded, so the
 * browser can't read it directly. This worker fetches it server-side,
 * decodes and reshapes it to JSON, and caches the result at the edge.
 *
 * Routes: GET /api/history?cs=USD&days=90
 *         GET /api/banks?currency=USD
 */

interface RateRecord {
  date: string; // YYYY-MM-DD
  nominal: number;
  value: number;
}

interface BankRates {
  name: string;
  interbank_buy: number;
  interbank_sell: number;
  cash_buy: number;
  cash_sell: number;
  noncash_buy: number;
  noncash_sell: number;
  card_buy: number;
  card_sell: number;
}

const ALLOWED_CURRENCIES = new Set(["USD", "EUR", "RUB", "CNY", "KZT"]);
const BANKS_ALLOWED_CURRENCIES = new Set(["USD", "EUR", "RUB"]);
const NBT_HOST = "https://www.nbt.tj";
const EDGE_CACHE_SECONDS = 1800; // 30 min — NBT publishes once per business day
const UPSTREAM_TIMEOUT_MS = 10_000;

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(data: unknown, status = 200, extraHeaders: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(),
      ...extraHeaders,
    },
  });
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseRecords(xml: string): RateRecord[] {
  const records: RateRecord[] = [];
  const blockRe = /<Record\s+Date="(\d{2})\.(\d{2})\.(\d{4})"[^>]*>([\s\S]*?)<\/Record>/g;
  let match: RegExpExecArray | null;
  while ((match = blockRe.exec(xml)) !== null) {
    const [, dd, mm, yyyy, body] = match;
    const nominalMatch = /<Nominal>\s*(\d+)\s*<\/Nominal>/.exec(body);
    const valueMatch = /<Value>\s*([\d.,]+)\s*<\/Value>/.exec(body);
    if (!valueMatch) continue;
    const nominal = nominalMatch ? parseInt(nominalMatch[1], 10) : 1;
    const value = parseFloat(valueMatch[1].replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) continue;
    records.push({ date: `${yyyy}-${mm}-${dd}`, nominal, value });
  }
  records.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return records;
}

async function handleHistory(url: URL): Promise<Response> {
  const cs = (url.searchParams.get("cs") || "").toUpperCase();
  const daysParam = parseInt(url.searchParams.get("days") || "90", 10);
  const days = Number.isFinite(daysParam) ? Math.min(Math.max(daysParam, 2), 370) : 90;

  if (!ALLOWED_CURRENCIES.has(cs)) {
    return jsonResponse(
      { error: `Unsupported currency "${cs}". Allowed: ${[...ALLOWED_CURRENCIES].join(", ")}` },
      400,
    );
  }

  const today = new Date();
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - days);
  const d1 = formatDate(start);
  const d2 = formatDate(today);

  const nbtUrl = `${NBT_HOST}/en/kurs/export_xml_dynamic.php?d1=${d1}&d2=${d2}&cs=${cs}&export=xml`;

  let upstream: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    upstream = await fetch(nbtUrl, {
      signal: controller.signal,
      cf: { cacheTtl: EDGE_CACHE_SECONDS, cacheEverything: true },
    });
    clearTimeout(timeout);
  } catch (err) {
    return jsonResponse({ error: "Upstream NBT request failed", detail: String(err) }, 502);
  }

  if (!upstream.ok) {
    return jsonResponse({ error: `NBT responded with ${upstream.status}` }, 502);
  }

  const buffer = await upstream.arrayBuffer();
  let xml: string;
  try {
    xml = new TextDecoder("windows-1251").decode(buffer);
  } catch {
    xml = new TextDecoder("utf-8").decode(buffer);
  }

  const rates = parseRecords(xml);
  if (rates.length === 0) {
    return jsonResponse({ error: "NBT returned no parsable records for this range" }, 502);
  }

  return jsonResponse(
    { currency: cs, from: d1, to: d2, count: rates.length, rates },
    200,
    { "Cache-Control": `public, max-age=${EDGE_CACHE_SECONDS}` },
  );
}

/** Убирает HTML-теги (нули на странице завёрнуты в <span>) и декодирует базовые сущности. */
function cellText(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .trim();
}

/**
 * Парсит HTML-таблицу курсов коммерческих банков nbt.tj.
 * Столбцы после названия банка (харид/фурӯш каждая): байнибонкӣ, нақдӣ,
 * ғайринақдӣ, ҳамёни электронӣ, кортҳо, ММПИМ, затем дата обновления.
 * В результат идут только байнибонкӣ/нақдӣ/ғайринақдӣ/кортҳо.
 */
function parseBanks(html: string): { updated: string; banks: BankRates[] } {
  const table = /<table>([\s\S]*?)<\/table>/.exec(html)?.[1] ?? "";
  const rows = table.match(/<tr>[\s\S]*?<\/tr>/g) ?? [];

  let updated = "";
  const banks: BankRates[] = [];

  for (const row of rows) {
    const cells = [...row.matchAll(/<td>([\s\S]*?)<\/td>/g)].map((m) => cellText(m[1]));
    if (cells.length < 14) continue; // строка заголовка (th, не td)

    const nums = cells.slice(1, 13).map((c) => parseFloat(c));
    if (nums.some((n) => !Number.isFinite(n))) continue;

    const [interbank_buy, interbank_sell, cash_buy, cash_sell, noncash_buy, noncash_sell, , , card_buy, card_sell] =
      nums;
    const rates = { interbank_buy, interbank_sell, cash_buy, cash_sell, noncash_buy, noncash_sell, card_buy, card_sell };
    if (Object.values(rates).every((v) => v === 0)) continue;

    updated = cells[13] || updated;
    banks.push({ name: cells[0], ...rates });
  }

  return { updated, banks };
}

async function handleBanks(url: URL): Promise<Response> {
  const currency = (url.searchParams.get("currency") || "USD").toUpperCase();
  if (!BANKS_ALLOWED_CURRENCIES.has(currency)) {
    return jsonResponse(
      { error: `Unsupported currency "${currency}". Allowed: ${[...BANKS_ALLOWED_CURRENCIES].join(", ")}` },
      400,
    );
  }

  const nbtUrl = `${NBT_HOST}/tj/kurs/kurs_kommer_bank.php?currency=${currency}`;

  let upstream: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    upstream = await fetch(nbtUrl, {
      signal: controller.signal,
      cf: { cacheTtl: EDGE_CACHE_SECONDS, cacheEverything: true },
    });
    clearTimeout(timeout);
  } catch (err) {
    return jsonResponse({ error: "Upstream NBT request failed", detail: String(err) }, 502);
  }

  if (!upstream.ok) {
    return jsonResponse({ error: `NBT responded with ${upstream.status}` }, 502);
  }

  const html = await upstream.text();
  const { updated, banks } = parseBanks(html);
  if (banks.length === 0) {
    return jsonResponse({ error: "NBT returned no parsable bank rates" }, 502);
  }

  return jsonResponse({ updated, currency, banks }, 200, { "Cache-Control": `public, max-age=${EDGE_CACHE_SECONDS}` });
}

export default {
  async fetch(request: Request, _env: unknown, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }
    if (request.method !== "GET") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    if (url.pathname === "/api/history") {
      const cache = caches.default;
      const cacheKey = new Request(url.toString(), request);
      const cached = await cache.match(cacheKey);
      if (cached) return cached;

      const response = await handleHistory(url);
      if (response.status === 200) {
        ctx.waitUntil(cache.put(cacheKey, response.clone()));
      }
      return response;
    }

    if (url.pathname === "/api/banks") {
      const cache = caches.default;
      const cacheKey = new Request(url.toString(), request);
      const cached = await cache.match(cacheKey);
      if (cached) return cached;

      const response = await handleBanks(url);
      if (response.status === 200) {
        ctx.waitUntil(cache.put(cacheKey, response.clone()));
      }
      return response;
    }

    if (url.pathname === "/" || url.pathname === "/api") {
      return jsonResponse({
        service: "kursi-tojik-proxy",
        endpoints: [
          "/api/history?cs=USD&days=90 (currencies: USD, EUR, RUB, CNY, KZT)",
          "/api/banks?currency=USD (currencies: USD, EUR, RUB)",
        ],
      });
    }

    return jsonResponse({ error: "Not found" }, 404);
  },
};
