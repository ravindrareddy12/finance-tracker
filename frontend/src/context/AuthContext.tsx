import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { AUTH_EXPIRED_EVENT, tokenStore } from '../services/api';
import { clearUserData, loadFromServer, purgeLegacyAuthKeys, pushChanges } from '../hooks/useAutoBackup';

// 'checking' while a stored token is being validated with the server
export type AuthStatus = 'checking' | 'authenticated' | 'anonymous';

interface SessionResponse {
  token: string;
  user: { id: string; username: string };
}

interface AuthContextType {
  currentUser: string | null;
  status: AuthStatus;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string, passwordHint?: string) => Promise<void>;
  logout: () => Promise<void>;
  /** End the session without syncing (e.g. after the account was deleted) */
  signOutLocal: () => void;
  resetPassword: (username: string, passwordHint: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() => (tokenStore.get() ? 'checking' : 'anonymous'));

  const endSession = useCallback(() => {
    tokenStore.clear();
    setCurrentUser(null);
    setStatus('anonymous');
  }, []);

  // Validate the stored token once on load
  useEffect(() => {
    purgeLegacyAuthKeys();
    if (!tokenStore.get()) return;
    axios.get<{ user: { username: string } }>('/api/auth/me')
      .then(async r => {
        const username = r.data.user.username;
        // The server copy is authoritative: other devices may have changed it
        try { await loadFromServer(username); } catch { /* offline — use the local copy */ }
        setCurrentUser(username);
        setStatus('authenticated');
      })
      .catch(err => {
        if (err.response?.status === 401) tokenStore.clear();
        setCurrentUser(null);
        setStatus('anonymous');
      });
  }, []);

  // Any protected request answering 401 → back to the login screen
  useEffect(() => {
    window.addEventListener(AUTH_EXPIRED_EVENT, endSession);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, endSession);
  }, [endSession]);

  // Store the token and load the user's saved data into this browser
  const startSession = async ({ token, user }: SessionResponse) => {
    tokenStore.set(token);
    try { await loadFromServer(user.username); } catch { /* keep whatever is cached locally */ }
    setCurrentUser(user.username);
    setStatus('authenticated');
  };

  const login = async (username: string, password: string) => {
    const r = await axios.post<SessionResponse>('/api/auth/login', { username, password });
    await startSession(r.data);
  };

  const signup = async (username: string, password: string, passwordHint?: string) => {
    const r = await axios.post<SessionResponse>('/api/auth/register', { username, password, passwordHint });
    await startSession(r.data);
  };

  // Save one last backup, then remove the user's data from this browser
  const logout = async () => {
    if (currentUser) {
      try { await pushChanges(currentUser); } catch { /* best-effort */ }
      clearUserData(currentUser);
    }
    endSession();
  };

  const resetPassword = async (username: string, passwordHint: string, newPassword: string) => {
    await axios.post('/api/auth/reset-password', { username, passwordHint, newPassword });
  };

  return (
    <AuthContext.Provider value={{ currentUser, status, login, signup, logout, signOutLocal: endSession, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
