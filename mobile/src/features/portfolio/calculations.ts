// Portfolio maths — mirrors the web dashboard so both apps show the same numbers.
import type {
  AdditionalInvestment, Currency, LoanInvestment, MFHolding, RealEstateProperty, StockQuote, Transaction,
} from '@/types/models';

const YEAR_MS = 365.25 * 86_400_000;
const yearsSince = (iso: string) => (Date.now() - new Date(iso).getTime()) / YEAR_MS;

export const toINR = (amount: number, currency: Currency, usdInr: number) => (currency === 'USD' ? amount * usdInr : amount);

// ─── Equity ──────────────────────────────────────────────────────────────────

export interface EquityHolding {
  key: string;
  symbol: string;
  name: string;
  account: string;
  currency: Currency;
  quantity: number;
  avgPrice: number;
  invested: number;
  price: number | null;
  value: number | null;
  dayChangePct: number | null;
  pnl: number | null;
  pnlPct: number | null;
}

/** Average-cost holdings per (symbol, account, currency), sells reduce quantity at average cost. */
export function computeHoldings(transactions: Transaction[], quotes: Map<string, StockQuote>): EquityHolding[] {
  const groups = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const key = `${tx.symbol}__${tx.dematAccount}__${tx.currency}`;
    groups.set(key, [...(groups.get(key) ?? []), tx]);
  }

  const holdings: EquityHolding[] = [];
  groups.forEach((txs, key) => {
    const sorted = [...txs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let qty = 0, cost = 0;
    for (const tx of sorted) {
      if (tx.type === 'buy') { cost += tx.quantity * tx.price; qty += tx.quantity; }
      else if (qty > 0) { const avg = cost / qty; qty -= tx.quantity; cost = avg * qty; }
    }
    if (qty < 0.0001) return;

    const { symbol, dematAccount, currency } = sorted[0];
    // Ignore quotes in another currency, e.g. INR holding "INFY" resolving to the USD-listed ADR
    // (Indian symbols need the .NS suffix) — a wrong price is worse than none.
    const rawQuote = quotes.get(symbol.toUpperCase());
    const quote = rawQuote && (!rawQuote.currency || rawQuote.currency === currency) ? rawQuote : undefined;
    const price = quote?.regularMarketPrice ?? null;
    const value = price !== null ? price * qty : null;
    const pnl   = value !== null ? value - cost : null;
    holdings.push({
      key, symbol, account: dematAccount, currency,
      name: quote?.longName ?? quote?.shortName ?? symbol,
      quantity: qty, avgPrice: cost / qty, invested: cost,
      price, value,
      dayChangePct: quote?.regularMarketChangePercent ?? null,
      pnl, pnlPct: pnl !== null && cost > 0 ? (pnl / cost) * 100 : null,
    });
  });
  return holdings.sort((a, b) => (b.value ?? b.invested) - (a.value ?? a.invested));
}

// ─── Mutual funds ────────────────────────────────────────────────────────────

export interface FundPosition {
  id: string;
  name: string;
  amc?: string;
  schemeCode: string;
  units: number;
  invested: number;
  nav: number | null;
  value: number;
  pnl: number;
  pnlPct: number;
}

export function computeFunds(holdings: MFHolding[], navs: Record<string, number>): FundPosition[] {
  return holdings.map(h => {
    const invested = h.transactions.filter(t => t.type === 'buy').reduce((s, t) => s + t.amount, 0);
    const units    = h.transactions.reduce((s, t) => (t.type === 'buy' ? s + t.units : s - t.units), 0);
    const nav      = navs[h.schemeCode] ?? null;
    const value    = nav !== null ? units * nav : invested;
    const pnl      = value - invested;
    return {
      id: h.id, name: h.fundName, amc: h.amcName, schemeCode: h.schemeCode,
      units, invested, nav, value, pnl, pnlPct: invested > 0 ? (pnl / invested) * 100 : 0,
    };
  }).sort((a, b) => b.value - a.value);
}

// ─── Real estate / additional investments / loans ────────────────────────────

export const propertyCost = (p: RealEstateProperty) => p.propertyPrice * (p.mySharePercent / 100);

export function propertyEstimate(p: RealEstateProperty): number {
  const cost = propertyCost(p);
  const yrs = yearsSince(p.purchaseDate);
  return p.appreciationPerYear > 0 && yrs > 0 ? cost * Math.pow(1 + p.appreciationPerYear / 100, yrs) : cost;
}

export function investmentEstimate(inv: AdditionalInvestment): number {
  const yrs = yearsSince(inv.dateOfInvestment);
  return inv.interestPercent > 0 && yrs > 0 ? inv.amountInvested * Math.pow(1 + inv.interestPercent / 100, yrs) : inv.amountInvested;
}

