# Курси Точик

Курс сомони, конвертер валют и курсы банков Таджикистана. `web/` — статический
фронтенд (Vite + TS), `worker/` — Cloudflare Worker, CORS-прокси для НБТ (nbt.tj).

## Деплой

**Прод:**
- Сайт: https://kursi-tojik.pages.dev
- Worker: https://kursi-tojik-proxy.simorgh-dev.workers.dev

**Web (Cloudflare Pages):**

```bash
cd web
npm run build
npx wrangler@4 pages deploy dist --project-name=kursi-tojik
```

`VITE_WORKER_URL` для прод-сборки берётся из `web/.env.production`.

**Worker (Cloudflare Workers):**

```bash
cd worker
npx wrangler deploy
```
