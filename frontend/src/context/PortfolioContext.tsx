import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Transaction, Holding, Currency, DematAccount, StockQuote } from '../types';
import { fetchQuotes } from '../services/stockService';
import { computeXIRR } from '../services/xirr';
import { useAuth } from './AuthContext';

interface AddBuyParams {
  symbol: string;
  quantity: number;
  price: number;
  fees?: number;
  currency: Currency;
  dematAccount: DematAccount;
  date?: string;
}

interface AddSellParams {
  symbol: string;
  quantity: number;
  price: number;
  fees?: number;
  currency: Currency;
  dematAccount: DematAccount;
}

export type CashAction = 'deposit' | 'withdraw' | 'set';

interface PortfolioContextType {
  transactions: Transaction[];
  holdings: Holding[];
  quotes: Map<string, StockQuote>;
  loading: boolean;
  usdCashBalances: Record<string, number>;
  inrCashBalances: Record<string, number>;
  updateCash: (account: DematAccount, amount: number, action: CashAction, currency: Currency) => void;
  addBuy: (params: AddBuyParams) => void;
  bulkAddBuy: (params: AddBuyParams[]) => void;
  addSell: (params: AddSellParams) => boolean;
  updateTransaction: (id: string, updates: Partial<Omit<Transaction, 'id'>>) => void;
  deleteTransaction: (id: string) => void;
  refreshQuotes: () => void;
}

const PortfolioContext = createContext<PortfolioContextType | null>(null);

function storageKey(user: string) {
  return `ft_transactions_${user}`;
}

