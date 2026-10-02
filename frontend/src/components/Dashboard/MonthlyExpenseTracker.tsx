import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MonthlyObligation, ObligationType, PaymentStatus, RecurrenceFrequency } from '../../types';
import {
  Plus, ChevronLeft, ChevronRight, Check, Clock, Trash2,
  Pencil, Copy, X, CreditCard, Home, User, Building, MoreHorizontal,
  ArrowUpDown, ArrowUp, ArrowDown, Filter, Repeat, FileSpreadsheet,
} from 'lucide-react';
import { downloadExcel } from '../../utils/exportExcel';
import { Download } from 'lucide-react';
import ExpenseExcelImportModal from '../Modals/ExpenseExcelImportModal';

type SortCol = 'type' | 'note' | 'amount' | 'status' | 'dueDate' | 'paidDate';
type SortDir = 'asc' | 'desc';

// ─── Constants ───────────────────────────────────────────────────────────────

const OBLIGATION_TYPES: ObligationType[] = [
  'Credit Card', 'Housing Loan', 'Personal Loan', 'Rent', 'Others',
];

const TYPE_CONFIG: Record<ObligationType, { color: string; icon: React.ReactNode }> = {
  'Credit Card':    { color: 'bg-purple-100 text-purple-700 border-purple-200', icon: <CreditCard className="w-3 h-3" /> },
  'Housing Loan':   { color: 'bg-blue-100 text-blue-700 border-blue-200',       icon: <Home className="w-3 h-3" /> },
  'Personal Loan':  { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: <User className="w-3 h-3" /> },
  'Rent':           { color: 'bg-green-100 text-green-700 border-green-200',    icon: <Building className="w-3 h-3" /> },
  'Others':         { color: 'bg-gray-100 text-gray-700 border-gray-200',       icon: <MoreHorizontal className="w-3 h-3" /> },
};

// ─── Storage helpers ──────────────────────────────────────────────────────────

function storageKey(user: string) { return `ft_monthly_expenses_${user}`; }

function loadAll(user: string): Record<string, MonthlyObligation[]> {
  try { return JSON.parse(localStorage.getItem(storageKey(user)) || '{}'); }
  catch { return {}; }
}

function saveAll(user: string, data: Record<string, MonthlyObligation[]>) {
  localStorage.setItem(storageKey(user), JSON.stringify(data));
}

// ─── Month helpers ────────────────────────────────────────────────────────────

function toKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}

// ─── Modal ───────────────────────────────────────────────────────────────────

interface ObligationForm {
  type: ObligationType;
  note: string;
  amount: string;
  currency: 'INR' | 'USD';
  status: PaymentStatus;
  paidDate: string;
  dueDate: string;
  isRecurring: boolean;
  frequency: RecurrenceFrequency;
  recurrenceEndDate: string;
}

const EMPTY_FORM: ObligationForm = {
  type: 'Credit Card', note: '', amount: '', currency: 'INR', status: 'Unpaid',
  paidDate: '', dueDate: '', isRecurring: false, frequency: 'Monthly', recurrenceEndDate: '',
};

function addPeriod(date: Date, freq: RecurrenceFrequency): Date {
  const d = new Date(date);
  if (freq === 'Monthly')   d.setMonth(d.getMonth() + 1);
  if (freq === 'Quarterly') d.setMonth(d.getMonth() + 3);
  if (freq === 'Yearly')    d.setFullYear(d.getFullYear() + 1);
  return d;
}

function generateRecurringDates(startDate: string, freq: RecurrenceFrequency, endDate: string): string[] {
  const dates: string[] = [];
  const end = new Date(endDate);
  let cur = new Date(startDate);
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur = addPeriod(cur, freq);
  }
  return dates;
}

