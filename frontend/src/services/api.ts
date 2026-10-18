import axios from 'axios';

// ─── Auth token storage + axios wiring ───────────────────────────────────────
// Every request to our own /api gets the bearer token. A 401 from a protected
// endpoint means the session is gone, so AuthContext is told to sign out.

const TOKEN_KEY = 'ft_token';

export const AUTH_EXPIRED_EVENT = 'ft:auth-expired';

export const tokenStore = {
  // No localStorage while prerendering on the server
  get:   (): string | null => (typeof localStorage === 'undefined' ? null : localStorage.getItem(TOKEN_KEY)),
  set:   (token: string)    => localStorage.setItem(TOKEN_KEY, token),
  clear: ()                 => localStorage.removeItem(TOKEN_KEY),
};

const isOwnApi  = (url?: string) => !!url && url.startsWith('/api/');
const isAuthApi = (url?: string) => !!url && url.startsWith('/api/auth/');

axios.interceptors.request.use(config => {
  const token = tokenStore.get();
  if (token && isOwnApi(config.url)) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axios.interceptors.response.use(
  response => response,
  error => {
    // Login/register failures are form errors, not an expired session
    if (error.response?.status === 401 && isOwnApi(error.config?.url) && !isAuthApi(error.config?.url)) {
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  }
);

// Server error message (`{ error }`) or a fallback
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) return 'Could not reach the server. Please check your connection.';
    const msg = (err.response.data as { error?: string } | undefined)?.error;
    if (msg) return msg;
  }
  return fallback;
}
