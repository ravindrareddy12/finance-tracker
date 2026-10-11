import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { authApi, type SessionResponse } from '@/api/auth';
import { session } from '@/api/client';
import { ApiError } from '@/api/errors';
import type { SessionUser } from '@/types/models';
import { isExpired, msUntilExpiry } from './jwt';
import { tokenStorage } from './tokenStorage';

export type AuthStatus = 'restoring' | 'signedIn' | 'signedOut';
export type SignOutReason = 'user' | 'expired' | 'revoked' | 'deleted';

interface AuthContextValue {
  status: AuthStatus;
  user: SessionUser | null;
  /** Why the last session ended, shown once on the sign-in screen */
  signOutReason: SignOutReason | null;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (username: string, password: string, passwordHint?: string) => Promise<void>;
  signOut: (reason?: SignOutReason) => Promise<void>;
  resetPassword: (username: string, passwordHint: string, newPassword: string) => Promise<void>;
  /** Permanently delete the account (password re-confirmed), then sign out */
  deleteAccount: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// setTimeout overflows above ~24.8 days; re-check periodically for long-lived tokens
const MAX_TIMER_MS = 2 ** 31 - 1;

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('restoring');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [signOutReason, setSignOutReason] = useState<SignOutReason | null>(null);
  const tokenRef  = useRef<string | null>(null);
  const expiryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearExpiryTimer = () => {
    if (expiryTimer.current) clearTimeout(expiryTimer.current);
    expiryTimer.current = null;
  };

  const signOut = useCallback(async (reason: SignOutReason = 'user') => {
    clearExpiryTimer();
    tokenRef.current = null;
    session.setToken(null);
    await tokenStorage.clear();
    queryClient.clear(); // drop every cached response belonging to this user
    setUser(null);
    setSignOutReason(reason);
    setStatus('signedOut');
  }, [queryClient]);

  // Sign out exactly when the token expires. Tokens outliving the timer limit re-arm on fire.
  const scheduleExpiry = useCallback((token: string) => {
    const arm = () => {
      clearExpiryTimer();
      const ms = msUntilExpiry(token);
      if (ms === null) return;
      expiryTimer.current = setTimeout(() => {
        if (isExpired(token)) signOut('expired');
        else arm();
      }, Math.max(0, Math.min(ms, MAX_TIMER_MS)));
    };
    arm();
  }, [signOut]);

  const activate = useCallback((token: string, nextUser: SessionUser) => {
    tokenRef.current = token;
    session.setToken(token);
    scheduleExpiry(token);
    setUser(nextUser);
    setSignOutReason(null);
    setStatus('signedIn');
  }, [scheduleExpiry]);

  const startSession = useCallback(async ({ token, user: nextUser }: SessionResponse) => {
    await tokenStorage.save({ token, user: nextUser });
    queryClient.clear();
    activate(token, nextUser);
  }, [activate, queryClient]);

  // Any signed request answering 401 ends the session
  useEffect(() => {
    session.setUnauthorizedHandler(() => { signOut('revoked'); });
    return () => session.setUnauthorizedHandler(null);
  }, [signOut]);

  // Restore on launch: trust an unexpired stored token immediately (works offline),
  // then confirm with the server in the background.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await tokenStorage.load();
      if (cancelled) return;
      if (!stored || isExpired(stored.token)) {
        if (stored) await tokenStorage.clear();
        setSignOutReason(stored ? 'expired' : null);
        setStatus('signedOut');
        return;
      }
      activate(stored.token, stored.user);
      try {
        const fresh = await authApi.me();
        if (!cancelled && tokenRef.current === stored.token) {
          setUser(fresh);
          await tokenStorage.save({ token: stored.token, user: fresh });
        }
      } catch (err) {
        // 401 is handled by the interceptor; network errors keep the offline session
        if (err instanceof ApiError && err.kind !== 'unauthorized') return;
      }
    })();
    return () => { cancelled = true; clearExpiryTimer(); };
  }, [activate]);

  // Timers don't run while the app is suspended — re-check expiry on resume
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active' && tokenRef.current && isExpired(tokenRef.current)) signOut('expired');
    });
    return () => sub.remove();
  }, [signOut]);

  const value = useMemo<AuthContextValue>(() => ({
    status,
    user,
    signOutReason,
    signIn: async (username, password) => startSession(await authApi.login(username.trim(), password)),
    signUp: async (username, password, passwordHint) =>
      startSession(await authApi.register(username.trim(), password, passwordHint?.trim() || undefined)),
    signOut,
    resetPassword: async (username, passwordHint, newPassword) => {
      await authApi.resetPassword(username.trim(), passwordHint.trim(), newPassword);
    },
    deleteAccount: async password => {
      await authApi.deleteAccount(password);
      await signOut('deleted');
    },
  }), [status, user, signOutReason, startSession, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
