/** Shapes of the Kursi Tojik API responses (see api/src/app.ts). */

export interface LatestRate {
  code: string;
  name: string;
  nominal: number;
  /** TJS per `nominal` units. */
  value: number;
  previousPerUnit: number | null;
}

export interface Latest {
  date: string;
  previousDate: string | null;
  rates: LatestRate[];
}

export interface HistoryPoint {
  date: string;
  nominal: number;
  value: number;
}

export interface BankRate {
  name: string;
  bank: string;
  cashBuy: number | null;
  cashSell: number | null;
  updated: string;
}

export interface Banks {
  currency: string;
  updated: string | null;
  banks: BankRate[];
}

export interface Health {
  bot: boolean;
  botUsername: string | null;
}
