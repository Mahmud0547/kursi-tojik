import { applyD1Migrations, env } from "cloudflare:test";

// Every test file starts with an empty database that has the real schema.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
