import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ListRow } from '@/components/ListRow';
import { SegmentedControl } from '@/components/SegmentedControl';
import { StatGrid, StatTile } from '@/components/StatTile';
import { isModuleEnabled, usePortfolio } from '@/features/portfolio/usePortfolio';
import { money, percent, toneOf } from '@/lib/format';
import { colors, font } from '@/theme';
import type { Currency } from '@/types/models';

export default function EquityScreen() {
  const { holdings, userData, isLoading, isRefreshing, quotesLoading, error, refresh } = usePortfolio();
  const markets = ([
    { value: 'USD', label: 'US', module: 'equity' },
    { value: 'INR', label: 'India', module: 'india-equity' },
  ] as const).filter(m => isModuleEnabled(userData.config, m.module));
  const [market, setMarket] = useState<Currency>(markets[0]?.value ?? 'USD');

  const list = useMemo(() => holdings.filter(h => h.currency === market), [holdings, market]);
  const invested = list.reduce((s, h) => s + h.invested, 0);
  const value    = list.reduce((s, h) => s + (h.value ?? h.invested), 0);
  const pnl      = value - invested;
  const priced   = list.filter(h => h.dayChangePct !== null && h.value !== null);
  const dayPnl   = priced.reduce((s, h) => s + (h.value! - h.value! / (1 + h.dayChangePct! / 100)), 0);

  if (markets.length === 0) {
    return <Screen><EmptyState icon="eye-off-outline" title="Equity modules are turned off" message="Enable them in Configuration on the website." /></Screen>;
  }

  return (
    <Screen loading={isLoading} error={error} refreshing={isRefreshing} onRefresh={refresh}>
      {markets.length > 1 ? <SegmentedControl options={markets.map(m => ({ value: m.value, label: m.label }))} value={market} onChange={setMarket} /> : null}

      <StatGrid>
        <StatTile label="Current value" value={money(value, market)} sub={`${list.length} holdings`} />
        <StatTile label="Invested" value={money(invested, market)} />
        <StatTile label="Total P&L" value={money(pnl, market, { signed: true })} tone={toneOf(pnl)} badge={invested > 0 ? percent((pnl / invested) * 100) : undefined} />
        <StatTile label="Today" value={money(dayPnl, market, { signed: true })} tone={toneOf(dayPnl)} sub={quotesLoading ? 'Loading prices…' : 'Live prices'} />
      </StatGrid>

      <Card title="Holdings" padded={false}>
        {list.length === 0 ? (
          <EmptyState icon="trending-up-outline" title="No holdings yet" message="Add buy transactions on the website." />
        ) : list.map((h, i) => (
          <ListRow
            key={h.key}
            last={i === list.length - 1}
            title={h.symbol}
            subtitle={`${h.quantity.toLocaleString()} @ ${money(h.avgPrice, h.currency, { decimals: true })} · ${h.account}`}
            value={h.value !== null ? money(h.value, h.currency) : money(h.invested, h.currency)}
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
      <View />
    </Screen>
  );
}

const styles = StyleSheet.create({
  pnl: { fontSize: 13, fontWeight: '500' },
});
