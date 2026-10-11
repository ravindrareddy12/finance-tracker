import type { Currency } from '@/types/models';

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const usd = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const usd2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inr2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function money(amount: number, currency: Currency = 'INR', { decimals = false, signed = false } = {}): string {
  const sign = amount < 0 ? '-' : signed && amount > 0 ? '+' : '';
  const abs = Math.abs(amount);
  const body = currency === 'USD' ? (decimals ? usd2 : usd).format(abs) : (decimals ? inr2 : inr).format(abs);
  return `${sign}${currency === 'USD' ? '$' : '₹'}${body}`;
}

export function percent(value: number, { signed = true, decimals = 1 } = {}): string {
  const sign = signed && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const toneOf = (v: number) => (v > 0 ? 'positive' : v < 0 ? 'negative' : 'neutral') as 'positive' | 'negative' | 'neutral';