function computeHoldings(transactions: Transaction[], quotes: Map<string, StockQuote>): Holding[] {
  const groups = new Map<string, Transaction[]>();
  transactions.forEach(tx => {
    const key = `${tx.symbol}__${tx.dematAccount}__${tx.currency}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(tx);
  });

  const holdings: Holding[] = [];
  let totalCurrentValue = 0;

  const rawHoldings: Array<{
    symbol: string; dematAccount: DematAccount; currency: Currency;
    quantity: number; avgBuyPrice: number; totalInvested: number;
    currentPrice: number | null; todayChange: number | null; todayChangeAbsolute: number | null;
    currentValue: number | null; firstBuyDate: string | null;
    xirrCashflows: { amount: number; date: Date }[];
  }> = [];

  groups.forEach((txs, key) => {
    const parts = key.split('__');
    const symbol = parts[0];
    const dematAccount = parts[1] as DematAccount;
    const currency = parts[2] as Currency;

    let totalQty = 0;
    let totalCost = 0;
    let firstBuyDate: string | null = null;

    // Sort chronologically
    txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Build XIRR cash flows: buys = negative (outflow), sells = positive (inflow)
    const xirrCashflows: { amount: number; date: Date }[] = [];

    for (const tx of txs) {
      if (tx.type === 'buy') {
        if (!firstBuyDate) firstBuyDate = tx.date;
        totalCost += tx.quantity * tx.price;
        totalQty += tx.quantity;
        xirrCashflows.push({ amount: -(tx.quantity * tx.price), date: new Date(tx.date) });
      } else {
        if (totalQty > 0) {
          const avgBefore = totalCost / totalQty;
          totalQty -= tx.quantity;
          totalCost = avgBefore * totalQty;
          xirrCashflows.push({ amount: tx.quantity * tx.price, date: new Date(tx.date) });
        }
      }
    }

    if (totalQty < 0.0001) return;

    const avgBuyPrice = totalCost / totalQty;
    const totalInvested = avgBuyPrice * totalQty;

    const quote = quotes.get(symbol.toUpperCase());
    const currentPrice = quote?.regularMarketPrice ?? null;
    const todayChange = quote?.regularMarketChangePercent ?? null;
    const todayChangeAbsolute = quote?.regularMarketChange ?? null;
    const currentValue = currentPrice !== null ? currentPrice * totalQty : null;

    if (currentValue !== null) totalCurrentValue += currentValue;

    rawHoldings.push({
      symbol, dematAccount, currency,
      quantity: totalQty, avgBuyPrice, totalInvested,
      currentPrice, todayChange, todayChangeAbsolute, currentValue,
      firstBuyDate, xirrCashflows,
    });
  });

  rawHoldings.forEach(h => {
    const quote = quotes.get(h.symbol.toUpperCase());
    const companyName = quote?.longName ?? quote?.shortName ?? h.symbol;
    const currentValue = h.currentValue;

    const totalProfit = currentValue !== null
      ? ((currentValue - h.totalInvested) / h.totalInvested) * 100
      : null;

    const portfolioPercent = totalCurrentValue > 0 && currentValue !== null
      ? (currentValue / totalCurrentValue) * 100
      : 0;

    // XIRR: add current value as final positive cash flow at today
    let xirr: number | null = null;
    if (currentValue !== null && h.xirrCashflows.length > 0) {
      const flows = [
        ...h.xirrCashflows,
        { amount: currentValue, date: new Date() },
      ];
      xirr = computeXIRR(flows);
    }

    holdings.push({
      symbol: h.symbol,
      companyName,
      quantity: h.quantity,
      avgBuyPrice: h.avgBuyPrice,
      totalInvested: h.totalInvested,
      currency: h.currency,
      dematAccount: h.dematAccount,
      currentPrice: h.currentPrice,
      todayChange: h.todayChangeAbsolute,
      todayChangePercent: h.todayChange,
      currentValue,
      totalProfit,
      portfolioPercent,
      firstBuyDate: h.firstBuyDate,
      xirr,
    });
  });

  return holdings.sort((a, b) => (b.currentValue ?? 0) - (a.currentValue ?? 0));
}

function usdCashKey(user: string) { return `ft_cash_usd_${user}`; }
function inrCashKey(user: string) { return `ft_cash_inr_${user}`; }
function loadCash(key: string): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(key) || '{}') ?? {}; }
  catch { return {}; }
}

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [quotes, setQuotes] = useState<Map<string, StockQuote>>(new Map());
  const [loading, setLoading] = useState(false);

  const [usdCashBalances, setUsdCashBalances] = useState<Record<string, number>>({});
  const [inrCashBalances, setInrCashBalances] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!currentUser) { setTransactions([]); setUsdCashBalances({}); setInrCashBalances({}); return; }
    try {
      const raw = localStorage.getItem(storageKey(currentUser));
      setTransactions(raw ? JSON.parse(raw) : []);
    } catch { setTransactions([]); }
    // Migrate old ft_cash_ key to usd key on first load
    const oldRaw = localStorage.getItem(`ft_cash_${currentUser}`);
    if (oldRaw) {
      localStorage.setItem(usdCashKey(currentUser), oldRaw);
      localStorage.removeItem(`ft_cash_${currentUser}`);
    }
    setUsdCashBalances(loadCash(usdCashKey(currentUser)));
    setInrCashBalances(loadCash(inrCashKey(currentUser)));
  }, [currentUser]);

  const updateCash = (account: DematAccount, amount: number, action: CashAction, currency: Currency) => {
    if (currency === 'USD') {
      setUsdCashBalances(prev => {
        const current = prev[account] ?? 0;
        const next = action === 'set' ? amount : action === 'deposit' ? current + amount : Math.max(0, current - amount);
        const updated = { ...prev, [account]: next };
        if (currentUser) localStorage.setItem(usdCashKey(currentUser), JSON.stringify(updated));
        return updated;
      });
    } else {
      setInrCashBalances(prev => {
        const current = prev[account] ?? 0;
        const next = action === 'set' ? amount : action === 'deposit' ? current + amount : Math.max(0, current - amount);
        const updated = { ...prev, [account]: next };
        if (currentUser) localStorage.setItem(inrCashKey(currentUser), JSON.stringify(updated));
        return updated;
      });
    }
  };

  const saveTransactions = (txs: Transaction[]) => {
    if (!currentUser) return;
    localStorage.setItem(storageKey(currentUser), JSON.stringify(txs));
    setTransactions(txs);
  };

  const addBuy = (params: AddBuyParams) => {
    const fees = params.fees ?? 0;
    const tx: Transaction = {
      id: Date.now().toString(),
      symbol: params.symbol.toUpperCase(),
      quantity: params.quantity,
      price: params.price,
      fees,
      type: 'buy',
      currency: params.currency,
      dematAccount: params.dematAccount,
      date: new Date().toISOString(),
    };
    saveTransactions([...transactions, tx]);
    updateCash(params.dematAccount, params.quantity * params.price + fees, 'withdraw', params.currency);
  };

  const bulkAddBuy = (paramsList: AddBuyParams[]) => {
    const newTxs: Transaction[] = paramsList.map((params, i) => ({
      id: (Date.now() + i).toString(),
      symbol: params.symbol.toUpperCase(),
      quantity: params.quantity,
      price: params.price,
      fees: params.fees ?? 0,
      type: 'buy' as const,
      currency: params.currency,
      dematAccount: params.dematAccount,
      date: params.date ?? new Date().toISOString(),
    }));
    saveTransactions([...transactions, ...newTxs]);
  };

  const updateTransaction = (id: string, updates: Partial<Omit<Transaction, 'id'>>) => {
    const updated = transactions.map(t =>
      t.id === id ? { ...t, ...updates, symbol: (updates.symbol ?? t.symbol).toUpperCase() } : t
    );
    saveTransactions(updated);
  };

  const deleteTransaction = (id: string) => {
    saveTransactions(transactions.filter(t => t.id !== id));
  };

  const addSell = (params: AddSellParams): boolean => {
    const fees = params.fees ?? 0;
    const tx: Transaction = {
      id: Date.now().toString(),
      symbol: params.symbol.toUpperCase(),
      quantity: params.quantity,
      price: params.price,
      fees,
      type: 'sell',
      currency: params.currency,
      dematAccount: params.dematAccount,
      date: new Date().toISOString(),
    };
    saveTransactions([...transactions, tx]);
    updateCash(params.dematAccount, Math.max(0, params.quantity * params.price - fees), 'deposit', params.currency);
    return true;
  };

  const refreshQuotes = useCallback(async () => {
    const symbols = [...new Set(transactions.map(t => t.symbol.toUpperCase()))];
    if (symbols.length === 0) return;
    setLoading(true);
    const q = await fetchQuotes(symbols);
    setQuotes(q);
    setLoading(false);
  }, [transactions]);

  useEffect(() => {
    if (transactions.length > 0) refreshQuotes();
  }, [transactions]);

  const holdings = computeHoldings(transactions, quotes);

  return (
    <PortfolioContext.Provider value={{ transactions, holdings, quotes, loading, usdCashBalances, inrCashBalances, updateCash, addBuy, bulkAddBuy, addSell, updateTransaction, deleteTransaction, refreshQuotes }}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error('usePortfolio must be inside PortfolioProvider');
  return ctx;
}
