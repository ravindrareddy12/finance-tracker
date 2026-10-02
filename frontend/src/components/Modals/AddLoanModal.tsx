import React, { useState } from 'react';
import { X, HandCoins } from 'lucide-react';
import { Currency, LoanInvestment } from '../../types';

interface Props {
  onSave: (investment: LoanInvestment) => void;
  onClose: () => void;
}

const CURRENCIES: Currency[] = ['INR', 'USD'];

export default function AddLoanModal({ onSave, onClose }: Props) {
  const [customerName, setCustomerName] = useState('');
  const [principal, setPrincipal]       = useState('');
  const [currency, setCurrency]         = useState<Currency>('INR');
  const [dateGiven, setDateGiven]       = useState(new Date().toISOString().slice(0, 10));
  const [interestRate, setInterestRate] = useState('');
  const [notes, setNotes]               = useState('');
  const [error, setError]               = useState('');

  const sym    = currency === 'INR' ? '₹' : '$';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!customerName.trim()) { setError('Customer name is required.'); return; }
    const amt = parseFloat(principal);
    if (isNaN(amt) || amt <= 0) { setError('Investment amount must be a positive number.'); return; }
    if (!dateGiven) { setError('Date is required.'); return; }

    const investment: LoanInvestment = {
      id: Date.now().toString(),
      customerName: customerName.trim(),
      principal: amt,
      currency,
      dateGiven,
      interestRate: interestRate ? parseFloat(interestRate) : undefined,
      notes: notes.trim() || undefined,
      returns: [],
    };
    onSave(investment);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="bg-violet-100 p-1.5 rounded-lg">
              <HandCoins className="text-violet-600 w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">New Interest Investment</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
            <input
              type="text"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="e.g. Ravi Kumar"
              autoFocus
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Investment Amount ({sym})</label>
              <input
                type="number"
                value={principal}
                onChange={e => setPrincipal(e.target.value)}
                placeholder="0.00"
                min="0"
                step="any"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value as Currency)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white"
              >
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Given</label>
              <input
                type="date"
                value={dateGiven}
                onChange={e => setDateGiven(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Interest Rate (% p.a.) <span className="text-gray-400 font-normal">— optional</span>
              </label>
              <input
                type="number"
                value={interestRate}
                onChange={e => setInterestRate(e.target.value)}
                placeholder="e.g. 12"
                min="0"
                step="any"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes <span className="text-gray-400 font-normal">— optional</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any remarks..."
              rows={2}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium text-sm transition-colors">
              Add Investment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
