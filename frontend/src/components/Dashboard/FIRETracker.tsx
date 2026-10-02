import React, { useState, useMemo, useEffect } from 'react';
import { Flame, Download } from 'lucide-react';
import { downloadExcel } from '../../utils/exportExcel';
import axios from 'axios';
import { usePortfolio } from '../../context/PortfolioContext';
import { useAuth } from '../../context/AuthContext';
import { useUSDINR } from '../../hooks/useExchangeRate';
import { RealEstateProperty, LoanInvestment, AdditionalInvestment, MFHolding } from '../../types';

interface NAVResult { schemeCode: string; currentNAV: number; }

function reEstimate(p: RealEstateProperty): number {
  const myInv = p.propertyPrice * (p.mySharePercent / 100);
  if (!p.appreciationPerYear || p.appreciationPerYear <= 0) return myInv;
  const yrs = (Date.now() - new Date(p.purchaseDate).getTime()) / (365.25 * 86400000);
  return yrs > 0 ? myInv * Math.pow(1 + p.appreciationPerYear / 100, yrs) : myInv;
}

function addlEstimate(inv: AdditionalInvestment): number {
  if (!inv.interestPercent || inv.interestPercent <= 0) return inv.amountInvested;
  const yrs = (Date.now() - new Date(inv.dateOfInvestment).getTime()) / (365.25 * 86400000);
  return yrs > 0 ? inv.amountInvested * Math.pow(1 + inv.interestPercent / 100, yrs) : inv.amountInvested;
}

const STORAGE_KEY = (user: string) => `ft_fire_${user}`;

type FIRECurrency = 'INR' | 'USD' | 'EUR';

const CURRENCY_SYM: Record<FIRECurrency, string> = { INR: '₹', USD: '$', EUR: '€' };

// Slider config for monthly expenses in each display currency
const EXPENSE_SLIDER: Record<FIRECurrency, { min: number; max: number; step: number }> = {
  INR: { min: 10000,  max: 1000000, step: 5000 },
  USD: { min: 100,    max: 12000,   step: 50   },
  EUR: { min: 100,    max: 12000,   step: 50   },
};

interface FIREInputs {
  monthlyExpenses: number; // always stored in INR
  currentAge: number;
  targetFIREAge: number;
  lifeExpectancy: number;
  inflation: number;
}

function loadInputs(user: string): FIREInputs {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY(user)) || 'null');
    if (saved) return saved;
  } catch { /* */ }
  return { monthlyExpenses: 100000, currentAge: 35, targetFIREAge: 50, lifeExpectancy: 85, inflation: 7 };
}

