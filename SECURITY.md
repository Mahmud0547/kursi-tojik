# Security

Report a vulnerability privately on Telegram: https://t.me/SimorghDev. Please do not open a public issue.

## Measures

- **Website:** strict Content-Security-Policy (`script-src 'self'`, `style-src 'self'`, `connect-src` limited to the API, `frame-ancestors 'none'`), HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`. No cookies, no analytics, no third-party requests. Network data is rendered with `textContent` only.
- **API:** read-only public endpoints with a CORS allowlist and input validation; parameterised D1 queries; security headers from Hono.
- **Owner endpoints:** bearer token compared in constant time.
- **Telegram webhook:** rejects calls without the secret header Telegram sends.
- **Secrets** (`ADMIN_TOKEN`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`) live only in Cloudflare (`wrangler secret put`), never in the repository.
- **Dependencies:** `npm audit` in CI, Dependabot, CodeQL.
