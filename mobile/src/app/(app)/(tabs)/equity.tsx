import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ListRow } from '@/components/ListRow';
import { ActionBar } from '@/components/ActionBar';
import { SegmentedControl } from '@/components/SegmentedControl';
import { StatGrid, StatTile } from '@/components/StatTile';
import { isModuleEnabled, usePortfolio } from '@/features/portfolio/usePortfolio';
import { BuySheet, CashSheet, SellSheet } from '@/features/equity/EquitySheets';
import { cashOf } from '@/features/equity/cash';
import { accountColor } from '@/features/config/modules';
import type { EquityHolding } from '@/features/portfolio/calculations';
import { money, percent, toneOf } from '@/lib/format';
import { colors, font } from '@/theme';
import type { Currency } from '@/types/models';

type SheetState =
  | { kind: 'buy' | 'sell'; symbol?: string; account?: string }
  | { kind: 'cash'; account?: string }
  | null;

export default function EquityScreen() {
  const { holdings, userData, isLoading, isRefreshing, quotesLoading, error, refresh } = usePortfolio();
  const markets = ([
    { value: 'USD', label: 'US', module: 'equity' },
    { value: 'INR', label: 'India', module: 'india-equity' },
  ] as const).filter(m => isModuleEnabled(userData.config, m.module));
  const [market, setMarket] = useState<Currency>(markets[0]?.value ?? 'USD');
  const [sheet, setSheet] = useState<SheetState>(null);

  const list = useMemo(() => holdings.filter(h => h.currency === market), [holdings, market]);
  const invested = list.reduce((s, h) => s + h.invested, 0);
  const value    = list.reduce((s, h) => s + (h.value ?? h.invested), 0);
  const pnl      = value - invested;
  const priced   = list.filter(h => h.dayChangePct !== null && h.value !== null);
  const dayPnl   = priced.reduce((s, h) => s + (h.value! - h.value! / (1 + h.dayChangePct! / 100)), 0);

  const accounts = userData.config.dematAccounts;
  const balances = cashOf(userData, market);
  const cashTotal = accounts.reduce((s, a) => s + (balances[a] ?? 0), 0);

  if (markets.length === 0) {
    return <Screen><EmptyState icon="eye-off-outline" title="Equity modules are turned off" message="Enable them in Configuration." /></Screen>;
  }

  const openHolding = (h: EquityHolding) =>
    Alert.alert(h.symbol, `${h.quantity.toLocaleString()} shares · ${h.account}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Buy more', onPress: () => setSheet({ kind: 'buy', symbol: h.symbol, account: h.account }) },
      { text: 'Sell', onPress: () => setSheet({ kind: 'sell', symbol: h.symbol, account: h.account }) },
    ]);

  return (
    <Screen loading={isLoading} error={error} refreshing={isRefreshing} onRefresh={refresh}>
      {markets.length > 1 ? <SegmentedControl options={markets.map(m => ({ value: m.value, label: m.label }))} value={market} onChange={setMarket} /> : null}

      <ActionBar actions={[
        { label: 'Buy', icon: 'add-circle-outline', primary: true, onPress: () => setSheet({ kind: 'buy' }) },
        { label: 'Sell', icon: 'remove-circle-outline', onPress: () => setSheet({ kind: 'sell' }) },
        { label: 'Cash', icon: 'wallet-outline', onPress: () => setSheet({ kind: 'cash' }) },
        { label: 'Transactions', icon: 'list-outline', onPress: () => router.push({ pathname: '/transactions', params: { currency: market } }) },
      ]} />

      <StatGrid>
        <StatTile label="Current value" value={money(value, market)} sub={`${list.length} holdings`} />
        <StatTile label="Invested" value={money(invested, market)} />
        <StatTile label="Total P&L" value={money(pnl, market, { signed: true })} tone={toneOf(pnl)} badge={invested > 0 ? percent((pnl / invested) * 100) : undefined} />
        <StatTile label="Today" value={money(dayPnl, market, { signed: true })} tone={toneOf(dayPnl)} sub={quotesLoading ? 'Loading prices…' : 'Live prices'} />
      </StatGrid>

      <Card title="Cash balances" subtitle={`Total ${money(cashTotal, market, { decimals: true })} · tap an account to update`} padded={false}>
        {accounts.length === 0 ? (
          <EmptyState icon="wallet-outline" title="No account holders" message="Add one in Configuration to track cash." />
        ) : accounts.map((a, i) => (
          <ListRow key={a} last={i === accounts.length - 1} title={a}
            leading={<View style={[styles.dot, { backgroundColor: accountColor(i) }]} />}
            value={money(balances[a] ?? 0, market, { decimals: true })}
            onPress={() => setSheet({ kind: 'cash', account: a })} />
        ))}
      </Card>

      <Card title="Holdings" subtitle="Tap a holding to buy more or sell" padded={false}>
        {list.length === 0 ? (
          <EmptyState icon="trending-up-outline" title="No holdings yet" message="Tap Buy to add your first transaction." />
        ) : list.map((h, i) => (
          <ListRow
            key={h.key}
            last={i === list.length - 1}
            title={h.symbol}
            subtitle={`${h.quantity.toLocaleString()} @ ${money(h.avgPrice, h.currency, { decimals: true })} · ${h.account}`}
            value={h.value !== null ? money(h.value, h.currency) : money(h.invested, h.currency)}
            onPress={() => openHolding(h)}
            valueSub={
              h.pnlPct !== null ? (
                <Text style={[styles.pnl, { color: h.pnlPct >= 0 ? colors.positive : colors.negative }]}>
                  {money(h.pnl ?? 0, h.currency, { signed: true })} ({percent(h.pnlPct)})
                </Text>
              ) : <Text style={font.caption}>No live price</Text>
            }
          />
        ))}
      </Card>

      {sheet?.kind === 'buy' ? <BuySheet defaultCurrency={market} defaultSymbol={sheet.symbol} defaultAccount={sheet.account} onClose={() => setSheet(null)} /> : null}
      {sheet?.kind === 'sell' ? <SellSheet defaultCurrency={market} defaultSymbol={sheet.symbol} defaultAccount={sheet.account} onClose={() => setSheet(null)} /> : null}
      {sheet?.kind === 'cash' ? <CashSheet currency={market} defaultAccount={sheet.account} onClose={() => setSheet(null)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pnl: { fontSize: 13, fontWeight: '500' },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
