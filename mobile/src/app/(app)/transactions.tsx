import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ListRow } from '@/components/ListRow';
import { Badge } from '@/components/Badge';
import { SegmentedControl } from '@/components/SegmentedControl';
import { usePortfolio } from '@/features/portfolio/usePortfolio';
import { TransactionSheet } from '@/features/equity/EquitySheets';
import { formatDate, money } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';
import type { Currency, Transaction } from '@/types/models';

type TypeFilter = 'all' | 'buy' | 'sell';

export default function TransactionsScreen() {
  const { currency } = useLocalSearchParams<{ currency?: Currency }>();
  const { userData, isLoading, isRefreshing, error, refresh } = usePortfolio();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<TypeFilter>('all');
  const [editing, setEditing] = useState<Transaction | null>(null);

  const list = useMemo(() => {
    const q = search.trim().toUpperCase();
    return userData.transactions
      .filter(t => !currency || t.currency === currency)
      .filter(t => type === 'all' || t.type === type)
      .filter(t => !q || t.symbol.toUpperCase().includes(q) || t.dematAccount.toUpperCase().includes(q))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [userData.transactions, currency, type, search]);

  return (
    <Screen loading={isLoading} error={error} refreshing={isRefreshing} onRefresh={refresh}>
      <Stack.Screen options={{ title: currency === 'INR' ? 'India Transactions' : currency === 'USD' ? 'US Transactions' : 'Transactions' }} />
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.textSubtle} />
        <TextInput value={search} onChangeText={setSearch} placeholder="Filter by symbol or account…" placeholderTextColor={colors.textSubtle}
          style={styles.input} autoCapitalize="characters" autoCorrect={false} />
      </View>
      <SegmentedControl options={[{ value: 'all', label: 'All' }, { value: 'buy', label: 'Buy' }, { value: 'sell', label: 'Sell' }]} value={type} onChange={setType} />

      <Card title={`${list.length} transaction${list.length === 1 ? '' : 's'}`} subtitle="Tap to edit or delete" padded={false}>
        {list.length === 0 ? <EmptyState icon="list-outline" title="No transactions" /> : list.map((t, i) => (
          <ListRow key={t.id} last={i === list.length - 1}
            title={t.symbol}
            subtitle={`${formatDate(t.date)} · ${t.quantity.toLocaleString()} @ ${money(t.price, t.currency, { decimals: true })} · ${t.dematAccount || '—'}`}
            value={money(t.quantity * t.price, t.currency, { decimals: true })}
            valueSub={<Badge label={t.type === 'buy' ? 'Buy' : 'Sell'} tone={t.type === 'buy' ? 'positive' : 'negative'} />}
            onPress={() => setEditing(t)} />
        ))}
      </Card>
      <Text style={styles.note}>Import from Excel and export are available on the website.</Text>

      {editing ? <TransactionSheet tx={editing} onClose={() => setEditing(null)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, minHeight: 44 },
  input:  { flex: 1, fontSize: 15, color: colors.text },
  note:   { fontSize: 12, color: colors.textSubtle, textAlign: 'center' },
});
