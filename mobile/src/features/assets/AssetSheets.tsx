import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Sheet, SheetActions } from '@/components/form/Sheet';
import { DateField } from '@/components/form/DateField';
import { FieldRow, Summary } from '@/components/form/Summary';
import { SegmentedControl } from '@/components/SegmentedControl';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { Banner } from '@/components/Banner';
import { useUpdateUserData } from '@/features/portfolio/usePortfolio';
import { investmentEstimate, loanReturned, propertyCost, propertyEstimate } from '@/features/portfolio/calculations';
import { formatDate, money } from '@/lib/format';
import { todayIso } from '@/lib/dates';
import { timestampId } from '@/lib/ids';
import { confirmDestructive, parseNum } from '@/lib/forms';
import { colors, radius, spacing } from '@/theme';
import type { AdditionalInvestment, Currency, LoanInvestment, LoanReturn, RealEstateProperty } from '@/types/models';

const CURRENCIES = [{ value: 'INR' as const, label: '₹ INR' }, { value: 'USD' as const, label: '$ USD' }];
const sym = (c: Currency) => (c === 'INR' ? '₹' : '$');
const fmt = (n: number, c: Currency) => money(n, c, { decimals: true });
const opt = (s: string) => s.trim() || undefined;

function ErrorBanner({ error, mutationError }: { error: string; mutationError: Error | null }) {
  return error || mutationError ? <Banner tone="negative" message={error || mutationError!.message} /> : null;
}

// ─── Real estate ─────────────────────────────────────────────────────────────

export function PropertySheet({ initial, onClose }: { initial?: RealEstateProperty; onClose: () => void }) {
  const update = useUpdateUserData();
  const [name, setName] = useState(initial?.propertyName ?? '');
  const [price, setPrice] = useState(initial ? String(initial.propertyPrice) : '');
  const [share, setShare] = useState(initial ? String(initial.mySharePercent) : '100');
  const [appreciation, setAppreciation] = useState(initial ? String(initial.appreciationPerYear) : '');
  const [purchaseDate, setPurchaseDate] = useState(initial?.purchaseDate ?? todayIso());
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? 'INR');
  const [partner, setPartner] = useState(initial?.partner ?? '');
  const [amountNotes, setAmountNotes] = useState(initial?.amountNotes ?? '');
  const [details1, setDetails1] = useState(initial?.details1 ?? '');
  const [details2, setDetails2] = useState(initial?.details2 ?? '');
  const [details3, setDetails3] = useState(initial?.details3 ?? '');
  const [selling, setSelling] = useState(false);
  const [error, setError] = useState('');

  const priceNum = parseNum(price) || 0, shareNum = parseNum(share) || 0, apprNum = parseNum(appreciation) || 0;
  const draft: RealEstateProperty = {
    id: initial?.id ?? timestampId(), propertyName: name.trim(), propertyPrice: priceNum, mySharePercent: shareNum,
    appreciationPerYear: apprNum, purchaseDate, currency,
    partner: opt(partner), amountNotes: opt(amountNotes), details1: opt(details1), details2: opt(details2), details3: opt(details3),
    status: initial?.status ?? 'active', soldDate: initial?.soldDate, soldAmount: initial?.soldAmount, soldNotes: initial?.soldNotes,
  };

  const save = () => {
    setError('');
    if (!name.trim()) { setError('Property name is required.'); return; }
    if (priceNum <= 0) { setError('Property price must be positive.'); return; }
    if (shareNum <= 0 || shareNum > 100) { setError('Share % must be between 1 and 100.'); return; }
    if (!purchaseDate) { setError('Purchase date is required.'); return; }
    update.mutate(latest => ({
      realestate: initial ? latest.properties.map(p => (p.id === draft.id ? draft : p)) : [...latest.properties, draft],
    }), { onSuccess: onClose });
  };

  const remove = () => confirmDestructive('Delete property?', `${initial!.propertyName} will be removed.`, 'Delete',
    () => update.mutate(latest => ({ realestate: latest.properties.filter(p => p.id !== initial!.id) }), { onSuccess: onClose }));

  if (selling && initial) return <SellPropertySheet property={initial} onClose={onClose} onBack={() => setSelling(false)} />;

  return (
    <Sheet visible title={initial ? 'Edit Property' : 'Add Property'} onClose={onClose}
      footer={<>
        <SheetActions><Button title="Cancel" variant="secondary" onPress={onClose} /><Button title={initial ? 'Save' : 'Add Property'} onPress={save} loading={update.isPending} /></SheetActions>
        {initial ? (
          <SheetActions>
            {initial.status === 'active' ? <Button title="Mark as sold" variant="secondary" onPress={() => setSelling(true)} disabled={update.isPending} /> : null}
            <Button title="Delete" variant="danger" onPress={remove} disabled={update.isPending} />
          </SheetActions>
        ) : null}
      </>}>
      <ErrorBanner error={error} mutationError={update.error} />
      <TextField label="Property name" value={name} onChangeText={setName} placeholder="e.g. Plot at Kokapet" autoCapitalize="words" />
      <SegmentedControl options={CURRENCIES} value={currency} onChange={setCurrency} />
      <FieldRow>
        <TextField label={`Property price (${sym(currency)})`} value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0" />
        <TextField label="My share %" value={share} onChangeText={setShare} keyboardType="decimal-pad" placeholder="100" />
      </FieldRow>
      <FieldRow>
        <TextField label="Appreciation % / yr" value={appreciation} onChangeText={setAppreciation} keyboardType="decimal-pad" placeholder="e.g. 8" />
        <DateField label="Purchase date" value={purchaseDate} onChange={setPurchaseDate} />
      </FieldRow>
      {priceNum > 0 ? (
        <Summary lines={[
          { label: 'My investment', value: fmt(propertyCost(draft), currency) },
          { label: 'Estimated value today', value: fmt(propertyEstimate(draft), currency), strong: true },
        ]} />
      ) : null}
      <TextField label="Partner (optional)" value={partner} onChangeText={setPartner} autoCapitalize="words" />
      <TextField label="Amount notes (optional)" value={amountNotes} onChangeText={setAmountNotes} autoCapitalize="sentences" />
      <TextField label="Details 1 (optional)" value={details1} onChangeText={setDetails1} autoCapitalize="sentences" />
      <TextField label="Details 2 (optional)" value={details2} onChangeText={setDetails2} autoCapitalize="sentences" />
      <TextField label="Details 3 (optional)" value={details3} onChangeText={setDetails3} autoCapitalize="sentences" />
      {initial?.status === 'sold' ? (
        <Banner tone="info" message={`Sold ${formatDate(initial.soldDate)} for ${fmt(initial.soldAmount ?? 0, currency)}${initial.soldNotes ? ` · ${initial.soldNotes}` : ''}`} />
      ) : null}
    </Sheet>
  );
}

