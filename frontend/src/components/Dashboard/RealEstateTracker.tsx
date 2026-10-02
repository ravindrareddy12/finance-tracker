import React, { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, DollarSign, Building2, ChevronDown, ChevronUp, FileSpreadsheet, Search, ArrowUpDown, ArrowUp, ArrowDown, Download } from 'lucide-react';
import { downloadExcel } from '../../utils/exportExcel';
import { RealEstateProperty } from '../../types';
import { useAuth } from '../../context/AuthContext';
import AddPropertyModal from '../Modals/AddPropertyModal';
import SellPropertyModal from '../Modals/SellPropertyModal';
import RealEstateImportModal from '../Modals/RealEstateImportModal';

function storageKey(user: string) { return `ft_realestate_${user}`; }

function load(user: string): RealEstateProperty[] {
  try { return JSON.parse(localStorage.getItem(storageKey(user)) || '[]'); }
  catch { return []; }
}
function save(user: string, data: RealEstateProperty[]) {
  localStorage.setItem(storageKey(user), JSON.stringify(data));
}

function yearsHeld(dateStr: string): number {
  return (Date.now() - new Date(dateStr).getTime()) / (365.25 * 24 * 3600 * 1000);
}

function estimatedValue(prop: RealEstateProperty): number {
  const myInv = prop.propertyPrice * (prop.mySharePercent / 100);
  if (!prop.appreciationPerYear || prop.appreciationPerYear <= 0) return myInv;
  const yrs = yearsHeld(prop.purchaseDate);
  return yrs > 0 ? myInv * Math.pow(1 + prop.appreciationPerYear / 100, yrs) : myInv;
}

function myInvestment(prop: RealEstateProperty): number {
  return prop.propertyPrice * (prop.mySharePercent / 100);
}

function fmt(n: number, currency: 'INR' | 'USD') {
  return n.toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US', { maximumFractionDigits: 2 });
}
function sym(currency: 'INR' | 'USD') { return currency === 'INR' ? '₹' : '$'; }

type SortField = 'propertyName' | 'purchaseDate' | 'propertyPrice' | 'myInvestment' | 'estValue' | 'appreciation';
type SortDir   = 'asc' | 'desc';

