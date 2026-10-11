import type { Ionicons } from '@expo/vector-icons';
import type { AppConfig } from '@/types/models';

type IconName = keyof typeof Ionicons.glyphMap;

export interface ModuleMeta { id: string; label: string; icon: IconName; section: string }

// Same modules, labels and sections as the web Configuration page
export const MODULES: ModuleMeta[] = [
  { id: 'equity',         label: 'US Equity Portfolio',     icon: 'trending-up-outline', section: 'US Equity (NYSE / NASDAQ)' },
  { id: 'india-equity',   label: 'India Equity Portfolio',  icon: 'trending-up-outline', section: 'India Equity (NSE)' },
  { id: 'india-mf',       label: 'Mutual Funds',            icon: 'bar-chart-outline',   section: 'India Equity (NSE)' },
  { id: 'loans',          label: 'Interest Investments',    icon: 'cash-outline',        section: 'Other Investments' },
  { id: 'realestate',     label: 'Real Estate',             icon: 'business-outline',    section: 'Other Investments' },
  { id: 'additional',     label: 'Additional Investments',  icon: 'wallet-outline',      section: 'Other Investments' },
  { id: 'fire',           label: 'FIRE Calculator',         icon: 'flame-outline',       section: 'Other Investments' },
  { id: 'expenses',       label: 'Monthly Expenses',        icon: 'receipt-outline',     section: 'Expenses' },
  { id: 'expense-report', label: 'Monthly Expense Summary', icon: 'document-text-outline', section: 'Expenses' },
];

// The web stores every configurable tab id (including ones the app doesn't show)
const ALL_TAB_IDS = [
  'equity', 'transactions', 'allocation',
  'india-equity', 'india-transactions', 'india-allocation', 'india-mf',
  'loans', 'realestate', 'additional', 'fire',
  'expenses', 'expense-report',
];

/** Fill defaults exactly like the web's loader, so a save from the app round-trips cleanly. */
export function normalizeConfig(config: Partial<AppConfig>): AppConfig {
  return {
    dematAccounts: Array.isArray(config.dematAccounts) ? config.dematAccounts : [],
    enabledTabs: { ...Object.fromEntries(ALL_TAB_IDS.map(id => [id, true])), ...(config.enabledTabs ?? {}) },
  };
}

// Web account colour palette (Tailwind *-500), assigned by position in the list
const ACCOUNT_COLORS = ['#3B82F6', '#A855F7', '#22C55E', '#F97316', '#EC4899', '#14B8A6', '#F59E0B', '#EF4444'];
export const accountColor = (index: number) => (index >= 0 ? ACCOUNT_COLORS[index % ACCOUNT_COLORS.length] : '#9CA3AF');
