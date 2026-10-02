import React, { useState } from 'react';
import { X, CalendarClock } from 'lucide-react';
import { MFHolding, SIPSchedule, SIPFrequency } from '../../types';
import { firstDueDate } from '../../utils/sipUtils';

interface Props {
  holding: MFHolding;
  initial?: SIPSchedule;
  onSave: (schedule: SIPSchedule) => void;
  onClose: () => void;
}

const DAY_OPTIONS = [1, 5, 7, 10, 15, 20, 25, 28];
const ordinal = (d: number) => d + (['st','nd','rd'][d - 1] ?? 'th') + ' of month';

export default function AddFutureSIPModal({ holding, initial, onSave, onClose }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const isEdit = !!initial;

  const [frequency,  setFrequency]  = useState<SIPFrequency>(initial?.frequency  ?? 'monthly');
  const [amount,     setAmount]     = useState(initial ? String(initial.amount) : '');
  const [dayOfMonth, setDayOfMonth] = useState(initial?.dayOfMonth ?? 1);
  const [startDate,  setStartDate]  = useState(initial?.startDate  ?? today);
  const [endDate,    setEndDate]    = useState(initial?.endDate     ?? '');
  const [notes,      setNotes]      = useState(initial?.notes       ?? '');

  const amt     = parseFloat(amount) || 0;
  const canSave = amt > 0 && startDate && endDate && endDate > startDate;

  const previewCount = (() => {
    if (!canSave) return 0;
    const step = frequency === 'weekly' ? 7 : (frequency === 'monthly' ? 30 : 91);
    const days = (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000;
    return Math.max(1, Math.round(days / step));
  })();

  // For edit mode, keep the existing nextDueDate unless frequency/day/start changed
  const nextDue = canSave
    ? (isEdit && initial!.startDate === startDate && initial!.frequency === frequency && initial!.dayOfMonth === dayOfMonth
        ? initial!.nextDueDate
        : firstDueDate(startDate, frequency, dayOfMonth))
    : '';

  const handleSave = () => {
    if (!canSave) return;
    const schedule: SIPSchedule = {
      id:                  initial?.id               ?? `sip_${Date.now()}`,
      fundId:              initial?.fundId            ?? holding.id,
      schemeCode:          initial?.schemeCode        ?? holding.schemeCode,
      fundName:            initial?.fundName          ?? holding.fundName,
      amount:              amt,
      frequency,
      dayOfMonth,
      startDate,
      endDate,
      nextDueDate:         nextDue,
      lastProcessedDate:   initial?.lastProcessedDate ?? null,
      active:              initial?.active            ?? true,
      notes:               notes || undefined,
    };
    onSave(schedule);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-sm font-semibold text-gray-800">{isEdit ? 'Edit SIP Schedule' : 'Setup Future SIP'}</h2>
              <p className="text-xs text-gray-400 truncate max-w-[280px]">{holding.fundName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">

          {!isEdit && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-xs text-indigo-700">
              SIP transactions will be automatically added on or after each due date using the NAV for that day.
            </div>
          )}

          {/* Frequency */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Frequency</label>
            <div className="flex border border-gray-200 rounded-lg overflow-hidden text-sm font-medium">
              {(['monthly', 'quarterly', 'weekly'] as SIPFrequency[]).map(f => (
                <button key={f} onClick={() => setFrequency(f)}
                  className={`flex-1 py-2 capitalize transition-colors ${frequency === f ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Amount */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">SIP Amount (₹)</label>
              <input type="number" min="1" step="100" placeholder="5000"
                value={amount} onChange={e => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>

            {/* Day of month */}
            {frequency !== 'weekly' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Day of Month</label>
                <select value={dayOfMonth} onChange={e => setDayOfMonth(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  {DAY_OPTIONS.map(d => <option key={d} value={d}>{ordinal(d)}</option>)}
                </select>
              </div>
            )}

            {/* Start Date */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
              <input type="date" value={endDate} min={startDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes (optional)</label>
            <input type="text" placeholder="e.g. Retirement SIP"
              value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>

          {/* Preview */}
          {canSave && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-xs text-emerald-800 space-y-1">
              <div className="flex justify-between">
                <span>{isEdit ? 'Next installment' : 'First installment'}</span>
                <strong>{new Date(nextDue).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
              </div>
              <div className="flex justify-between">
                <span>Est. installments</span>
                <strong>~{previewCount}</strong>
              </div>
              <div className="flex justify-between">
                <span>Est. total</span>
                <strong>₹{(amt * previewCount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 pb-5 flex justify-end gap-2">
          <button onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={!canSave}
            className="px-5 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {isEdit ? 'Save Changes' : 'Activate SIP'}
          </button>
        </div>
      </div>
    </div>
  );
}
