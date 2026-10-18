import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { portfolioApi } from '@/api/portfolio';
import { useAuth } from '@/auth/AuthProvider';
import type {
  AdditionalInvestment, AppConfig, BackupResponse, FIREInputs, LoanInvestment, MFHolding, MonthlyExpenses, RealEstateProperty, SIPSchedule, StockQuote, Transaction,
} from '@/types/models';
import { computeFunds, computeHoldings, summarize } from './calculations';

const FALLBACK_USD_INR = 84;

export const queryKeys = {
  backup: (user: string) => ['backup', user] as const,
  quotes: (symbols: string[]) => ['quotes', ...symbols] as const,
  navs:   (codes: string[]) => ['navs', ...codes] as const,
  usdInr: ['fx', 'usd-inr'] as const,
};

/** Every data key the web app syncs, as `ft_<name>_<username>`. */
export type DataName =
  | 'transactions' | 'cash_usd' | 'cash_inr' | 'mf' | 'sip_schedules' | 'realestate'
  | 'investments' | 'loans' | 'monthly_expenses' | 'fire' | 'app_config';

export interface UserData {
  transactions: Transaction[];
  cashUsd: Record<string, number>;
  cashInr: Record<string, number>;
  funds: MFHolding[];
  sipSchedules: SIPSchedule[];
  properties: RealEstateProperty[];
  investments: AdditionalInvestment[];
  loans: LoanInvestment[];
  expenses: MonthlyExpenses;
  fire: FIREInputs | null;
  config: AppConfig;
  savedAt: string | null;
}

/** Decode the `ft_<name>_<username>` backup keys into typed data. */
export function decodeUserData(backup: BackupResponse | undefined, username: string): UserData {
  const raw = backup?.data ?? {};
  const get = <T,>(name: DataName, fallback: T): T => (raw[`ft_${name}_${username}`] as T | undefined) ?? fallback;
  const config = get<Partial<AppConfig>>('app_config', {});
  return {
    transactions: get<Transaction[]>('transactions', []),
    cashUsd:      get<Record<string, number>>('cash_usd', {}),
    cashInr:      get<Record<string, number>>('cash_inr', {}),
    funds:        get<MFHolding[]>('mf', []),
    sipSchedules: get<SIPSchedule[]>('sip_schedules', []),
    properties:   get<RealEstateProperty[]>('realestate', []),
    investments:  get<AdditionalInvestment[]>('investments', []),
    loans:        get<LoanInvestment[]>('loans', []),
    expenses:     get<MonthlyExpenses>('monthly_expenses', {}),
    fire:         get<FIREInputs | null>('fire', null),
    config: {
      dematAccounts: config.dematAccounts ?? [],
      enabledTabs:   config.enabledTabs ?? {},
    },
    savedAt: backup?.savedAt ?? null,
  };
}

/** The user's raw saved data, decoded from the `ft_<name>_<username>` backup keys. */
export function useUserData() {
  const { user } = useAuth();
  const username = user?.username ?? '';

  const query = useQuery({
    queryKey: queryKeys.backup(username),
    queryFn: portfolioApi.backup,
    enabled: !!username,
    staleTime: 60_000,
  });

  const data = useMemo(() => decodeUserData(query.data, username), [query.data, username]);

  return { ...query, userData: data };
}

/** Data names the app writes whole, from the cached copy (settings-style screens). */
export type WritableKey = 'app_config' | 'fire';

/**
 * Save one data key. The cache is updated optimistically and rolled back if the
 * server rejects the write; only that key is sent, so other devices' data is safe.
 */
export function useSaveUserData() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const username = user?.username ?? '';
  const cacheKey = queryKeys.backup(username);

  return useMutation({
    mutationFn: ({ name, value }: { name: WritableKey; value: unknown }) =>
      portfolioApi.saveKeys({ [`ft_${name}_${username}`]: value }),
    onMutate: async ({ name, value }) => {
      await queryClient.cancelQueries({ queryKey: cacheKey });
      const previous = queryClient.getQueryData<BackupResponse>(cacheKey);
      queryClient.setQueryData<BackupResponse>(cacheKey, old => ({
        savedAt: old?.savedAt ?? null,
        versions: old?.versions,
        data: { ...(old?.data ?? {}), [`ft_${name}_${username}`]: value },
      }));
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(cacheKey, ctx.previous);
    },
    onSuccess: res => {
      queryClient.setQueryData<BackupResponse>(cacheKey, old => (old ? { ...old, savedAt: res.savedAt } : old));
    },
  });
}

