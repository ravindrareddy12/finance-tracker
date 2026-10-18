import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ListRow } from '@/components/ListRow';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { ActionBar } from '@/components/ActionBar';
import { StatGrid, StatTile } from '@/components/StatTile';
import { usePortfolio, useUpdateUserData } from '@/features/portfolio/usePortfolio';
import { FutureSIPSheet, HistoricalSIPSheet, MFTransactionSheet } from '@/features/funds/FundSheets';
import { computeXIRR } from '@/lib/xirr';
import { confirmDestructive } from '@/lib/forms';
import { formatDate, money, percent, toneOf } from '@/lib/format';
import { spacing } from '@/theme';
import type { MFTransaction, SIPSchedule } from '@/types/models';

type SheetState = { kind: 'tx'; tx?: MFTransaction } | { kind: 'sip' } | { kind: 'future'; schedule?: SIPSchedule } | null;

export default function FundScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userData, funds, navs, isLoading, isRefreshing, refresh } = usePortfolio();
  const update = useUpdateUserData();
  const [sheet, setSheet] = useState<SheetState>(null);

  const fund = userData.funds.find(f => f.id === id);
  const position = funds.find(f => f.id === id);
  const schedules = userData.sipSchedules.filter(s => s.fundId === id);
  const nav = fund ? navs[fund.schemeCode] ?? null : null;

  const txs = useMemo(() => [...(fund?.transactions ?? [])].sort((a, b) => b.date.localeCompare(a.date)), [fund]);
  const xirr = useMemo(() => {
    if (!fund || !position || nav === null || fund.transactions.length === 0) return null;
    return computeXIRR([
      ...fund.transactions.map(t => ({ amount: t.type === 'buy' ? -t.amount : t.amount, date: new Date(t.date) })),
      { amount: position.value, date: new Date() },
    ]);
  }, [fund, position, nav]);

  if (!fund || !position) {
    return <Screen loading={isLoading}><EmptyState icon="bar-chart-outline" title="Fund not found" message="It may have been deleted on another device." /></Screen>;
  }

  const avgNav = position.units > 0 ? position.invested / position.units : null;
  const deleteFund = () => confirmDestructive('Delete fund?', `${fund.fundName} and all its transactions will be removed.`, 'Delete',
    () => update.mutate(latest => ({ mf: latest.funds.filter(f => f.id !== fund.id) }), { onSuccess: () => router.back() }));

  return (
    <Screen refreshing={isRefreshing} onRefresh={refresh}>
      <Stack.Screen options={{ title: fund.fundName }} />
      <ActionBar actions={[
        { label: 'Transaction', icon: 'add-circle-outline', primary: true, onPress: () => setSheet({ kind: 'tx' }) },
        { label: 'Historical SIP', icon: 'calendar-outline', onPress: () => setSheet({ kind: 'sip' }) },
        { label: 'Future SIP', icon: 'timer-outline', onPress: () => setSheet({ kind: 'future' }) },
      ]} />

      <StatGrid>
        <StatTile label="Current value" value={money(position.value)} sub={nav !== null ? `NAV ₹${nav}` : 'NAV unavailable'} />
        <StatTile label="Invested" value={money(position.invested)} sub={`${position.units.toFixed(3)} units`} />
        <StatTile label="Gain" value={money(position.pnl, 'INR', { signed: true })} tone={toneOf(position.pnl)} badge={percent(position.pnlPct)} />
        <StatTile label="XIRR" value={xirr !== null ? percent(xirr) : '—'} tone={xirr !== null ? toneOf(xirr) : 'neutral'}
          sub={avgNav !== null ? `Avg NAV ₹${avgNav.toFixed(4)}` : undefined} />
      </StatGrid>

      {schedules.length > 0 ? (
        <Card title="SIP schedules" subtitle="Tap to edit, pause or remove" padded={false}>
          {schedules.map((s, i) => (
            <ListRow key={s.id} last={i === schedules.length - 1}
              title={`${money(s.amount)} ${s.frequency}`}
              subtitle={`${formatDate(s.startDate)} → ${formatDate(s.endDate)}${s.active ? ` · next ${formatDate(s.nextDueDate)}` : ''}`}
              valueSub={<Badge label={s.active ? 'Active' : s.nextDueDate > s.endDate ? 'Completed' : 'Paused'} tone={s.active ? 'positive' : 'neutral'} />}
              onPress={() => setSheet({ kind: 'future', schedule: s })} />
          ))}
        </Card>
      ) : null}

      <Card title="Transactions" subtitle="Tap to edit or delete" padded={false}>
        {txs.length === 0 ? <EmptyState icon="receipt-outline" title="No transactions" /> : txs.map((t, i) => (
          <ListRow key={t.id} last={i === txs.length - 1}
            title={formatDate(t.date)}
            subtitle={`${t.units.toFixed(3)} units @ ₹${t.nav}${t.notes ? ` · ${t.notes}` : ''}`}
            value={money(t.amount, 'INR', { decimals: true })}
            valueSub={<Badge label={t.type === 'buy' ? 'Buy' : 'Sell'} tone={t.type === 'buy' ? 'positive' : 'negative'} />}
            onPress={() => setSheet({ kind: 'tx', tx: t })} />
        ))}
      </Card>

      <View style={styles.delete}>
        <Button title="Delete fund" variant="danger" onPress={deleteFund} loading={update.isPending} />
      </View>

      {sheet?.kind === 'tx' ? <MFTransactionSheet fund={fund} currentNav={nav} initial={sheet.tx} onClose={() => setSheet(null)} /> : null}
      {sheet?.kind === 'sip' ? <HistoricalSIPSheet fund={fund} onClose={() => setSheet(null)} /> : null}
      {sheet?.kind === 'future' ? <FutureSIPSheet fund={fund} initial={sheet.schedule} onClose={() => setSheet(null)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({ delete: { marginTop: spacing.sm } });
