import { useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { tokenStore } from '../services/api';

// ─── Sync between this browser's localStorage and the server ─────────────────
// The server is shared with other devices (e.g. the Android app), so only keys
// changed in this tab are uploaded, and keys changed elsewhere are pulled in.
// `synced` remembers the last value known to match the server for each key.

// Browser keys that used to hold every account's plaintext credentials.
const LEGACY_AUTH_KEYS = ['ft_users', 'ft_current_user'];

function userKeys(user: string): string[] {
  return [
    `ft_transactions_${user}`,
    `ft_cash_usd_${user}`,
    `ft_cash_inr_${user}`,
    `ft_loans_${user}`,
    `ft_realestate_${user}`,
    `ft_investments_${user}`,
    `ft_mf_${user}`,
    `ft_sip_schedules_${user}`,
    `ft_monthly_expenses_${user}`,
    `ft_fire_${user}`,
    `ft_app_config_${user}`,
  ];
}

const isUserKey = (user: string, key: string) => key.startsWith('ft_') && key.endsWith(`_${user}`);

const synced = new Map<string, string>(); // key → canonical JSON last matching the server

// Canonical JSON of a localStorage entry (null when absent)
function localJson(key: string): string | null {
  const raw = localStorage.getItem(key);
  if (raw === null) return null;
  try { return JSON.stringify(JSON.parse(raw)); } catch { return JSON.stringify(raw); }
}

const isDirty = (key: string) => {
  const local = localJson(key);
  return local !== null && local !== synced.get(key);
};

function markSynced(data: Record<string, unknown>) {
  for (const [key, value] of Object.entries(data)) synced.set(key, JSON.stringify(value));
}

export function clearSyncState() {
  synced.clear();
}

// Collect the signed-in user's data from localStorage for backup
export function collectUserData(user: string): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const key of userKeys(user)) {
    const json = localJson(key);
    if (json !== null) data[key] = JSON.parse(json);
  }
  return data;
}

function collectDirty(user: string): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const key of userKeys(user)) {
    if (isDirty(key)) data[key] = JSON.parse(localJson(key)!);
  }
  return data;
}

// Write the user's backup payload into localStorage (foreign keys are ignored)
export function restoreUserData(user: string, data: Record<string, unknown>) {
  for (const [key, value] of Object.entries(data)) {
    if (isUserKey(user, key)) localStorage.setItem(key, JSON.stringify(value));
  }
}

/** Replace local data with the server copy (session start, manual restore). */
export async function loadFromServer(user: string): Promise<string | null> {
  const r = await axios.get('/api/backup');
  const data = (r.data?.data ?? {}) as Record<string, unknown>;
  restoreUserData(user, data);
  clearSyncState();
  markSynced(data);
  return r.data?.savedAt ?? null;
}

/** Upload keys changed in this tab. `all` re-uploads everything (manual backup). */
export async function pushChanges(user: string, { all = false } = {}): Promise<number> {
  const data = all ? collectUserData(user) : collectDirty(user);
  if (Object.keys(data).length === 0) return 0;
  await axios.post('/api/backup', { data });
  markSynced(data);
  return Object.keys(data).length;
}

/** Apply keys another device changed. Keys edited locally win (they get pushed). Returns true if anything changed. */
async function pullRemoteChanges(user: string): Promise<boolean> {
  const r = await axios.get('/api/backup');
  const data = (r.data?.data ?? {}) as Record<string, unknown>;
  let changed = false;
  for (const [key, value] of Object.entries(data)) {
    if (!isUserKey(user, key)) continue;
    const remote = JSON.stringify(value);
    if (remote === synced.get(key)) continue;          // unchanged on the server
    if (remote === localJson(key)) { synced.set(key, remote); continue; }
    if (synced.has(key) && isDirty(key)) continue;      // local edit pending — keep it
    localStorage.setItem(key, remote);
    synced.set(key, remote);
    changed = true;
  }
  return changed;
}

// Remove the user's data from this browser (on sign out)
export function clearUserData(user: string) {
  for (const key of userKeys(user)) localStorage.removeItem(key);
  clearSyncState();
}

export function purgeLegacyAuthKeys() {
  for (const key of LEGACY_AUTH_KEYS) localStorage.removeItem(key);
}

export function useAutoBackup(user: string | null) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerBackup = useCallback(() => {
    if (!user) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      pushChanges(user).catch(() => { /* best-effort; retried on the next tick */ });
    }, 1500); // debounce: wait 1.5s after last change
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Upload local edits, then pick up edits made on other devices. Screens read
    // localStorage on mount, so a remote change reloads the page.
    const syncOnReturn = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        await pushChanges(user);
        if (await pullRemoteChanges(user)) window.location.reload();
      } catch { /* offline — try again next time */ }
    };

    // Last-chance upload when the tab closes (keepalive survives page unload)
    const flushOnUnload = () => {
      const data = collectDirty(user);
      const token = tokenStore.get();
      if (!token || Object.keys(data).length === 0) return;
      fetch('/api/backup', {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ data }),
      }).catch(() => {});
    };

    window.addEventListener('storage', triggerBackup);
    document.addEventListener('visibilitychange', syncOnReturn);
    window.addEventListener('focus', syncOnReturn);
    window.addEventListener('pagehide', flushOnUnload);
    // Same-tab localStorage writes don't fire 'storage', so check for unsynced
    // edits often — the Android app reads the server copy.
    const interval = setInterval(triggerBackup, 5_000);
    triggerBackup();
    return () => {
      window.removeEventListener('storage', triggerBackup);
      document.removeEventListener('visibilitychange', syncOnReturn);
      window.removeEventListener('focus', syncOnReturn);
      window.removeEventListener('pagehide', flushOnUnload);
      clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [user, triggerBackup]);

  return { triggerBackup };
}
