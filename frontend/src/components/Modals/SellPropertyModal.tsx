import React, { useState } from 'react';
import { X, DollarSign } from 'lucide-react';
import { RealEstateProperty } from '../../types';

interface Props {
  property: RealEstateProperty;
  onSave: (soldDate: string, soldAmount: number, soldNotes: string) => void;
  onClose: () => void;
}

export default function SellPropertyModal({ property, onSave, onClose }: Props) {
  const [soldDate,   setSoldDate]   = useState(new Date().toISOString().slice(0, 10));
  const [soldAmount, setSoldAmount] = useState('');
  const [soldNotes,  setSoldNotes]  = useState('');
  const [error,      setError]      = useState('');

  const sym    = property.currency === 'INR' ? '₹' : '$';
  const locale = property.currency === 'INR' ? 'en-IN' : 'en-US';
  const fmt    = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 2 });

  const myInvestment = property.propertyPrice * (property.mySharePercent / 100);
  const soldNum = parseFloat(soldAmount) || 0;
  const gain = soldNum - myInvestment;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!soldDate)          { setError('Sold date is required.'); return; }
    if (soldNum <= 0)       { setError('Sold amount must be positive.'); return; }
    onSave(soldDate, soldNum, soldNotes.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="bg-green-100 p-1.5 rounded-lg">
              <DollarSign className="text-green-600 w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Mark as Sold</h2>
              <p className="text-xs text-gray-400">{property.propertyName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}

          {/* Summary */}
          <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 grid grid-cols-2 gap-3 text-xs text-center">
            <div>
              <p className="text-gray-400 uppercase tracking-wide font-semibold">My Investment</p>
              <p className="font-bold text-gray-800 mt-1">{sym}{fmt(myInvestment)}</p>
              <p className="text-gray-400">({property.mySharePercent}% of {sym}{fmt(property.propertyPrice)})</p>
            </div>
            <div>
              <p className="text-gray-400 uppercase tracking-wide font-semibold">My Gain / Loss</p>
              <p className={`font-bold mt-1 ${gain >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {soldNum > 0 ? `${gain >= 0 ? '+' : ''}${sym}${fmt(gain)}` : '—'}
              </p>
              {soldNum > 0 && myInvestment > 0 && (
                <p className={`${gain >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {((gain / myInvestment) * 100).toFixed(1)}%
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sold Date</label>
              <input type="date" value={soldDate} onChange={e => setSoldDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">My Sale Amount ({sym})</label>
              <input type="number" value={soldAmount} onChange={e => setSoldAmount(e.target.value)}
                placeholder="0.00" min="0" step="any" autoFocus
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes <span className="text-gray-400 font-normal">— optional</span></label>
            <input type="text" value={soldNotes} onChange={e => setSoldNotes(e.target.value)}
              placeholder="e.g. Sold to buyer, registry done"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors">
              Confirm Sale
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