function SellPropertySheet({ property, onClose, onBack }: { property: RealEstateProperty; onClose: () => void; onBack: () => void }) {
  const update = useUpdateUserData();
  const [soldDate, setSoldDate] = useState(todayIso());
  const [soldAmount, setSoldAmount] = useState('');
  const [soldNotes, setSoldNotes] = useState('');
  const [error, setError] = useState('');
  const cost = propertyCost(property);
  const soldNum = parseNum(soldAmount) || 0;
  const gain = soldNum - cost;

  const save = () => {
    setError('');
    if (!soldDate) { setError('Sold date is required.'); return; }
    if (soldNum <= 0) { setError('Sold amount must be positive.'); return; }
    update.mutate(latest => ({
      realestate: latest.properties.map(p => (p.id === property.id
        ? { ...p, status: 'sold' as const, soldDate, soldAmount: soldNum, soldNotes: soldNotes.trim() || undefined } : p)),
    }), { onSuccess: onClose });
  };

  return (
    <Sheet visible title="Mark as Sold" subtitle={property.propertyName} onClose={onClose}
      footer={<SheetActions><Button title="Back" variant="secondary" onPress={onBack} /><Button title="Mark as Sold" onPress={save} loading={update.isPending} /></SheetActions>}>
      <ErrorBanner error={error} mutationError={update.error} />
      <DateField label="Sold date" value={soldDate} onChange={setSoldDate} />
      <TextField label={`Sold amount — my share (${sym(property.currency)})`} value={soldAmount} onChangeText={setSoldAmount} keyboardType="decimal-pad" placeholder="0" />
      <Summary lines={[
        { label: 'My investment', value: fmt(cost, property.currency) },
        ...(soldNum > 0 ? [{ label: gain >= 0 ? 'Gain' : 'Loss', value: fmt(gain, property.currency), strong: true, tone: gain >= 0 ? 'positive' as const : 'negative' as const }] : []),
      ]} />
      <TextField label="Notes (optional)" value={soldNotes} onChangeText={setSoldNotes} autoCapitalize="sentences" />
    </Sheet>
  );
}

