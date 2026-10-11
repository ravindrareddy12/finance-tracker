// Single source for the details shown on the public legal pages.
export const LEGAL = {
  appName: 'Finance Tracker',
  // Publisher / data controller as shown on Google Play — fill in your registered name
  publisher: '',
  contactEmail: 'support@mypgmanager.com',
  siteUrl: 'https://finance.mypgmanager.com',
  lastUpdated: '2 October 2026',
};

export const publisherLabel = LEGAL.publisher ? `${LEGAL.appName} (operated by ${LEGAL.publisher})` : LEGAL.appName;
