export type TrackedCurrency = "USD" | "EUR" | "RUB" | "CNY" | "KZT";

export const TRACKED_CURRENCIES: TrackedCurrency[] = ["USD", "EUR", "RUB", "CNY", "KZT"];

export const CURRENCY_NAMES: Record<TrackedCurrency, string> = {
  USD: "Доллар США",
  EUR: "Евро",
  RUB: "Российский рубль",
  CNY: "Китайский юань",
  KZT: "Казахстанский тенге",
};

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
