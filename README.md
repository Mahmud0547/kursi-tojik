# Kursi Tojik

Official Tajik somoni exchange rates from the National Bank of Tajikistan — on the web and in Telegram.

**Live:** https://kursi-tojik.pages.dev · **API:** https://kursi-tojik-api.simorgh-dev.workers.dev

- Today's official rates with the daily change, for every currency NBT publishes.
- A converter between any two of them (through TJS, respecting nominals such as 10 KZT and 100 UZS).
- Rate history from 7 days to a year, from our own database.
- Commercial bank cash rates with the best ones marked.
- A Telegram bot: send `100 usd` and get somoni; daily digest at 09:00 Dushanbe time.
- Tajik (default), Russian and English.

Every number comes from [nbt.tj](https://www.nbt.tj) and is shown with its date. Nothing is estimated or typed by hand.

## How it works

```
nbt.tj ──(every 3 h)──▶ Worker cron ──▶ D1 database ◀── Worker API ◀── website (Cloudflare Pages)
                                                    ◀── Telegram bot webhook
```

The website and the bot read only from the database, so they keep working when nbt.tj is slow or down.
See [docs/architecture.md](docs/architecture.md).

## Repository

| Folder | What | Stack |
|---|---|---|
| [`api/`](api) | API, scheduled collection, Telegram bot | Cloudflare Workers, Hono, D1 (SQLite), TypeScript |
| [`web/`](web) | Website | Vite, TypeScript (no framework), plain CSS |

## Run locally

```bash
cd api && npm install && npx wrangler d1 migrations apply kursi-tojik --local && npm run dev   # http://localhost:8787
cd web && npm install && VITE_API_URL=http://localhost:8787 npm run dev                        # http://localhost:5173
```

Fill the local database once: `curl "http://localhost:8787/__scheduled?cron=0+*/3+*+*+*"` (runs the collection cron locally).

## Tests

```bash
cd api && npm run typecheck && npm run lint && npm test
cd web && npm run lint && npm test && npm run build && npm run test:e2e && npx lhci autorun
```

## Deploy

```bash
cd api && npx wrangler deploy
cd web && npm run build && npx wrangler pages deploy dist --project-name kursi-tojik --branch main
```

Details, secrets and the bot setup: [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Code: [MIT](LICENSE). Exchange-rate data belongs to the National Bank of Tajikistan.
