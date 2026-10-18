import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { StatGrid, StatTile } from '@/components/StatTile';
import { Badge } from '@/components/Badge';
import { Banner } from '@/components/Banner';
import { ActionBar, HeaderButton } from '@/components/ActionBar';
import { SegmentedControl } from '@/components/SegmentedControl';
import { usePortfolio, useUpdateUserData } from '@/features/portfolio/usePortfolio';
import { ObligationSheet } from '@/features/expenses/ObligationSheet';
import { OBLIGATION_TYPES, TYPE_COLORS, copyFromPrevious, toggleStatus, totalsByCurrency } from '@/features/expenses/expenses';
import { monthKeyOf, monthLabel, shiftMonth } from '@/lib/dates';
import { formatDate, money } from '@/lib/format';
import { colors, spacing } from '@/theme';
import type { MonthlyObligation, PaymentStatus } from '@/types/models';

export default function ExpensesScreen() {
  const { userData, isRefreshing, refresh } = usePortfolio();
  const update = useUpdateUserData();
  const [month, setMonth] = useState(() => monthKeyOf(new Date().getFullYear(), new Date().getMonth()));
  const [filter, setFilter] = useState<'All' | PaymentStatus>('All');
  const [sheet, setSheet] = useState<{ item?: MonthlyObligation } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const items = useMemo(() => userData.expenses[month] ?? [], [userData.expenses, month]);
  const shown = useMemo(() => {
    const order = (o: MonthlyObligation) => OBLIGATION_TYPES.indexOf(o.type);
    return (filter === 'All' ? items : items.filter(o => o.status === filter)).slice().sort((a, b) => order(a) - order(b));
  }, [items, filter]);
  const totals = totalsByCurrency(items);
  const paidCount = items.filter(o => o.status === 'Paid').length;

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 4000); };

  const copyPrev = () => {
    const prev = shiftMonth(month, -1);
    const prevItems = userData.expenses[prev] ?? [];
    if (prevItems.length === 0) { Alert.alert('Nothing to copy', `No obligations found in ${monthLabel(prev)}.`); return; }
    const run = () => update.mutate(latest => ({ monthly_expenses: copyFromPrevious(latest.expenses, month, prev) }));
    if (items.length === 0) { run(); return; }
    Alert.alert('Copy from previous month?', `This will append ${prevItems.length} obligation(s) from ${monthLabel(prev)} to ${monthLabel(month)}.`, [
      { text: 'Cancel', style: 'cancel' }, { text: 'Copy', onPress: run },
    ]);
  };

  const toggle = (o: MonthlyObligation) => update.mutate(latest => ({ monthly_expenses: toggleStatus(latest.expenses, month, o.id) }));

  return (
    <Screen refreshing={isRefreshing} onRefresh={refresh}>
      <Stack.Screen options={{ headerRight: () => <HeaderButton icon="add-circle" label="Add obligation" onPress={() => setSheet({})} /> }} />
      <View style={styles.monthNav}>
        <Pressable onPress={() => setMonth(m => shiftMonth(m, -1))} hitSlop={12} accessibilityLabel="Previous month">
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={styles.month}>{monthLabel(month)}</Text>
        <Pressable onPress={() => setMonth(m => shiftMonth(m, 1))} hitSlop={12} accessibilityLabel="Next month">
          <Ionicons name="chevron-forward" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <ActionBar actions={[
        { label: 'Add', icon: 'add-circle-outline', primary: true, onPress: () => setSheet({}) },
        { label: 'Copy last month', icon: 'copy-outline', onPress: copyPrev, disabled: update.isPending },
      ]} />
      {toast ? <Banner tone="positive" message={toast} /> : null}
      {update.error ? <Banner tone="negative" message={`Couldn't save: ${update.error.message}`} /> : null}

      <StatGrid>
        {totals.INR.count > 0 || totals.USD.count === 0 ? <>
          <StatTile label="Total due" value={money(totals.INR.total)} sub={`${items.length} obligations · ${paidCount} paid`} />
          <StatTile label="Unpaid" value={money(totals.INR.unpaid)} tone={totals.INR.unpaid > 0 ? 'negative' : 'positive'} sub={`Paid ${money(totals.INR.paid)}`} />
        </> : null}
        {totals.USD.count > 0 ? <>
          <StatTile label="Total due (USD)" value={money(totals.USD.total, 'USD')} sub={`${totals.USD.count} in USD`} />
          <StatTile label="Unpaid (USD)" value={money(totals.USD.unpaid, 'USD')} tone={totals.USD.unpaid > 0 ? 'negative' : 'positive'} sub={`Paid ${money(totals.USD.paid, 'USD')}`} />
        </> : null}
      </StatGrid>

      <SegmentedControl options={[{ value: 'All', label: 'All' }, { value: 'Unpaid', label: 'Unpaid' }, { value: 'Paid', label: 'Paid' }]} value={filter} onChange={setFilter} />

      <Card title="Obligations" subtitle="Tap the circle to mark paid · tap a row to edit" padded={false}>
        {shown.length === 0 ? <EmptyState icon="receipt-outline" title={items.length ? `No ${filter.toLowerCase()} obligations` : `Nothing recorded for ${monthLabel(month)}`} /> :
          shown.map((o, i) => (
            <View key={o.id} style={[styles.row, i < shown.length - 1 && styles.divider]}>
              <Pressable onPress={() => toggle(o)} hitSlop={8} accessibilityRole="checkbox" accessibilityState={{ checked: o.status === 'Paid' }}
                accessibilityLabel={`Mark ${o.note || o.type} as ${o.status === 'Paid' ? 'unpaid' : 'paid'}`}>
                <Ionicons name={o.status === 'Paid' ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={o.status === 'Paid' ? colors.positive : colors.textSubtle} />
              </Pressable>
              <Pressable style={styles.body} onPress={() => setSheet({ item: o })} accessibilityRole="button" android_ripple={{ color: '#E2E8F0' }}>
                <View style={styles.main}>
                  <Text style={styles.title} numberOfLines={1}>{o.note || o.type}</Text>
                  <View style={styles.meta}>
                    <View style={[styles.typeDot, { backgroundColor: TYPE_COLORS[o.type] }]} />
                    <Text style={styles.subtitle} numberOfLines={1}>
                      {o.type}{o.recurrence ? ' · ↻' : ''}{o.status === 'Paid' ? (o.paidDate ? ` · paid ${formatDate(o.paidDate)}` : '') : o.dueDate ? ` · due ${formatDate(o.dueDate)}` : ''}
                    </Text>
                  </View>
                </View>
                <View style={styles.trailing}>
                  <Text style={styles.value}>{money(o.amount, o.currency ?? 'INR')}</Text>
                  <Badge label={o.status} tone={o.status === 'Paid' ? 'positive' : 'warning'} />
                </View>
              </Pressable>
            </View>
          ))}
      </Card>

      {sheet ? <ObligationSheet month={month} initial={sheet.item} onClose={() => setSheet(null)} onMoved={showToast} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm },
  month:    { fontSize: 17, fontWeight: '600', color: colors.text },
  row:      { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingLeft: spacing.lg, minHeight: 60 },
  divider:  { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  body:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingRight: spacing.lg },
  main:     { flex: 1, gap: 2 },
  meta:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeDot:  { width: 8, height: 8, borderRadius: 4 },
  title:    { fontSize: 15, fontWeight: '500', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, flexShrink: 1 },
  trailing: { alignItems: 'flex-end', gap: 4 },
  value:    { fontSize: 15, fontWeight: '600', color: colors.text },
});
