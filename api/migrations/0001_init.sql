-- Official NBT rates, one row per currency per date, exactly as published (value is per `nominal` units).
CREATE TABLE rates (
  date    TEXT    NOT NULL, -- YYYY-MM-DD, NBT rate date
  code    TEXT    NOT NULL, -- ISO 4217 code, e.g. USD
  nominal INTEGER NOT NULL, -- units the value refers to (10 for KZT, 100 for UZS)
  value   REAL    NOT NULL, -- TJS per `nominal` units
  PRIMARY KEY (date, code)
);
CREATE INDEX rates_code_date ON rates (code, date);

-- English currency names as NBT publishes them.
CREATE TABLE currencies (
  code    TEXT PRIMARY KEY,
  name_en TEXT NOT NULL
);

-- Latest commercial bank rates per currency, as published on nbt.tj. Replaced on every collection.
CREATE TABLE bank_rates (
  currency     TEXT NOT NULL,
  bank         TEXT NOT NULL, -- full legal name as published
  cash_buy     REAL,          -- NULL when the bank publishes 0 (not offered)
  cash_sell    REAL,
  noncash_buy  REAL,
  noncash_sell REAL,
  card_buy     REAL,
  card_sell    REAL,
  updated      TEXT NOT NULL, -- NBT timestamp, Dushanbe time, YYYY-MM-DDTHH:MM
  fetched_at   TEXT NOT NULL, -- when we collected it, ISO UTC
  PRIMARY KEY (currency, bank)
);

-- Telegram bot users: language preference and daily digest subscription.
CREATE TABLE bot_users (
  chat_id    INTEGER PRIMARY KEY,
  lang       TEXT    NOT NULL DEFAULT 'tj',
  subscribed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL
);

-- One row per collection run, for /api/health.
CREATE TABLE collect_runs (
  ran_at TEXT PRIMARY KEY, -- ISO UTC
  ok     INTEGER NOT NULL,
  detail TEXT    NOT NULL
);
