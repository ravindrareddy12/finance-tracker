import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Sheet, SheetActions } from '@/components/form/Sheet';
import { ChipSelect } from '@/components/form/ChipSelect';
import { DateField } from '@/components/form/DateField';
import { FieldRow, Summary } from '@/components/form/Summary';
import { SegmentedControl } from '@/components/SegmentedControl';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { Banner } from '@/components/Banner';
import { portfolioApi } from '@/api/portfolio';
import { useUpdateUserData } from '@/features/portfolio/usePortfolio';
import { formatDate, money } from '@/lib/format';
import { todayIso } from '@/lib/dates';
import { timestampId } from '@/lib/ids';
import { confirmDestructive, parseNum } from '@/lib/forms';
import { colors, radius, spacing } from '@/theme';
import type { MFHolding, MFSearchResult, MFTransaction, NavOnDate, SIPFrequency, SIPSchedule } from '@/types/models';
import { firstDueDate, generateSipDates } from './sip';

const inr = (n: number) => money(n, 'INR', { decimals: true });
const DAY_OPTIONS = [1, 5, 7, 10, 15, 20, 25, 28];
const ordinal = (d: number) => `${d}${['st', 'nd', 'rd'][d - 1] ?? 'th'}`;
const FREQUENCIES: { value: SIPFrequency; label: string }[] = [
  { value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' }, { value: 'weekly', label: 'Weekly' },
];
const unitsOf = (fund: MFHolding) => fund.transactions.reduce((s, t) => (t.type === 'buy' ? s + t.units : s - t.units), 0);

/**
 * NAV on a date for the NAV field: filled automatically when the date changes,
 * unless the user typed their own (same as the web forms).
 */
function useAutoNav(code: string | null, date: string, setNav: (v: string) => void, skipInitial = false) {
  const [initialDate] = useState(skipInitial ? date : null);
  const enabled = !!code && !!date && date !== initialDate;
  const query = useQuery({
    queryKey: ['navOnDate', code, date],
    queryFn: () => portfolioApi.navOnDates(code!, [date]).then(r => r[0] ?? null),
    enabled,
    staleTime: 60 * 60_000,
  });
  const result = enabled ? query.data : undefined;
  useEffect(() => {
    if (result?.nav != null) setNav(String(parseFloat(result.nav.toFixed(4))));
  }, [result]); // eslint-disable-line react-hooks/exhaustive-deps
  const hint = !enabled ? undefined
    : query.isFetching ? 'Fetching NAV…'
    : query.isError ? 'Failed to fetch NAV'
    : result === undefined ? undefined
    : result?.nav != null ? `NAV as of ${result.navDate}` : 'NAV not available for this date';
  return { loading: enabled && query.isFetching, hint };
}

// ─── Add fund ────────────────────────────────────────────────────────────────

export function AddFundSheet({ onClose, onAdded }: { onClose: () => void; onAdded?: (id: string) => void }) {
  const update = useUpdateUserData();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selected, setSelected] = useState<MFSearchResult | null>(null);
  const [date, setDate] = useState(todayIso());
  const [units, setUnits] = useState('');
  const [nav, setNav] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 400);
    return () => clearTimeout(t);
  }, [query]);

  const search = useQuery({
    queryKey: ['mfSearch', debounced],
    queryFn: () => portfolioApi.mfSearch(debounced).then(r => r.slice(0, 10)),
    enabled: !selected && debounced.length >= 3,
    staleTime: 10 * 60_000,
  });
  const live = useQuery({
    queryKey: ['navs', String(selected?.schemeCode)],
    queryFn: () => portfolioApi.mfNavs([String(selected!.schemeCode)]),
    enabled: !!selected,
  });
  const navInfo = useAutoNav(selected ? String(selected.schemeCode) : null, date, setNav);

  const u = parseNum(units), n = parseNum(nav);
  const amount = u > 0 && n > 0 ? u * n : 0;
  const canSave = !!selected && !!date && u > 0 && n > 0;

  const save = () => {
    if (!selected || !canSave) return;
    const tx: MFTransaction = { id: timestampId(), type: 'buy', date, units: u, nav: n, amount, notes: notes.trim() || undefined };
    const holding: MFHolding = {
      id: `${timestampId()}_h`, schemeCode: String(selected.schemeCode), fundName: selected.schemeName,
      amcName: selected.amcName || undefined, transactions: [tx],
    };
    update.mutate(latest => ({ mf: [...latest.funds, holding] }), { onSuccess: () => { onClose(); onAdded?.(holding.id); } });
  };

  return (
    <Sheet visible title="Add Mutual Fund" onClose={onClose}
      footer={<SheetActions><Button title="Cancel" variant="secondary" onPress={onClose} /><Button title="Add Fund" onPress={save} disabled={!canSave || navInfo.loading} loading={update.isPending} /></SheetActions>}>
      {update.error ? <Banner tone="negative" message={update.error.message} /> : null}
      <TextField label="Search fund" icon="search" value={query} placeholder="Type fund name (min 3 chars)…" autoCapitalize="words"
        onChangeText={t => { setQuery(t); setSelected(null); }} />
      {!selected && search.isFetching ? <ActivityIndicator color={colors.primary} /> : null}
      {!selected && search.data && search.data.length > 0 ? (
        <View style={styles.results}>
          {search.data.map((r, i) => (
            <Pressable key={String(r.schemeCode)} onPress={() => { setSelected(r); setQuery(r.schemeName); }}
              style={[styles.result, i > 0 && styles.resultDivider]} accessibilityRole="button">
              <Text style={styles.resultName}>{r.schemeName}</Text>
              <Text style={styles.resultCode}>Code: {r.schemeCode}{r.amcName ? ` · ${r.amcName}` : ''}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {!selected && debounced.length >= 3 && search.data?.length === 0 ? <Text style={styles.hint}>No funds match “{debounced}”.</Text> : null}
      {selected ? (
        <Banner tone="info" message={`${selected.schemeName} · Latest NAV ${live.data?.[0] ? `₹${live.data[0].currentNAV}` : '—'}`} />
      ) : null}

      <Text style={styles.section}>Initial purchase</Text>
      <DateField label="Purchase date" value={date} onChange={setDate} />
      <FieldRow>
        <TextField label="Units" value={units} onChangeText={setUnits} keyboardType="decimal-pad" placeholder="0.000" />
        <TextField label="NAV at purchase (₹)" value={nav} onChangeText={setNav} keyboardType="decimal-pad" placeholder="0.0000" hint={selected ? navInfo.hint : undefined} />
      </FieldRow>
      <Summary lines={[{ label: 'Amount', value: amount > 0 ? inr(amount) : '—', strong: true }]} />
      <TextField label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="e.g. SIP, lump sum…" autoCapitalize="sentences" />
    </Sheet>
  );
}

// ─── Add / edit transaction ──────────────────────────────────────────────────

export function MFTransactionSheet({ fund, currentNav, initial, onClose }: {
  fund: MFHolding; currentNav: number | null; initial?: MFTransaction; onClose: () => void;
}) {
  const isEdit = !!initial;
  const update = useUpdateUserData();
  const [type, setType] = useState<'buy' | 'sell'>(initial?.type ?? 'buy');
  const [date, setDate] = useState(initial?.date ?? todayIso());
  const [units, setUnits] = useState(initial ? String(initial.units) : '');
  const [nav, setNav] = useState(initial ? String(initial.nav) : currentNav ? String(currentNav) : '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  // When editing, keep the saved NAV until the date is changed
  const navInfo = useAutoNav(fund.schemeCode, date, setNav, isEdit);

  const held = unitsOf(fund);
  const u = parseNum(units), n = parseNum(nav);
  const amount = u > 0 && n > 0 ? u * n : 0;
  const overSell = type === 'sell' && u > held;
  const canSave = !!date && u > 0 && n > 0 && !overSell;

  const save = () => {
    if (!canSave) return;
    const tx: MFTransaction = { id: initial?.id ?? timestampId(), type, date, units: u, nav: n, amount, notes: notes.trim() || undefined };
    update.mutate(latest => ({
      mf: latest.funds.map(h => h.id !== fund.id ? h : {
        ...h, transactions: isEdit ? h.transactions.map(t => (t.id === tx.id ? tx : t)) : [...h.transactions, tx],
      }),
    }), { onSuccess: onClose });
  };

  const remove = () => confirmDestructive('Delete transaction?', `${initial!.type === 'buy' ? 'Buy' : 'Sell'} of ${initial!.units} units on ${formatDate(initial!.date)}.`, 'Delete',
    () => update.mutate(latest => ({
      mf: latest.funds.map(h => (h.id !== fund.id ? h : { ...h, transactions: h.transactions.filter(t => t.id !== initial!.id) })),
    }), { onSuccess: onClose }));

  return (
    <Sheet visible title={isEdit ? 'Edit Transaction' : 'Add Transaction'} subtitle={fund.fundName} onClose={onClose}
      footer={<>
        <SheetActions><Button title="Cancel" variant="secondary" onPress={onClose} /><Button title={isEdit ? 'Update' : 'Save'} onPress={save} disabled={!canSave || navInfo.loading} loading={update.isPending} /></SheetActions>
        {isEdit ? <Button title="Delete transaction" variant="danger" onPress={remove} disabled={update.isPending} /> : null}
      </>}>
      {update.error ? <Banner tone="negative" message={update.error.message} /> : null}
      <Summary lines={[
        { label: 'Current units held', value: held.toFixed(3) },
        ...(currentNav ? [{ label: 'Latest NAV', value: `₹${currentNav}` }] : []),
      ]} />
      <SegmentedControl options={[{ value: 'buy' as const, label: 'Buy' }, { value: 'sell' as const, label: 'Sell' }]} value={type} onChange={setType} />
      <DateField label="Date" value={date} onChange={setDate} />
      <FieldRow>
        <TextField label="Units" value={units} onChangeText={setUnits} keyboardType="decimal-pad" placeholder="0.000" />
        <TextField label="NAV (₹)" value={nav} onChangeText={setNav} keyboardType="decimal-pad" placeholder="0.0000" hint={navInfo.hint} />
      </FieldRow>
      {overSell ? <Banner tone="negative" message={`Cannot sell ${units} units — only ${held.toFixed(3)} held`} /> : null}
      <Summary lines={[{ label: 'Amount', value: amount > 0 ? inr(amount) : '—', strong: true }]} />
      <TextField label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="e.g. SIP, redemption…" autoCapitalize="sentences" />
    </Sheet>
  );
}

// ─── Historical SIP (past instalments at their NAVs) ─────────────────────────

interface SIPRow { date: string; nav: number | null; navDate: string | null; exact: boolean; units: number | null; skip: boolean }

export function HistoricalSIPSheet({ fund, onClose }: { fund: MFHolding; onClose: () => void }) {
  const update = useUpdateUserData();
  const [frequency, setFrequency] = useState<SIPFrequency>('monthly');
  const [sipAmount, setSipAmount] = useState('');
  const [day, setDay] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [mode, setMode] = useState<'count' | 'endDate'>('count');
  const [count, setCount] = useState('12');
  const [endDate, setEndDate] = useState('');
  const [rows, setRows] = useState<SIPRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [navError, setNavError] = useState('');

  const amount = parseNum(sipAmount) || 0;
  const canGenerate = !!startDate && amount > 0 && (mode === 'count' ? parseInt(count, 10) > 0 : endDate > startDate);

  const generate = async () => {
    if (!canGenerate) return;
    const dates = generateSipDates(frequency, startDate, day, mode, parseInt(count, 10) || 12, endDate || todayIso());
    if (dates.length === 0) return;
    setRows(dates.map(date => ({ date, nav: null, navDate: null, exact: false, units: null, skip: false })));
    setLoading(true);
    setNavError('');
    try {
      const results = await portfolioApi.navOnDates(fund.schemeCode, dates);
      const byDate = new Map<string, NavOnDate>(results.map(r => [r.requestedDate, r]));
      setRows(dates.map(date => {
        const found = byDate.get(date);
        const nav = found?.nav ?? null;
        return { date, nav, navDate: found?.navDate ?? null, exact: found?.exact ?? false, units: nav && nav > 0 ? amount / nav : null, skip: nav == null };
      }));
    } catch (e) {
      setNavError(e instanceof Error ? e.message : 'Failed to fetch NAVs');
    } finally {
      setLoading(false);
    }
  };

  const active = (rows ?? []).filter(r => !r.skip && r.nav != null);
  const totalUnits = active.reduce((s, r) => s + (r.units ?? 0), 0);

  const save = () => {
    const base = timestampId();
    const txs: MFTransaction[] = active.map((r, i) => ({
      id: `${base}_sip_${i}`, type: 'buy', date: r.date, units: r.units!, nav: r.nav!, amount, notes: 'SIP',
    }));
    update.mutate(latest => ({
      mf: latest.funds.map(h => (h.id === fund.id ? { ...h, transactions: [...h.transactions, ...txs] } : h)),
    }), { onSuccess: onClose });
  };

  const footer = rows ? (
    <SheetActions>
      <Button title="Back" variant="secondary" onPress={() => setRows(null)} />
      <Button title={`Add ${active.length} SIP${active.length === 1 ? '' : 's'}`} onPress={save} disabled={loading || active.length === 0} loading={update.isPending} />
    </SheetActions>
  ) : (
    <SheetActions>
      <Button title="Cancel" variant="secondary" onPress={onClose} />
      <Button title="Fetch NAVs" onPress={generate} disabled={!canGenerate} />
    </SheetActions>
  );

  return (
    <Sheet visible title="Add SIP Transactions" subtitle={fund.fundName} onClose={onClose} footer={footer}>
      {update.error ? <Banner tone="negative" message={update.error.message} /> : null}
      {!rows ? (
        <>
          <SegmentedControl options={FREQUENCIES} value={frequency} onChange={setFrequency} />
          <TextField label="SIP amount (₹)" value={sipAmount} onChangeText={setSipAmount} keyboardType="decimal-pad" placeholder="5000" />
          {frequency !== 'weekly' ? (
            <ChipSelect label="Day of month" value={String(day)} onChange={v => setDay(Number(v))}
              options={DAY_OPTIONS.map(d => ({ value: String(d), label: ordinal(d) }))} />
          ) : null}
          <DateField label="Start date" value={startDate} onChange={setStartDate} />
          <SegmentedControl options={[{ value: 'count' as const, label: '# Instalments' }, { value: 'endDate' as const, label: 'End date' }]} value={mode} onChange={setMode} />
          {mode === 'count'
            ? <TextField label="Number of instalments" value={count} onChangeText={setCount} keyboardType="number-pad" placeholder="12" />
            : <DateField label="End date" value={endDate} onChange={setEndDate} minimumDate={startDate || undefined} />}
          {canGenerate && mode === 'count' ? (
            <Summary lines={[{ label: `${count} × ${inr(amount)} (${frequency})`, value: `≈ ${inr(amount * (parseInt(count, 10) || 0))}`, strong: true }]} />
          ) : null}
        </>
      ) : (
        <>
          {loading ? <Banner tone="info" message="Fetching historical NAVs from AMFI… this can take a few seconds." /> : null}
          {navError ? <Banner tone="negative" message={navError} /> : null}
          {!loading && !navError ? (
            <Summary lines={[
              { label: 'Instalments', value: String(active.length) },
              { label: 'Total units', value: totalUnits.toFixed(3) },
              { label: 'Total invested', value: inr(active.length * amount), strong: true },
            ]} />
          ) : null}
          <Text style={styles.hint}>Tap an instalment to skip or include it.</Text>
          <View style={styles.results}>
            {rows.map((r, i) => (
              <Pressable key={r.date} disabled={r.nav == null}
                onPress={() => setRows(prev => prev!.map((x, idx) => (idx === i ? { ...x, skip: !x.skip } : x)))}
                style={[styles.sipRow, i > 0 && styles.resultDivider, r.skip && styles.skipped]}>
                <Ionicons name={r.skip ? 'square-outline' : 'checkbox'} size={20} color={r.skip ? colors.textSubtle : colors.primary} />
                <View style={styles.flex}>
                  <Text style={styles.resultName}>{formatDate(r.date)}</Text>
                  <Text style={styles.resultCode}>
                    {loading ? 'Loading…' : r.nav == null ? 'NAV unavailable' : `NAV ₹${r.nav}${r.exact ? '' : ` (from ${r.navDate})`}`}
                  </Text>
                </View>
                <Text style={styles.resultCode}>{r.units != null ? `${r.units.toFixed(3)} u` : '—'}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </Sheet>
  );
}

// ─── Future SIP schedule (auto-added on each due date) ───────────────────────

export function FutureSIPSheet({ fund, initial, onClose }: { fund: MFHolding; initial?: SIPSchedule; onClose: () => void }) {
  const isEdit = !!initial;
  const update = useUpdateUserData();
  const [frequency, setFrequency] = useState<SIPFrequency>(initial?.frequency ?? 'monthly');
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [day, setDay] = useState(initial?.dayOfMonth ?? 1);
  const [startDate, setStartDate] = useState(initial?.startDate ?? todayIso());
  const [endDate, setEndDate] = useState(initial?.endDate ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const amt = parseNum(amount) || 0;
  const canSave = amt > 0 && !!startDate && !!endDate && endDate > startDate;
  const previewCount = useMemo(() => {
    if (!canSave) return 0;
    const step = frequency === 'weekly' ? 7 : frequency === 'monthly' ? 30 : 91;
    return Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000 / step));
  }, [canSave, frequency, startDate, endDate]);
  // Keep the existing next due date unless the timing changed (as on the web)
  const nextDue = !canSave ? '' : isEdit && initial!.startDate === startDate && initial!.frequency === frequency && initial!.dayOfMonth === day
    ? initial!.nextDueDate : firstDueDate(startDate, frequency, day);

  const save = () => {
    if (!canSave) return;
    const schedule: SIPSchedule = {
      id: initial?.id ?? `sip_${Date.now()}`,
      fundId: initial?.fundId ?? fund.id,
      schemeCode: initial?.schemeCode ?? fund.schemeCode,
      fundName: initial?.fundName ?? fund.fundName,
      amount: amt, frequency, dayOfMonth: day, startDate, endDate, nextDueDate: nextDue,
      lastProcessedDate: initial?.lastProcessedDate ?? null,
      active: initial?.active ?? true,
      notes: notes.trim() || undefined,
    };
    update.mutate(latest => ({
      sip_schedules: isEdit ? latest.sipSchedules.map(s => (s.id === schedule.id ? schedule : s)) : [...latest.sipSchedules, schedule],
    }), { onSuccess: onClose });
  };

  const toggle = () => update.mutate(latest => ({
    sip_schedules: latest.sipSchedules.map(s => (s.id === initial!.id ? { ...s, active: !s.active } : s)),
  }), { onSuccess: onClose });

  const remove = () => confirmDestructive('Remove SIP schedule?', 'Instalments already added stay in the fund.', 'Remove',
    () => update.mutate(latest => ({ sip_schedules: latest.sipSchedules.filter(s => s.id !== initial!.id) }), { onSuccess: onClose }));

  return (
    <Sheet visible title={isEdit ? 'Edit SIP Schedule' : 'Setup Future SIP'} subtitle={fund.fundName} onClose={onClose}
      footer={<>
        <SheetActions><Button title="Cancel" variant="secondary" onPress={onClose} /><Button title={isEdit ? 'Update' : 'Create SIP'} onPress={save} disabled={!canSave} loading={update.isPending} /></SheetActions>
        {isEdit ? (
          <SheetActions>
            <Button title={initial!.active ? 'Pause' : 'Resume'} variant="secondary" onPress={toggle} disabled={update.isPending} />
            <Button title="Remove" variant="danger" onPress={remove} disabled={update.isPending} />
          </SheetActions>
        ) : null}
      </>}>
      {update.error ? <Banner tone="negative" message={update.error.message} /> : null}
      {!isEdit ? <Banner tone="info" message="SIP transactions are added automatically on or after each due date, using that day's NAV." /> : null}
      <SegmentedControl options={FREQUENCIES} value={frequency} onChange={setFrequency} />
      <TextField label="SIP amount (₹)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="5000" />
      {frequency !== 'weekly' ? (
        <ChipSelect label="Day of month" value={String(day)} onChange={v => setDay(Number(v))}
          options={DAY_OPTIONS.map(d => ({ value: String(d), label: ordinal(d) }))} />
      ) : null}
      <FieldRow>
        <DateField label="Start date" value={startDate} onChange={setStartDate} />
        <DateField label="End date" value={endDate} onChange={setEndDate} minimumDate={startDate} />
      </FieldRow>
      {canSave ? (
        <Summary lines={[
          { label: 'First / next due', value: formatDate(nextDue) },
          { label: 'Instalments', value: `~${previewCount}` },
          { label: 'Total', value: `≈ ${inr(previewCount * amt)}`, strong: true },
        ]} />
      ) : null}
      <TextField label="Notes (optional)" value={notes} onChangeText={setNotes} autoCapitalize="sentences" />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex:          { flex: 1 },
  section:       { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', color: colors.textSubtle },
  hint:          { fontSize: 12, color: colors.textMuted },
  results:       { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  result:        { paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: 2 },
  resultDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  resultName:    { fontSize: 14, fontWeight: '500', color: colors.text },
  resultCode:    { fontSize: 12, color: colors.textMuted },
  sipRow:        { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  skipped:       { opacity: 0.5 },
});
