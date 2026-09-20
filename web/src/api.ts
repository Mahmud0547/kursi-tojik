import type { HistoryResponse, TrackedCurrency } from "./types";

const WORKER_URL = (import.meta.env.VITE_WORKER_URL as string | undefined)?.replace(/\/$/, "");

const cache = new Map<TrackedCurrency, Promise<HistoryResponse>>();

/** Fetches (and memoizes for this page session) up to `days` of TJS rate history for one currency. */
export function fetchHistory(currency: TrackedCurrency, days = 95): Promise<HistoryResponse> {
  const cached = cache.get(currency);
  if (cached) return cached;

  if (!WORKER_URL) {
    return Promise.reject(
      new Error(
        "VITE_WORKER_URL не задан. Укажите адрес развёрнутого Cloudflare Worker в .env (см. .env.example).",
      ),
    );
  }

  const promise = fetch(`${WORKER_URL}/api/history?cs=${currency}&days=${days}`)
    .then(async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Запрос к прокси завершился ошибкой (${res.status})`);
      }
      return res.json() as Promise<HistoryResponse>;
    })
    .catch((err) => {
      cache.delete(currency);
      throw err;
    });

  cache.set(currency, promise);
  return promise;
}
