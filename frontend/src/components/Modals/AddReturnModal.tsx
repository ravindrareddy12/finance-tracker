import React, { useState } from 'react';
import { X, ArrowDownCircle } from 'lucide-react';
import { LoanInvestment, LoanReturn } from '../../types';

interface Props {
  investment: LoanInvestment;
  onSave: (ret: LoanReturn) => void;
  onClose: () => void;
}

export default function AddReturnModal({ investment, onSave, onClose }: Props) {
  const [amount, setAmount]   = useState('');
  const [date, setDate]       = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes]     = useState('');
  const [error, setError]     = useState('');

  const sym    = investment.currency === 'INR' ? '₹' : '$';
  const locale = investment.currency === 'INR' ? 'en-IN' : 'en-US';
  const fmt    = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 2 });

  const totalReturned  = investment.returns.reduce((s, r) => s + r.amount, 0);
  const outstanding    = investment.principal - totalReturned;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setError('Return amount must be a positive number.'); return; }
    if (!date) { setError('Date is required.'); return; }

    onSave({
      id: Date.now().toString(),
      amount: amt,
      date,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-100 p-1.5 rounded-lg">
              <ArrowDownCircle className="text-emerald-600 w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Record Return</h2>
              <p className="text-xs text-gray-400">{investment.customerName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
          )}

          {/* Outstanding summary */}
          <div className="bg-violet-50 border border-violet-100 rounded-lg px-4 py-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <p className="text-gray-400 uppercase tracking-wide">Principal</p>
              <p className="font-bold text-gray-800 mt-0.5">{sym}{fmt(investment.principal)}</p>
            </div>
            <div>
              <p className="text-gray-400 uppercase tracking-wide">Returned</p>
              <p className="font-bold text-emerald-600 mt-0.5">{sym}{fmt(totalReturned)}</p>
            </div>
            <div>
              <p className="text-gray-400 uppercase tracking-wide">Outstanding</p>
              <p className="font-bold text-red-600 mt-0.5">{sym}{fmt(outstanding)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Return Amount ({sym})</label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="any"
                autoFocus
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Received</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes <span className="text-gray-400 font-normal">— optional</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Partial payment, interest included..."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm transition-colors">
              Record Return
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
