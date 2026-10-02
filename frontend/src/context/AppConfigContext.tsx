import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';

export interface AppConfig {
  dematAccounts: string[];
  enabledTabs: Record<string, boolean>;
}

const DEFAULT_ACCOUNTS: string[] = [];

const ALL_CONFIGURABLE_TABS = [
  'equity', 'transactions', 'allocation',
  'india-equity', 'india-transactions', 'india-allocation', 'india-mf',
  'loans', 'realestate', 'additional', 'fire',
  'expenses', 'expense-report',
];

function defaultEnabledTabs(): Record<string, boolean> {
  return Object.fromEntries(ALL_CONFIGURABLE_TABS.map(t => [t, true]));
}

function configKey(user: string) {
  return `ft_app_config_${user}`;
}

function load(user: string): AppConfig {
  try {
    const raw = JSON.parse(localStorage.getItem(configKey(user)) || 'null');
    if (raw) {
      return {
        dematAccounts: Array.isArray(raw.dematAccounts)
          ? raw.dematAccounts
          : [...DEFAULT_ACCOUNTS],
        enabledTabs: { ...defaultEnabledTabs(), ...(raw.enabledTabs ?? {}) },
      };
    }
  } catch { /* */ }
  return { dematAccounts: [...DEFAULT_ACCOUNTS], enabledTabs: defaultEnabledTabs() };
}

function save(user: string, cfg: AppConfig) {
  if (!user) return;
  localStorage.setItem(configKey(user), JSON.stringify(cfg));
}

interface AppConfigCtx {
  config: AppConfig;
  addAccount: (name: string) => void;
  removeAccount: (name: string) => void;
  renameAccount: (oldName: string, newName: string) => void;
  setTabEnabled: (tabId: string, enabled: boolean) => void;
}

const Ctx = createContext<AppConfigCtx | null>(null);

export function AppConfigProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const [config, setConfig] = useState<AppConfig>(() =>
    currentUser ? load(currentUser) : { dematAccounts: [...DEFAULT_ACCOUNTS], enabledTabs: defaultEnabledTabs() }
  );

  // Reload config whenever the logged-in user changes
  useEffect(() => {
    if (currentUser) {
      setConfig(load(currentUser));
    } else {
      setConfig({ dematAccounts: [...DEFAULT_ACCOUNTS], enabledTabs: defaultEnabledTabs() });
    }
  }, [currentUser]);

  const addAccount = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed || !currentUser) return;
    setConfig(prev => {
      if (prev.dematAccounts.includes(trimmed)) return prev;
      const next = { ...prev, dematAccounts: [...prev.dematAccounts, trimmed] };
      save(currentUser, next);
      return next;
    });
  }, [currentUser]);

  const removeAccount = useCallback((name: string) => {
    if (!currentUser) return;
    setConfig(prev => {
      const next = { ...prev, dematAccounts: prev.dematAccounts.filter(a => a !== name) };
      save(currentUser, next);
      return next;
    });
  }, [currentUser]);

  const renameAccount = useCallback((oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName || !currentUser) return;
    setConfig(prev => {
      if (prev.dematAccounts.includes(trimmed)) return prev;
      const next = { ...prev, dematAccounts: prev.dematAccounts.map(a => a === oldName ? trimmed : a) };
      save(currentUser, next);
      return next;
    });
  }, [currentUser]);

  const setTabEnabled = useCallback((tabId: string, enabled: boolean) => {
    if (!currentUser) return;
    setConfig(prev => {
      const next = { ...prev, enabledTabs: { ...prev.enabledTabs, [tabId]: enabled } };
      save(currentUser, next);
      return next;
    });
  }, [currentUser]);

  return (
    <Ctx.Provider value={{ config, addAccount, removeAccount, renameAccount, setTabEnabled }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAppConfig() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppConfig must be used inside AppConfigProvider');
  return ctx;
}
