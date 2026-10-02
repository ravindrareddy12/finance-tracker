import React, { useState } from 'react';
import { useAppConfig } from '../../context/AppConfigContext';
import { getAccountColors } from '../../utils/accountColors';
import {
  Plus, Trash2, Pencil, Check, X,
  TrendingUp, HandCoins, Building2, Landmark,
  LayoutDashboard, BarChart3, Flame, Receipt, FileBarChart, Settings,
} from 'lucide-react';

// ─── Tab metadata for the toggle grid ────────────────────────────────────────

interface TabMeta { id: string; label: string; icon: React.ReactNode; section: string; }

const TAB_META: TabMeta[] = [
  { id: 'equity',             label: 'US Equity Portfolio',       icon: <TrendingUp className="w-4 h-4" />,     section: 'US Equity (NYSE / NASDAQ)' },
  { id: 'india-equity',       label: 'India Equity Portfolio',    icon: <TrendingUp className="w-4 h-4" />,     section: 'India Equity (NSE)' },
  { id: 'india-mf',           label: 'Mutual Funds',              icon: <BarChart3 className="w-4 h-4" />,      section: 'India Equity (NSE)' },
  { id: 'loans',              label: 'Interest Investments',      icon: <HandCoins className="w-4 h-4" />,      section: 'Other Investments' },
  { id: 'realestate',         label: 'Real Estate',               icon: <Building2 className="w-4 h-4" />,      section: 'Other Investments' },
  { id: 'additional',         label: 'Additional Investments',    icon: <Landmark className="w-4 h-4" />,       section: 'Other Investments' },
  { id: 'fire',               label: 'FIRE Calculator',           icon: <Flame className="w-4 h-4" />,          section: 'Other Investments' },
  { id: 'expenses',           label: 'Monthly Expenses',          icon: <Receipt className="w-4 h-4" />,        section: 'Expenses' },
  { id: 'expense-report',     label: 'Monthly Expense Summary',   icon: <FileBarChart className="w-4 h-4" />,   section: 'Expenses' },
];

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ConfigurationPage() {
  const { config, addAccount, removeAccount, renameAccount, setTabEnabled } = useAppConfig();
  const { dematAccounts, enabledTabs } = config;

  const [newAccount, setNewAccount]   = useState('');
  const [editName, setEditName]       = useState<string | null>(null);   // which account is being renamed
  const [editValue, setEditValue]     = useState('');

  // Group TAB_META by section
  const sections = TAB_META.reduce<Record<string, TabMeta[]>>((acc, t) => {
    (acc[t.section] ??= []).push(t); return acc;
  }, {});

  const handleAdd = () => {
    const trimmed = newAccount.trim();
    if (!trimmed) return;
    addAccount(trimmed);
    setNewAccount('');
  };

  const startRename = (name: string) => { setEditName(name); setEditValue(name); };
  const commitRename = () => {
    if (editName) renameAccount(editName, editValue);
    setEditName(null);
  };

  return (
    <div className="space-y-8 max-w-3xl">

      {/* Header */}
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-blue-600" />
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Configuration</h2>
          <p className="text-sm text-gray-400 mt-0.5">Manage account holders and control which tabs are visible</p>
        </div>
      </div>

      {/* ── Section 1: Demat Account Holders ── */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">Demat Account Holders</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Names appear in account filters across all tabs. Configuration is saved separately per user.
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {dematAccounts.length === 0 && (
            <div className="px-6 py-6 text-center text-sm text-gray-400 italic">
              No accounts yet. Add your first account holder below.
            </div>
          )}
          {dematAccounts.map((acct, idx) => {
            const colors = getAccountColors(acct, dematAccounts);
            const isEditing = editName === acct;
            return (
              <div key={acct} className="flex items-center gap-3 px-6 py-3">
                {/* Color dot + index */}
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${colors.dot}`}>
                  {idx + 1}
                </span>

                {isEditing ? (
                  <input
                    autoFocus
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditName(null); }}
                    className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                ) : (
                  <span className="flex-1 text-sm font-medium text-gray-800">{acct}</span>
                )}

                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors.badge}`}>
                  {acct}
                </span>

                {isEditing ? (
                  <div className="flex items-center gap-1">
                    <button onClick={commitRename} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setEditName(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <button onClick={() => startRename(acct)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeAccount(acct)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title={`Remove ${acct}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add row */}
          <div className="flex items-center gap-2 px-6 py-4">
            <input
              value={newAccount}
              onChange={e => setNewAccount(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
              placeholder="New account holder name…"
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={handleAdd}
              disabled={!newAccount.trim() || dematAccounts.includes(newAccount.trim())}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </div>
      </div>

      {/* ── Section 2: Tab Visibility ── */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">Tab Visibility</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Disabled tabs are hidden from the sidebar. Dashboard and Configuration are always visible.
          </p>
        </div>

        {/* Always-on tabs */}
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Always Visible</p>
          <div className="flex gap-3">
            {[
              { icon: <LayoutDashboard className="w-4 h-4" />, label: 'Dashboard' },
              { icon: <Settings className="w-4 h-4" />,        label: 'Configuration' },
            ].map(t => (
              <div key={t.label} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium">
                {t.icon} {t.label}
                <span className="text-[10px] text-blue-400 font-normal">always on</span>
              </div>
            ))}
          </div>
        </div>

        {/* Configurable sections */}
        {Object.entries(sections).map(([section, tabs]) => (
          <div key={section} className="border-b border-gray-100 last:border-0">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-6 pt-4 pb-2">{section}</p>
            <div className="divide-y divide-gray-50">
              {tabs.map(tab => (
                <div key={tab.id} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className={`${enabledTabs[tab.id] !== false ? 'text-gray-500' : 'text-gray-300'} transition-colors`}>
                      {tab.icon}
                    </span>
                    <span className={`text-sm font-medium transition-colors ${enabledTabs[tab.id] !== false ? 'text-gray-700' : 'text-gray-400'}`}>
                      {tab.label}
                    </span>
                  </div>
                  <Toggle
                    enabled={enabledTabs[tab.id] !== false}
                    onChange={v => setTabEnabled(tab.id, v)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
