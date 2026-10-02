import React, { useState } from 'react';
import { X, TrendingDown, Zap, Wallet } from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { useAppConfig } from '../../context/AppConfigContext';
import { Currency, DematAccount } from '../../types';

const CURRENCIES: Currency[] = ['INR', 'USD'];

interface Props { onClose: () => void; }

export default function SellModal({ onClose }: Props) {
  const { addSell, holdings, usdCashBalances, inrCashBalances } = usePortfolio();
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

  const holding = holdings.find(
    h => h.symbol === symbol.toUpperCase() && h.dematAccount === dematAccount && h.currency === currency
  );

  const prcNum = parseFloat(price);
  const usingMarketPrice = price === '0' || price === '0.00' || prcNum === 0;
  const effectivePrice = usingMarketPrice ? (holding?.currentPrice ?? null) : (isNaN(prcNum) ? null : prcNum);
  const sym    = currency === 'INR' ? '₹' : '$';
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  const fmt    = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 2 });
  const qty    = parseFloat(quantity);
  const fee    = parseFloat(fees) || 0;
  const grossSale  = effectivePrice !== null && !isNaN(qty) ? qty * effectivePrice : null;
  const netProceeds = grossSale !== null ? Math.max(0, grossSale - fee) : null;
  const cashBalances = currency === 'INR' ? inrCashBalances : usdCashBalances;
  const cashBal  = cashBalances[dematAccount] ?? 0;
  const afterBal = netProceeds !== null ? cashBal + netProceeds : null;

  const handleSellAll = () => {
    if (holding) setQuantity(String(holding.quantity));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!symbol.trim()) { setError('Symbol is required.'); return; }
    if (!quantity)       { setError('Quantity is required.'); return; }
    if (price === '')    { setError('Sell price is required. Enter 0 to use live market price.'); return; }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) { setError('Quantity must be a positive number.'); return; }

    const prc = parseFloat(price);
    if (isNaN(prc) || prc < 0)  { setError('Price must be 0 or a positive number.'); return; }

    if (holding && qty > holding.quantity) {
      setError(`You only hold ${holding.quantity} shares of ${symbol.toUpperCase()} in this account.`);
      return;
    }

    let finalPrice = prc;
    if (prc === 0) {
      if (!holding?.currentPrice) {
        setError('Live market price is unavailable. Please enter a price manually.');
        return;
      }
      finalPrice = holding.currentPrice;
    }

    addSell({ symbol: symbol.trim().toUpperCase(), quantity: qty, price: finalPrice, fees: fee, currency, dematAccount });
    setSuccess(true);
    setTimeout(onClose, 1200);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="bg-red-100 p-1.5 rounded-lg">
              <TrendingDown className="text-red-600 w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Add Sell Transaction</h2>
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
              Sell transaction recorded!
            </div>
          )}

          {/* Symbol */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Symbol</label>
            <input
              type="text"
              value={symbol}
              onChange={e => setSymbol(e.target.value.toUpperCase())}
              placeholder="e.g. RELIANCE.NS or AAPL"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
            />
          </div>

          {/* Demat + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Demat Account</label>
              <select value={dematAccount} onChange={e => setDematAccount(e.target.value as DematAccount)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm bg-white">
                {dematAccounts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value as Currency)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm bg-white">
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Holding info banner */}
          {holding && (
            <div className="bg-blue-50 border border-blue-100 text-blue-700 rounded-lg px-4 py-2 text-xs flex items-center justify-between">
              <span>
                Available: <strong>{holding.quantity.toLocaleString()} shares</strong> @ avg{' '}
                <strong>{sym}{holding.avgBuyPrice.toFixed(2)}</strong>
                {holding.currentPrice !== null && (
                  <span className="ml-2 text-blue-500">· Live: {sym}{fmt(holding.currentPrice)}</span>
                )}
              </span>
            </div>
          )}

          {/* Cash balance banner */}
          <div className="flex items-center justify-between rounded-lg px-4 py-2 text-xs border bg-emerald-50 border-emerald-200 text-emerald-700">
            <span className="flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" />
              Cash balance ({dematAccount}): <strong>{sym}{fmt(cashBal)}</strong>
            </span>
            {afterBal !== null && (
              <span className="text-emerald-600 font-semibold">After: {sym}{fmt(afterBal)}</span>
            )}
          </div>

          {/* Quantity + Sell All */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Quantity</label>
              {holding && (
                <button type="button" onClick={handleSellAll}
                  className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1 rounded-lg transition-colors">
                  <Zap className="w-3 h-3" />
                  Sell All ({holding.quantity.toLocaleString()})
                </button>
              )}
            </div>
            <input
              type="number"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder="0"
              min="0"
              step="any"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
            />
          </div>

          {/* Sell Price */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Sell Price</label>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" />
                Enter <strong className="text-gray-600 mx-0.5">0</strong> to use live market price
              </span>
            </div>
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="0.00 for market price"
              min="0"
              step="any"
              className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 text-sm transition-colors ${
                usingMarketPrice && holding?.currentPrice
                  ? 'border-amber-300 bg-amber-50 focus:ring-amber-400'
                  : 'border-gray-300 focus:ring-red-500'
              }`}
            />
            {usingMarketPrice && (
              <p className="text-xs mt-1 flex items-center gap-1">
                {holding?.currentPrice
                  ? <span className="text-amber-600"><Zap className="w-3 h-3 inline mr-0.5" />Using live price: <strong>{sym}{holding.currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong></span>
                  : <span className="text-red-500">Live price unavailable — enter a price manually</span>}
              </p>
            )}
          </div>

          {/* Fees */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Brokerage / Fees ({sym}) <span className="text-gray-400 font-normal">— optional</span>
            </label>
            <input type="number" value={fees} onChange={e => setFees(e.target.value)}
              placeholder="0.00" min="0" step="any"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" />
          </div>

          {/* Preview */}
          {grossSale !== null && quantity && (
            <div className="bg-gray-50 rounded-lg px-4 py-3 space-y-1 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Gross sale ({qty.toLocaleString()} × {sym}{fmt(effectivePrice ?? 0)})</span>
                <span>{sym}{fmt(grossSale)}</span>
              </div>
              {fee > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Fees</span>
                  <span>− {sym}{fmt(fee)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-gray-800 pt-1 border-t border-gray-200">
                <span>Net Proceeds (credited to cash)</span>
                <span className="text-emerald-600">{sym}{fmt(netProceeds ?? 0)}</span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors">
              Add Sell
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
