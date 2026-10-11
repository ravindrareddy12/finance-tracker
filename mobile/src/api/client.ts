import { create } from 'axios';
import { API_URL, REQUEST_TIMEOUT_MS } from '@/config/env';
import { toApiError } from './errors';

// ─── Session hooks wired up by AuthProvider ──────────────────────────────────
// The token lives in memory for request signing; SecureStore is the durable copy.

let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export const session = {
  setToken(token: string | null) { accessToken = token; },
  setUnauthorizedHandler(handler: (() => void) | null) { onUnauthorized = handler; },
};

export const api = create({
  baseURL: `${API_URL}/api`,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { Accept: 'application/json' },
});

api.interceptors.request.use(config => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    const apiError = toApiError(error);
    // A 401 on a signed request means the session is no longer valid. Credential
    // checks (login/register/reset, and account deletion's password confirmation)
    // answer 401 for bad input, so they're excluded.
    const url = error.config?.url ?? '';
    const isCredentialCheck = /\/auth\/(login|register|reset-password)$/.test(url)
      || (error.config?.method === 'delete' && /\/auth\/me$/.test(url));
    if (apiError.kind === 'unauthorized' && accessToken && !isCredentialCheck) onUnauthorized?.();
    return Promise.reject(apiError);
  },
);