function makeFmt(currency: FIRECurrency, rate: number) {
  const sym = CURRENCY_SYM[currency];
  return function fmt(inrAmount: number): string {
    const n = inrAmount / rate;
    if (currency === 'INR') {
      if (n >= 1e7) return `${sym}${(n / 1e7).toFixed(2)} Cr`;
      if (n >= 1e5) return `${sym}${(n / 1e5).toFixed(2)} L`;
      return `${sym}${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    }
    if (n >= 1e6) return `${sym}${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `${sym}${(n / 1e3).toFixed(2)}K`;
    return `${sym}${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  };
}

interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  prefix?: string;
  onChange: (v: number) => void;
}

function SliderField({ label, value, min, max, step, suffix, prefix, onChange }: SliderFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const pct = ((value - min) / (max - min)) * 100;

  const commitDraft = () => {
    if (draft === null) return;
    const n = Number(draft.replace(/,/g, ''));
    if (!isNaN(n) && n >= min && n <= max) onChange(Math.round(n / step) * step);
    setDraft(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1 min-w-[100px] text-right focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-300 transition-all">
          <span className="text-sm font-bold text-gray-500 mr-0.5">{prefix}</span>
          <input
            type="text"
            inputMode="numeric"
            value={draft !== null ? draft : value.toLocaleString('en-IN')}
            onChange={e => setDraft(e.target.value)}
            onFocus={e => { setDraft(String(value)); e.target.select(); }}
            onBlur={commitDraft}
            onKeyDown={e => { if (e.key === 'Enter') commitDraft(); if (e.key === 'Escape') setDraft(null); }}
            className="text-sm font-bold text-gray-800 bg-transparent outline-none text-right w-20"
          />
          <span className="text-sm font-bold text-gray-500 ml-0.5">{suffix}</span>
        </div>
      </div>
      <div className="relative h-5 flex items-center">
        <div className="w-full h-1.5 bg-gray-200 rounded-full">
          <div className="h-1.5 bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-5"
        />
        <div
          className="absolute w-4 h-4 bg-emerald-500 rounded-full shadow border-2 border-white pointer-events-none"
          style={{ left: `calc(${pct}% - 8px)` }}
        />
      </div>
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  highlight?: boolean;
}
function SummaryCard({ label, value, sub, color = 'text-gray-800', highlight }: SummaryCardProps) {
  return (
    <div className={`rounded-2xl p-5 border ${highlight ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200'} shadow-sm`}>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex items-center ml-1">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="w-4 h-4 rounded-full border border-gray-300 text-gray-400 text-[10px] font-bold flex items-center justify-center hover:border-gray-500"
      >i</button>
      {show && (
        <span className="absolute left-5 top-0 bg-gray-800 text-white text-xs rounded-lg px-2.5 py-1.5 w-52 z-10 shadow-lg">
          {text}
        </span>
      )}
    </span>
  );
}

export default function FIRETracker() {
  const { currentUser } = useAuth();
  const user = currentUser ?? 'default';
  const { holdings, usdCashBalances, inrCashBalances } = usePortfolio();
  const { rate: usdToINR } = useUSDINR();

  const [currency, setCurrency] = useState<FIRECurrency>('INR');
  const [eurToINR, setEurToINR] = useState(90);
  useEffect(() => {
    axios.get('/api/quotes?symbols=EURINR%3DX')
      .then(r => {
        const p = r.data?.quoteResponse?.result?.[0]?.regularMarketPrice;
        if (p) setEurToINR(p);
      })
      .catch(() => {});
  }, []);

  // Rate: how many INR per 1 unit of selected currency
  const displayRate = currency === 'INR' ? 1 : currency === 'USD' ? usdToINR : eurToINR;
  const fmt = makeFmt(currency, displayRate);
  const sym = CURRENCY_SYM[currency];

  const realEstate = useMemo<RealEstateProperty[]>(() => {
    try { return JSON.parse(localStorage.getItem(`ft_realestate_${user}`) || '[]'); }
    catch { return []; }
  }, [user]);

  const loans = useMemo<LoanInvestment[]>(() => {
    try { return JSON.parse(localStorage.getItem(`ft_loans_${user}`) || '[]'); }
    catch { return []; }
  }, [user]);

  const mfHoldings = useMemo<MFHolding[]>(() => {
    try { return JSON.parse(localStorage.getItem(`ft_mf_${user}`) || '[]'); }
    catch { return []; }
  }, [user]);

  const additionalInvestments = useMemo<AdditionalInvestment[]>(() => {
    try { return JSON.parse(localStorage.getItem(`ft_investments_${user}`) || '[]'); }
    catch { return []; }
  }, [user]);

  const [mfNavMap, setMfNavMap] = useState<Record<string, number>>({});
  useEffect(() => {
    if (mfHoldings.length === 0) return;
    const codes = mfHoldings.map(h => h.schemeCode).join(',');
    axios.get(`/api/mf/nav?codes=${codes}`)
      .then(r => {
        const map: Record<string, number> = {};
        (r.data?.results ?? []).forEach((n: NAVResult) => { map[n.schemeCode] = n.currentNAV; });
        setMfNavMap(map);
      })
      .catch(() => {});
  }, [mfHoldings.length]); // eslint-disable-line

  const totalPortfolio = useMemo(() => {
    const toINR = (amt: number, cur: 'INR' | 'USD') => cur === 'USD' ? amt * usdToINR : amt;

    const equityCurrent = holdings.reduce((s, h) =>
      s + toINR(h.currentValue ?? h.totalInvested, h.currency), 0);

    let mfCurrent = 0;
    mfHoldings.forEach(h => {
      const invested = h.transactions.filter(t => t.type === 'buy').reduce((s, t) => s + t.amount, 0);
      const units = h.transactions.reduce((s, t) => t.type === 'buy' ? s + t.units : s - t.units, 0);
      const nav = mfNavMap[h.schemeCode];
      mfCurrent += nav != null ? units * nav : invested;
    });

    const reCurrent = realEstate.filter(p => p.status === 'active')
      .reduce((s, p) => s + toINR(reEstimate(p), p.currency), 0);

    const addlCurrent = additionalInvestments
      .reduce((s, i) => s + toINR(addlEstimate(i), i.currency), 0);

    const loanOutstanding = loans.reduce((s, l) => {
      const returned = l.returns.reduce((x, r) => x + r.amount, 0);
      return s + toINR(Math.max(0, l.principal - returned), l.currency);
    }, 0);

    const cashINR = Object.values(inrCashBalances).reduce((s, v) => s + (v ?? 0), 0);
    const cashUSD = Object.values(usdCashBalances).reduce((s, v) => s + (v ?? 0), 0);
    const cashTotal = cashINR + cashUSD * usdToINR;

    return equityCurrent + mfCurrent + reCurrent + addlCurrent + loanOutstanding + cashTotal;
  }, [holdings, mfHoldings, mfNavMap, realEstate, additionalInvestments, loans,
      usdCashBalances, inrCashBalances, usdToINR]);

  const [inputs, setInputs] = useState<FIREInputs>(() => loadInputs(user));

  const update = (field: keyof FIREInputs, value: number) => {
    const next = { ...inputs, [field]: value };
    setInputs(next);
    localStorage.setItem(STORAGE_KEY(user), JSON.stringify(next));
  };

  const { monthlyExpenses, currentAge, targetFIREAge, lifeExpectancy, inflation } = inputs;

  const calc = useMemo(() => {
    const yearsToFIRE        = Math.max(0, targetFIREAge - currentAge);
    const yearsInRetirement  = Math.max(0, lifeExpectancy - targetFIREAge);
    const annualExpenses     = monthlyExpenses * 12;
    const inflatedAnnual     = annualExpenses * Math.pow(1 + inflation / 100, yearsToFIRE);

    // FIRE Number = 25x inflated annual expenses (4% Safe Withdrawal Rate)
    const fireNumber  = inflatedAnnual * 25;
    const leanFIRE    = inflatedAnnual * 0.5 * 25;  // 50% lifestyle
    const fatFIRE     = inflatedAnnual * 2   * 25;  // 2x lifestyle

    const remaining   = Math.max(0, fireNumber - totalPortfolio);
    const progressPct = fireNumber > 0 ? Math.min(100, (totalPortfolio / fireNumber) * 100) : 0;

    // Monthly savings needed
    // Step 1: how much does the existing portfolio grow to by FIRE age?
    const NOMINAL_RETURN = 0.10;
    const rm             = NOMINAL_RETURN / 12;
    const n              = yearsToFIRE * 12;
    const fvPortfolio    = yearsToFIRE > 0
      ? totalPortfolio * Math.pow(1 + NOMINAL_RETURN, yearsToFIRE)
      : totalPortfolio;

    // Step 2: gap between FIRE number and projected portfolio value
    const gap = Math.max(0, fireNumber - fvPortfolio);

    // Step 3: monthly SIP needed to fill that gap (FV of annuity formula)
    // If gap = 0, no additional savings needed; portfolio growth alone covers it
    const monthlySavings = (n > 0 && rm > 0 && gap > 0)
      ? gap * rm / (Math.pow(1 + rm, n) - 1)
      : 0;

    // Whether the portfolio is already on track (FV covers FIRE number)
    const alreadyOnTrack = fvPortfolio >= fireNumber;

    return {
      yearsToFIRE, yearsInRetirement, annualExpenses, inflatedAnnual,
      fireNumber, leanFIRE, fatFIRE,
      totalPortfolio, remaining, progressPct, monthlySavings, alreadyOnTrack,
      fvPortfolio,
    };
  }, [inputs, totalPortfolio]);

  const isAchievable = targetFIREAge > currentAge;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Flame className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-800">FIRE Calculator</h2>
          </div>
          <p className="text-sm text-gray-400">
            <span className="text-emerald-600 font-semibold">F</span>inancial{' '}
            <span className="text-emerald-600 font-semibold">I</span>ndependence,{' '}
            <span className="text-emerald-600 font-semibold">R</span>etire{' '}
            <span className="text-emerald-600 font-semibold">E</span>arly — find your number and the savings path to get there.
          </p>
        </div>
        {/* Currency toggle */}
        <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden shrink-0 self-start">
          {(['INR', 'USD', 'EUR'] as FIRECurrency[]).map(c => (
            <button key={c} onClick={() => setCurrency(c)}
              className={`px-3 py-2 text-xs font-semibold transition-colors ${currency === c ? 'bg-emerald-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
              {CURRENCY_SYM[c]} {c}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            const rows = [
              { Field: `Monthly Expenses (${currency})`, Value: +(inputs.monthlyExpenses / displayRate).toFixed(0) },
              { Field: 'Current Age', Value: inputs.currentAge },
              { Field: 'Target FIRE Age', Value: inputs.targetFIREAge },
              { Field: 'Life Expectancy', Value: inputs.lifeExpectancy },
              { Field: 'Inflation %', Value: inputs.inflation },
              { Field: 'Currency', Value: currency },
              { Field: '', Value: '' },
              { Field: 'Years to FIRE', Value: calc.yearsToFIRE },
              { Field: `Current Portfolio (${currency})`, Value: +((calc.totalPortfolio / displayRate)).toFixed(0) },
              { Field: `FIRE Number (${currency})`, Value: +((calc.fireNumber / displayRate)).toFixed(0) },
              { Field: `Lean FIRE (${currency})`, Value: +((calc.leanFIRE / displayRate)).toFixed(0) },
              { Field: `Fat FIRE (${currency})`, Value: +((calc.fatFIRE / displayRate)).toFixed(0) },
              { Field: `Remaining Amount (${currency})`, Value: +((calc.remaining / displayRate)).toFixed(0) },
              { Field: 'Progress %', Value: +calc.progressPct.toFixed(1) },
              { Field: `Projected Portfolio at FIRE (${currency})`, Value: +((calc.fvPortfolio / displayRate)).toFixed(0) },
              { Field: `Monthly Savings Needed (${currency})`, Value: calc.alreadyOnTrack ? 0 : +((calc.monthlySavings / displayRate)).toFixed(0) },
              { Field: 'Already On Track', Value: calc.alreadyOnTrack ? 'Yes' : 'No' },
            ];
            downloadExcel(rows, 'fire-calculator', 'FIRE Calculator');
          }}
          className="flex items-center gap-1.5 px-3 py-2 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium transition-colors shrink-0 self-start"
        >
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Inputs */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
          <SliderField
            label="Monthly household expenses"
            prefix={sym}
            value={Math.round(monthlyExpenses / displayRate)}
            min={EXPENSE_SLIDER[currency].min}
            max={EXPENSE_SLIDER[currency].max}
            step={EXPENSE_SLIDER[currency].step}
            onChange={v => update('monthlyExpenses', Math.round(v * displayRate))}
          />
          <SliderField label="Current Age" value={currentAge}
            min={18} max={70} step={1} suffix=" yrs" onChange={v => update('currentAge', Math.min(v, targetFIREAge - 1))} />
          <SliderField label="Target FIRE Age" value={targetFIREAge}
            min={25} max={75} step={1} suffix=" yrs" onChange={v => update('targetFIREAge', Math.max(v, currentAge + 1))} />
          <SliderField label="Life Expectancy" value={lifeExpectancy}
            min={60} max={100} step={1} suffix=" yrs" onChange={v => update('lifeExpectancy', v)} />
          <SliderField label="Inflation (%)" value={inflation}
            min={2} max={15} step={0.5} suffix="%" onChange={v => update('inflation', v)} />
        </div>

        {/* Right: Results */}
        <div className="space-y-4">
          {/* Hero FIRE number */}
          <div className="bg-white border border-emerald-200 rounded-2xl p-6 shadow-sm text-center">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">
              Your F.I.R.E Number at Age {targetFIREAge}
            </p>
            <p className="text-4xl font-bold text-emerald-600 my-2">
              {isAchievable ? fmt(calc.fireNumber) : '—'}
            </p>

            {/* Age strip */}
            <div className="flex items-center justify-center gap-8 mt-4 bg-emerald-50 rounded-xl px-4 py-3">
              <div className="text-center">
                <p className="text-xs text-gray-400">Current Age</p>
                <p className="text-xl font-bold text-gray-800">{currentAge}</p>
              </div>
              <div className="h-px w-8 bg-gray-300" />
              <div className="text-center">
                <p className="text-xs text-gray-400">Years to FIRE</p>
                <p className="text-xl font-bold text-emerald-600">{calc.yearsToFIRE} yrs</p>
              </div>
              <div className="h-px w-8 bg-gray-300" />
              <div className="text-center">
                <p className="text-xs text-gray-400">FIRE Age</p>
                <p className="text-xl font-bold text-gray-800">{targetFIREAge}</p>
              </div>
            </div>
          </div>

          {/* FIRE Snapshot */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest">FIRE Snapshot</p>
            {[
              { label: 'Annual Expenses Today',  value: fmt(calc.annualExpenses),  tip: null },
              { label: `Expense at Age ${targetFIREAge}`, value: fmt(calc.inflatedAnnual), tip: `Inflated at ${inflation}% p.a. for ${calc.yearsToFIRE} years` },
              { label: 'Lean FIRE', value: fmt(calc.leanFIRE),  tip: '50% of expenses — minimal lifestyle' },
              { label: 'FAT FIRE',  value: fmt(calc.fatFIRE),   tip: '2× expenses — luxury retirement' },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                <span className="text-sm font-semibold text-gray-700 flex items-center">
                  {row.label}
                  {row.tip && <Tooltip text={row.tip} />}
                </span>
                <span className="text-sm font-bold text-emerald-600">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Your FIRE Number"
          value={isAchievable ? fmt(calc.fireNumber) : '—'}
          sub={`4% SWR · ${calc.yearsInRetirement} yr retirement`}
          color="text-emerald-600"
          highlight
        />
        <SummaryCard
          label="Current Portfolio"
          value={fmt(calc.totalPortfolio)}
          sub={`${calc.progressPct.toFixed(1)}% of FIRE goal`}
          color="text-indigo-600"
        />
        <SummaryCard
          label="Remaining Amount"
          value={calc.remaining > 0 ? fmt(calc.remaining) : 'Goal Reached!'}
          sub={calc.remaining > 0 ? 'FIRE Number − Current Portfolio' : 'You can retire now 🎉'}
          color={calc.remaining > 0 ? 'text-orange-500' : 'text-emerald-600'}
        />
        <SummaryCard
          label="Monthly Savings Needed"
          value={
            !isAchievable ? '—'
            : calc.alreadyOnTrack ? 'On Track!'
            : fmt(calc.monthlySavings)
          }
          sub={
            calc.alreadyOnTrack
              ? `Portfolio grows to ${fmt(calc.fvPortfolio)} by age ${targetFIREAge}`
              : 'Assuming 10% p.a. portfolio growth'
          }
          color={calc.alreadyOnTrack ? 'text-emerald-600' : 'text-blue-600'}
        />
      </div>

      {/* Progress bar */}
      {isAchievable && calc.fireNumber > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">FIRE Progress</span>
            <span className="text-sm font-bold text-emerald-600">{calc.progressPct.toFixed(1)}%</span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
              style={{ width: `${calc.progressPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{fmt(calc.totalPortfolio)} saved</span>
            <span>{fmt(calc.fireNumber)} goal</span>
          </div>
        </div>
      )}
    </div>
  );
}
