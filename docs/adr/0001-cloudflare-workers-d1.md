# 1. Cloudflare Workers and D1 instead of a proxy

Date: 2026-10-01 · Status: accepted

## Context
v1 proxied every visitor request to nbt.tj. When nbt.tj was slow or down, the site was empty, and history depended on NBT's export each time.

## Decision
Collect from nbt.tj on a schedule into a D1 database and serve every read from D1. Keep Workers (free tier, cron triggers, same account as Pages).

## Consequences
- The site and the bot work when nbt.tj is down; data shows its own date.
- We own a history we can chart for a year without extra NBT calls.
- One more moving part (the cron). `/api/health` and `collect_runs` make failures visible.
