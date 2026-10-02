import * as XLSX from 'xlsx';
import type { MonthlyObligation, RealEstateProperty, LoanInvestment, AdditionalInvestment, MFHolding } from '../types';

interface Transaction {
  id: string; symbol: string; quantity: number; price: number; fees: number;
  type: 'buy' | 'sell'; currency: string; dematAccount: string; date: string;
}

function load<T>(key: string): T | null {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null'); } catch { return null; }
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function addSheet(wb: XLSX.WorkBook, name: string, rows: object[]) {
  if (rows.length === 0) {
    const ws = XLSX.utils.aoa_to_sheet([['No data']]);
    XLSX.utils.book_append_sheet(wb, ws, name);
    return;
  }
  const ws = XLSX.utils.json_to_sheet(rows);
  // Auto column widths
  const cols = Object.keys(rows[0]);
  ws['!cols'] = cols.map(c => ({ wch: Math.max(c.length, 12) }));
  XLSX.utils.book_append_sheet(wb, ws, name);
}

export function exportAllToExcel(user: string) {
  const wb = XLSX.utils.book_new();

  // ── 1. US Equity Transactions ─────────────────────────────────────────────
  const txns: Transaction[] = load<Transaction[]>(`ft_transactions_${user}`) ?? [];
  const usTxns = txns.filter(t => t.currency === 'USD')
    .sort((a, b) => b.date.localeCompare(a.date));
  addSheet(wb, 'US Equity Transactions', usTxns.map(t => ({
    Date: fmtDate(t.date),
    Type: t.type.toUpperCase(),
    Symbol: t.symbol,
    Quantity: t.quantity,
    'Price (USD)': t.price,
    'Fees (USD)': t.fees,
    'Total (USD)': +(t.quantity * t.price + (t.type === 'buy' ? t.fees : -t.fees)).toFixed(2),
    Account: t.dematAccount,
  })));

  // ── 2. India Equity Transactions ──────────────────────────────────────────
  const inTxns = txns.filter(t => t.currency === 'INR')
    .sort((a, b) => b.date.localeCompare(a.date));
  addSheet(wb, 'India Equity Transactions', inTxns.map(t => ({
    Date: fmtDate(t.date),
    Type: t.type.toUpperCase(),
    Symbol: t.symbol,
    Quantity: t.quantity,
    'Price (INR)': t.price,
    'Fees (INR)': t.fees,
    'Total (INR)': +(t.quantity * t.price + (t.type === 'buy' ? t.fees : -t.fees)).toFixed(2),
    Account: t.dematAccount,
  })));

  // ── 3. US Equity Holdings (computed) ──────────────────────────────────────
  addSheet(wb, 'US Equity Holdings', computeHoldings(txns, 'USD'));

  // ── 4. India Equity Holdings (computed) ───────────────────────────────────
  addSheet(wb, 'India Equity Holdings', computeHoldings(txns, 'INR'));

  // ── 5. Cash Balances ──────────────────────────────────────────────────────
  const cashUSD: Record<string, number> = load(`ft_cash_usd_${user}`) ?? {};
  const cashINR: Record<string, number> = load(`ft_cash_inr_${user}`) ?? {};
  const allAccounts = Array.from(new Set([...Object.keys(cashUSD), ...Object.keys(cashINR)]));
  addSheet(wb, 'Cash Balances', allAccounts.map(a => ({
    Account: a,
    'Cash (INR)': cashINR[a] ?? 0,
    'Cash (USD)': cashUSD[a] ?? 0,
  })));

  // ── 6. Mutual Funds ───────────────────────────────────────────────────────
  const mfHoldings: MFHolding[] = load(`ft_mf_${user}`) ?? [];
  addSheet(wb, 'Mutual Funds', mfHoldings.map(f => {
    const buys = f.transactions.filter(t => t.type === 'buy');
    const sells = f.transactions.filter(t => t.type === 'sell');
    const totalUnits = buys.reduce((s, t) => s + t.units, 0) - sells.reduce((s, t) => s + t.units, 0);
    const totalInvested = buys.reduce((s, t) => s + t.amount, 0) - sells.reduce((s, t) => s + t.amount, 0);
    return {
      'Fund Name': f.fundName,
      AMC: f.amcName ?? '',
      Category: f.category ?? '',
      'Scheme Code': f.schemeCode,
      'Total Units': +totalUnits.toFixed(4),
      'Total Invested (INR)': +totalInvested.toFixed(2),
      'Avg NAV': totalUnits > 0 ? +(totalInvested / totalUnits).toFixed(4) : 0,
      Transactions: f.transactions.length,
    };
  }));

  // ── 7. MF Transactions (detail) ───────────────────────────────────────────
  const mfRows: object[] = [];
  for (const f of mfHoldings) {
    for (const t of f.transactions) {
      mfRows.push({
        'Fund Name': f.fundName,
        Type: t.type.toUpperCase(),
        Date: fmtDate(t.date),
        Units: t.units,
        'NAV (INR)': t.nav,
        'Amount (INR)': t.amount,
        Notes: t.notes ?? '',
      });
    }
  }
  addSheet(wb, 'MF Transactions', mfRows);

  // ── 8. Real Estate ────────────────────────────────────────────────────────
  const props: RealEstateProperty[] = load(`ft_realestate_${user}`) ?? [];
  addSheet(wb, 'Real Estate', props.map(p => {
    const years = (Date.now() - new Date(p.purchaseDate).getTime()) / (365.25 * 24 * 3600 * 1000);
    const currentTotal = p.propertyPrice * Math.pow(1 + p.appreciationPerYear / 100, years);
    const myShare = currentTotal * p.mySharePercent / 100;
    return {
      Property: p.propertyName,
      Status: p.status,
      Currency: p.currency,
      'Purchase Price': p.propertyPrice,
      'My Share %': p.mySharePercent,
      'Purchase Date': fmtDate(p.purchaseDate),
      'Appreciation %/yr': p.appreciationPerYear,
      'Est. Current Value (My Share)': +myShare.toFixed(0),
      Partner: p.partner ?? '',
      Notes: p.amountNotes ?? '',
      'Sold Date': fmtDate(p.soldDate),
      'Sold Amount': p.soldAmount ?? '',
      'Sold Notes': p.soldNotes ?? '',
    };
  }));

  // ── 9. Interest Investments (Loans) ───────────────────────────────────────
  const loans: LoanInvestment[] = load(`ft_loans_${user}`) ?? [];
  const loanRows: object[] = [];
  for (const l of loans) {
    const totalReturned = l.returns.reduce((s, r) => s + r.amount, 0);
    loanRows.push({
      Customer: l.customerName,
      Principal: l.principal,
      Currency: l.currency,
      'Date Given': fmtDate(l.dateGiven),
      'Interest Rate %': l.interestRate ?? '',
      'Total Returned': totalReturned,
      Outstanding: +(l.principal - totalReturned).toFixed(2),
      Notes: l.notes ?? '',
    });
  }
  addSheet(wb, 'Interest Investments', loanRows);

  // ── 10. Loan Returns (detail) ─────────────────────────────────────────────
  const returnRows: object[] = [];
  for (const l of loans) {
    for (const r of l.returns) {
      returnRows.push({
        Customer: l.customerName,
        Currency: l.currency,
        Date: fmtDate(r.date),
        Amount: r.amount,
        Notes: r.notes ?? '',
      });
    }
  }
  addSheet(wb, 'Loan Returns', returnRows);

  // ── 11. Additional Investments ────────────────────────────────────────────
  const additional: AdditionalInvestment[] = load(`ft_investments_${user}`) ?? [];
  addSheet(wb, 'Additional Investments', additional.map(a => {
    const years = (Date.now() - new Date(a.dateOfInvestment).getTime()) / (365.25 * 24 * 3600 * 1000);
    const currentValue = a.amountInvested * Math.pow(1 + a.interestPercent / 100, years);
    return {
      Name: a.name,
      'Amount Invested': a.amountInvested,
      Currency: a.currency,
      'Date of Investment': fmtDate(a.dateOfInvestment),
      'Interest %/yr': a.interestPercent,
      'Est. Current Value': +currentValue.toFixed(2),
      'Gain/Loss': +(currentValue - a.amountInvested).toFixed(2),
      Notes: a.notes ?? '',
    };
  }));

  // ── 12. Monthly Expenses (all months) ─────────────────────────────────────
  const expKey = `ft_monthly_expenses_${user}`;
  const expData: Record<string, MonthlyObligation[]> = load(expKey) ?? {};
  const expRows: object[] = [];
  const sortedMonths = Object.keys(expData).sort();
  for (const month of sortedMonths) {
    for (const o of expData[month]) {
      expRows.push({
        Month: month,
        Type: o.type,
        Note: o.note,
        Amount: o.amount,
        Currency: o.currency ?? 'INR',
        Status: o.status,
        'Due Date': fmtDate(o.dueDate ?? undefined),
        'Paid Date': fmtDate(o.paidDate ?? undefined),
        Recurrence: o.recurrence ? o.recurrence.frequency : 'One-time',
        'Recurrence End': o.recurrence ? fmtDate(o.recurrence.endDate) : '',
      });
    }
  }
  addSheet(wb, 'Monthly Expenses', expRows);

  // ── Download ───────────────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `FinanceTracker_${user}_${today}.xlsx`);
}

// Compute holdings from raw transactions (buy/sell netting per symbol+account)
function computeHoldings(txns: Transaction[], currency: string): object[] {
  const filtered = txns.filter(t => t.currency === currency);
  const map = new Map<string, { symbol: string; account: string; qty: number; cost: number; firstDate: string }>();

  for (const t of filtered.sort((a, b) => a.date.localeCompare(b.date))) {
    const key = `${t.symbol}|${t.dematAccount}`;
    const existing = map.get(key) ?? { symbol: t.symbol, account: t.dematAccount, qty: 0, cost: 0, firstDate: t.date };
    if (t.type === 'buy') {
      existing.cost += t.quantity * t.price + t.fees;
      existing.qty += t.quantity;
    } else {
      const avgCost = existing.qty > 0 ? existing.cost / existing.qty : 0;
      existing.cost -= avgCost * t.quantity;
      existing.qty -= t.quantity;
    }
    map.set(key, existing);
  }

  const ccy = currency === 'INR' ? 'INR' : 'USD';
  return Array.from(map.values())
    .filter(h => h.qty > 0.0001)
    .sort((a, b) => a.symbol.localeCompare(b.symbol))
    .map(h => ({
      Symbol: h.symbol,
      Account: h.account,
      Quantity: +h.qty.toFixed(4),
      [`Avg Buy Price (${ccy})`]: +(h.cost / h.qty).toFixed(4),
      [`Total Invested (${ccy})`]: +h.cost.toFixed(2),
      'First Buy Date': fmtDate(h.firstDate),
    }));
}
