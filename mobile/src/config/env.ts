import Constants from 'expo-constants';

// API origin: EXPO_PUBLIC_API_URL (e.g. a LAN dev server) wins over app.json `extra.apiUrl`.
const fromConfig = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? fromConfig ?? 'https://finance.mypgmanager.com').replace(/\/+$/, '');

export const REQUEST_TIMEOUT_MS = 20_000;

// Public pages (also listed on Google Play) — always the production website
export const WEBSITE_URL = 'https://finance.mypgmanager.com';
export const PRIVACY_POLICY_URL = `${WEBSITE_URL}/privacy-policy`;
export const SUPPORT_EMAIL = 'support@mypgmanager.com';