interface MetricCardProps { label: string; value: string; sub?: string; color?: string; badge?: string; badgeColor?: string; }
function MetricCard({ label, value, sub, color = 'text-gray-800', badge, badgeColor = 'bg-gray-100 text-gray-600' }: MetricCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm px-5 py-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">{label}</p>
      <div className="flex items-end gap-2">
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        {badge && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mb-0.5 ${badgeColor}`}>{badge}</span>}
      </div>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
  return dir === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-600" /> : <ArrowDown className="w-3 h-3 text-orange-600" />;
}

export default function RealEstateTracker() {
  const { currentUser } = useAuth();
  const user = currentUser ?? 'default';

  const [properties, setProperties] = useState<RealEstateProperty[]>(() => load(user));
  const [showAdd, setShowAdd]           = useState(false);
  const [showImport, setShowImport]     = useState(false);
  const [editProp, setEditProp]         = useState<RealEstateProperty | null>(null);
  const [sellProp, setSellProp]         = useState<RealEstateProperty | null>(null);
  const [expanded, setExpanded]         = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Filters
  const [statusFilter,   setStatusFilter]   = useState<'ALL' | 'active' | 'sold'>('ALL');
  const [currencyFilter, setCurrencyFilter] = useState<'ALL' | 'INR' | 'USD'>('ALL');
  const [search,         setSearch]         = useState('');

  // Sort
  const [sortField, setSortField] = useState<SortField>('purchaseDate');
  const [sortDir,   setSortDir]   = useState<SortDir>('desc');

  const persist = (data: RealEstateProperty[]) => { setProperties(data); save(user, data); };

  const handleAdd  = (prop: RealEstateProperty) => { persist([...properties, prop]); setShowAdd(false); };
  const handleImportProperties = (imported: RealEstateProperty[]) => { persist([...properties, ...imported]); };
  const handleEdit = (prop: RealEstateProperty) => { persist(properties.map(p => p.id === prop.id ? prop : p)); setEditProp(null); };
  const handleSell = (soldDate: string, soldAmount: number, soldNotes: string) => {
    if (!sellProp) return;
    persist(properties.map(p => p.id === sellProp.id ? { ...p, status: 'sold', soldDate, soldAmount, soldNotes: soldNotes || undefined } : p));
    setSellProp(null);
  };
  const handleDelete = (id: string) => { persist(properties.filter(p => p.id !== id)); setDeleteConfirm(null); };

  const handleSortClick = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const filtered = useMemo(() => {
    let list = properties;
    if (statusFilter   !== 'ALL') list = list.filter(p => p.status === statusFilter);
    if (currencyFilter !== 'ALL') list = list.filter(p => p.currency === currencyFilter);
    if (search.trim())            list = list.filter(p =>
      p.propertyName.toLowerCase().includes(search.toLowerCase()) ||
      (p.partner ?? '').toLowerCase().includes(search.toLowerCase())
    );

    return [...list].sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;
      switch (sortField) {
        case 'propertyName':  aVal = a.propertyName;                bVal = b.propertyName;                break;
        case 'purchaseDate':  aVal = new Date(a.purchaseDate).getTime(); bVal = new Date(b.purchaseDate).getTime(); break;
        case 'propertyPrice': aVal = a.propertyPrice;               bVal = b.propertyPrice;               break;
        case 'myInvestment':  aVal = myInvestment(a);               bVal = myInvestment(b);               break;
        case 'estValue':      aVal = estimatedValue(a);             bVal = estimatedValue(b);             break;
        case 'appreciation':  aVal = a.appreciationPerYear ?? 0;    bVal = b.appreciationPerYear ?? 0;    break;
      }
      if (typeof aVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [properties, statusFilter, currencyFilter, search, sortField, sortDir]);

  const active = properties.filter(p => p.status === 'active');
  const sold   = properties.filter(p => p.status === 'sold');

  const sumBy = (list: RealEstateProperty[], currency: 'INR' | 'USD', fn: (p: RealEstateProperty) => number) =>
    list.filter(p => p.currency === currency).reduce((s, p) => s + fn(p), 0);

  const inrActiveInvested  = sumBy(active, 'INR', myInvestment);
  const inrActiveEstimated = sumBy(active, 'INR', estimatedValue);
  const inrUnrealisedGain  = inrActiveEstimated - inrActiveInvested;
  const inrUnrealisedPct   = inrActiveInvested > 0 ? (inrUnrealisedGain / inrActiveInvested) * 100 : 0;
  const inrSoldInvested    = sumBy(sold, 'INR', myInvestment);
  const inrRealised        = sumBy(sold, 'INR', p => p.soldAmount ?? 0);
  const inrRealisedGain    = inrRealised - inrSoldInvested;

  const usdActiveInvested  = sumBy(active, 'USD', myInvestment);
  const usdActiveEstimated = sumBy(active, 'USD', estimatedValue);
  const usdUnrealisedGain  = usdActiveEstimated - usdActiveInvested;
  const usdUnrealisedPct   = usdActiveInvested > 0 ? (usdUnrealisedGain / usdActiveInvested) * 100 : 0;
  const usdSoldInvested    = sumBy(sold, 'USD', myInvestment);
  const usdRealised        = sumBy(sold, 'USD', p => p.soldAmount ?? 0);
  const usdRealisedGain    = usdRealised - usdSoldInvested;

  const hasINR = properties.some(p => p.currency === 'INR');
  const hasUSD = properties.some(p => p.currency === 'USD');

  const thCls = 'px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-orange-600 transition-colors';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Real Estate Investments</h2>
          <p className="text-sm text-gray-400 mt-0.5">Track properties, appreciation & realized gains</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              const rows = filtered.map(prop => {
                const myInv = myInvestment(prop);
                const estVal = prop.status === 'active' ? estimatedValue(prop) : (prop.soldAmount ?? myInv);
                return {
                  Property: prop.propertyName,
                  Currency: prop.currency,
                  Partner: prop.partner ?? '',
                  'Purchase Date': new Date(prop.purchaseDate).toLocaleDateString('en-IN'),
                  'Property Price': prop.propertyPrice,
                  'My Share %': prop.mySharePercent,
                  'My Investment': +myInv.toFixed(2),
                  'Est. Value': +estVal.toFixed(2),
                  'Gain': +(estVal - myInv).toFixed(2),
                  'Appreciation % p.a.': prop.appreciationPerYear ?? '',
                  Status: prop.status,
                  'Sold Date': prop.soldDate ? new Date(prop.soldDate).toLocaleDateString('en-IN') : '',
                  'Sold Amount': prop.soldAmount ?? '',
                  Notes: prop.amountNotes ?? '',
                };
              });
              downloadExcel(rows, 'real-estate', 'Real Estate');
            }}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
          >
            <Download className="w-4 h-4" /> Export Excel
          </button>
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors">
            <FileSpreadsheet className="w-4 h-4" /> Import Excel
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Add Property
          </button>
        </div>
      </div>

      {/* Filter / Sort bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search property / partner…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 w-52"
          />
        </div>

        {/* Status filter */}
        <div className="flex border border-gray-200 rounded-lg overflow-hidden text-xs font-medium">
          {(['ALL', 'active', 'sold'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 capitalize transition-colors ${statusFilter === s ? 'bg-orange-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              {s}
            </button>
          ))}
        </div>

        {/* Currency filter */}
        <div className="flex border border-gray-200 rounded-lg overflow-hidden text-xs font-medium">
          {(['ALL', 'INR', 'USD'] as const).map(c => (
            <button key={c} onClick={() => setCurrencyFilter(c)}
              className={`px-3 py-1.5 transition-colors ${currencyFilter === c ? 'bg-orange-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              {c}
            </button>
          ))}
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2 py-1.5 text-xs">
          <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
          <select
            value={sortField}
            onChange={e => { setSortField(e.target.value as SortField); setSortDir('asc'); }}
            className="text-xs border-none outline-none bg-transparent text-gray-600 cursor-pointer"
          >
            <option value="purchaseDate">Purchase Date</option>
            <option value="propertyName">Property Name</option>
            <option value="propertyPrice">Price</option>
            <option value="myInvestment">My Investment</option>
            <option value="estValue">Est. Value</option>
            <option value="appreciation">Appreciation %</option>
          </select>
          <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
            className="ml-1 text-orange-600 hover:text-orange-800">
            {sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {filtered.length < properties.length && (
          <span className="text-xs text-gray-400">{filtered.length} of {properties.length} shown</span>
        )}
      </div>

      {/* Summary cards — INR */}
      {hasINR && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">INR Properties</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <MetricCard label="Total Invested" value={`₹${fmt(inrActiveInvested, 'INR')}`} sub={`${active.filter(p => p.currency === 'INR').length} active`} />
            <MetricCard label="Total Current Value" value={`₹${fmt(inrActiveEstimated, 'INR')}`} sub="Appreciation-adjusted"
              color={inrActiveEstimated >= inrActiveInvested ? 'text-emerald-600' : 'text-red-600'} />
            <MetricCard label="Unrealised Gain" value={`₹${fmt(Math.abs(inrUnrealisedGain), 'INR')}`}
              color={inrUnrealisedGain >= 0 ? 'text-emerald-600' : 'text-red-600'}
              badge={`${inrUnrealisedGain >= 0 ? '+' : '-'}${Math.abs(inrUnrealisedPct).toFixed(1)}%`}
              badgeColor={inrUnrealisedGain >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}
              sub={inrUnrealisedGain >= 0 ? 'Profit on active' : 'Loss on active'} />
            <MetricCard label="Realised (Sold)" value={`₹${fmt(inrRealised, 'INR')}`}
              color={inrRealisedGain >= 0 ? 'text-emerald-600' : 'text-red-600'}
              sub={`${sold.filter(p => p.currency === 'INR').length} sold · ${inrRealisedGain >= 0 ? '+' : ''}₹${fmt(inrRealisedGain, 'INR')} gain`} />
            <MetricCard label="Net P&L" value={`₹${fmt(Math.abs(inrUnrealisedGain + inrRealisedGain), 'INR')}`}
              color={(inrUnrealisedGain + inrRealisedGain) >= 0 ? 'text-emerald-600' : 'text-red-600'}
              sub={(inrUnrealisedGain + inrRealisedGain) >= 0 ? 'Total profit' : 'Total loss'} />
          </div>
        </div>
      )}

      {/* Summary cards — USD */}
      {hasUSD && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">USD Properties</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <MetricCard label="Total Invested" value={`$${fmt(usdActiveInvested, 'USD')}`} sub={`${active.filter(p => p.currency === 'USD').length} active`} />
            <MetricCard label="Total Current Value" value={`$${fmt(usdActiveEstimated, 'USD')}`} sub="Appreciation-adjusted"
              color={usdActiveEstimated >= usdActiveInvested ? 'text-emerald-600' : 'text-red-600'} />
            <MetricCard label="Unrealised Gain" value={`$${fmt(Math.abs(usdUnrealisedGain), 'USD')}`}
              color={usdUnrealisedGain >= 0 ? 'text-emerald-600' : 'text-red-600'}
              badge={`${usdUnrealisedGain >= 0 ? '+' : '-'}${Math.abs(usdUnrealisedPct).toFixed(1)}%`}
              badgeColor={usdUnrealisedGain >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}
              sub={usdUnrealisedGain >= 0 ? 'Profit on active' : 'Loss on active'} />
            <MetricCard label="Realised (Sold)" value={`$${fmt(usdRealised, 'USD')}`}
              color={usdRealisedGain >= 0 ? 'text-emerald-600' : 'text-red-600'}
              sub={`${sold.filter(p => p.currency === 'USD').length} sold · ${usdRealisedGain >= 0 ? '+' : ''}$${fmt(usdRealisedGain, 'USD')} gain`} />
            <MetricCard label="Net P&L" value={`$${fmt(Math.abs(usdUnrealisedGain + usdRealisedGain), 'USD')}`}
              color={(usdUnrealisedGain + usdRealisedGain) >= 0 ? 'text-emerald-600' : 'text-red-600'}
              sub={(usdUnrealisedGain + usdRealisedGain) >= 0 ? 'Total profit' : 'Total loss'} />
          </div>
        </div>
      )}

      {!hasINR && !hasUSD && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {['Total Invested', 'Total Current Value', 'Unrealised Gain', 'Realised (Sold)', 'Net P&L'].map(label => (
            <MetricCard key={label} label={label} value="—" sub="No properties yet" />
          ))}
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl py-20 text-center text-gray-400">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">{properties.length === 0 ? 'No properties found' : 'No results match filters'}</p>
          <p className="text-sm mt-1">{properties.length === 0 ? 'Click "Add Property" to record your first investment' : 'Clear filters to see all properties'}</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className={`${thCls} text-left`} onClick={() => handleSortClick('propertyName')}>
                    <div className="flex items-center gap-1">Property <SortIcon active={sortField === 'propertyName'} dir={sortDir} /></div>
                  </th>
                  <th className={`${thCls} text-left`} onClick={() => handleSortClick('purchaseDate')}>
                    <div className="flex items-center gap-1">Purchase Date <SortIcon active={sortField === 'purchaseDate'} dir={sortDir} /></div>
                  </th>
                  <th className={`${thCls} text-right`} onClick={() => handleSortClick('propertyPrice')}>
                    <div className="flex items-center justify-end gap-1">Price <SortIcon active={sortField === 'propertyPrice'} dir={sortDir} /></div>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">My Share</th>
                  <th className={`${thCls} text-right`} onClick={() => handleSortClick('myInvestment')}>
                    <div className="flex items-center justify-end gap-1">My Investment <SortIcon active={sortField === 'myInvestment'} dir={sortDir} /></div>
                  </th>
                  <th className={`${thCls} text-right`} onClick={() => handleSortClick('estValue')}>
                    <div className="flex items-center justify-end gap-1">Est. Value <SortIcon active={sortField === 'estValue'} dir={sortDir} /></div>
                  </th>
                  <th className={`${thCls} text-center`} onClick={() => handleSortClick('appreciation')}>
                    <div className="flex items-center justify-center gap-1">Apprec. <SortIcon active={sortField === 'appreciation'} dir={sortDir} /></div>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(prop => {
                  const myInv   = myInvestment(prop);
                  const estVal  = prop.status === 'active' ? estimatedValue(prop) : (prop.soldAmount ?? myInv);
                  const gain    = estVal - myInv;
                  const gainPct = myInv > 0 ? (gain / myInv) * 100 : 0;
                  const s       = sym(prop.currency);
                  const isSold  = prop.status === 'sold';
                  const isExp   = expanded === prop.id;
                  const yrs     = yearsHeld(prop.purchaseDate);

                  return (
                    <React.Fragment key={prop.id}>
                      <tr className={`hover:bg-gray-50 transition-colors ${isSold ? 'opacity-70' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${isSold ? 'bg-gray-400' : 'bg-orange-500'}`} />
                            <div>
                              <p className="font-semibold text-gray-800">{prop.propertyName}</p>
                              {prop.partner && <p className="text-xs text-gray-400">Partner: {prop.partner}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          <p>{new Date(prop.purchaseDate).toLocaleDateString('en-IN')}</p>
                          <p className="text-xs text-gray-400">{Math.max(0, yrs).toFixed(1)} yrs</p>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">{s}{fmt(prop.propertyPrice, prop.currency)}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{prop.mySharePercent}%</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-800">{s}{fmt(myInv, prop.currency)}</td>
                        <td className="px-4 py-3 text-right">
                          <p className={`font-semibold ${isSold ? 'text-emerald-600' : gain >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {s}{fmt(estVal, prop.currency)}
                          </p>
                          {gain !== 0 && (
                            <p className={`text-xs ${gain >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {gain >= 0 ? '+' : ''}{gainPct.toFixed(1)}%
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-500 text-xs">
                          {prop.appreciationPerYear ? `${prop.appreciationPerYear}% p.a.` : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${isSold ? 'bg-gray-100 text-gray-600' : 'bg-orange-100 text-orange-700'}`}>
                            {isSold ? 'Sold' : 'Active'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => setEditProp(prop)} title="Edit"
                              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                              <Pencil className="w-4 h-4" />
                            </button>
                            {!isSold && (
                              <button onClick={() => setSellProp(prop)} title="Mark as Sold"
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                                <DollarSign className="w-4 h-4" />
                              </button>
                            )}
                            <button onClick={() => setExpanded(isExp ? null : prop.id)} title="Details"
                              className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
                              {isExp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            {deleteConfirm === prop.id ? (
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleDelete(prop.id)}
                                  className="text-xs bg-red-600 text-white px-2 py-1 rounded-lg font-medium">Confirm</button>
                                <button onClick={() => setDeleteConfirm(null)}
                                  className="text-xs border border-gray-200 px-2 py-1 rounded-lg text-gray-500">Cancel</button>
                              </div>
                            ) : (
                              <button onClick={() => setDeleteConfirm(prop.id)} title="Delete"
                                className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isExp && (
                        <tr>
                          <td colSpan={9} className="px-6 pb-4 pt-0 bg-gray-50">
                            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                              {prop.details1 && (
                                <div className="bg-white border border-gray-100 rounded-lg px-3 py-2">
                                  <p className="text-gray-400 font-semibold uppercase mb-0.5">Details 1</p>
                                  <p className="text-gray-700">{prop.details1}</p>
                                </div>
                              )}
                              {prop.details2 && (
                                <div className="bg-white border border-gray-100 rounded-lg px-3 py-2">
                                  <p className="text-gray-400 font-semibold uppercase mb-0.5">Details 2</p>
                                  <p className="text-gray-700">{prop.details2}</p>
                                </div>
                              )}
                              {prop.details3 && (
                                <div className="bg-white border border-gray-100 rounded-lg px-3 py-2">
                                  <p className="text-gray-400 font-semibold uppercase mb-0.5">Details 3</p>
                                  <p className="text-gray-700">{prop.details3}</p>
                                </div>
                              )}
                              {prop.amountNotes && (
                                <div className="bg-white border border-gray-100 rounded-lg px-3 py-2 col-span-2">
                                  <p className="text-gray-400 font-semibold uppercase mb-0.5">Amount Notes</p>
                                  <p className="text-gray-700">{prop.amountNotes}</p>
                                </div>
                              )}
                              {prop.status === 'sold' && prop.soldDate && (
                                <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 col-span-2">
                                  <p className="text-gray-400 font-semibold uppercase mb-0.5">Sale Details</p>
                                  <p className="text-gray-700">
                                    Sold on {new Date(prop.soldDate).toLocaleDateString('en-IN')} for{' '}
                                    <strong className="text-emerald-700">{sym(prop.currency)}{fmt(prop.soldAmount ?? 0, prop.currency)}</strong>
                                    {prop.soldNotes && ` — ${prop.soldNotes}`}
                                  </p>
                                </div>
                              )}
                              <div className="bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
                                <p className="text-gray-400 font-semibold uppercase mb-0.5">Appreciation Calc</p>
                                <p className="text-gray-700">
                                  {sym(prop.currency)}{fmt(myInvestment(prop), prop.currency)} × (1 + {prop.appreciationPerYear ?? 0}%)^{Math.max(0, yearsHeld(prop.purchaseDate)).toFixed(2)} yrs
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAdd   && <AddPropertyModal onSave={handleAdd} onClose={() => setShowAdd(false)} />}
      {showImport && <RealEstateImportModal onImport={handleImportProperties} onClose={() => setShowImport(false)} />}
      {editProp  && <AddPropertyModal initial={editProp} onSave={handleEdit} onClose={() => setEditProp(null)} />}
      {sellProp  && <SellPropertyModal property={sellProp} onSave={handleSell} onClose={() => setSellProp(null)} />}
    </div>
  );
}
