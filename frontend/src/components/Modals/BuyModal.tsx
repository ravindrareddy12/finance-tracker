import React, { useState } from 'react';
import { X, TrendingUp, Wallet } from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { useAppConfig } from '../../context/AppConfigContext';
import { Currency, DematAccount } from '../../types';

const CURRENCIES: Currency[] = ['INR', 'USD'];

interface Props { onClose: () => void; }

export default function BuyModal({ onClose }: Props) {
  const { addBuy, usdCashBalances, inrCashBalances } = usePortfolio();
  const { config } = useAppConfig();
  const dematAccounts = config.dematAccounts;
  const [symbol, setSymbol]           = useState('');
  const [quantity, setQuantity]       = useState('');
  const [price, setPrice]             = useState('');
  const [fees, setFees]               = useState('');
  const [currency, setCurrency]       = useState<Currency>('USD');
  const [dematAccount, setDematAccount] = useState<DematAccount>(dematAccounts[0] ?? '');
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState(false);

  const qty   = parseFloat(quantity) || 0;
  const prc   = parseFloat(price)    || 0;
  const fee   = parseFloat(fees)     || 0;
  const sym   = currency === 'INR' ? '₹' : '$';
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  const fmt   = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 2 });

  const cashBalances = currency === 'INR' ? inrCashBalances : usdCashBalances;
  const total       = qty * prc + fee;
  const cashBal     = cashBalances[dematAccount] ?? 0;
  const afterBal    = cashBal - total;
  const insufficient = total > 0 && afterBal < 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!symbol.trim()) { setError('Symbol is required.'); return; }
    if (qty <= 0)        { setError('Quantity must be a positive number.'); return; }
    if (prc <= 0)        { setError('Price must be a positive number.'); return; }
    if (fee < 0)         { setError('Fees cannot be negative.'); return; }

    addBuy({ symbol: symbol.trim().toUpperCase(), quantity: qty, price: prc, fees: fee, currency, dematAccount });
    setSuccess(true);
    setTimeout(onClose, 1200);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="bg-green-100 p-1.5 rounded-lg">
              <TrendingUp className="text-green-600 w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Add Buy Transaction</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
              Buy transaction added successfully!
            </div>
          )}

          {/* Symbol */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Symbol</label>
            <input type="text" value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())}
              placeholder="e.g. RELIANCE.NS or AAPL"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
            <p className="text-xs text-gray-400 mt-1">Indian: add .NS (RELIANCE.NS) · US: just ticker (AAPL)</p>
          </div>

          {/* Demat + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Demat Account</label>
              <select value={dematAccount} onChange={e => setDematAccount(e.target.value as DematAccount)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white">
                {dematAccounts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value as Currency)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white">
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Cash balance banner */}
          <div className={`flex items-center justify-between rounded-lg px-4 py-2 text-xs border ${insufficient ? 'bg-red-50 border-red-200 text-red-700' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
            <span className="flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" />
              Available cash ({dematAccount}): <strong>{sym}{fmt(cashBal)}</strong>
            </span>
            {total > 0 && (
              <span className={insufficient ? 'text-red-600 font-semibold' : 'text-blue-600'}>
                After: {sym}{fmt(afterBal)}
              </span>
            )}
          </div>

          {/* Qty + Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)}
                placeholder="0" min="0" step="any"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Buy Price ({sym})</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)}
                placeholder="0.00" min="0" step="any"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
            </div>
          </div>

          {/* Fees */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brokerage / Fees ({sym}) <span className="text-gray-400 font-normal">— optional</span></label>
            <input type="number" value={fees} onChange={e => setFees(e.target.value)}
              placeholder="0.00" min="0" step="any"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
          </div>

          {/* Cost breakdown */}
          {qty > 0 && prc > 0 && (
            <div className="bg-gray-50 rounded-lg px-4 py-3 space-y-1 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>{qty.toLocaleString()} × {sym}{fmt(prc)}</span>
                <span>{sym}{fmt(qty * prc)}</span>
              </div>
              {fee > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Fees</span>
                  <span>+ {sym}{fmt(fee)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-gray-800 pt-1 border-t border-gray-200">
                <span>Total Deduction</span>
                <span>{sym}{fmt(total)}</span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors">
              Add Buy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
