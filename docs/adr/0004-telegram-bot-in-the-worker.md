# 4. The Telegram bot runs in the same worker

Date: 2026-10-01 · Status: accepted

## Context
The bot needs the same data and conversion rules as the site.

## Decision
Handle Telegram updates through a webhook in the API worker and store bot users in the same D1 database. The daily digest uses a second cron.

## Consequences
- No extra server; the bot shares tested code with the API (`money.ts`, `db.ts`).
- The bot is off until `TELEGRAM_BOT_TOKEN` and `BOT_USERNAME` are set; the webhook checks a secret header on every call.
