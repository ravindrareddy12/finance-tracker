import { SIPSchedule, SIPFrequency } from '../types';

/** Return the first SIP date on or after startDate for the given frequency/day */
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

/** Advance a due date by one period */
export function advanceDueDate(current: string, frequency: SIPFrequency, dayOfMonth: number): string {
  const d = new Date(current);
  if (frequency === 'weekly') {
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  }
  const step = frequency === 'monthly' ? 1 : 3;
  let month = d.getMonth() + step;
  let year  = d.getFullYear() + Math.floor(month / 12);
  month = month % 12;
  const day = Math.min(dayOfMonth, new Date(year, month + 1, 0).getDate());
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Collect all due dates for a schedule up to today */
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
