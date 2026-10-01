# Architecture

## Components

| Component | Where | Responsibility |
|---|---|---|
| Collector | `api/src/collect.ts`, cron `0 */3 * * *` | Reads nbt.tj and writes D1. Backfills 400 days of history on the first run. |
| NBT parsers | `api/src/nbt.ts` | Pure functions over the daily XML, the history XML (windows-1251) and the bank HTML table. |
| API | `api/src/app.ts` (Hono) | Read-only JSON for the site; owner endpoints; Telegram webhook. |
| Bot | `api/src/bot/` | Parses messages, answers from D1, daily digest from the `0 4 * * *` cron. |
| Database | D1 `kursi-tojik`, `api/migrations/` | `rates`, `currencies`, `bank_rates`, `bot_users`, `collect_runs`. |
| Website | `web/` | Static pages per language; data loaded from the API in the browser. |

## Data flow

1. Every 3 hours the cron fetches today's daily XML (all published currencies) and the bank tables for USD, EUR and RUB.
2. Rates are stored as published: `value` TJS per `nominal` units. Conversions divide by the nominal.
3. Bank rates replace the previous snapshot only when the new one is not empty. `0.0000` from NBT means "not offered" and is stored as NULL.
4. Each run is recorded in `collect_runs`; `/api/health` reports the last run and whether data is stale (older than 4 days).

## Endpoints

| Method | Path | Cache | Notes |
|---|---|---|---|
| GET | `/api/rates/latest` | 5 min | latest date, previous date, every rate with the previous per-unit value |
| GET | `/api/history?code=USD&days=30` | 15 min | tracked currencies only; days 2–400 |
| GET | `/api/banks?currency=USD` | 15 min | USD, EUR, RUB |
| GET | `/api/health` | — | freshness, last run, bot status |
| POST | `/admin/collect?backfill=N` | — | `Authorization: Bearer <ADMIN_TOKEN>` |
| POST | `/admin/telegram/setup` | — | sets the webhook and the command list |
| POST | `/telegram/webhook` | — | requires `X-Telegram-Bot-Api-Secret-Token` |

## Website

- `web/template.html` + `web/messages/*.json` → `scripts/pages.mjs` generates `index.html` (tg), `ru/index.html`, `en/index.html`.
  Static text is in the HTML for search engines; numbers are filled in by `src/main.ts`.
- No inline scripts or styles, so `_headers` (written by `scripts/postbuild.mjs`) can use `script-src 'self'; style-src 'self'`.
- A service worker keeps the last pages and API answers for offline use.

## Failure behaviour

| Situation | What people see |
|---|---|
| nbt.tj down | the last stored rates with their date; the next run fills the gap |
| API down | the site says the data could not be loaded; no zeros or invented numbers |
| Bot token not set | webhook answers 503, the site hides the bot section |
