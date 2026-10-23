// Per-route search metadata. Used by <Seo> in the browser and by
// scripts/prerender.mjs, which writes it into each page's static HTML.

export const SITE = {
  name: 'Finance Tracker',
  url: 'https://finance.mypgmanager.com',
  ogImage: 'https://finance.mypgmanager.com/og-image.jpg',
  playStoreUrl: 'https://play.google.com/store/apps/details?id=com.mypgmanager.finance',
};

export interface PageMeta {
  title: string;
  description: string;
  /** Keep out of search results (private or utility pages) */
  noindex?: boolean;
}

export const PAGES: Record<string, PageMeta> = {
  '/': {
    title: 'Finance Tracker – Net Worth, Stock, Mutual Fund & Expense Tracker',
    description:
      'Track US and Indian stocks, mutual funds, SIPs, real estate, loans and expenses in one private dashboard. See your net worth, XIRR returns and FIRE progress.',
  },
  '/features': {
    title: 'Features – Stocks, SIPs, Property & Expenses | Finance Tracker',
    description:
      'Live NYSE, NASDAQ and NSE prices, mutual fund SIPs with XIRR, real estate, loans, a FIRE calculator, monthly expense reports and Excel import/export.',
  },
  '/about': {
    title: 'About Finance Tracker – A Private Personal Finance Dashboard',
    description:
      'Why Finance Tracker exists, who it is for and how your data is kept private: no bank linking, no ads, no analytics trackers.',
  },
  '/login': {
    title: 'Sign In | Finance Tracker',
    description: 'Sign in to Finance Tracker to see your portfolio, net worth and expenses.',
  },
  '/signup': {
    title: 'Create a Free Account | Finance Tracker',
    description: 'Create a Finance Tracker account and start tracking your stocks, mutual funds, property and expenses in one place.',
  },
  '/privacy-policy': {
    title: 'Privacy Policy | Finance Tracker',
    description: 'How Finance Tracker collects, uses, stores and deletes your information.',
  },
  '/delete-account': {
    title: 'Delete Your Account | Finance Tracker',
    description: 'Permanently delete your Finance Tracker account and all the data stored with it.',
  },
  '/dashboard': {
    title: 'Dashboard | Finance Tracker',
    description: 'Your Finance Tracker dashboard.',
    noindex: true,
  },
};

// nginx serves each prerendered page from a folder, so /features redirects to
// /features/ — the trailing-slash form is the canonical URL.
const stripSlash = (path: string) => (path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path);

export const metaFor = (path: string): PageMeta => PAGES[stripSlash(path)] ?? PAGES['/'];

export const canonicalFor = (path: string) => {
  const p = stripSlash(path);
  return SITE.url + (p === '/' ? '/' : `${p}/`);
};

export interface FaqItem { q: string; a: string }

export const FAQ: FaqItem[] = [
  {
    q: 'What can I track with Finance Tracker?',
    a: 'US stocks (NYSE/NASDAQ), Indian stocks (NSE), mutual funds and SIPs, interest-bearing loans you have given, real estate, other investments such as FDs or gold, cash balances and your monthly expenses — all rolled up into one net worth view.',
  },
  {
    q: 'Do I need to connect my bank or broker account?',
    a: 'No. You add transactions yourself or import them from Excel. Finance Tracker never asks for bank, broker or demat credentials.',
  },
  {
    q: 'Is Finance Tracker free?',
    a: 'Yes. Creating an account and tracking your stocks, mutual funds, property, loans and expenses is free on the web and on the Android app. There are no ads.',
  },
  {
    q: 'How are my returns calculated?',
    a: 'Mutual fund and portfolio returns use XIRR, which accounts for the timing of every purchase, SIP instalment and redemption — the same method fund houses use for annualised returns.',
  },
  {
    q: 'What is XIRR and why is it better than absolute return for SIPs?',
    a: 'XIRR is the annualised return of a series of cash flows made on different dates. Absolute return ignores time, so a SIP started last month and one started five years ago look alike. XIRR weighs each instalment by how long it was invested, so returns are comparable across funds and holding periods.',
  },
  {
    q: 'How are SIP instalments recorded?',
    a: 'Set up a SIP once with its amount and date. Each instalment is recorded automatically at that day’s NAV, using official NAV data published by AMFI, so units and XIRR stay up to date without manual entry.',
  },
  {
    q: 'Can I track investments for my family members?',
    a: 'Yes. Holdings can be kept in separate portfolios per family member or demat account, and the dashboard shows both each portfolio and the combined household net worth.',
  },
  {
    q: 'Can I track US and Indian investments together?',
    a: 'Yes. US holdings are valued in USD and converted at the current USD/INR rate so your combined net worth is shown in one currency.',
  },
  {
    q: 'Is my data private?',
    a: 'Your data is tied to your account and is not sold, shared or used for advertising. Passwords are stored only as bcrypt hashes and the site has no ad or analytics trackers.',
  },
  {
    q: 'Is there a mobile app?',
    a: 'Yes. Finance Tracker is available on Google Play for Android. Sign in with the same account and your data stays in sync with the website.',
  },
  {
    q: 'Can I export my data?',
    a: 'Yes. You can export your portfolio to Excel at any time and take a full JSON backup that can be restored later.',
  },
];
