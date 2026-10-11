import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ListRow } from '@/components/ListRow';
import { StatGrid, StatTile } from '@/components/StatTile';
import { Badge } from '@/components/Badge';
import { usePortfolio } from '@/features/portfolio/usePortfolio';
import { formatDate, money } from '@/lib/format';
import { colors, spacing } from '@/theme';

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const shiftMonth = (key: string, delta: number) => {
  const [y, m] = key.split('-').map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
};
const monthLabel = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

export default function ExpensesScreen() {
  const { userData, usdInr, isRefreshing, refresh } = usePortfolio();
  const [month, setMonth] = useState(() => monthKey(new Date()));

  const items = useMemo(() => userData.expenses[month] ?? [], [userData.expenses, month]);
  const totals = useMemo(() => {
    const inr = (amount: number, currency: 'INR' | 'USD') => (currency === 'USD' ? amount * usdInr : amount);
    const total = items.reduce((s, o) => s + inr(o.amount, o.currency), 0);
    const paid  = items.filter(o => o.status === 'Paid').reduce((s, o) => s + inr(o.amount, o.currency), 0);
    return { total, paid, unpaid: total - paid };
  }, [items, usdInr]);

  return (
    <Screen refreshing={isRefreshing} onRefresh={refresh}>
      <View style={styles.monthNav}>
        <Pressable onPress={() => setMonth(m => shiftMonth(m, -1))} hitSlop={12} accessibilityLabel="Previous month">
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={styles.month}>{monthLabel(month)}</Text>
        <Pressable onPress={() => setMonth(m => shiftMonth(m, 1))} hitSlop={12} accessibilityLabel="Next month">
          <Ionicons name="chevron-forward" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <StatGrid>
        <StatTile label="Total due" value={money(totals.total)} sub={`${items.length} obligations`} />
        <StatTile label="Unpaid" value={money(totals.unpaid)} tone={totals.unpaid > 0 ? 'negative' : 'positive'} />
      </StatGrid>

      <Card title="Obligations" padded={false}>
        {items.length === 0 ? <EmptyState icon="receipt-outline" title={`Nothing recorded for ${monthLabel(month)}`} /> :
          items.map((o, i) => (
            <ListRow key={o.id} last={i === items.length - 1}
              title={o.note || o.type}
              subtitle={`${o.type}${o.dueDate ? ` · due ${formatDate(o.dueDate)}` : ''}`}
              value={money(o.amount, o.currency)}
              valueSub={<Badge label={o.status} tone={o.status === 'Paid' ? 'positive' : 'warning'} />} />
          ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm },
  month:    { fontSize: 17, fontWeight: '600', color: colors.text },
});
