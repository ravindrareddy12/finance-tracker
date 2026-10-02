import React, { useState } from 'react';
import { Wallet, Plus } from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { useAppConfig } from '../../context/AppConfigContext';
import { getAccountColors } from '../../utils/accountColors';
import CashModal from '../Modals/CashModal';

interface CashBalanceSectionProps { currency?: 'INR' | 'USD'; }

export default function CashBalanceSection({ currency = 'USD' }: CashBalanceSectionProps) {
  const { usdCashBalances, inrCashBalances } = usePortfolio();
  const { config } = useAppConfig();
  const dematAccounts = config.dematAccounts;
  const [modalAccount, setModalAccount] = useState<string | null>(null);

  const cashBalances = currency === 'INR' ? inrCashBalances : usdCashBalances;
  const sym    = currency === 'INR' ? '₹' : '$';
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  const fmt    = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 2 });
  const total  = dematAccounts.reduce((s, a) => s + (cashBalances[a] ?? 0), 0);

  return (
    <>
      <div className="space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-gray-700">Cash Balances</h3>
            <span className="text-xs text-gray-400">
              Total: {sym}{fmt(total)}
            </span>
          </div>
          <button
            onClick={() => setModalAccount(dematAccounts[0] ?? null)}
            className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 border border-emerald-200 px-2 py-1 rounded-lg hover:bg-emerald-50 transition-colors"
          >
            <Plus className="w-3 h-3" /> Manage Cash
          </button>
        </div>

        {/* Account cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {dematAccounts.map(account => {
            const s = getAccountColors(account, dematAccounts);
            const bal = cashBalances[account] ?? 0;
            return (
              <div
                key={account}
                className={`${s.bg} ${s.border} border rounded-xl p-3 flex flex-col gap-2`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                    <span className={`text-xs font-semibold ${s.text}`}>{account}</span>
                  </div>
                  <button
                    onClick={() => setModalAccount(account)}
                    title="Add / Edit cash"
                    className={`${s.text} opacity-60 hover:opacity-100 transition-opacity`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div>
                  <p className={`text-base font-bold ${s.text}`}>
                    {sym}{fmt(bal)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Available cash</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {modalAccount && (
        <CashModal
          defaultAccount={modalAccount}
          currency={currency}
          onClose={() => setModalAccount(null)}
        />
      )}
    </>
  );
}