// ─── Interest investments (loans) ────────────────────────────────────────────

export function AddLoanSheet({ onClose }: { onClose: () => void }) {
  const update = useUpdateUserData();
  const [customerName, setCustomerName] = useState('');
  const [principal, setPrincipal] = useState('');
  const [currency, setCurrency] = useState<Currency>('INR');
  const [dateGiven, setDateGiven] = useState(todayIso());
  const [interestRate, setInterestRate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const save = () => {
    setError('');
    if (!customerName.trim()) { setError('Customer name is required.'); return; }
    const amt = parseNum(principal);
    if (isNaN(amt) || amt <= 0) { setError('Investment amount must be a positive number.'); return; }
    if (!dateGiven) { setError('Date is required.'); return; }
    const rate = parseNum(interestRate);
    const loan: LoanInvestment = {
      id: timestampId(), customerName: customerName.trim(), principal: amt, currency, dateGiven,
      interestRate: isNaN(rate) ? undefined : rate, notes: opt(notes), returns: [],
    };
    update.mutate(latest => ({ loans: [...latest.loans, loan] }), { onSuccess: onClose });
  };

  return (
    <Sheet visible title="Add Interest Investment" onClose={onClose}
      footer={<SheetActions><Button title="Cancel" variant="secondary" onPress={onClose} /><Button title="Add" onPress={save} loading={update.isPending} /></SheetActions>}>
      <ErrorBanner error={error} mutationError={update.error} />
      <TextField label="Customer name" value={customerName} onChangeText={setCustomerName} placeholder="e.g. Ravi Kumar" autoCapitalize="words" />
      <SegmentedControl options={CURRENCIES} value={currency} onChange={setCurrency} />
      <FieldRow>
        <TextField label={`Amount given (${sym(currency)})`} value={principal} onChangeText={setPrincipal} keyboardType="decimal-pad" placeholder="0" />
        <TextField label="Interest % (optional)" value={interestRate} onChangeText={setInterestRate} keyboardType="decimal-pad" placeholder="e.g. 12" />
      </FieldRow>
      <DateField label="Date given" value={dateGiven} onChange={setDateGiven} />
      <TextField label="Notes (optional)" value={notes} onChangeText={setNotes} autoCapitalize="sentences" />
    </Sheet>
  );
}

/** A loan's repayments, with a form to record a new one, and delete. */
export function LoanSheet({ loan, onClose }: { loan: LoanInvestment; onClose: () => void }) {
  const update = useUpdateUserData();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIso());
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const c = loan.currency;
  const returned = loanReturned(loan);
  const outstanding = loan.principal - returned;

  const addReturn = () => {
    setError('');
    const amt = parseNum(amount);
    if (isNaN(amt) || amt <= 0) { setError('Return amount must be a positive number.'); return; }
    if (!date) { setError('Date is required.'); return; }
    const ret: LoanReturn = { id: timestampId(), amount: amt, date, notes: opt(notes) };
    update.mutate(latest => ({ loans: latest.loans.map(l => (l.id === loan.id ? { ...l, returns: [...l.returns, ret] } : l)) }), { onSuccess: onClose });
  };

  const remove = () => confirmDestructive('Delete investment?', `${loan.customerName} and all recorded returns will be removed.`, 'Delete',
    () => update.mutate(latest => ({ loans: latest.loans.filter(l => l.id !== loan.id) }), { onSuccess: onClose }));

  return (
    <Sheet visible title={loan.customerName} subtitle={`Given ${formatDate(loan.dateGiven)}${loan.interestRate ? ` · ${loan.interestRate}%` : ''}`} onClose={onClose}
      footer={<>
        <SheetActions><Button title="Close" variant="secondary" onPress={onClose} /><Button title="Record return" onPress={addReturn} loading={update.isPending} /></SheetActions>
        <Button title="Delete investment" variant="danger" onPress={remove} disabled={update.isPending} />
      </>}>
      <ErrorBanner error={error} mutationError={update.error} />
      <Summary lines={[
        { label: 'Principal', value: fmt(loan.principal, c) },
        { label: 'Returned', value: fmt(returned, c) },
        { label: 'Outstanding', value: fmt(outstanding, c), strong: true, tone: outstanding > 0 ? 'negative' : 'positive' },
      ]} />
      {loan.notes ? <Text style={styles.hint}>{loan.notes}</Text> : null}

      <Text style={styles.section}>Returns ({loan.returns.length})</Text>
      {loan.returns.length === 0 ? <Text style={styles.hint}>No returns recorded yet.</Text> : (
        <View style={styles.list}>
          {[...loan.returns].sort((a, b) => b.date.localeCompare(a.date)).map((r, i) => (
            <View key={r.id} style={[styles.row, i > 0 && styles.divider]}>
              <View style={styles.flex}>
                <Text style={styles.rowTitle}>{formatDate(r.date)}</Text>
                {r.notes ? <Text style={styles.hint}>{r.notes}</Text> : null}
              </View>
              <Text style={styles.rowValue}>{fmt(r.amount, c)}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.section}>Record a return</Text>
      <FieldRow>
        <TextField label={`Amount (${sym(c)})`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0" />
        <DateField label="Date" value={date} onChange={setDate} />
      </FieldRow>
      <TextField label="Notes (optional)" value={notes} onChangeText={setNotes} autoCapitalize="sentences" />
    </Sheet>
  );
}

// ─── Additional investments ──────────────────────────────────────────────────

export function InvestmentSheet({ initial, onClose }: { initial?: AdditionalInvestment; onClose: () => void }) {
  const update = useUpdateUserData();
  const [name, setName] = useState(initial?.name ?? '');
  const [amount, setAmount] = useState(initial ? String(initial.amountInvested) : '');
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? 'INR');
  const [date, setDate] = useState(initial?.dateOfInvestment ?? todayIso());
  const [interest, setInterest] = useState(initial ? String(initial.interestPercent) : '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [error, setError] = useState('');

  const amtNum = parseNum(amount) || 0, intNum = parseNum(interest) || 0;
  const draft: AdditionalInvestment = {
    id: initial?.id ?? timestampId(), name: name.trim(), amountInvested: amtNum, currency,
    dateOfInvestment: date, interestPercent: intNum, notes: opt(notes),
  };

  const save = () => {
    setError('');
    if (!name.trim()) { setError('Investment name is required.'); return; }
    if (amtNum <= 0) { setError('Amount invested must be a positive number.'); return; }
    if (!date) { setError('Date of investment is required.'); return; }
    if (intNum < 0) { setError('Interest % cannot be negative.'); return; }
    update.mutate(latest => ({
      investments: initial ? latest.investments.map(x => (x.id === draft.id ? draft : x)) : [...latest.investments, draft],
    }), { onSuccess: onClose });
  };

  const remove = () => confirmDestructive('Delete investment?', `${initial!.name} will be removed.`, 'Delete',
    () => update.mutate(latest => ({ investments: latest.investments.filter(x => x.id !== initial!.id) }), { onSuccess: onClose }));

  return (
    <Sheet visible title={initial ? 'Edit Investment' : 'Add Investment'} onClose={onClose}
      footer={<>
        <SheetActions><Button title="Cancel" variant="secondary" onPress={onClose} /><Button title={initial ? 'Save' : 'Add'} onPress={save} loading={update.isPending} /></SheetActions>
        {initial ? <Button title="Delete investment" variant="danger" onPress={remove} disabled={update.isPending} /> : null}
      </>}>
      <ErrorBanner error={error} mutationError={update.error} />
      <TextField label="Investment name" value={name} onChangeText={setName} placeholder="e.g. PPF, FD, Bonds" autoCapitalize="words" />
      <SegmentedControl options={CURRENCIES} value={currency} onChange={setCurrency} />
      <FieldRow>
        <TextField label={`Amount invested (${sym(currency)})`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0" />
        <TextField label="Interest % / yr" value={interest} onChangeText={setInterest} keyboardType="decimal-pad" placeholder="e.g. 7.1" />
      </FieldRow>
      <DateField label="Date of investment" value={date} onChange={setDate} />
      {amtNum > 0 ? <Summary lines={[{ label: 'Estimated value today', value: fmt(investmentEstimate(draft), currency), strong: true }]} /> : null}
      <TextField label="Notes (optional)" value={notes} onChangeText={setNotes} autoCapitalize="sentences" />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex:     { flex: 1 },
  section:  { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', color: colors.textSubtle },
  hint:     { fontSize: 13, color: colors.textMuted },
  list:     { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  row:      { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  divider:  { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  rowTitle: { fontSize: 14, fontWeight: '500', color: colors.text },
  rowValue: { fontSize: 14, fontWeight: '600', color: colors.positive },
});
