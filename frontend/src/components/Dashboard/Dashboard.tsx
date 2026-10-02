import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PortfolioProvider } from '../../context/PortfolioContext';
import { AppConfigProvider, useAppConfig } from '../../context/AppConfigContext';
import ConsolidatedDashboard from './ConsolidatedDashboard';
import EquityPortfolio from './EquityPortfolio';
import LoanTracker from './LoanTracker';
import RealEstateTracker from './RealEstateTracker';
import AdditionalInvestments from './AdditionalInvestments';
import MutualFundTracker from './MutualFundTracker';
import FIRETracker from './FIRETracker';
import MonthlyExpenseTracker from './MonthlyExpenseTracker';
import MonthlyExpenseReport from './MonthlyExpenseReport';
import ConfigurationPage from './ConfigurationPage';
import { TrendingUp, LogOut, HandCoins, Building2, Landmark, LayoutDashboard, BarChart3, Flame, Receipt, FileBarChart, Settings, Download, DatabaseBackup, UploadCloud, CheckCircle, AlertCircle, Menu, X } from 'lucide-react';
import { exportAllToExcel } from '../../utils/exportToExcel';
import { useAutoBackup, collectUserData, restoreUserData } from '../../hooks/useAutoBackup';
import axios from 'axios';

type Tab = 'dashboard' | 'equity' | 'transactions' | 'allocation' | 'india-equity' | 'india-transactions' | 'india-allocation' | 'india-mf' | 'loans' | 'realestate' | 'additional' | 'fire' | 'expenses' | 'expense-report' | 'config';

interface TabDef { id: Tab; label: string; icon: React.ReactNode; section?: string; configurable?: boolean; }

const TABS: TabDef[] = [
  { id: 'dashboard',          label: 'Dashboard',                  icon: <LayoutDashboard className="w-4 h-4" />, section: 'Overview' },
  { id: 'equity',             label: 'US Equity Portfolio',        icon: <TrendingUp className="w-4 h-4" />, section: 'US Equity (NYSE/NASDAQ)', configurable: true },
  { id: 'india-equity',       label: 'India Equity Portfolio',     icon: <TrendingUp className="w-4 h-4" />, section: 'India Equity (NSE)', configurable: true },
  { id: 'india-mf',           label: 'Mutual Funds',               icon: <BarChart3 className="w-4 h-4" />, configurable: true },
  { id: 'loans',              label: 'Interest Investments',       icon: <HandCoins className="w-4 h-4" />, section: 'Other', configurable: true },
  { id: 'realestate',         label: 'Real Estate',                icon: <Building2 className="w-4 h-4" />, configurable: true },
  { id: 'additional',         label: 'Additional Investments',     icon: <Landmark className="w-4 h-4" />, configurable: true },
  { id: 'fire',               label: 'FIRE Calculator',            icon: <Flame className="w-4 h-4" />, configurable: true },
  { id: 'expenses',           label: 'Monthly Expenses',           icon: <Receipt className="w-4 h-4" />, section: 'Expenses', configurable: true },
  { id: 'expense-report',     label: 'Monthly Expense Summary',    icon: <FileBarChart className="w-4 h-4" />, configurable: true },
  { id: 'config',             label: 'Configuration',              icon: <Settings className="w-4 h-4" />, section: 'Settings' },
];

export default function Dashboard() {
  return (
    <AppConfigProvider>
      <PortfolioProvider>
        <DashboardContent />
      </PortfolioProvider>
    </AppConfigProvider>
  );
}

