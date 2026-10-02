export type Currency = 'INR' | 'USD';
export type DematAccount = string;
export type TransactionType = 'buy' | 'sell';

export interface Transaction {
  id: string;
  symbol: string;
  quantity: number;
  price: number;
  fees: number;
  type: TransactionType;
  currency: Currency;
  dematAccount: DematAccount;
  date: string;
}

export interface Holding {
  symbol: string;
  companyName: string;
  quantity: number;
  avgBuyPrice: number;
  totalInvested: number;
  currency: Currency;
  dematAccount: DematAccount;
  currentPrice: number | null;
  todayChange: number | null;
  todayChangePercent: number | null;
  currentValue: number | null;
  totalProfit: number | null;
  portfolioPercent: number;
  firstBuyDate: string | null;
  xirr: number | null;
}

export interface StockQuote {
  symbol: string;
  longName?: string;
  shortName?: string;
  regularMarketPrice: number;
  regularMarketChange?: number;
  regularMarketChangePercent: number;
  currency: string;
}

export interface RealEstateProperty {
  id: string;
  propertyName: string;
  propertyPrice: number;
  mySharePercent: number;
  appreciationPerYear: number;
  purchaseDate: string;
  currency: Currency;
  partner?: string;
  amountNotes?: string;
  details1?: string;
  details2?: string;
  details3?: string;
  status: 'active' | 'sold';
  soldDate?: string;
  soldAmount?: number;
  soldNotes?: string;
}

export interface AdditionalInvestment {
  id: string;
  name: string;
  amountInvested: number;
  currency: Currency;
  dateOfInvestment: string;
  interestPercent: number;
  notes?: string;
}

export interface LoanReturn {
  id: string;
  amount: number;
  date: string;
  notes?: string;
}

export interface LoanInvestment {
  id: string;
  customerName: string;
  principal: number;
  currency: Currency;
  dateGiven: string;
  interestRate?: number;
  notes?: string;
  returns: LoanReturn[];
}

export interface MFTransaction {
  id: string;
  type: 'buy' | 'sell';
  date: string;
  units: number;
  nav: number;
  amount: number;
  notes?: string;
}

export type SIPFrequency = 'monthly' | 'quarterly' | 'weekly';

export interface SIPSchedule {
  id: string;
  fundId: string;
  schemeCode: string;
  fundName: string;
  amount: number;
  frequency: SIPFrequency;
  dayOfMonth: number;
  startDate: string;
  endDate: string;
  nextDueDate: string;
  lastProcessedDate: string | null;
  active: boolean;
  notes?: string;
}

export type ObligationType = 'Credit Card' | 'Housing Loan' | 'Personal Loan' | 'Rent' | 'Others';
export type PaymentStatus = 'Paid' | 'Unpaid';

export type RecurrenceFrequency = 'Monthly' | 'Quarterly' | 'Yearly';

export interface MonthlyObligation {
  id: string;
  type: ObligationType;
  note: string;
  amount: number;
  currency: 'INR' | 'USD';
  status: PaymentStatus;
  paidDate: string | null;
  dueDate?: string | null;
  recurrence?: { frequency: RecurrenceFrequency; endDate: string; groupId: string } | null;
}

export interface MFHolding {
  id: string;
  schemeCode: string;
  fundName: string;
  amcName?: string;
  category?: string;
  transactions: MFTransaction[];
}