function ObligationModal({
  initial, onSave, onSaveMany, onClose,
}: {
  initial?: MonthlyObligation;
  onSave: (o: Omit<MonthlyObligation, 'id'>) => void;
  onSaveMany?: (os: Omit<MonthlyObligation, 'id'>[]) => void;
  onClose: () => void;
}) {
  const isEdit = !!initial;
  const [form, setForm] = useState<ObligationForm>(
    initial
      ? {
          type: initial.type, note: initial.note, amount: String(initial.amount),
          currency: initial.currency ?? 'INR', status: initial.status,
          paidDate: initial.paidDate ?? '', dueDate: initial.dueDate ?? '',
          isRecurring: !!initial.recurrence, frequency: initial.recurrence?.frequency ?? 'Monthly',
          recurrenceEndDate: initial.recurrence?.endDate ?? '',
        }
      : EMPTY_FORM,
  );
  const [err, setErr] = useState('');

  const set = (k: keyof ObligationForm, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      setErr('Enter a valid amount'); return;
    }
    if (form.isRecurring && !isEdit) {
      if (!form.dueDate) { setErr('Start date (Due Date) is required for recurring obligations'); return; }
      if (!form.recurrenceEndDate) { setErr('End date is required for recurring obligations'); return; }
      if (new Date(form.recurrenceEndDate) <= new Date(form.dueDate)) {
        setErr('End date must be after the start date'); return;
      }
      const groupId = crypto.randomUUID();
      const dates = generateRecurringDates(form.dueDate, form.frequency, form.recurrenceEndDate);
      if (dates.length === 0) { setErr('No occurrences generated — check dates'); return; }
      const instances: Omit<MonthlyObligation, 'id'>[] = dates.map(d => ({
        type: form.type,
        note: form.note.trim(),
        amount: Number(form.amount),
        currency: form.currency,
        status: 'Unpaid' as PaymentStatus,
        paidDate: null,
        dueDate: d,
        recurrence: { frequency: form.frequency, endDate: form.recurrenceEndDate, groupId },
      }));
      onSaveMany?.(instances);
      onClose();
      return;
    }
    onSave({
      type: form.type,
      note: form.note.trim(),
      amount: Number(form.amount),
      currency: form.currency,
      status: form.status,
      paidDate: form.status === 'Paid' && form.paidDate ? form.paidDate : null,
      dueDate: form.status === 'Unpaid' && form.dueDate ? form.dueDate : null,
      recurrence: null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90dvh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-gray-800">{isEdit ? 'Edit Obligation' : 'Add Obligation'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        <div className="space-y-4">
          {/* One-time / Recurring toggle — only on add */}
          {!isEdit && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Transaction Type</label>
              <div className="flex gap-2">
                {[{ val: false, label: 'One-time', icon: <Check className="w-3.5 h-3.5" /> },
                  { val: true,  label: 'Recurring', icon: <Repeat className="w-3.5 h-3.5" /> }].map(opt => (
                  <button key={String(opt.val)} type="button"
                    onClick={() => set('isRecurring', opt.val)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      form.isRecurring === opt.val
                        ? opt.val ? 'bg-purple-50 text-purple-700 border-purple-300' : 'bg-blue-50 text-blue-700 border-blue-300'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}>
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recurring options */}
          {form.isRecurring && !isEdit && (
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1.5">Frequency</label>
                <div className="flex gap-2">
                  {(['Monthly', 'Quarterly', 'Yearly'] as RecurrenceFrequency[]).map(f => (
                    <button key={f} type="button" onClick={() => set('frequency', f)}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                        form.frequency === f ? 'bg-purple-600 text-white border-purple-600' : 'border-purple-200 text-purple-600 hover:bg-purple-100'
                      }`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1.5">Start Date</label>
                  <input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1.5">End Date</label>
                  <input type="date" value={form.recurrenceEndDate} onChange={e => set('recurrenceEndDate', e.target.value)}
                    min={form.dueDate || undefined}
                    className="w-full px-3 py-2 text-sm border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white" />
                </div>
              </div>
              {form.dueDate && form.recurrenceEndDate && new Date(form.recurrenceEndDate) > new Date(form.dueDate) && (
                <p className="text-xs text-purple-600">
                  ↻ {generateRecurringDates(form.dueDate, form.frequency, form.recurrenceEndDate).length} occurrence{generateRecurringDates(form.dueDate, form.frequency, form.recurrenceEndDate).length !== 1 ? 's' : ''} will be created
                </p>
              )}
            </div>
          )}

          {/* Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {OBLIGATION_TYPES.map(t => (
                <button key={t} onClick={() => set('type', t)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${form.type === t ? TYPE_CONFIG[t].color + ' border' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {TYPE_CONFIG[t].icon} {t}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Note</label>
            <input value={form.note} onChange={e => set('note', e.target.value)}
              placeholder="e.g. HDFC Credit Card Nov bill"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>

          {/* Amount + Currency */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Amount</label>
            <div className="flex gap-2">
              <div className="flex rounded-lg border border-gray-200 overflow-hidden shrink-0">
                {(['INR', 'USD'] as const).map(c => (
                  <button key={c} type="button" onClick={() => set('currency', c)}
                    className={`px-3 py-2 text-xs font-semibold transition-colors ${form.currency === c ? (c === 'INR' ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white') : 'text-gray-500 hover:bg-gray-50'}`}>
                    {c === 'INR' ? '₹ INR' : '$ USD'}
                  </button>
                ))}
              </div>
              <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)}
                placeholder="0"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
          </div>

          {/* Status — hidden for recurring (always Unpaid) */}
          {!form.isRecurring && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Status</label>
              <div className="flex gap-2">
                {(['Unpaid', 'Paid'] as PaymentStatus[]).map(s => (
                  <button key={s} onClick={() => set('status', s)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm font-medium transition-colors ${form.status === s
                      ? s === 'Paid' ? 'bg-green-50 text-green-700 border-green-300' : 'bg-red-50 text-red-600 border-red-200'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                    {s === 'Paid' ? <Check className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />} {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Due Date — one-time unpaid only */}
          {!form.isRecurring && form.status === 'Unpaid' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Due Date <span className="text-gray-400 font-normal normal-case">(optional)</span></label>
              <input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          )}

          {/* Paid Date — only when Paid */}
          {!form.isRecurring && form.status === 'Paid' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Date of Payment</label>
              <input type="date" value={form.paidDate} onChange={e => set('paidDate', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={onClose}
            className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit}
            className={`flex-1 py-2 text-sm text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-1.5 ${form.isRecurring && !isEdit ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
            {form.isRecurring && !isEdit ? <><Repeat className="w-3.5 h-3.5" /> Create Recurring</> : isEdit ? 'Save Changes' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MonthlyExpenseTracker() {
  const { currentUser } = useAuth();
  const user = currentUser ?? 'default';

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [allData, setAllData] = useState<Record<string, MonthlyObligation[]>>(() => loadAll(user));
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<MonthlyObligation | null>(null);
  const [statusFilter, setStatusFilter] = useState<'All' | PaymentStatus>('All');
  const [sortCol, setSortCol] = useState<SortCol | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [movedToast, setMovedToast] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  const monthKey = toKey(year, month);

  // Returns the storage key for an obligation: due-date month if set, else current month
  const targetKey = (o: Omit<MonthlyObligation, 'id'>) => {
    if (!o.dueDate) return monthKey;
    const d = new Date(o.dueDate);
    return toKey(d.getFullYear(), d.getMonth());
  };

  // One-time migration: move any obligation stored in the wrong month bucket
  React.useEffect(() => {
    const data = loadAll(user);
    const migrated: Record<string, MonthlyObligation[]> = {};
    // Copy all months first
    Object.keys(data).forEach(k => { migrated[k] = []; });
    Object.entries(data).forEach(([key, obs]) => {
      obs.forEach(o => {
        if (o.dueDate) {
          const d = new Date(o.dueDate);
          const dest = toKey(d.getFullYear(), d.getMonth());
          if (!migrated[dest]) migrated[dest] = [];
          migrated[dest].push(o);
        } else {
          if (!migrated[key]) migrated[key] = [];
          migrated[key].push(o);
        }
      });
    });
    const changed = JSON.stringify(migrated) !== JSON.stringify(data);
    if (changed) { setAllData(migrated); saveAll(user, migrated); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const obligations: MonthlyObligation[] = useMemo(() => allData[monthKey] ?? [], [allData, monthKey]);

  const handleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const displayObligations = useMemo(() => {
    let list = statusFilter === 'All' ? obligations : obligations.filter(o => o.status === statusFilter);
    if (sortCol) {
      list = [...list].sort((a, b) => {
        let va: string | number = '', vb: string | number = '';
        if (sortCol === 'type')     { va = a.type;    vb = b.type; }
        if (sortCol === 'note')     { va = a.note;    vb = b.note; }
        if (sortCol === 'amount')   { va = a.amount;  vb = b.amount; }
        if (sortCol === 'status')   { va = a.status;  vb = b.status; }
        if (sortCol === 'dueDate')  { va = a.dueDate ?? ''; vb = b.dueDate ?? ''; }
        if (sortCol === 'paidDate') { va = a.paidDate ?? ''; vb = b.paidDate ?? ''; }
        const cmp = typeof va === 'number' ? va - (vb as number) : String(va).localeCompare(String(vb));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return list;
  }, [obligations, statusFilter, sortCol, sortDir]);

  const isFiltered = statusFilter !== 'All' || sortCol !== null;

  const persist = (next: Record<string, MonthlyObligation[]>) => {
    setAllData(next);
    saveAll(user, next);
  };

  const updateMonth = (obs: MonthlyObligation[]) => persist({ ...allData, [monthKey]: obs });

  // Navigation
  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  const showMoved = (dest: string) => {
    const [y, m] = dest.split('-').map(Number);
    setMovedToast(monthLabel(y, m - 1));
    setTimeout(() => setMovedToast(null), 4000);
  };

  // CRUD
  const handleAdd = (o: Omit<MonthlyObligation, 'id'>) => {
    const dest = targetKey(o);
    const newOb = { ...o, id: crypto.randomUUID() };
    if (dest !== monthKey) {
      persist({ ...allData, [dest]: [...(allData[dest] ?? []), newOb] });
      showMoved(dest);
    } else {
      updateMonth([...obligations, newOb]);
    }
  };

  const handleEdit = (o: Omit<MonthlyObligation, 'id'>) => {
    const dest = targetKey(o);
    if (dest !== monthKey) {
      // Remove from current month, place in due-date month
      const withoutCurrent = obligations.filter(ob => ob.id !== editItem!.id);
      const destObs = allData[dest] ?? [];
      persist({ ...allData, [monthKey]: withoutCurrent, [dest]: [...destObs, { ...o, id: editItem!.id }] });
      showMoved(dest);
    } else {
      updateMonth(obligations.map(ob => ob.id === editItem!.id ? { ...o, id: ob.id } : ob));
    }
  };

  // Bulk add for recurring obligations — routes each instance to its due-date month
  const handleAddMany = (os: Omit<MonthlyObligation, 'id'>[]) => {
    const next = { ...allData };
    os.forEach(o => {
      const newOb = { ...o, id: crypto.randomUUID() };
      const dest = targetKey(o);
      next[dest] = [...(next[dest] ?? []), newOb];
    });
    persist(next);
    const uniqueMonths = [...new Set(os.map(o => o.dueDate ? toKey(new Date(o.dueDate).getFullYear(), new Date(o.dueDate).getMonth()) : monthKey))];
    if (uniqueMonths.length > 1) {
      setMovedToast(`${os.length} occurrences created across ${uniqueMonths.length} months`);
      setTimeout(() => setMovedToast(null), 4000);
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this obligation?')) return;
    updateMonth(obligations.filter(o => o.id !== id));
  };

  const toggleStatus = (id: string) => {
    updateMonth(obligations.map(o => {
      if (o.id !== id) return o;
      const next: PaymentStatus = o.status === 'Paid' ? 'Unpaid' : 'Paid';
      return { ...o, status: next, paidDate: next === 'Paid' ? new Date().toISOString().slice(0, 10) : null };
    }));
  };

  // Copy from previous month
  const copyFromPrev = () => {
    const pm = month === 0 ? 11 : month - 1;
    const py = month === 0 ? year - 1 : year;
    const prevKey = toKey(py, pm);
    const prevObs = allData[prevKey] ?? [];
    if (prevObs.length === 0) { alert(`No obligations found in ${monthLabel(py, pm)}.`); return; }
    if (obligations.length > 0 && !confirm(`This will append ${prevObs.length} obligation(s) from ${monthLabel(py, pm)} to ${monthLabel(year, month)}. Continue?`)) return;
    const copied: MonthlyObligation[] = prevObs.map(o => ({
      ...o, id: crypto.randomUUID(), status: 'Unpaid', paidDate: null, dueDate: null,
    }));
    updateMonth([...obligations, ...copied]);
  };

  // Export
  const handleExport = () => {
    const rows = obligations.map((o, i) => ({
      '#': i + 1,
      Type: o.type,
      Note: o.note,
      Currency: o.currency ?? 'INR',
      Amount: o.amount,
      Status: o.status,
      'Due Date': o.status === 'Unpaid' ? (o.dueDate ?? '') : '',
      'Paid Date': o.paidDate ?? '',
    }));
    downloadExcel(rows, `monthly-expenses-${monthKey}`, 'Expenses');
  };

  // Summaries
  const fmtINR = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  const fmtUSD = (n: number) => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const fmt = (n: number, ccy: 'INR' | 'USD') => ccy === 'INR' ? fmtINR(n) : fmtUSD(n);

  const inr = obligations.filter(o => (o.currency ?? 'INR') === 'INR');
  const usd = obligations.filter(o => o.currency === 'USD');

  const totalINR       = inr.reduce((s, o) => s + o.amount, 0);
  const totalUSD       = usd.reduce((s, o) => s + o.amount, 0);
  const paidINR        = inr.filter(o => o.status === 'Paid').reduce((s, o) => s + o.amount, 0);
  const paidUSD        = usd.filter(o => o.status === 'Paid').reduce((s, o) => s + o.amount, 0);
  const unpaidINR      = totalINR - paidINR;
  const unpaidUSD      = totalUSD - paidUSD;
  const paidCount      = obligations.filter(o => o.status === 'Paid').length;
  const unpaidCount    = obligations.length - paidCount;

  const hasBoth = inr.length > 0 && usd.length > 0;
  const onlyUSD = inr.length === 0 && usd.length > 0;

  // Group by type for the default (unfiltered/unsorted) view
  const grouped = useMemo(() => {
    const map = new Map<ObligationType, MonthlyObligation[]>();
    OBLIGATION_TYPES.forEach(t => map.set(t, []));
    displayObligations.forEach(o => map.get(o.type)?.push(o));
    return map;
  }, [displayObligations]);

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Month navigator */}
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <span className="text-base font-semibold text-gray-800 w-40 text-center">{monthLabel(year, month)}</span>
          <button onClick={nextMonth} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={copyFromPrev}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Copy className="w-4 h-4" /> Copy from Previous Month
          </button>
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-blue-700 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
            <FileSpreadsheet className="w-4 h-4" /> Import
          </button>
          <button onClick={handleExport} disabled={obligations.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors disabled:opacity-40">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => { setEditItem(null); setShowModal(true); }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium">
            <Plus className="w-4 h-4" /> Add Obligation
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <SummaryCard label="TOTAL OBLIGATIONS"
          value={hasBoth ? fmtINR(totalINR) : onlyUSD ? fmtUSD(totalUSD) : fmtINR(totalINR)}
          value2={hasBoth ? fmtUSD(totalUSD) : undefined}
          sub={`${obligations.length} item${obligations.length !== 1 ? 's' : ''}`} color="gray" />
        <SummaryCard label="TOTAL PAID"
          value={hasBoth ? fmtINR(paidINR) : onlyUSD ? fmtUSD(paidUSD) : fmtINR(paidINR)}
          value2={hasBoth ? fmtUSD(paidUSD) : undefined}
          sub={`${paidCount} paid`} color="green" />
        <SummaryCard label="TOTAL UNPAID"
          value={hasBoth ? fmtINR(unpaidINR) : onlyUSD ? fmtUSD(unpaidUSD) : fmtINR(unpaidINR)}
          value2={hasBoth ? fmtUSD(unpaidUSD) : undefined}
          sub={`${unpaidCount} pending`} color="red" />
        <SummaryCard label="COMPLETION"
          value={obligations.length > 0 ? `${Math.round((paidCount / obligations.length) * 100)}%` : '—'}
          sub={`${paidCount} of ${obligations.length} paid`}
          color={obligations.length > 0 && paidCount === obligations.length ? 'green' : 'orange'} />
      </div>

      {/* Filter + sort bar */}
      {obligations.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</span>
          </div>
          {(['All', 'Unpaid', 'Paid'] as const).map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                statusFilter === f
                  ? f === 'Paid'   ? 'bg-green-600 text-white border-green-600'
                  : f === 'Unpaid' ? 'bg-red-500 text-white border-red-500'
                  : 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}>
              {f === 'Paid' && <Check className="w-3 h-3 inline mr-1" />}
              {f === 'Unpaid' && <Clock className="w-3 h-3 inline mr-1" />}
              {f}{f !== 'All' && ` (${obligations.filter(o => o.status === f).length})`}
            </button>
          ))}
          {sortCol && (
            <button onClick={() => { setSortCol(null); setSortDir('asc'); }}
              className="ml-auto flex items-center gap-1 px-2.5 py-1 text-xs text-gray-500 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors">
              <X className="w-3 h-3" /> Clear sort
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {obligations.length === 0 ? (
        <div className="text-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-200">
          <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No obligations for {monthLabel(year, month)}</p>
          <p className="text-sm mt-1">Click <strong>Add Obligation</strong> or <strong>Copy from Previous Month</strong> to get started</p>
        </div>
      ) : displayObligations.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-200">
          <Check className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="font-medium">No {statusFilter.toLowerCase()} obligations this month</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <SortTh col="type"     label="Type"      sortCol={sortCol} sortDir={sortDir} onSort={handleSort} align="left" />
                  <SortTh col="note"     label="Note"      sortCol={sortCol} sortDir={sortDir} onSort={handleSort} align="left" />
                  <SortTh col="amount"   label="Amount"    sortCol={sortCol} sortDir={sortDir} onSort={handleSort} align="right" />
                  <SortTh col="status"   label="Status"    sortCol={sortCol} sortDir={sortDir} onSort={handleSort} align="center" />
                  <SortTh col="dueDate"  label="Due Date"  sortCol={sortCol} sortDir={sortDir} onSort={handleSort} align="left" />
                  <SortTh col="paidDate" label="Paid Date" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} align="left" />
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isFiltered
                  /* ── Flat list when filter/sort active ── */
                  ? displayObligations.map(o => <ObligationRow key={o.id} o={o} onEdit={() => { setEditItem(o); setShowModal(true); }} onDelete={() => handleDelete(o.id)} onToggle={() => toggleStatus(o.id)} />)
                  /* ── Grouped view when default ── */
                  : OBLIGATION_TYPES.map(type => {
                      const items = grouped.get(type) ?? [];
                      if (items.length === 0) return null;
                      return (
                        <React.Fragment key={type}>
                          <tr className="bg-gray-50/60">
                            <td colSpan={7} className="px-4 py-2">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${TYPE_CONFIG[type].color}`}>
                                {TYPE_CONFIG[type].icon} {type}
                                <span className="ml-1 opacity-60">({items.length})</span>
                              </span>
                            </td>
                          </tr>
                          {items.map(o => <ObligationRow key={o.id} o={o} onEdit={() => { setEditItem(o); setShowModal(true); }} onDelete={() => handleDelete(o.id)} onToggle={() => toggleStatus(o.id)} />)}
                          <tr className="bg-gray-50/40">
                            <td colSpan={2} className="px-4 py-2 text-xs text-gray-500 font-medium pl-8">
                              {type} subtotal — {items.filter(i => i.status === 'Paid').length}/{items.length} paid
                            </td>
                            <td className="px-4 py-2 text-right text-xs font-semibold text-gray-700">
                              {(() => {
                                const iINR = items.filter(i => (i.currency ?? 'INR') === 'INR').reduce((s, i) => s + i.amount, 0);
                                const iUSD = items.filter(i => i.currency === 'USD').reduce((s, i) => s + i.amount, 0);
                                return [iINR > 0 && fmtINR(iINR), iUSD > 0 && fmtUSD(iUSD)].filter(Boolean).join(' + ') || '—';
                              })()}
                            </td>
                            <td colSpan={4} />
                          </tr>
                        </React.Fragment>
                      );
                    })
                }
              </tbody>
              <tfoot>
                {(() => {
                  const dINR = displayObligations.filter(o => (o.currency ?? 'INR') === 'INR');
                  const dUSD = displayObligations.filter(o => o.currency === 'USD');
                  const totINR = dINR.reduce((s, o) => s + o.amount, 0);
                  const totUSD = dUSD.reduce((s, o) => s + o.amount, 0);
                  const pINR = dINR.filter(o => o.status === 'Paid').reduce((s, o) => s + o.amount, 0);
                  const pUSD = dUSD.filter(o => o.status === 'Paid').reduce((s, o) => s + o.amount, 0);
                  const uINR = totINR - pINR;
                  const uUSD = totUSD - pUSD;
                  const totStr = [totINR > 0 && fmtINR(totINR), totUSD > 0 && fmtUSD(totUSD)].filter(Boolean).join(' + ');
                  const paidStr = [pINR > 0 && fmtINR(pINR), pUSD > 0 && fmtUSD(pUSD)].filter(Boolean).join(' + ');
                  const unpaidStr = [uINR > 0 && fmtINR(uINR), uUSD > 0 && fmtUSD(uUSD)].filter(Boolean).join(' + ');
                  return (
                    <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                      <td colSpan={2} className="px-4 py-3 text-gray-700">
                        {isFiltered ? `${displayObligations.length} item${displayObligations.length !== 1 ? 's' : ''}` : 'Total'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900 text-xs">{totStr || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs text-green-700">{paidStr || '—'} paid</span>
                      </td>
                      <td colSpan={2} className="px-4 py-3">
                        <span className="text-xs text-red-600">{unpaidStr || '—'} pending</span>
                      </td>
                      <td />
                    </tr>
                  );
                })()}
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Moved-month toast */}
      {movedToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg animate-fade-in">
          <span>↗ Obligation moved to <strong>{movedToast}</strong> (matches due date)</span>
          <button onClick={() => setMovedToast(null)} className="ml-1 opacity-70 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Obligation Modal */}
      {showModal && (
        <ObligationModal
          initial={editItem ?? undefined}
          onSave={editItem ? handleEdit : handleAdd}
          onSaveMany={handleAddMany}
          onClose={() => { setShowModal(false); setEditItem(null); }}
        />
      )}

      {/* Excel Import Modal */}
      {showImport && (
        <ExpenseExcelImportModal
          allData={allData}
          defaultMonthKey={monthKey}
          onImport={updated => { persist(updated); setShowImport(false); }}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}

// ─── Sortable header cell ─────────────────────────────────────────────────────

function SortTh({ col, label, sortCol, sortDir, onSort, align }: {
  col: SortCol; label: string; sortCol: SortCol | null; sortDir: SortDir;
  onSort: (c: SortCol) => void; align: 'left' | 'right' | 'center';
}) {
  const active = sortCol === col;
  const Icon = active ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th
      onClick={() => onSort(col)}
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide cursor-pointer select-none hover:bg-gray-100 transition-colors ${
        active ? 'text-blue-600 bg-blue-50' : 'text-gray-500'
      } text-${align}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <Icon className={`w-3 h-3 ${active ? 'text-blue-500' : 'text-gray-300'}`} />
      </span>
    </th>
  );
}

// ─── Table data row (shared by flat and grouped views) ────────────────────────

function ObligationRow({ o, onEdit, onDelete, onToggle }: {
  o: MonthlyObligation;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const ccy = o.currency ?? 'INR';
  const sym = ccy === 'INR' ? '₹' : '$';
  const locale = ccy === 'INR' ? 'en-IN' : 'en-US';
  const fmtAmt = (n: number) => sym + n.toLocaleString(locale, { maximumFractionDigits: 0 });

  return (
    <tr className={`hover:bg-gray-50 transition-colors ${o.status === 'Paid' ? 'opacity-75' : ''}`}>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${TYPE_CONFIG[o.type].color}`}>
          {TYPE_CONFIG[o.type].icon} {o.type}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-700 max-w-xs">
        <div className="flex flex-col gap-1">
          <span>{o.note || <span className="text-gray-400 text-xs">—</span>}</span>
          {o.recurrence && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-600 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded-full w-fit">
              <Repeat className="w-2.5 h-2.5" /> {o.recurrence.frequency}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-right font-semibold text-gray-800">
        <span className={`inline-flex items-center gap-1`}>
          <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${ccy === 'INR' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>{ccy}</span>
          {fmtAmt(o.amount)}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <button onClick={onToggle}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
            o.status === 'Paid'
              ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
              : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
          }`}>
          {o.status === 'Paid' ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
          {o.status}
        </button>
      </td>
      <td className="px-4 py-3 text-sm">
        {o.status === 'Unpaid' && o.dueDate ? (() => {
          const due = new Date(o.dueDate);
          const isOverdue = due < new Date(new Date().toDateString());
          return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${isOverdue ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
              {isOverdue && <Clock className="w-3 h-3" />}
              {due.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          );
        })() : <span className="text-gray-400 text-xs">—</span>}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {o.paidDate
          ? new Date(o.paidDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
          : <span className="text-gray-400 text-xs">—</span>}
      </td>
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-1">
          <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Summary card ─────────────────────────────────────────────────────────────

const COLOR_MAP = {
  gray:   'border-gray-200 text-gray-900',
  green:  'border-green-200 text-green-700',
  red:    'border-red-200 text-red-600',
  orange: 'border-orange-200 text-orange-700',
};

function SummaryCard({ label, value, value2, sub, color }: { label: string; value: string; value2?: string; sub: string; color: keyof typeof COLOR_MAP }) {
  return (
    <div className={`bg-white border rounded-xl p-4 shadow-sm ${COLOR_MAP[color]}`}>
      <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-2">{label}</p>
      <p className={`text-lg font-bold leading-tight ${COLOR_MAP[color].split(' ')[1]}`}>{value}</p>
      {value2 && <p className={`text-sm font-semibold leading-tight mt-0.5 ${COLOR_MAP[color].split(' ')[1]} opacity-70`}>{value2}</p>}
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}