function DashboardContent() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const { config } = useAppConfig();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [navOpen, setNavOpen] = useState(false); // mobile/tablet drawer
  const [backupStatus, setBackupStatus] = useState<'idle' | 'saving' | 'ok' | 'restoring' | 'error'>('idle');
  const [backupMsg,   setBackupMsg]   = useState('');
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-backup every 30s and on every localStorage change
  useAutoBackup(currentUser);

  const showStatus = (status: typeof backupStatus, msg: string, duration = 3000) => {
    setBackupStatus(status);
    setBackupMsg(msg);
    if (statusTimer.current) clearTimeout(statusTimer.current);
    if (duration > 0) statusTimer.current = setTimeout(() => setBackupStatus('idle'), duration);
  };

  const handleManualBackup = async () => {
    showStatus('saving', 'Saving backup…', 0);
    try {
      if (!currentUser) return;
      await axios.post('/api/backup', { data: collectUserData(currentUser) });
      showStatus('ok', `Backup saved (${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })})`);
    } catch {
      showStatus('error', 'Backup failed');
    }
  };

  const handleRestore = async () => {
    if (!window.confirm('This will overwrite your current data with the last backup. Continue?')) return;
    showStatus('restoring', 'Restoring…', 0);
    try {
      const r = await axios.get('/api/backup');
      if (!r.data?.data) { showStatus('error', 'No backup found'); return; }
      if (currentUser) restoreUserData(currentUser, r.data.data as Record<string, unknown>);
      showStatus('ok', `Restored from ${new Date(r.data.savedAt).toLocaleString('en-IN')}`);
      setTimeout(() => window.location.reload(), 1200);
    } catch {
      showStatus('error', 'Restore failed');
    }
  };

  const selectTab = (tab: Tab) => {
    setActiveTab(tab);
    setNavOpen(false);
    window.scrollTo({ top: 0 });
  };

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setNavOpen(false); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [navOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const visibleTabs = TABS.filter(tab => {
    if (!tab.configurable) return true;
    return config.enabledTabs[tab.id] !== false;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Top navbar */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="px-3 sm:px-6 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              data-nav-toggle
              onClick={() => setNavOpen(o => !o)}
              aria-label={navOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={navOpen}
              className="lg:hidden -ml-1 p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {navOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="bg-blue-600 p-1.5 rounded-lg shrink-0">
              <TrendingUp className="text-white w-4 h-4" />
            </div>
            <span className="font-bold text-gray-800 text-base sm:text-lg truncate">
              <span className="hidden sm:inline">Personal </span>Finance<span className="hidden min-[400px]:inline"> Tracker</span>
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <div className="hidden min-[480px]:flex items-center gap-2 text-sm text-gray-600 mr-1">
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center font-semibold text-blue-700 text-xs uppercase">
                {currentUser?.charAt(0)}
              </div>
              <span className="hidden md:inline font-medium max-w-[10rem] truncate">{currentUser}</span>
            </div>

            {/* Backup status badge */}
            {backupStatus !== 'idle' && (
              <span className={`hidden lg:flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${
                backupStatus === 'ok'      ? 'bg-emerald-50 text-emerald-700' :
                backupStatus === 'error'   ? 'bg-red-50 text-red-600' :
                'bg-blue-50 text-blue-600'
              }`}>
                {backupStatus === 'ok'    && <CheckCircle className="w-3 h-3" />}
                {backupStatus === 'error' && <AlertCircle className="w-3 h-3" />}
                {backupMsg}
              </span>
            )}

            {/* Manual backup button */}
            <button
              onClick={handleManualBackup}
              title="Save backup to the server"
              aria-label="Backup" className="flex items-center gap-1.5 p-2 md:px-3 md:py-1.5 text-sm text-gray-500 hover:text-blue-700 hover:bg-blue-50 border border-gray-200 rounded-lg transition-colors"
            >
              <DatabaseBackup className="w-4 h-4" />
              <span className="hidden md:inline">Backup</span>
            </button>

            {/* Restore button */}
            <button
              onClick={handleRestore}
              title="Restore all data from last backup"
              aria-label="Restore" className="flex items-center gap-1.5 p-2 md:px-3 md:py-1.5 text-sm text-gray-500 hover:text-amber-700 hover:bg-amber-50 border border-gray-200 rounded-lg transition-colors"
            >
              <UploadCloud className="w-4 h-4" />
              <span className="hidden md:inline">Restore</span>
            </button>

            <button
              onClick={() => currentUser && exportAllToExcel(currentUser)}
              title="Download all data as Excel"
              aria-label="Export Excel" className="flex items-center gap-1.5 p-2 md:px-3 md:py-1.5 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors font-medium"
            >
              <Download className="w-4 h-4" />
              <span className="hidden md:inline">Export Excel</span>
            </button>
            <button
              onClick={handleLogout}
              aria-label="Logout" className="flex items-center gap-1.5 p-2 md:px-3 md:py-1.5 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Body: sidebar + content */}
      <div className="flex flex-1 min-w-0">

        {/* Backdrop for the mobile/tablet drawer */}
        <div
          onClick={() => setNavOpen(false)}
          className={`lg:hidden fixed inset-0 top-14 z-30 bg-black/40 transition-opacity ${navOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        />

        {/* Left sidebar: static on desktop, slide-in drawer below lg */}
        <aside
          className={`fixed lg:sticky top-14 bottom-0 lg:bottom-auto lg:h-[calc(100vh-3.5rem)] left-0 z-30 w-64 lg:w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col pt-4 pb-6 overflow-y-auto transition-transform duration-200 ${
            navOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'
          } lg:translate-x-0 lg:shadow-none`}
        >
          <nav className="flex flex-col px-2 gap-0.5">
            {visibleTabs.map(tab => (
              <React.Fragment key={tab.id}>
                {tab.section && (
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 pt-4 pb-1">
                    {tab.section}
                  </p>
                )}
                <button
                  onClick={() => selectTab(tab.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors w-full ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-100'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800 border border-transparent'
                  }`}
                >
                  <span className={activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'}>
                    {tab.icon}
                  </span>
                  {tab.label}
                </button>
              </React.Fragment>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 px-3 py-4 sm:px-6 sm:py-6">
          {activeTab === 'dashboard'          && <ConsolidatedDashboard />}
          {activeTab === 'equity'             && <EquityPortfolio currencyFilter="USD" />}
          {activeTab === 'india-equity'       && <EquityPortfolio currencyFilter="INR" />}
          {activeTab === 'india-mf'           && <MutualFundTracker />}
          {activeTab === 'loans'              && <LoanTracker />}
          {activeTab === 'realestate'         && <RealEstateTracker />}
          {activeTab === 'additional'         && <AdditionalInvestments />}
          {activeTab === 'fire'               && <FIRETracker />}
          {activeTab === 'expenses'           && <MonthlyExpenseTracker />}
          {activeTab === 'expense-report'     && <MonthlyExpenseReport />}
          {activeTab === 'config'             && <ConfigurationPage />}
        </main>

      </div>
    </div>
  );
}
