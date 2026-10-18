/** Today as YYYY-MM-DD (UTC, matching the web's `new Date().toISOString().slice(0, 10)`). */
export const todayIso = () => new Date().toISOString().slice(0, 10);

/** Local calendar date of `d` as YYYY-MM-DD (for date pickers). */
export const localIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Parse YYYY-MM-DD as a local date (for date pickers). */
export function parseIso(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return y ? new Date(y, (m || 1) - 1, d || 1) : new Date();
}

/** Month bucket key used by monthly expenses: YYYY-MM. */
export const monthKeyOf = (year: number, month: number) => `${year}-${String(month + 1).padStart(2, '0')}`;

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return monthKeyOf(d.getFullYear(), d.getMonth());
}
