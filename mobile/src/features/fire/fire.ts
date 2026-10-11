// FIRE maths — identical to the web FIRE Calculator.
import type { FIREInputs } from '@/types/models';

export type FIRECurrency = 'INR' | 'USD' | 'EUR';

export const CURRENCY_SYMBOL: Record<FIRECurrency, string> = { INR: '₹', USD: '$', EUR: '€' };

export const DEFAULT_INPUTS: FIREInputs = { monthlyExpenses: 100000, currentAge: 35, targetFIREAge: 50, lifeExpectancy: 85, inflation: 7 };

// Monthly expense slider range per display currency
export const EXPENSE_RANGE: Record<FIRECurrency, { min: number; max: number; step: number }> = {
  INR: { min: 10000, max: 1000000, step: 5000 },
  USD: { min: 100,   max: 12000,   step: 50 },
  EUR: { min: 100,   max: 12000,   step: 50 },
};

export const AGE_RANGES = {
  currentAge:     { min: 18, max: 70,  step: 1 },
  targetFIREAge:  { min: 25, max: 75,  step: 1 },
  lifeExpectancy: { min: 60, max: 100, step: 1 },
  inflation:      { min: 2,  max: 15,  step: 0.5 },
} as const;

const NOMINAL_RETURN = 0.10; // assumed portfolio growth p.a.
const SAFE_WITHDRAWAL_MULTIPLE = 25; // 4% SWR

export interface FIREResult {
  yearsToFIRE: number;
  yearsInRetirement: number;
  annualExpenses: number;
  inflatedAnnual: number;
  fireNumber: number;
  leanFIRE: number;
  fatFIRE: number;
  totalPortfolio: number;
  remaining: number;
  progressPct: number;
  monthlySavings: number;
  alreadyOnTrack: boolean;
  fvPortfolio: number;
}

/** All amounts in INR. `totalPortfolio` is the dashboard's total current value. */
export function calculateFIRE(inputs: FIREInputs, totalPortfolio: number): FIREResult {
  const { monthlyExpenses, currentAge, targetFIREAge, lifeExpectancy, inflation } = inputs;
  const yearsToFIRE       = Math.max(0, targetFIREAge - currentAge);
  const yearsInRetirement = Math.max(0, lifeExpectancy - targetFIREAge);
  const annualExpenses    = monthlyExpenses * 12;
  const inflatedAnnual    = annualExpenses * Math.pow(1 + inflation / 100, yearsToFIRE);

  const fireNumber = inflatedAnnual * SAFE_WITHDRAWAL_MULTIPLE;
  const leanFIRE   = inflatedAnnual * 0.5 * SAFE_WITHDRAWAL_MULTIPLE; // 50% lifestyle
  const fatFIRE    = inflatedAnnual * 2 * SAFE_WITHDRAWAL_MULTIPLE;   // 2× lifestyle

  const remaining   = Math.max(0, fireNumber - totalPortfolio);
  const progressPct = fireNumber > 0 ? Math.min(100, (totalPortfolio / fireNumber) * 100) : 0;

  // Existing portfolio grown to FIRE age, then the monthly SIP that closes the gap (FV of annuity)
  const rm = NOMINAL_RETURN / 12;
  const n  = yearsToFIRE * 12;
  const fvPortfolio = yearsToFIRE > 0 ? totalPortfolio * Math.pow(1 + NOMINAL_RETURN, yearsToFIRE) : totalPortfolio;
  const gap = Math.max(0, fireNumber - fvPortfolio);
  const monthlySavings = n > 0 && gap > 0 ? (gap * rm) / (Math.pow(1 + rm, n) - 1) : 0;

  return {
    yearsToFIRE, yearsInRetirement, annualExpenses, inflatedAnnual,
    fireNumber, leanFIRE, fatFIRE, totalPortfolio, remaining, progressPct,
    monthlySavings, alreadyOnTrack: fvPortfolio >= fireNumber, fvPortfolio,
  };
}

/** Compact amounts like the web: ₹1.25 Cr / ₹4.50 L, $1.20M / $3.40K. `rate` = INR per unit. */
export function formatFIRE(inrAmount: number, currency: FIRECurrency, rate: number): string {
  const sym = CURRENCY_SYMBOL[currency];
  const n = inrAmount / rate;
  if (currency === 'INR') {
    if (n >= 1e7) return `${sym}${(n / 1e7).toFixed(2)} Cr`;
    if (n >= 1e5) return `${sym}${(n / 1e5).toFixed(2)} L`;
    return `${sym}${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }
  if (n >= 1e6) return `${sym}${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${sym}${(n / 1e3).toFixed(2)}K`;
  return `${sym}${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}
