export type TrackedCurrency = "USD" | "EUR" | "RUB" | "CNY" | "KZT";

export const TRACKED_CURRENCIES: TrackedCurrency[] = ["USD", "EUR", "RUB", "CNY", "KZT"];

export interface RatePoint {
  date: string; // YYYY-MM-DD
  nominal: number;
  value: number; // TJS per `nominal` units of the currency
}

export interface HistoryResponse {
  currency: string;
  from: string;
  to: string;
  count: number;
  rates: RatePoint[];
}

export interface BankRateEntry {
  buy: number;
  sell: number;
}

export interface Bank {
  id: string;
  name: string;
  updated: string;
  verified: boolean;
  rates: Partial<Record<"USD" | "EUR" | "RUB", BankRateEntry>>;
}

export interface BanksFile {
  note: string;
  banks: Bank[];
}

/** Один банк в ответе воркера GET /api/banks — все курсы для запрошенной валюты. */
export interface BankApiEntry {
  name: string;
  interbank_buy: number;
  interbank_sell: number;
  cash_buy: number;
  cash_sell: number;
  noncash_buy: number;
  noncash_sell: number;
  card_buy: number;
  card_sell: number;
}

export interface BanksApiResponse {
  updated: string;
  currency: string;
  banks: BankApiEntry[];
}

export interface TransferTier {
  upTo: number | null;
  feePercent: number;
  minFee: number;
}

export interface TransferSystem {
  id: string;
  name: string;
  url: string;
  tiers: TransferTier[];
}

export interface TransfersFile {
  note: string;
  systems: TransferSystem[];
}
