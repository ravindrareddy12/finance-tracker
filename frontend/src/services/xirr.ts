interface CashFlow {
  amount: number;
  date: Date;
}

// Newton-Raphson XIRR — returns annualized rate as a percentage, or null if unconverged.
export function computeXIRR(cashflows: CashFlow[]): number | null {
  if (cashflows.length < 2) return null;

  const firstDate = cashflows[0].date;
  // years from first date for each cash flow
  const years = cashflows.map(c =>
    (c.date.getTime() - firstDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );

  const npv = (rate: number): number =>
    cashflows.reduce((sum, c, i) => sum + c.amount / Math.pow(1 + rate, years[i]), 0);

  const dnpv = (rate: number): number =>
    cashflows.reduce((sum, c, i) =>
      sum - years[i] * c.amount / Math.pow(1 + rate, years[i] + 1), 0);

  let rate = 0.1;
  for (let iter = 0; iter < 200; iter++) {
    const f  = npv(rate);
    const df = dnpv(rate);
    if (Math.abs(df) < 1e-12) break;
    const next = rate - f / df;
    if (Math.abs(next - rate) < 1e-8) return next * 100;
    rate = next;
    if (rate < -0.999) rate = -0.999;
  }
  return null;
}
