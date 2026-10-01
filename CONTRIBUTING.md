# Contributing

## Setup

Node.js 24. Each package has its own dependencies:

```bash
cd api && npm install
cd web && npm install && npx playwright install chromium
```

## Conventions

- TypeScript strict everywhere; ESLint must pass.
- Code, comments and docs in English. Visible text lives in `web/messages/{tj,ru,en}.json` and `api/src/bot/texts.ts`,
  with the same keys in every language (a unit test checks the site dictionaries).
- Never call the National Bank "БМТ" in Tajik: it means the UN. Use "Бонки миллӣ". A test enforces it.
- Only official data: every number must come from nbt.tj and be shown with its date (see `docs/adr/0003-only-official-data.md`).
- Data from the network is rendered with `textContent`, never `innerHTML`.
- No inline `<script>`, `<style>` or `style=""` in the pages: the build fails, because the CSP forbids them.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org): `feat(api):`, `fix(web):`, `docs:`, `test:`, `chore:`.

## Common changes

**Change a text on the site.** Edit the key in all three files in `web/messages/`, run `npm test`.

**Add a currency to the board and chart.** Add the code to `TRACKED` in `api/src/collect.ts` and `web/src/board.ts`
(same order), add its name to the `currency` section of the three dictionaries, deploy the API and run
`POST /admin/collect?backfill=400` to load its history.

**Change how a bot command answers.** Parsing is in `api/src/bot/commands.ts`, replies in `api/src/bot/handle.ts`,
wording in `api/src/bot/texts.ts`. Add a case to `api/test/bot.test.ts`.

**nbt.tj changed its format.** Save a fresh response into `api/test/fixtures/`, update the parser in `api/src/nbt.ts`
until `npm test` passes.

**Database change.** Add `api/migrations/000N_name.sql`, then `npx wrangler d1 migrations apply kursi-tojik --remote`.

## Secrets and the bot

```bash
cd api
npx wrangler secret put ADMIN_TOKEN               # any long random string; keep a copy locally
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET   # any long random string
npx wrangler secret put TELEGRAM_BOT_TOKEN        # from @BotFather
```

Set `BOT_USERNAME` (without "@") under `[vars]` in `api/wrangler.toml`, deploy, then point Telegram at the worker:

```bash
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" https://kursi-tojik-api.simorgh-dev.workers.dev/admin/telegram/setup
```

The site shows the bot section as soon as `/api/health` reports `"bot": true`.

## Release

1. CI green on the pull request.
2. `cd api && npx wrangler deploy` (and migrations, if any).
3. `cd web && npm run build && npx wrangler pages deploy dist --project-name kursi-tojik --branch main`.
4. Add the changes to `CHANGELOG.md`.
