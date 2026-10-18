import React, { useState } from 'react';
import { Sheet, SheetActions } from '@/components/form/Sheet';
import { ChipSelect } from '@/components/form/ChipSelect';
import { DateField } from '@/components/form/DateField';
import { FieldRow, Summary } from '@/components/form/Summary';
import { SegmentedControl } from '@/components/SegmentedControl';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { Banner } from '@/components/Banner';
import { useUpdateUserData } from '@/features/portfolio/usePortfolio';
import { confirmDestructive, parseNum } from '@/lib/forms';
import { monthLabel } from '@/lib/dates';
import { uuid } from '@/lib/ids';
import type { MonthlyObligation, ObligationType, PaymentStatus, RecurrenceFrequency } from '@/types/models';
import { OBLIGATION_TYPES, addObligations, bucketOf, editObligation, generateRecurringDates, type NewObligation } from './expenses';

export function ObligationSheet({ month, initial, onClose, onMoved }: {
  /** The YYYY-MM month being viewed */
  month: string; initial?: MonthlyObligation; onClose: () => void; onMoved?: (message: string) => void;
}) {
  const isEdit = !!initial;
  const update = useUpdateUserData();
  const [recurring, setRecurring] = useState(false);
  const [type, setType] = useState<ObligationType>(initial?.type ?? 'Credit Card');
  const [note, setNote] = useState(initial?.note ?? '');
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [currency, setCurrency] = useState<'INR' | 'USD'>(initial?.currency ?? 'INR');
  const [status, setStatus] = useState<PaymentStatus>(initial?.status ?? 'Unpaid');
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '');
  const [paidDate, setPaidDate] = useState(initial?.paidDate ?? '');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('Monthly');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  const occurrences = recurring && dueDate && endDate && endDate > dueDate ? generateRecurringDates(dueDate, frequency, endDate) : [];

  const save = () => {
    setError('');
    const amt = parseNum(amount);
    if (isNaN(amt) || amt <= 0) { setError('Enter a valid amount'); return; }

    if (recurring && !isEdit) {
      if (!dueDate) { setError('Start date (Due Date) is required for recurring obligations'); return; }
      if (!endDate) { setError('End date is required for recurring obligations'); return; }
      if (endDate <= dueDate) { setError('End date must be after the start date'); return; }
      if (occurrences.length === 0) { setError('No occurrences generated — check dates'); return; }
      const groupId = uuid();
      const items: NewObligation[] = occurrences.map(d => ({
        type, note: note.trim(), amount: amt, currency, status: 'Unpaid', paidDate: null, dueDate: d,
        recurrence: { frequency, endDate, groupId },
      }));
      const months = new Set(items.map(o => bucketOf(o, month)));
      update.mutate(latest => ({ monthly_expenses: addObligations(latest.expenses, items, month) }), {
        onSuccess: () => { onClose(); if (months.size > 1) onMoved?.(`${items.length} occurrences created across ${months.size} months`); },
      });
      return;
    }

    const o: NewObligation = {
      type, note: note.trim(), amount: amt, currency, status,
      paidDate: status === 'Paid' && paidDate ? paidDate : null,
      dueDate: status === 'Unpaid' && dueDate ? dueDate : null,
      recurrence: null,
    };
    const dest = bucketOf(o, month);
    update.mutate(latest => ({
      monthly_expenses: isEdit ? editObligation(latest.expenses, initial!.id, o, month) : addObligations(latest.expenses, [o], month),
    }), { onSuccess: () => { onClose(); if (dest !== month) onMoved?.(`Saved to ${monthLabel(dest)} (its due-date month)`); } });
  };

  const remove = () => confirmDestructive('Delete this obligation?', initial!.note || initial!.type, 'Delete',
    () => update.mutate(latest => ({
      monthly_expenses: { ...latest.expenses, [month]: (latest.expenses[month] ?? []).filter(o => o.id !== initial!.id) },
    }), { onSuccess: onClose }));

  return (
    <Sheet visible title={isEdit ? 'Edit Obligation' : 'Add Obligation'} subtitle={monthLabel(month)} onClose={onClose}
      footer={<>
        <SheetActions><Button title="Cancel" variant="secondary" onPress={onClose} /><Button title={isEdit ? 'Save' : recurring ? `Create ${occurrences.length || ''}`.trim() : 'Add'} onPress={save} loading={update.isPending} /></SheetActions>
        {isEdit ? <Button title="Delete" variant="danger" onPress={remove} disabled={update.isPending} /> : null}
      </>}>
      {error || update.error ? <Banner tone="negative" message={error || update.error!.message} /> : null}
      {!isEdit ? (
        <SegmentedControl options={[{ value: 'once', label: 'One-time' }, { value: 'recurring', label: 'Recurring' }]}
          value={recurring ? 'recurring' : 'once'} onChange={v => setRecurring(v === 'recurring')} />
      ) : null}
      {isEdit && initial?.recurrence ? <Banner tone="info" message="Saving changes makes this occurrence one-time (same as the website)." /> : null}
      <ChipSelect label="Type" value={type} onChange={setType} options={OBLIGATION_TYPES.map(t => ({ value: t, label: t }))} />
      <TextField label="Note" value={note} onChangeText={setNote} placeholder="e.g. HDFC Credit Card Nov bill" autoCapitalize="sentences" />
      <SegmentedControl options={[{ value: 'INR' as const, label: '₹ INR' }, { value: 'USD' as const, label: '$ USD' }]} value={currency} onChange={setCurrency} />
      <TextField label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0" />

      {recurring && !isEdit ? (
        <>
          <SegmentedControl options={(['Monthly', 'Quarterly', 'Yearly'] as const).map(f => ({ value: f, label: f }))} value={frequency} onChange={setFrequency} />
          <FieldRow>
            <DateField label="First due date" value={dueDate} onChange={setDueDate} />
            <DateField label="End date" value={endDate} onChange={setEndDate} minimumDate={dueDate || undefined} />
          </FieldRow>
          {occurrences.length > 0 ? (
            <Summary lines={[{ label: 'Occurrences', value: `↻ ${occurrences.length} will be created (unpaid)`, strong: true }]} />
          ) : null}
        </>
      ) : (
        <>
          <SegmentedControl options={[{ value: 'Unpaid' as const, label: 'Unpaid' }, { value: 'Paid' as const, label: 'Paid' }]} value={status} onChange={setStatus} />
          {status === 'Unpaid'
            ? <DateField label="Due date (optional)" value={dueDate} onChange={setDueDate} clearable hint="Dated obligations are filed under their due-date month." />
            : <DateField label="Paid date (optional)" value={paidDate} onChange={setPaidDate} clearable />}
        </>
      )}
    </Sheet>
  );
}
