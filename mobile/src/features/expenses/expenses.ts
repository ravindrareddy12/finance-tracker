// Monthly expense rules — same as the web MonthlyExpenseTracker.
import type { MonthlyExpenses, MonthlyObligation, ObligationType, PaymentStatus, RecurrenceFrequency } from '@/types/models';
import { monthKeyOf } from '@/lib/dates';
import { uuid } from '@/lib/ids';

export const OBLIGATION_TYPES: ObligationType[] = ['Credit Card', 'Housing Loan', 'Personal Loan', 'Rent', 'Others'];

export const TYPE_COLORS: Record<ObligationType, string> = {
  'Credit Card': '#8B5CF6', 'Housing Loan': '#3B82F6', 'Personal Loan': '#F97316', Rent: '#22C55E', Others: '#94A3B8',
};

function addPeriod(date: Date, freq: RecurrenceFrequency): Date {
  const d = new Date(date);
  if (freq === 'Monthly') d.setMonth(d.getMonth() + 1);
  if (freq === 'Quarterly') d.setMonth(d.getMonth() + 3);
  if (freq === 'Yearly') d.setFullYear(d.getFullYear() + 1);
  return d;
}

export function generateRecurringDates(startDate: string, freq: RecurrenceFrequency, endDate: string): string[] {
  const dates: string[] = [];
  const end = new Date(endDate);
  let cur = new Date(startDate);
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur = addPeriod(cur, freq);
  }
  return dates;
}

/** Obligations live in their due-date month; undated ones in the month being viewed. */
export function bucketOf(o: Pick<MonthlyObligation, 'dueDate'>, viewedMonth: string): string {
  if (!o.dueDate) return viewedMonth;
  const d = new Date(o.dueDate);
  return monthKeyOf(d.getFullYear(), d.getMonth());
}

export type NewObligation = Omit<MonthlyObligation, 'id'>;

export function addObligations(all: MonthlyExpenses, items: NewObligation[], viewedMonth: string): MonthlyExpenses {
  const next = { ...all };
  for (const o of items) {
    const dest = bucketOf(o, viewedMonth);
    next[dest] = [...(next[dest] ?? []), { ...o, id: uuid() }];
  }
  return next;
}

/** Replace an obligation, moving it to its due-date month if that changed. */
export function editObligation(all: MonthlyExpenses, id: string, o: NewObligation, viewedMonth: string): MonthlyExpenses {
  const dest = bucketOf(o, viewedMonth);
  const current = all[viewedMonth] ?? [];
  if (dest === viewedMonth) return { ...all, [viewedMonth]: current.map(x => (x.id === id ? { ...o, id } : x)) };
  return { ...all, [viewedMonth]: current.filter(x => x.id !== id), [dest]: [...(all[dest] ?? []), { ...o, id }] };
}

export function toggleStatus(all: MonthlyExpenses, month: string, id: string): MonthlyExpenses {
  return {
    ...all,
    [month]: (all[month] ?? []).map(o => {
      if (o.id !== id) return o;
      const status: PaymentStatus = o.status === 'Paid' ? 'Unpaid' : 'Paid';
      return { ...o, status, paidDate: status === 'Paid' ? new Date().toISOString().slice(0, 10) : null };
    }),
  };
}

/** Append last month's obligations as unpaid, undated copies. */
export function copyFromPrevious(all: MonthlyExpenses, month: string, prevMonth: string): MonthlyExpenses {
  const copied = (all[prevMonth] ?? []).map(o => ({ ...o, id: uuid(), status: 'Unpaid' as const, paidDate: null, dueDate: null }));
  return { ...all, [month]: [...(all[month] ?? []), ...copied] };
}

export function totalsByCurrency(items: MonthlyObligation[]) {
  const sum = (list: MonthlyObligation[]) => list.reduce((s, o) => s + o.amount, 0);
  const of = (c: 'INR' | 'USD') => {
    const list = items.filter(o => (o.currency ?? 'INR') === c);
    const total = sum(list), paid = sum(list.filter(o => o.status === 'Paid'));
    return { count: list.length, total, paid, unpaid: total - paid };
  };
  return { INR: of('INR'), USD: of('USD') };
}
