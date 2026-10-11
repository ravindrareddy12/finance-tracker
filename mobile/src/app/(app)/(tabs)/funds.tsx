import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ListRow } from '@/components/ListRow';
import { StatGrid, StatTile } from '@/components/StatTile';
import { isModuleEnabled, usePortfolio } from '@/features/portfolio/usePortfolio';
import { money, percent, toneOf } from '@/lib/format';
import { colors } from '@/theme';

export default function FundsScreen() {
  const { funds, userData, isLoading, isRefreshing, error, refresh } = usePortfolio();

  if (!isModuleEnabled(userData.config, 'india-mf')) {
    return <Screen><EmptyState icon="eye-off-outline" title="Mutual Funds is turned off" message="Enable it in Configuration on the website." /></Screen>;
  }

  const invested = funds.reduce((s, f) => s + f.invested, 0);
  const value    = funds.reduce((s, f) => s + f.value, 0);
  const pnl      = value - invested;

  return (
    <Screen loading={isLoading} error={error} refreshing={isRefreshing} onRefresh={refresh}>
      <StatGrid>
        <StatTile label="Current value" value={money(value)} sub={`${funds.length} funds`} />
        <StatTile label="Invested" value={money(invested)} />
        <StatTile label="Total gain" value={money(pnl, 'INR', { signed: true })} tone={toneOf(pnl)} badge={invested > 0 ? percent((pnl / invested) * 100) : undefined} />
      </StatGrid>

      <Card title="Funds" subtitle="Latest NAV from AMFI" padded={false}>
        {funds.length === 0 ? (
          <EmptyState icon="bar-chart-outline" title="No mutual funds yet" message="Add funds on the website." />
        ) : funds.map((f, i) => (
          <ListRow
            key={f.id}
            last={i === funds.length - 1}
            title={f.name}
            subtitle={`${f.units.toFixed(3)} units${f.nav !== null ? ` · NAV ₹${f.nav.toFixed(2)}` : ''}`}
            value={money(f.value)}
            valueSub={<Text style={[styles.pnl, { color: f.pnl >= 0 ? colors.positive : colors.negative }]}>{percent(f.pnlPct)}</Text>}
          />
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({ pnl: { fontSize: 13, fontWeight: '500' } });
