// SIP date maths — identical to the web (utils/sipUtils.ts and AddSIPModal) so both
// apps generate the same dates and the same auto-SIP transaction ids.
import type { MFHolding, MFTransaction, SIPFrequency, SIPSchedule } from '@/types/models';

/** First SIP date on or after startDate for the given frequency/day. */
export function firstDueDate(startDate: string, frequency: SIPFrequency, dayOfMonth: number): string {
  const start = new Date(startDate);
  if (frequency === 'weekly') return startDate;

  const step = frequency === 'monthly' ? 1 : 3;
  let year  = start.getFullYear();
  let month = start.getMonth();
  if (start.getDate() > dayOfMonth) {
    month += step;
    if (month >= 12) { year += Math.floor(month / 12); month = month % 12; }
  }
  const day = Math.min(dayOfMonth, new Date(year, month + 1, 0).getDate());
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Advance a due date by one period. */
export function advanceDueDate(current: string, frequency: SIPFrequency, dayOfMonth: number): string {
  const d = new Date(current);
  if (frequency === 'weekly') {
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  }
  const step = frequency === 'monthly' ? 1 : 3;
  let month = d.getMonth() + step;
  const year = d.getFullYear() + Math.floor(month / 12);
  month = month % 12;
  const day = Math.min(dayOfMonth, new Date(year, month + 1, 0).getDate());
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** All due dates of a schedule up to today. */
export function collectDueDates(schedule: SIPSchedule): string[] {
  const today = new Date().toISOString().slice(0, 10);
  const dates: string[] = [];
  let cur = schedule.nextDueDate;
  while (cur <= today && cur <= schedule.endDate) {
    dates.push(cur);
    cur = advanceDueDate(cur, schedule.frequency, schedule.dayOfMonth);
  }
  return dates;
}

/** Dates for a historical SIP (web AddSIPModal), either `count` instalments or up to `endDate`. */
export function generateSipDates(
  frequency: SIPFrequency, startDate: string, dayOfMonth: number,
  mode: 'count' | 'endDate', count: number, endDate: string,
): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);

  if (frequency === 'weekly') {
    const cur = new Date(start);
    const limit = mode === 'count' ? count : 520;
    for (let i = 0; i < limit; i++) {
      const iso = cur.toISOString().slice(0, 10);
      if (mode === 'endDate' && iso > endDate) break;
      dates.push(iso);
      cur.setDate(cur.getDate() + 7);
    }
  } else {
    const step = frequency === 'monthly' ? 1 : 3;
    let year  = start.getFullYear();
    let month = start.getMonth();
    if (start.getDate() > dayOfMonth) month++;
    const limit = mode === 'count' ? count : 600;
    for (let i = 0; i < limit; i++) {
      const day = Math.min(dayOfMonth, new Date(year, month + 1, 0).getDate());
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (mode === 'endDate' && iso > endDate) break;
      dates.push(iso);
      month += step;
      if (month >= 12) { year += Math.floor(month / 12); month = month % 12; }
    }
  }
  return dates;
}

/** NAVs fetched per scheme code, keyed by requested ISO date. */
export type NavsByCode = Record<string, Record<string, number>>;

/**
 * Add the transactions of every due SIP instalment and advance the schedules.
 * Schedules whose NAVs couldn't be fetched are left for the next run, and
 * instalments already recorded (by either app) are not added twice.
 */
export function applyDueSIPs(holdings: MFHolding[], schedules: SIPSchedule[], navsByCode: NavsByCode) {
  let changed = false;
  let nextHoldings = holdings;
  const nextSchedules = schedules.map(s => {
    const codeNavs = navsByCode[s.schemeCode];
    if (!s.active || !codeNavs) return s;
    const dates = collectDueDates(s);
    if (dates.length === 0) return s;

    const fund = nextHoldings.find(h => h.id === s.fundId);
    const existing = new Set(fund?.transactions.map(t => t.id) ?? []);
    const newTxs: MFTransaction[] = [];
    for (const date of dates) {
      const nav = codeNavs[date];
      const id = `sip_auto_${s.id}_${date}`;
      if (!nav || existing.has(id)) continue;
      newTxs.push({ id, type: 'buy', date, units: parseFloat((s.amount / nav).toFixed(3)), nav, amount: s.amount, notes: `SIP (${s.frequency})` });
    }
    if (newTxs.length > 0) {
      nextHoldings = nextHoldings.map(h => (h.id === s.fundId ? { ...h, transactions: [...h.transactions, ...newTxs] } : h));
    }

    let next = s.nextDueDate;
    dates.forEach(() => { next = advanceDueDate(next, s.frequency, s.dayOfMonth); });
    changed = true;
    return { ...s, nextDueDate: next, lastProcessedDate: dates[dates.length - 1], active: next <= s.endDate };
  });
  return { changed, holdings: nextHoldings, schedules: nextSchedules };
}
