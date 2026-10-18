import React from 'react';
import {
  BarChart3, Building2, FileSpreadsheet, Flame, HandCoins, Landmark, LayoutDashboard, Receipt, TrendingUp,
} from 'lucide-react';

export interface Feature {
  id: string;
  icon: React.ReactNode;
  title: string;
  summary: string;
  points: string[];
}

const icon = (Icon: typeof TrendingUp) => <Icon className="w-6 h-6" aria-hidden="true" />;

export const FEATURES: Feature[] = [
  {
    id: 'net-worth',
    icon: icon(LayoutDashboard),
    title: 'Net worth dashboard',
    summary: 'Every asset you own rolled up into one number, with allocation by asset class and account holder.',
    points: [
      'Consolidated view across stocks, funds, property, loans, cash and other investments',
      'Asset allocation breakdown and charts',
      'Track holdings for each family member or demat account separately',
    ],
  },
  {
    id: 'stocks',
    icon: icon(TrendingUp),
    title: 'US & Indian stocks',
    summary: 'Portfolios for NYSE/NASDAQ and NSE with live quotes, realised and unrealised gains.',
    points: [
      'Buy and sell transactions with fees and dates',
      'Live market prices and day change',
      'USD holdings converted at the current USD/INR rate',
      'Cash balance per account and a market news feed',
    ],
  },
  {
    id: 'mutual-funds',
    icon: icon(BarChart3),
    title: 'Mutual funds & SIPs',
    summary: 'Track lump sums, SIPs and redemptions with XIRR returns that account for every cash flow.',
    points: [
      'Holdings and transaction history per fund',
      'Active and future SIP schedules',
      'XIRR, absolute return and current value per fund',
      'Bulk import from Excel',
    ],
  },
  {
    id: 'real-estate',
    icon: icon(Building2),
    title: 'Real estate',
    summary: 'Record land, flats and houses — including jointly owned property — with estimated appreciation and sales.',
    points: [
      'Purchase price, date and your ownership share',
      'Track partners in jointly owned property',
      'Estimated current value from yearly appreciation',
      'Record sales and see the realised gain',
    ],
  },
  {
    id: 'interest-investments',
    icon: icon(HandCoins),
    title: 'Interest investments',
    summary: 'Money you have lent out at interest — how much, to whom, and what has come back.',
    points: [
      'Borrower, amount and date given for each loan',
      'Log every return received',
      'Outstanding amount at a glance',
    ],
  },
  {
    id: 'other-investments',
    icon: icon(Landmark),
    title: 'Other investments',
    summary: 'Fixed deposits, gold, PPF, bonds or anything else you want counted in your net worth.',
    points: [
      'Amount, date, currency and interest rate',
      'Notes for maturity dates or scheme details',
      'Included in the consolidated dashboard',
    ],
  },
  {
    id: 'fire',
    icon: icon(Flame),
    title: 'FIRE calculator',
    summary: 'See how close you are to financial independence based on what you have already saved.',
    points: [
      'Target corpus from your expenses and withdrawal rate',
      'Progress based on your real portfolio value',
      'Adjust inflation and return assumptions',
    ],
  },
  {
    id: 'expenses',
    icon: icon(Receipt),
    title: 'Monthly expenses',
    summary: 'Log monthly spending and obligations, then review month-by-month summaries.',
    points: [
      'Monthly expenses and recurring obligations',
      'Monthly expense summary report',
      'Import past months from Excel',
    ],
  },
  {
    id: 'excel',
    icon: icon(FileSpreadsheet),
    title: 'Excel import, export & backup',
    summary: 'Bring your existing spreadsheets in, export everything out, and keep full backups.',
    points: [
      'Import stocks, mutual funds, property and expenses from Excel',
      'Export your whole portfolio to a formatted workbook',
      'One-click JSON backup and restore',
    ],
  },
];
