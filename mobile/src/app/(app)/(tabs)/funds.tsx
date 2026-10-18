import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ListRow } from '@/components/ListRow';
import { Badge } from '@/components/Badge';
import { ActionBar } from '@/components/ActionBar';
import { StatGrid, StatTile } from '@/components/StatTile';
import { isModuleEnabled, usePortfolio } from '@/features/portfolio/usePortfolio';
import { AddFundSheet } from '@/features/funds/FundSheets';
import { formatDate, money, percent, toneOf } from '@/lib/format';
import { colors } from '@/theme';

export default function FundsScreen() {
  const { funds, userData, isLoading, isRefreshing, error, refresh } = usePortfolio();
  const [adding, setAdding] = useState(false);

  if (!isModuleEnabled(userData.config, 'india-mf')) {
    return <Screen><EmptyState icon="eye-off-outline" title="Mutual Funds is turned off" message="Enable it in Configuration." /></Screen>;
  }

  const invested = funds.reduce((s, f) => s + f.invested, 0);
  const value    = funds.reduce((s, f) => s + f.value, 0);
  const pnl      = value - invested;
  const schedules = userData.sipSchedules;
  const openFund = (id: string) => router.push({ pathname: '/fund/[id]', params: { id } });

  return (
    <Screen loading={isLoading} error={error} refreshing={isRefreshing} onRefresh={refresh}>
      <ActionBar actions={[{ label: 'Add fund', icon: 'add-circle-outline', primary: true, onPress: () => setAdding(true) }]} />

      <StatGrid>
        <StatTile label="Current value" value={money(value)} sub={`${funds.length} funds`} />
        <StatTile label="Invested" value={money(invested)} />
        <StatTile label="Total gain" value={money(pnl, 'INR', { signed: true })} tone={toneOf(pnl)} badge={invested > 0 ? percent((pnl / invested) * 100) : undefined} />
      </StatGrid>

      <Card title="Funds" subtitle="Latest NAV from AMFI · tap a fund for transactions and SIPs" padded={false}>
        {funds.length === 0 ? (
          <EmptyState icon="bar-chart-outline" title="No mutual funds yet" message="Tap Add fund to search and add one." />
        ) : funds.map((f, i) => (
          <ListRow
            key={f.id}
            last={i === funds.length - 1}
            title={f.name}
            subtitle={`${f.units.toFixed(3)} units${f.nav !== null ? ` · NAV ₹${f.nav.toFixed(2)}` : ''}`}
            value={money(f.value)}
            valueSub={<Text style={[styles.pnl, { color: f.pnl >= 0 ? colors.positive : colors.negative }]}>{percent(f.pnlPct)}</Text>}
            onPress={() => openFund(f.id)}
          />
        ))}
      </Card>

      {schedules.length > 0 ? (
        <Card title="SIP schedules" subtitle="Instalments are added automatically on each due date" padded={false}>
          {schedules.map((s, i) => (
            <ListRow key={s.id} last={i === schedules.length - 1}
              title={s.fundName}
              subtitle={`${money(s.amount)} ${s.frequency} · next ${s.active ? formatDate(s.nextDueDate) : '—'}`}
              valueSub={<Badge label={s.active ? 'Active' : s.nextDueDate > s.endDate ? 'Completed' : 'Paused'} tone={s.active ? 'positive' : 'neutral'} />}
              onPress={() => openFund(s.fundId)} />
          ))}
        </Card>
      ) : null}

      {adding ? <AddFundSheet onClose={() => setAdding(false)} onAdded={openFund} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({ pnl: { fontSize: 13, fontWeight: '500' } });