/** Builds the new values of the keys a change touches, from the latest server data. */
export type DataChange = (latest: UserData) => Partial<Record<DataName, unknown>>;

/**
 * Add / edit / delete records. Each change re-reads the server first and is
 * applied to that copy, so an edit made on the website meanwhile isn't lost;
 * only the keys the change returns are uploaded.
 */
export function useUpdateUserData() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const username = user?.username ?? '';
  const cacheKey = queryKeys.backup(username);

  const encode = (patch: Partial<Record<DataName, unknown>>) =>
    Object.fromEntries(Object.entries(patch).map(([name, value]) => [`ft_${name}_${username}`, value]));

  return useMutation({
    mutationFn: async (change: DataChange) => {
      const latest = await portfolioApi.backup();
      const payload = encode(change(decodeUserData(latest, username)));
      if (Object.keys(payload).length === 0) return latest;
      const res = await portfolioApi.saveKeys(payload);
      return { ...latest, savedAt: res.savedAt, data: { ...(latest.data ?? {}), ...payload } } as BackupResponse;
    },
    // Show the change straight away; the server copy replaces it once saved
    onMutate: async change => {
      await queryClient.cancelQueries({ queryKey: cacheKey });
      const previous = queryClient.getQueryData<BackupResponse>(cacheKey);
      if (previous) {
        const payload = encode(change(decodeUserData(previous, username)));
        queryClient.setQueryData<BackupResponse>(cacheKey, { ...previous, data: { ...(previous.data ?? {}), ...payload } });
      }
      return { previous };
    },
    onError: (_err, _change, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(cacheKey, ctx.previous);
    },
    onSuccess: next => {
      queryClient.setQueryData<BackupResponse>(cacheKey, next);
    },
  });
}

/** Modules switched off in the web app's Configuration page are hidden here too. */
export const isModuleEnabled = (config: AppConfig, tabId: string) => config.enabledTabs[tabId] !== false;

export function usePortfolio() {
  const queryClient = useQueryClient();
  const userQuery = useUserData();
  const { userData } = userQuery;

  const symbols = useMemo(
    () => [...new Set(userData.transactions.map(t => t.symbol.toUpperCase()))].sort(),
    [userData.transactions],
  );
  const schemeCodes = useMemo(() => [...new Set(userData.funds.map(f => f.schemeCode))].sort(), [userData.funds]);

  const quotesQuery = useQuery({
    queryKey: queryKeys.quotes(symbols),
    queryFn: () => portfolioApi.quotes(symbols),
    enabled: symbols.length > 0,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const navsQuery = useQuery({
    queryKey: queryKeys.navs(schemeCodes),
    queryFn: () => portfolioApi.mfNavs(schemeCodes),
    enabled: schemeCodes.length > 0,
    staleTime: 30 * 60_000,
  });

  const fxQuery = useQuery({ queryKey: queryKeys.usdInr, queryFn: portfolioApi.usdInr, staleTime: 30 * 60_000 });
  const usdInr = fxQuery.data ?? FALLBACK_USD_INR;

  const derived = useMemo(() => {
    const quotes = new Map<string, StockQuote>((quotesQuery.data ?? []).map(q => [q.symbol.toUpperCase(), q]));
    const navs = Object.fromEntries((navsQuery.data ?? []).map(n => [n.schemeCode, n.currentNAV]));
    const holdings = computeHoldings(userData.transactions, quotes);
    const funds = computeFunds(userData.funds, navs);
    const summary = summarize({
      holdings, funds,
      properties: userData.properties,
      investments: userData.investments,
      loans: userData.loans,
      cashUsd: userData.cashUsd,
      cashInr: userData.cashInr,
      usdInr,
    });
    return { holdings, funds, summary, navs };
  }, [quotesQuery.data, navsQuery.data, userData, usdInr]);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['backup'] });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['quotes'] }),
      queryClient.invalidateQueries({ queryKey: ['navs'] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.usdInr }),
    ]);
  }, [queryClient]);

  return {
    ...derived,
    userData,
    usdInr,
    isLoading: userQuery.isLoading,
    isRefreshing: userQuery.isRefetching || quotesQuery.isRefetching,
    quotesLoading: quotesQuery.isLoading && symbols.length > 0,
    error: userQuery.error,
    refresh,
  };
}
