import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { DonutChart } from '@/components/DonutChart';
import { SegmentedControl } from '@/components/SegmentedControl';
import { StatGrid, StatTile } from '@/components/StatTile';
import { isModuleEnabled, usePortfolio } from '@/features/portfolio/usePortfolio';
import type { CategoryKey } from '@/features/portfolio/calculations';
import { formatDate, money, percent, toneOf } from '@/lib/format';
import { categoryColors, colors, font, radius, spacing } from '@/theme';
import type { Currency } from '@/types/models';

// Dashboard category → web module id (for honouring the user's enabled modules)
const MODULE_OF: Partial<Record<CategoryKey, string>> = {
  us: 'equity', india: 'india-equity', mf: 'india-mf', re: 'realestate', addl: 'additional', loans: 'loans',
};

export default function DashboardScreen() {
  const { summary, usdInr, userData, isLoading, isRefreshing, error, refresh } = usePortfolio();
  const [currency, setCurrency] = useState<Currency>('INR');

  // Summary values are INR; convert for display
  const fmt = (inrAmount: number, opts?: { signed?: boolean }) =>
    money(currency === 'USD' ? inrAmount / usdInr : inrAmount, currency, opts);

  const categories = summary.categories.filter(c => {
    const mod = MODULE_OF[c.key];
    return !mod || isModuleEnabled(userData.config, mod);
  });
  const segments = categories.filter(c => c.allocation > 0.1).map(c => ({ key: c.key, value: c.current, color: categoryColors[c.key] }));

  return (
    <Screen loading={isLoading} error={error} refreshing={isRefreshing} onRefresh={refresh}>
      <SegmentedControl
        options={[{ value: 'INR', label: '₹ INR' }, { value: 'USD', label: '$ USD' }]}
        value={currency}
        onChange={setCurrency}
      />

      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Total portfolio</Text>
        <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit>{fmt(summary.totalCurrent)}</Text>
        <Text style={styles.heroSub}>
          {fmt(summary.netPnL, { signed: true })} ({percent(summary.netPnLPct)}) on {fmt(summary.totalInvested)} invested
        </Text>
      </View>

      <StatGrid>
        <StatTile label="Liquid" value={fmt(summary.liquid)} sub="Equity · Funds · Cash" />
        <StatTile label="Not liquid" value={fmt(summary.illiquid)} sub="Property · Loans · Other" />
        <StatTile label="Net P&L" value={fmt(summary.netPnL, { signed: true })} tone={toneOf(summary.netPnL)} badge={percent(summary.netPnLPct)} />
        <StatTile label="USD / INR" value={`₹${usdInr.toFixed(2)}`} sub="Live exchange rate" />
      </StatGrid>

      <Card title="Allocation">
        <View style={styles.chartRow}>
          <DonutChart segments={segments} size={160} stroke={24} centerLabel="Total" centerValue={fmt(summary.totalCurrent)} />
        </View>
        <View style={styles.legend}>
          {categories.map(c => (
            <View key={c.key} style={styles.legendRow}>
              <View style={[styles.dot, { backgroundColor: categoryColors[c.key] }]} />
              <View style={styles.legendMain}>
                <Text style={styles.legendLabel}>{c.label}</Text>
                <Text style={font.caption}>{c.count}</Text>
              </View>
              <View style={styles.legendValues}>
                <Text style={styles.legendValue}>{fmt(c.current)}</Text>
                <Text style={[font.caption, c.key !== 'cash' && c.key !== 'loans' && c.invested > 0 && { color: c.pnl >= 0 ? colors.positive : colors.negative }]}>
                  {c.key === 'cash' || c.key === 'loans' || c.invested === 0 ? `${c.allocation.toFixed(1)}%` : `${percent(c.pnlPct)} · ${c.allocation.toFixed(1)}%`}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </Card>

      {userData.savedAt ? <Text style={styles.synced}>Last synced {formatDate(userData.savedAt)}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero:      { backgroundColor: colors.primaryDark, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.xs },
  heroLabel: { color: '#BFDBFE', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  heroValue: { color: colors.white, fontSize: 32, fontWeight: '800' },
  heroSub:   { color: '#DBEAFE', fontSize: 14 },
  chartRow:  { alignItems: 'center', marginBottom: spacing.lg },
  legend:    { gap: spacing.md },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dot:       { width: 10, height: 10, borderRadius: 5 },
  legendMain:   { flex: 1 },
  legendLabel:  { fontSize: 14, fontWeight: '500', color: colors.text },
  legendValues: { alignItems: 'flex-end' },
  legendValue:  { fontSize: 14, fontWeight: '600', color: colors.text },
  synced:    { ...font.caption, textAlign: 'center' },
});
