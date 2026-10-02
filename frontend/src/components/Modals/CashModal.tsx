import React, { useState } from 'react';
import { X, Wallet, PlusCircle, MinusCircle, RefreshCw } from 'lucide-react';
import { usePortfolio, CashAction } from '../../context/PortfolioContext';
import { useAppConfig } from '../../context/AppConfigContext';

const ACTION_CONFIG = {
  deposit:  { label: 'Deposit',      icon: PlusCircle,  color: 'green',  desc: 'Add cash to the account' },
  withdraw: { label: 'Withdraw',     icon: MinusCircle, color: 'red',    desc: 'Remove cash from the account' },
  set:      { label: 'Set Balance',  icon: RefreshCw,   color: 'blue',   desc: 'Override the current balance' },
} as const;

interface Props {
  defaultAccount?: string;
  currency?: 'INR' | 'USD';
  onClose: () => void;
}

export default function CashModal({ defaultAccount, currency = 'USD', onClose }: Props) {
  const { usdCashBalances, inrCashBalances, updateCash } = usePortfolio();
  const { config } = useAppConfig();
  const dematAccounts = config.dematAccounts;
  const [account, setAccount]   = useState<string>(defaultAccount ?? dematAccounts[0] ?? '');
  const [action, setAction]     = useState<CashAction>('deposit');
  const [amount, setAmount]     = useState('');
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);

  const cashBalances = currency === 'INR' ? inrCashBalances : usdCashBalances;
  const sym    = currency === 'INR' ? '₹' : '$';
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  const fmt    = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 2 });

  const cfg = ACTION_CONFIG[action];
  const current = cashBalances[account] ?? 0;

  const preview = (() => {
    const amt = parseFloat(amount || '0');
    if (isNaN(amt)) return null;
    if (action === 'set') return amt;
    if (action === 'deposit') return current + amt;
    return Math.max(0, current - amt);
  })();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 0) { setError('Please enter a valid amount.'); return; }
    if (action === 'withdraw' && amt > current) {
      setError(`Insufficient balance. Current: ${sym}${fmt(current)}`);
      return;
    }
    updateCash(account, amt, action, currency);
    setSuccess(true);
    setTimeout(onClose, 1000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-100 p-1.5 rounded-lg">
              <Wallet className="text-emerald-600 w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Manage Cash Balance</h2>
              <p className="text-xs text-gray-400">Current: {sym}{fmt(current)}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}
          {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">Cash balance updated!</div>}

          {/* Account selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Demat Account</label>
            <select
              value={account}
              onChange={e => setAccount(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm bg-white"
            >
              {dematAccounts.map(a => (
                <option key={a} value={a}>
                  {a} — {sym}{fmt(cashBalances[a] ?? 0)}
                </option>
              ))}
            </select>
          </div>

          {/* Action tabs */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(ACTION_CONFIG) as [CashAction, typeof ACTION_CONFIG[CashAction]][]).map(([key, c]) => {
                const Icon = c.icon;
                const active = action === key;
                const border = active
                  ? c.color === 'green' ? 'border-green-500 bg-green-50 text-green-700'
                    : c.color === 'red'  ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50';
                return (
                  <button key={key} type="button" onClick={() => setAction(key)}
                    className={`flex flex-col items-center gap-1 px-3 py-2.5 border-2 rounded-xl text-xs font-medium transition-all ${border}`}>
                    <Icon className="w-4 h-4" />
                    {c.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">{ACTION_CONFIG[action].desc}</p>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount ({sym})
            </label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="any"
              autoFocus
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
            />
          </div>

          {/* Preview */}
          {amount && preview !== null && (
            <div className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between text-sm">
              <span className="text-gray-500">New Balance</span>
              <span className="font-bold text-gray-800 text-base">
                {sym}{preview.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm">
              Cancel
            </button>
            <button type="submit"
              className={`flex-1 px-4 py-2.5 text-white rounded-lg font-medium text-sm transition-colors ${
                action === 'deposit'  ? 'bg-green-600 hover:bg-green-700' :
                action === 'withdraw' ? 'bg-red-600 hover:bg-red-700' :
                'bg-blue-600 hover:bg-blue-700'
              }`}>
              {ACTION_CONFIG[action].label}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
