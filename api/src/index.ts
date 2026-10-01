/**
 * Kursi Tojik API worker.
 *
 * fetch:     public read API, owner maintenance endpoints and the Telegram webhook (src/app.ts)
 * scheduled: every 3 hours collects nbt.tj into D1; at 04:00 UTC (09:00 Dushanbe) sends the bot digest
 */

import { app } from "./app";
import { sendDigest } from "./bot/handle";
import { telegramSender } from "./bot/telegram";
import { collect } from "./collect";
import type { Env } from "./env";

export const DIGEST_CRON = "0 4 * * *";

export default {
  fetch: app.fetch,

  async scheduled(controller, env, ctx) {
    if (controller.cron === DIGEST_CRON) {
      if (!env.TELEGRAM_BOT_TOKEN) return;
      ctx.waitUntil(sendDigest(env, telegramSender(env.TELEGRAM_BOT_TOKEN)).then((r) => console.log("digest", r)));
      return;
    }
    ctx.waitUntil(collect(env, new Date(controller.scheduledTime)).then((r) => console.log("collect", r)));
  },
} satisfies ExportedHandler<Env>;
