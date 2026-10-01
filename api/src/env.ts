/** Bindings and settings of the worker (see wrangler.toml; secrets are set with `wrangler secret put`). */
export interface Env {
  DB: D1Database;
  ALLOWED_ORIGINS: string;
  SITE_URL: string;
  /** Guards the /admin endpoints. Secret. */
  ADMIN_TOKEN?: string;
  /** Telegram bot token from @BotFather. Secret; the bot is off until it is set. */
  TELEGRAM_BOT_TOKEN?: string;
  /** Telegram sends it back in a header on every webhook call. Secret. */
  TELEGRAM_WEBHOOK_SECRET?: string;
}
