import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Banner } from '@/components/Banner';
import { SegmentedControl } from '@/components/SegmentedControl';
import { SliderField } from '@/components/SliderField';
import { StatGrid, StatTile } from '@/components/StatTile';
import { portfolioApi } from '@/api/portfolio';
import { usePortfolio, useSaveUserData } from '@/features/portfolio/usePortfolio';
import {
  AGE_RANGES, CURRENCY_SYMBOL, DEFAULT_INPUTS, EXPENSE_RANGE, calculateFIRE, formatFIRE, type FIRECurrency,
} from '@/features/fire/fire';
import { colors, font, radius, spacing } from '@/theme';
import type { FIREInputs } from '@/types/models';

const SAVE_DELAY_MS = 800;

export default function FIREScreen() {
  const { userData, isLoading } = usePortfolio();
  // Wait for the saved inputs so the sliders start from them
  if (isLoading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }
  return <FIRECalculator initialInputs={{ ...DEFAULT_INPUTS, ...(userData.fire ?? {}) }} />;
}

function FIRECalculator({ initialInputs }: { initialInputs: FIREInputs }) {
  const { summary, usdInr, isRefreshing, refresh } = usePortfolio();
  const save = useSaveUserData();

  const [currency, setCurrency] = useState<FIRECurrency>('INR');
  const eurQuery = useQuery({
    queryKey: ['quotes', 'EURINR=X'],
    queryFn: () => portfolioApi.quotes(['EURINR=X']),
    staleTime: 30 * 60_000,
  });
  const eurInr = eurQuery.data?.[0]?.regularMarketPrice ?? 90;
  const rate = currency === 'INR' ? 1 : currency === 'USD' ? usdInr : eurInr;
  const fmt = (inr: number) => formatFIRE(inr, currency, rate);
  const sym = CURRENCY_SYMBOL[currency];

  // Local copy for smooth slider drags
  const [inputs, setInputs] = useState<FIREInputs>(initialInputs);

  // Debounced save — only the FIRE key is written
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { mutate } = save;
  const update = (field: keyof FIREInputs, value: number) => {
    setInputs(prev => {
      const next = { ...prev, [field]: value };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => mutate({ name: 'fire', value: next }), SAVE_DELAY_MS);
      return next;
    });
  };
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const calc = useMemo(() => calculateFIRE(inputs, summary.totalCurrent), [inputs, summary.totalCurrent]);
  const { currentAge, targetFIREAge, lifeExpectancy, inflation, monthlyExpenses } = inputs;
  const achievable = targetFIREAge > currentAge;
  const range = EXPENSE_RANGE[currency];

  const share = () => Share.share({
    title: 'FIRE Calculator',
    message: [
      `FIRE Calculator (${currency})`,
      `Monthly expenses: ${fmt(monthlyExpenses)} · Age ${currentAge} → ${targetFIREAge} · Life expectancy ${lifeExpectancy} · Inflation ${inflation}%`,
      `FIRE Number: ${achievable ? fmt(calc.fireNumber) : '—'} (Lean ${fmt(calc.leanFIRE)}, Fat ${fmt(calc.fatFIRE)})`,
      `Current portfolio: ${fmt(calc.totalPortfolio)} (${calc.progressPct.toFixed(1)}% of goal)`,
      `Remaining: ${calc.remaining > 0 ? fmt(calc.remaining) : 'Goal reached'}`,
      `Monthly savings needed: ${calc.alreadyOnTrack ? 'On track' : fmt(calc.monthlySavings)}`,
    ].join('\n'),
  });

  return (
    <>
      <Stack.Screen options={{
        headerRight: () => (
          <Pressable onPress={share} hitSlop={10} accessibilityRole="button" accessibilityLabel="Share FIRE summary">
            <Ionicons name="share-outline" size={22} color={colors.primary} />
          </Pressable>
        ),
      }} />
      <Screen refreshing={isRefreshing} onRefresh={refresh}>
        <Text style={styles.intro}>
          <Text style={styles.em}>F</Text>inancial <Text style={styles.em}>I</Text>ndependence, <Text style={styles.em}>R</Text>etire{' '}
          <Text style={styles.em}>E</Text>arly — find your number and the savings path to get there.
        </Text>

        <SegmentedControl
          options={(['INR', 'USD', 'EUR'] as FIRECurrency[]).map(c => ({ value: c, label: `${CURRENCY_SYMBOL[c]} ${c}` }))}
          value={currency}
          onChange={setCurrency}
        />

        {save.isError ? <Banner tone="negative" message={`Couldn't save your inputs: ${save.error.message}`} /> : null}

        <Card>
          <View style={styles.inputs}>
            <SliderField label="Monthly household expenses" prefix={sym}
              value={Math.round(monthlyExpenses / rate)} min={range.min} max={range.max} step={range.step}
              onChange={v => update('monthlyExpenses', Math.round(v * rate))} />
            <SliderField label="Current Age" suffix=" yrs" value={currentAge} {...AGE_RANGES.currentAge}
              onChange={v => update('currentAge', Math.min(v, targetFIREAge - 1))} />
            <SliderField label="Target FIRE Age" suffix=" yrs" value={targetFIREAge} {...AGE_RANGES.targetFIREAge}
              onChange={v => update('targetFIREAge', Math.max(v, currentAge + 1))} />
            <SliderField label="Life Expectancy" suffix=" yrs" value={lifeExpectancy} {...AGE_RANGES.lifeExpectancy}
              onChange={v => update('lifeExpectancy', v)} />
            <SliderField label="Inflation (%)" suffix="%" value={inflation} {...AGE_RANGES.inflation}
              onChange={v => update('inflation', v)} />
          </View>
        </Card>

        <View style={styles.hero}>
          <Text style={font.label}>Your F.I.R.E Number at Age {targetFIREAge}</Text>
          <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit>{achievable ? fmt(calc.fireNumber) : '—'}</Text>
          <View style={styles.ageStrip}>
            <Age label="Current Age" value={String(currentAge)} />
            <View style={styles.ageLine} />
            <Age label="Years to FIRE" value={`${calc.yearsToFIRE} yrs`} accent />
            <View style={styles.ageLine} />
            <Age label="FIRE Age" value={String(targetFIREAge)} />
          </View>
        </View>

        <Card title="FIRE Snapshot">
          {[
            { label: 'Annual Expenses Today', value: fmt(calc.annualExpenses) },
            { label: `Expense at Age ${targetFIREAge}`, value: fmt(calc.inflatedAnnual), tip: `Inflated at ${inflation}% p.a. for ${calc.yearsToFIRE} years` },
            { label: 'Lean FIRE', value: fmt(calc.leanFIRE), tip: '50% of expenses — minimal lifestyle' },
            { label: 'FAT FIRE', value: fmt(calc.fatFIRE), tip: '2× expenses — luxury retirement' },
          ].map((row, i, all) => (
            <View key={row.label} style={[styles.snapRow, i < all.length - 1 && styles.snapDivider]}>
              <View style={styles.flex}>
                <Text style={styles.snapLabel}>{row.label}</Text>
                {row.tip ? <Text style={font.caption}>{row.tip}</Text> : null}
              </View>
              <Text style={styles.snapValue}>{row.value}</Text>
            </View>
          ))}
        </Card>

        <StatGrid>
          <StatTile label="Your FIRE Number" value={achievable ? fmt(calc.fireNumber) : '—'} tone="positive"
            sub={`4% SWR · ${calc.yearsInRetirement} yr retirement`} />
          <StatTile label="Current Portfolio" value={fmt(calc.totalPortfolio)} sub={`${calc.progressPct.toFixed(1)}% of FIRE goal`} />
          <StatTile label="Remaining Amount" value={calc.remaining > 0 ? fmt(calc.remaining) : 'Goal Reached!'}
            tone={calc.remaining > 0 ? 'warning' : 'positive'}
            sub={calc.remaining > 0 ? 'FIRE Number − Current Portfolio' : 'You can retire now 🎉'} />
          <StatTile label="Monthly Savings Needed"
            value={!achievable ? '—' : calc.alreadyOnTrack ? 'On Track!' : fmt(calc.monthlySavings)}
            tone={calc.alreadyOnTrack ? 'positive' : 'neutral'}
            sub={calc.alreadyOnTrack ? `Portfolio grows to ${fmt(calc.fvPortfolio)} by age ${targetFIREAge}` : 'Assuming 10% p.a. portfolio growth'} />
        </StatGrid>

        {achievable && calc.fireNumber > 0 ? (
          <Card>
            <View style={styles.progressHeader}>
              <Text style={styles.snapLabel}>FIRE Progress</Text>
              <Text style={styles.progressPct}>{calc.progressPct.toFixed(1)}%</Text>
            </View>
            <View style={styles.track}><View style={[styles.fill, { width: `${calc.progressPct}%` }]} /></View>
            <View style={styles.progressHeader}>
              <Text style={font.caption}>{fmt(calc.totalPortfolio)} saved</Text>
              <Text style={font.caption}>{fmt(calc.fireNumber)} goal</Text>
            </View>
          </Card>
        ) : null}
      </Screen>
    </>
  );
}

function Age({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.age}>
      <Text style={font.caption}>{label}</Text>
      <Text style={[styles.ageValue, accent && { color: colors.positive }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex:      { flex: 1 },
  loading:   { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  intro:     { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  em:        { color: colors.positive, fontWeight: '700' },
  inputs:    { gap: spacing.lg },
  hero:      { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: '#A7F3D0', padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  heroValue: { fontSize: 34, fontWeight: '800', color: colors.positive },
  ageStrip:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.positiveSoft, borderRadius: radius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, alignSelf: 'stretch' },
  age:       { alignItems: 'center', flex: 1 },
  ageValue:  { fontSize: 18, fontWeight: '700', color: colors.text },
  ageLine:   { width: 16, height: 1, backgroundColor: '#CBD5E1' },
  snapRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  snapDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  snapLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  snapValue: { fontSize: 15, fontWeight: '700', color: colors.positive },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: spacing.xs },
  progressPct: { fontSize: 14, fontWeight: '700', color: colors.positive },
  track:     { height: 12, borderRadius: 6, backgroundColor: '#F1F5F9', overflow: 'hidden' },
  fill:      { height: 12, borderRadius: 6, backgroundColor: colors.positive },
});
