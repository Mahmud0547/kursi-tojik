/** Client for the Kursi Tojik API. Every response is checked before use; anything unexpected becomes an error. */

import type { Banks, Health, HistoryPoint, Latest, LatestRate } from "./types";

const API_URL = document.querySelector<HTMLMetaElement>('meta[name="api-url"]')?.content ?? "";
const TIMEOUT_MS = 10_000;

async function getJson(path: string): Promise<unknown> {
  const response = await fetch(`${API_URL}${path}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}

const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v);

function isRate(v: unknown): v is LatestRate {
  const r = v as LatestRate;
  return typeof r?.code === "string" && /^[A-Z]{3}$/.test(r.code) && isNumber(r.value) && r.value > 0 && isNumber(r.nominal) && r.nominal > 0
    && (r.previousPerUnit === null || isNumber(r.previousPerUnit));
}

export async function getLatest(): Promise<Latest> {
  const body = (await getJson("/api/rates/latest")) as Latest;
  if (!isDate(body?.date) || !Array.isArray(body.rates)) throw new Error("latest: unexpected response");
  return { date: body.date, previousDate: isDate(body.previousDate) ? body.previousDate : null, rates: body.rates.filter(isRate) };
}

export async function getHistory(code: string, days: number): Promise<HistoryPoint[]> {
  const body = (await getJson(`/api/history?code=${encodeURIComponent(code)}&days=${days}`)) as { points?: HistoryPoint[] };
  if (!Array.isArray(body?.points)) throw new Error("history: unexpected response");
  return body.points.filter((p) => isDate(p.date) && isNumber(p.value) && p.value > 0 && isNumber(p.nominal) && p.nominal > 0);
}

export async function getBanks(currency: string): Promise<Banks> {
  const body = (await getJson(`/api/banks?currency=${encodeURIComponent(currency)}`)) as Banks;
  if (!Array.isArray(body?.banks)) throw new Error("banks: unexpected response");
  const price = (v: unknown) => (isNumber(v) && v > 0 ? v : null);
  return {
    currency,
    updated: typeof body.updated === "string" ? body.updated : null,
    banks: body.banks
      .filter((b) => typeof b?.name === "string")
      .map((b) => ({ name: b.name, bank: String(b.bank ?? b.name), cashBuy: price(b.cashBuy), cashSell: price(b.cashSell), updated: String(b.updated ?? "") })),
  };
}

export async function getHealth(): Promise<Health> {
  const body = (await getJson("/api/health")) as Partial<Health>;
  return { bot: body?.bot === true, botUsername: typeof body?.botUsername === "string" ? body.botUsername : null };
}