export const loanReturned    = (l: LoanInvestment) => l.returns.reduce((s, r) => s + r.amount, 0);
export const loanOutstanding = (l: LoanInvestment) => Math.max(0, l.principal - loanReturned(l));

// ─── Consolidated summary (all values in INR) ────────────────────────────────

export type CategoryKey = 'us' | 'india' | 'mf' | 're' | 'addl' | 'loans' | 'cash';

export interface CategorySummary {
  key: CategoryKey;
  label: string;
  count: string;
  invested: number;
  current: number;
  pnl: number;
  pnlPct: number;
  allocation: number;
}

export interface PortfolioSummary {
  categories: CategorySummary[];
  totalInvested: number;
  totalCurrent: number;
  netPnL: number;
  netPnLPct: number;
  liquid: number;
  illiquid: number;
}

interface SummaryInput {
  holdings: EquityHolding[];
  funds: FundPosition[];
  properties: RealEstateProperty[];
  investments: AdditionalInvestment[];
  loans: LoanInvestment[];
  cashUsd: Record<string, number>;
  cashInr: Record<string, number>;
  usdInr: number;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function summarize(input: SummaryInput): PortfolioSummary {
  const { holdings, funds, properties, investments, loans, cashUsd, cashInr, usdInr } = input;
  const inr = (amount: number, currency: Currency) => toINR(amount, currency, usdInr);

  const us    = holdings.filter(h => h.currency === 'USD');
  const india = holdings.filter(h => h.currency === 'INR');
  const active = properties.filter(p => p.status === 'active');
  const cash = Object.values(cashInr).reduce((s, v) => s + (v ?? 0), 0)
             + Object.values(cashUsd).reduce((s, v) => s + (v ?? 0), 0) * usdInr;

  const raw: Omit<CategorySummary, 'pnl' | 'pnlPct' | 'allocation'>[] = [
    { key: 'us', label: 'US Equity', count: plural(us.length, 'holding'),
      invested: us.reduce((s, h) => s + inr(h.invested, 'USD'), 0),
      current:  us.reduce((s, h) => s + inr(h.value ?? h.invested, 'USD'), 0) },
    { key: 'india', label: 'India Equity', count: plural(india.length, 'holding'),
      invested: india.reduce((s, h) => s + h.invested, 0),
      current:  india.reduce((s, h) => s + (h.value ?? h.invested), 0) },
    { key: 'mf', label: 'Mutual Funds', count: plural(funds.length, 'fund'),
      invested: funds.reduce((s, f) => s + f.invested, 0),
      current:  funds.reduce((s, f) => s + f.value, 0) },
    { key: 're', label: 'Real Estate', count: `${active.length} active propert${active.length === 1 ? 'y' : 'ies'}`,
      invested: active.reduce((s, p) => s + inr(propertyCost(p), p.currency), 0),
      current:  active.reduce((s, p) => s + inr(propertyEstimate(p), p.currency), 0) },
    { key: 'addl', label: 'Additional Investments', count: plural(investments.length, 'investment'),
      invested: investments.reduce((s, i) => s + inr(i.amountInvested, i.currency), 0),
      current:  investments.reduce((s, i) => s + inr(investmentEstimate(i), i.currency), 0) },
    { key: 'loans', label: 'Interest Loans', count: plural(loans.length, 'loan'),
      invested: loans.reduce((s, l) => s + inr(l.principal, l.currency), 0),
      current:  loans.reduce((s, l) => s + inr(loanOutstanding(l), l.currency), 0) },
    { key: 'cash', label: 'Cash', count: 'USD + INR balances', invested: cash, current: cash },
  ];

  const totalCurrent = raw.reduce((s, c) => s + c.current, 0);
  const categories = raw.map(c => {
    const pnl = c.current - c.invested;
    return {
      ...c,
      pnl,
      pnlPct: c.invested > 0 ? (pnl / c.invested) * 100 : 0,
      allocation: totalCurrent > 0 ? (c.current / totalCurrent) * 100 : 0,
    };
  });

  const byKey = Object.fromEntries(categories.map(c => [c.key, c])) as Record<CategoryKey, CategorySummary>;
  // Gains exclude cash and loans (loans are tracked as outstanding principal)
  const gainKeys: CategoryKey[] = ['us', 'india', 'mf', 're', 'addl'];
  const totalInvested = gainKeys.reduce((s, k) => s + byKey[k].invested, 0);
  const netPnL        = gainKeys.reduce((s, k) => s + byKey[k].pnl, 0);

  return {
    categories,
    totalInvested,
    totalCurrent,
    netPnL,
    netPnLPct: totalInvested > 0 ? (netPnL / totalInvested) * 100 : 0,
    liquid:   byKey.us.current + byKey.india.current + byKey.mf.current + byKey.cash.current,
    illiquid: byKey.loans.current + byKey.re.current + byKey.addl.current,
  };
}
