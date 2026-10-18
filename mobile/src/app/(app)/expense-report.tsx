import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { DonutChart } from '@/components/DonutChart';
import { EmptyState } from '@/components/EmptyState';
import { StatGrid, StatTile } from '@/components/StatTile';
import { ChipSelect } from '@/components/form/ChipSelect';
import { usePortfolio } from '@/features/portfolio/usePortfolio';
import { OBLIGATION_TYPES, TYPE_COLORS } from '@/features/expenses/expenses';
import { monthKeyOf } from '@/lib/dates';
import { money } from '@/lib/format';
import { colors, font, spacing } from '@/theme';
import type { MonthlyObligation } from '@/types/models';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const sum = (list: MonthlyObligation[]) => list.reduce((s, o) => s + o.amount, 0);
const short = (n: number) => (n >= 1_00_000 ? `₹${(n / 1_00_000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}K` : `₹${Math.round(n)}`);

// Same figures as the web's Monthly Expense Summary (amounts summed as entered)
export default function ExpenseReportScreen() {
  const { userData, isRefreshing, refresh } = usePortfolio();
  const all = userData.expenses;
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState<number | 'all'>(now.getMonth());

  const years = useMemo(() => {
    const set = new Set<number>([now.getFullYear()]);
    Object.keys(all).forEach(k => { const y = parseInt(k.split('-')[0], 10); if (!isNaN(y)) set.add(y); });
    return [...set].sort((a, b) => b - a);
  }, [all]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = useMemo(() => month === 'all'
    ? MONTHS.flatMap((_, m) => all[monthKeyOf(year, m)] ?? [])
    : all[monthKeyOf(year, month)] ?? [], [all, year, month]);

  const total = sum(items);
  const paid = sum(items.filter(o => o.status === 'Paid'));
  const paidCount = items.filter(o => o.status === 'Paid').length;
  const completion = items.length > 0 ? Math.round((paidCount / items.length) * 100) : 0;

  const byType = OBLIGATION_TYPES.map(type => {
    const list = items.filter(o => o.type === type);
    return { type, count: list.length, total: sum(list), paid: sum(list.filter(o => o.status === 'Paid')) };
  }).filter(t => t.total > 0);

  const bars = MONTHS.map((label, m) => {
    const obs = all[monthKeyOf(year, m)] ?? [];
    return { label, m, paid: sum(obs.filter(o => o.status === 'Paid')), unpaid: sum(obs.filter(o => o.status === 'Unpaid')) };
  });
  const barMax = Math.max(...bars.map(b => b.paid + b.unpaid), 1);

  return (
    <Screen refreshing={isRefreshing} onRefresh={refresh}>
      <ChipSelect value={String(year)} onChange={v => setYear(Number(v))} options={years.map(y => ({ value: String(y), label: String(y) }))} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <ChipSelect value={String(month)} onChange={v => setMonth(v === 'all' ? 'all' : Number(v))}
          options={[{ value: 'all', label: 'Full year' }, ...MONTHS.map((l, m) => ({ value: String(m), label: l }))]} />
      </ScrollView>

      <StatGrid>
        <StatTile label="Total" value={money(total)} sub={`${items.length} obligations`} />
        <StatTile label="Paid" value={money(paid)} tone="positive" sub={`${paidCount} paid`} />
        <StatTile label="Unpaid" value={money(total - paid)} tone={total - paid > 0 ? 'negative' : 'neutral'} sub={`${items.length - paidCount} pending`} />
        <StatTile label="Completion" value={`${completion}%`} tone={completion === 100 ? 'positive' : 'neutral'} sub="Obligations paid" />
      </StatGrid>

      <Card title="By type">
        {byType.length === 0 ? <EmptyState icon="pie-chart-outline" title="No expenses in this period" /> : (
          <>
            <View style={styles.center}>
              <DonutChart size={170} stroke={26} centerLabel="Total" centerValue={short(total)}
                segments={byType.map(t => ({ key: t.type, value: t.total, color: TYPE_COLORS[t.type] }))} />
            </View>
            <View style={styles.legend}>
              {byType.map(t => (
                <View key={t.type} style={styles.legendRow}>
                  <View style={[styles.dot, { backgroundColor: TYPE_COLORS[t.type] }]} />
                  <View style={styles.flex}>
                    <Text style={styles.label}>{t.type}</Text>
                    <Text style={font.caption}>{t.count} · paid {money(t.paid)}</Text>
                  </View>
                  <View style={styles.right}>
                    <Text style={styles.value}>{money(t.total)}</Text>
                    <Text style={font.caption}>{((t.total / total) * 100).toFixed(1)}%</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </Card>

      <Card title={`Monthly trend ${year}`} subtitle="Paid (green) and unpaid (amber)">
        <View style={styles.chart}>
          {bars.map(b => {
            const h = 140;
            const selected = month === b.m;
            return (
              <View key={b.label} style={styles.barCol}>
                <View style={[styles.barTrack, { height: h }]}>
                  <View style={{ height: (b.unpaid / barMax) * h, backgroundColor: '#F59E0B', borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />
                  <View style={{ height: (b.paid / barMax) * h, backgroundColor: colors.positive }} />
                </View>
                <Text style={[styles.barLabel, selected && styles.barSelected]}>{b.label[0]}</Text>
              </View>
            );
          })}
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex:      { flex: 1 },
  center:    { alignItems: 'center', marginBottom: spacing.lg },
  legend:    { gap: spacing.md },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dot:       { width: 10, height: 10, borderRadius: 5 },
  label:     { fontSize: 14, fontWeight: '500', color: colors.text },
  right:     { alignItems: 'flex-end' },
  value:     { fontSize: 14, fontWeight: '600', color: colors.text },
  chart:     { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  barCol:    { flex: 1, alignItems: 'center', gap: 4 },
  barTrack:  { width: '100%', justifyContent: 'flex-end' },
  barLabel:  { fontSize: 11, color: colors.textSubtle },
  barSelected: { color: colors.primary, fontWeight: '700' },
});
