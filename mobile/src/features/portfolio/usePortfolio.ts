import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { portfolioApi } from '@/api/portfolio';
import { useAuth } from '@/auth/AuthProvider';
import type {
  AdditionalInvestment, AppConfig, BackupResponse, FIREInputs, LoanInvestment, MFHolding, MonthlyExpenses, RealEstateProperty, StockQuote, Transaction,
} from '@/types/models';
import { computeFunds, computeHoldings, summarize } from './calculations';

const FALLBACK_USD_INR = 84;

export const queryKeys = {
  backup: (user: string) => ['backup', user] as const,
  quotes: (symbols: string[]) => ['quotes', ...symbols] as const,
  navs:   (codes: string[]) => ['navs', ...codes] as const,
  usdInr: ['fx', 'usd-inr'] as const,
};

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

  const data = useMemo(() => {
    const raw = query.data?.data ?? {};
    const get = <T,>(name: string, fallback: T): T => (raw[`ft_${name}_${username}`] as T | undefined) ?? fallback;
    const config = get<Partial<AppConfig>>('app_config', {});
    return {
      transactions: get<Transaction[]>('transactions', []),
      cashUsd:      get<Record<string, number>>('cash_usd', {}),
      cashInr:      get<Record<string, number>>('cash_inr', {}),
      funds:        get<MFHolding[]>('mf', []),
      properties:   get<RealEstateProperty[]>('realestate', []),
      investments:  get<AdditionalInvestment[]>('investments', []),
      loans:        get<LoanInvestment[]>('loans', []),
      expenses:     get<MonthlyExpenses>('monthly_expenses', {}),
      fire:         get<FIREInputs | null>('fire', null),
      config: {
        dematAccounts: config.dematAccounts ?? [],
        enabledTabs:   config.enabledTabs ?? {},
      } as AppConfig,
      savedAt: query.data?.savedAt ?? null,
    };
  }, [query.data, username]);

  return { ...query, userData: data };
}

/** Data names the app can write, mapped to the `ft_<name>_<username>` keys. */
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
    return { holdings, funds, summary };
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
