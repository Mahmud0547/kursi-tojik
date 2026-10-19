/**
 * "Where to exchange": for an amount of foreign cash, how many somoni each bank gives (when you sell)
 * or charges (when you buy), best bank first. Uses the cash rates the National Bank publishes for every bank.
 */

import type { BankRate } from "./types";

export type Direction = "sell" | "buy";

export interface Offer {
  bank: string;
  /** TJS per one unit of the currency. */
  rate: number;
  /** TJS you get (sell) or pay (buy) for the whole amount. */
  total: number;
}

export function rankOffers(banks: BankRate[], amount: number, direction: Direction): Offer[] {
  const offers = banks.flatMap((bank) => {
    // When you sell, the bank buys from you at its "buy" price; when you buy, it sells at its "sell" price.
    const rate = direction === "sell" ? bank.cashBuy : bank.cashSell;
    return rate === null ? [] : [{ bank: bank.name, rate, total: amount * rate }];
  });
  // Selling: more somoni is better. Buying: paying less is better.
  return offers.sort((a, b) => (direction === "sell" ? b.total - a.total : a.total - b.total) || a.bank.localeCompare(b.bank, "ru"));
}

/** How much the best bank is better than the worst one, in TJS. */
export function saving(offers: Offer[]): number {
  if (offers.length < 2) return 0;
  return Math.abs(offers[0]!.total - offers[offers.length - 1]!.total);
}
