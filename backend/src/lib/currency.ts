import { db } from "@/db";
import { accounts, transactions, budgets, savingsGoals, recurringTransactions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export const BASE_RATES_USD: Record<string, number> = {
  USD: 1.0,
  INR: 84.0,
  EUR: 0.92,
  GBP: 0.78,
  JPY: 150.0,
  CAD: 1.36,
  AUD: 1.52,
  AED: 3.67,
};

let liveRatesCache: { rates: Record<string, number>; timestamp: number } | null = null;

export async function getLiveRates(): Promise<Record<string, number>> {
  if (liveRatesCache && Date.now() - liveRatesCache.timestamp < 3600000) {
    return liveRatesCache.rates;
  }
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const json = (await res.json()) as { rates?: Record<string, number> };
      if (json && json.rates) {
        liveRatesCache = {
          rates: { ...BASE_RATES_USD, ...json.rates },
          timestamp: Date.now(),
        };
        return liveRatesCache.rates;
      }
    }
  } catch {
    // Network offline or timeout - safely fallback to base rates
  }
  return BASE_RATES_USD;
}

export async function getExchangeRate(from: string, to: string): Promise<number> {
  const f = (from || "INR").toUpperCase();
  const t = (to || "INR").toUpperCase();
  if (f === t) return 1.0;

  const rates = await getLiveRates();
  const fromRate = rates[f] ?? BASE_RATES_USD[f] ?? 1.0;
  const toRate = rates[t] ?? BASE_RATES_USD[t] ?? 1.0;
  if (!fromRate || !toRate || isNaN(fromRate) || isNaN(toRate) || fromRate <= 0) return 1.0;
  return toRate / fromRate;
}

/**
 * Converts all existing monetary records for a user from their old currency to their new currency.
 */
export async function convertAllUserAmounts(userId: string, fromCurrency: string, toCurrency: string) {
  const f = (fromCurrency || "INR").toUpperCase();
  const t = (toCurrency || "INR").toUpperCase();
  if (f === t) return { rate: 1.0, fromCurrency: f, toCurrency: t };

  const rate = await getExchangeRate(f, t);
  if (!rate || isNaN(rate) || rate <= 0) {
    return { rate: 1.0, fromCurrency: f, toCurrency: t };
  }
  const decimals = t === "JPY" ? 0 : 2;

  // 1. Accounts
  await db
    .update(accounts)
    .set({
      balance: sql`ROUND((COALESCE(${accounts.balance}, 0) * ${rate})::numeric, ${decimals})`,
      updatedAt: new Date(),
    })
    .where(eq(accounts.userId, userId));

  // 2. Transactions
  await db
    .update(transactions)
    .set({
      amount: sql`ROUND((COALESCE(${transactions.amount}, 0) * ${rate})::numeric, ${decimals})`,
      updatedAt: new Date(),
    })
    .where(eq(transactions.userId, userId));

  // 3. Budgets
  await db
    .update(budgets)
    .set({
      amount: sql`ROUND((COALESCE(${budgets.amount}, 0) * ${rate})::numeric, ${decimals})`,
    })
    .where(eq(budgets.userId, userId));

  // 4. Savings Goals
  await db
    .update(savingsGoals)
    .set({
      targetAmount: sql`ROUND((COALESCE(${savingsGoals.targetAmount}, 0) * ${rate})::numeric, ${decimals})`,
      currentAmount: sql`ROUND((COALESCE(${savingsGoals.currentAmount}, 0) * ${rate})::numeric, ${decimals})`,
      updatedAt: new Date(),
    })
    .where(eq(savingsGoals.userId, userId));

  // 5. Recurring Transactions
  await db
    .update(recurringTransactions)
    .set({
      amount: sql`ROUND((COALESCE(${recurringTransactions.amount}, 0) * ${rate})::numeric, ${decimals})`,
    })
    .where(eq(recurringTransactions.userId, userId));

  return { rate, fromCurrency: f, toCurrency: t };
}
