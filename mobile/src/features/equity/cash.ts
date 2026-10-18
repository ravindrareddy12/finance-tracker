import type { Currency } from '@/types/models';
import type { DataName, UserData } from '@/features/portfolio/usePortfolio';

export type CashAction = 'deposit' | 'withdraw' | 'set';

/** Same rules as the web's updateCash: withdrawals never go below zero. */
export function applyCash(balances: Record<string, number>, account: string, amount: number, action: CashAction) {
  const current = balances[account] ?? 0;
  const next = action === 'set' ? amount : action === 'deposit' ? current + amount : Math.max(0, current - amount);
  return { ...balances, [account]: next };
}

export const cashKey = (currency: Currency): DataName => (currency === 'USD' ? 'cash_usd' : 'cash_inr');
export const cashOf = (data: UserData, currency: Currency) => (currency === 'USD' ? data.cashUsd : data.cashInr);
