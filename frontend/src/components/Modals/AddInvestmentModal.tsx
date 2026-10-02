import React, { useState, useMemo } from 'react';
import { X, Landmark } from 'lucide-react';
import { Currency, AdditionalInvestment } from '../../types';

interface Props {
  initial?: AdditionalInvestment;
  onSave: (inv: AdditionalInvestment) => void;
  onClose: () => void;
}

const CURRENCIES: Currency[] = ['INR', 'USD'];

function currentValue(amountInvested: number, interestPercent: number, dateOfInvestment: string): number {
  const years = Math.max(0, (Date.now() - new Date(dateOfInvestment).getTime()) / (365.25 * 86400000));
  return amountInvested * Math.pow(1 + interestPercent / 100, years);
}

export default function AddInvestmentModal({ initial, onSave, onClose }: Props) {
  const [name,       setName]       = useState(initial?.name ?? '');
  const [amount,     setAmount]     = useState(initial ? String(initial.amountInvested) : '');
  const [currency,   setCurrency]   = useState<Currency>(initial?.currency ?? 'INR');
  const [date,       setDate]       = useState(initial?.dateOfInvestment ?? new Date().toISOString().slice(0, 10));
  const [interest,   setInterest]   = useState(initial ? String(initial.interestPercent) : '');
  const [notes,      setNotes]      = useState(initial?.notes ?? '');
  const [error,      setError]      = useState('');

  const sym    = currency === 'INR' ? '₹' : '$';
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  const fmt    = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 2 });

  const amtNum  = parseFloat(amount) || 0;
  const intNum  = parseFloat(interest) || 0;

  const preview = useMemo(() => {
    if (amtNum <= 0 || !date) return null;
    return currentValue(amtNum, intNum, date);
  }, [amtNum, intNum, date]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim())            { setError('Investment name is required.'); return; }
    if (amtNum <= 0)             { setError('Amount invested must be a positive number.'); return; }
    if (!date)                   { setError('Date of investment is required.'); return; }
    if (intNum < 0)              { setError('Interest % cannot be negative.'); return; }

    onSave({
      id:               initial?.id ?? Date.now().toString(),
      name:             name.trim(),
      amountInvested:   amtNum,
      currency,
      dateOfInvestment: date,
      interestPercent:  intNum,
      notes:            notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="bg-teal-100 p-1.5 rounded-lg">
              <Landmark className="text-teal-600 w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">
              {initial ? 'Edit Investment' : 'Add Investment'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Investment Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. SBI FD, PPF, NSC, Mutual Fund"
              autoFocus
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount Invested ({sym})</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0.00" min="0" step="any"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value as Currency)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white">
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Investment</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (% p.a.)</label>
              <input type="number" value={interest} onChange={e => setInterest(e.target.value)}
                placeholder="e.g. 7.5" min="0" step="any"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
            </div>
          </div>

          {/* Live preview */}
          {preview !== null && amtNum > 0 && (
            <div className="bg-teal-50 border border-teal-100 rounded-lg px-4 py-3 grid grid-cols-3 gap-3 text-center text-xs">
              <div>
                <p className="text-gray-400 uppercase tracking-wide">Invested</p>
                <p className="font-bold text-gray-800 mt-0.5">{sym}{fmt(amtNum)}</p>
              </div>
              <div>
                <p className="text-gray-400 uppercase tracking-wide">Gain</p>
                <p className="font-bold text-teal-600 mt-0.5">+{sym}{fmt(preview - amtNum)}</p>
              </div>
              <div>
                <p className="text-gray-400 uppercase tracking-wide">Current Value</p>
                <p className="font-bold text-teal-700 mt-0.5">{sym}{fmt(preview)}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes <span className="text-gray-400 font-normal">— optional</span>
            </label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Maturity date, bank, scheme details..."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm">Cancel</button>
            <button type="submit"
              className="flex-1 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium text-sm transition-colors">
              {initial ? 'Save Changes' : 'Add Investment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
