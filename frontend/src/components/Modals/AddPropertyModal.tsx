import React, { useState } from 'react';
import { X, Building2 } from 'lucide-react';
import { Currency, RealEstateProperty } from '../../types';

interface Props {
  initial?: RealEstateProperty;
  onSave: (property: RealEstateProperty) => void;
  onClose: () => void;
}

const CURRENCIES: Currency[] = ['INR', 'USD'];

export default function AddPropertyModal({ initial, onSave, onClose }: Props) {
  const [propertyName,       setPropertyName]       = useState(initial?.propertyName ?? '');
  const [propertyPrice,      setPropertyPrice]       = useState(initial ? String(initial.propertyPrice) : '');
  const [mySharePercent,     setMySharePercent]      = useState(initial ? String(initial.mySharePercent) : '100');
  const [appreciationPerYear,setAppreciationPerYear] = useState(initial ? String(initial.appreciationPerYear) : '');
  const [purchaseDate,       setPurchaseDate]        = useState(initial?.purchaseDate ?? new Date().toISOString().slice(0, 10));
  const [currency,           setCurrency]            = useState<Currency>(initial?.currency ?? 'INR');
  const [partner,            setPartner]             = useState(initial?.partner ?? '');
  const [amountNotes,        setAmountNotes]         = useState(initial?.amountNotes ?? '');
  const [details1,           setDetails1]            = useState(initial?.details1 ?? '');
  const [details2,           setDetails2]            = useState(initial?.details2 ?? '');
  const [details3,           setDetails3]            = useState(initial?.details3 ?? '');
  const [error,              setError]               = useState('');

  const sym    = currency === 'INR' ? '₹' : '$';
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  const fmt    = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 2 });

  const priceNum = parseFloat(propertyPrice) || 0;
  const shareNum = parseFloat(mySharePercent) || 0;
  const myInvestment = priceNum * (shareNum / 100);

  const yearsHeld = purchaseDate
    ? (Date.now() - new Date(purchaseDate).getTime()) / (365.25 * 24 * 3600 * 1000)
    : 0;
  const appreciation = parseFloat(appreciationPerYear) || 0;
  const estimatedValue = myInvestment > 0 && appreciation > 0 && yearsHeld > 0
    ? myInvestment * Math.pow(1 + appreciation / 100, yearsHeld)
    : myInvestment;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!propertyName.trim())              { setError('Property name is required.'); return; }
    if (priceNum <= 0)                     { setError('Property price must be positive.'); return; }
    if (shareNum <= 0 || shareNum > 100)   { setError('Share % must be between 1 and 100.'); return; }
    if (!purchaseDate)                     { setError('Purchase date is required.'); return; }

    onSave({
      id: initial?.id ?? Date.now().toString(),
      propertyName: propertyName.trim(),
      propertyPrice: priceNum,
      mySharePercent: shareNum,
      appreciationPerYear: appreciation,
      purchaseDate,
      currency,
      partner: partner.trim() || undefined,
      amountNotes: amountNotes.trim() || undefined,
      details1: details1.trim() || undefined,
      details2: details2.trim() || undefined,
      details3: details3.trim() || undefined,
      status: initial?.status ?? 'active',
      soldDate: initial?.soldDate,
      soldAmount: initial?.soldAmount,
      soldNotes: initial?.soldNotes,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="bg-orange-100 p-1.5 rounded-lg">
              <Building2 className="text-orange-600 w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">
              {initial ? 'Edit Property' : 'Add Real Estate Investment'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}

          {/* Property Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Property Name</label>
            <input type="text" value={propertyName} onChange={e => setPropertyName(e.target.value)}
              placeholder="e.g. Flat 4B, Green Valley, Hyderabad"
              autoFocus
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm" />
          </div>

          {/* Price + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Property Price ({sym})</label>
              <input type="number" value={propertyPrice} onChange={e => setPropertyPrice(e.target.value)}
                placeholder="0.00" min="0" step="any"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value as Currency)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm bg-white">
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Share % + Appreciation */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">My Share (%)</label>
              <input type="number" value={mySharePercent} onChange={e => setMySharePercent(e.target.value)}
                placeholder="100" min="0" max="100" step="any"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Appreciation / Year (%)</label>
              <input type="number" value={appreciationPerYear} onChange={e => setAppreciationPerYear(e.target.value)}
                placeholder="e.g. 8" min="0" step="any"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm" />
            </div>
          </div>

          {/* Purchase Date + Partner */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
              <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Partner <span className="text-gray-400 font-normal">— optional</span></label>
              <input type="text" value={partner} onChange={e => setPartner(e.target.value)}
                placeholder="e.g. Rohini"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm" />
            </div>
          </div>

          {/* Live calculations preview */}
          {priceNum > 0 && (
            <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 grid grid-cols-3 gap-3 text-center text-xs">
              <div>
                <p className="text-gray-400 uppercase tracking-wide font-semibold">My Investment</p>
                <p className="font-bold text-gray-800 mt-1 text-sm">{sym}{fmt(myInvestment)}</p>
                <p className="text-gray-400 mt-0.5">{sym}{fmt(priceNum)} × {shareNum}%</p>
              </div>
              <div>
                <p className="text-gray-400 uppercase tracking-wide font-semibold">Years Held</p>
                <p className="font-bold text-gray-800 mt-1 text-sm">{Math.max(0, yearsHeld).toFixed(1)} yrs</p>
                <p className="text-gray-400 mt-0.5">{appreciation > 0 ? `${appreciation}% p.a.` : 'No appreciation set'}</p>
              </div>
              <div>
                <p className="text-gray-400 uppercase tracking-wide font-semibold">Est. Value</p>
                <p className="font-bold text-orange-600 mt-1 text-sm">{sym}{fmt(estimatedValue)}</p>
                <p className="text-gray-400 mt-0.5">
                  {estimatedValue > myInvestment
                    ? `+${sym}${fmt(estimatedValue - myInvestment)}`
                    : 'set appreciation'}
                </p>
              </div>
            </div>
          )}

          {/* Amount Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount Calculation Notes <span className="text-gray-400 font-normal">— optional</span></label>
            <input type="text" value={amountNotes} onChange={e => setAmountNotes(e.target.value)}
              placeholder="e.g. Registry + stamp duty included"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm" />
          </div>

          {/* Details 1 / 2 / 3 */}
          <div className="space-y-2">
            {[
              { label: 'Details 1', val: details1, set: setDetails1, ph: 'e.g. Flat no / Block / Floor' },
              { label: 'Details 2', val: details2, set: setDetails2, ph: 'e.g. Area in sq.ft' },
              { label: 'Details 3', val: details3, set: setDetails3, ph: 'e.g. Registry No / Agreement details' },
            ].map(f => (
              <div key={f.label}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{f.label} <span className="text-gray-400 font-normal">— optional</span></label>
                <input type="text" value={f.val} onChange={e => f.set(e.target.value)}
                  placeholder={f.ph}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm" />
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium text-sm transition-colors">
              {initial ? 'Save Changes' : 'Add Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
