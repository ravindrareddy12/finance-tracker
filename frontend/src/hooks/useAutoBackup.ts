import { useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

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

// Collect the signed-in user's data from localStorage for backup
export function collectUserData(user: string): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const key of userKeys(user)) {
    const val = localStorage.getItem(key);
    if (val !== null) {
      try { data[key] = JSON.parse(val); }
      catch { data[key] = val; }
    }
  }
  return data;
}

// Write the user's backup payload into localStorage (foreign keys are ignored)
export function restoreUserData(user: string, data: Record<string, unknown>) {
  for (const [key, value] of Object.entries(data)) {
    if (isUserKey(user, key)) localStorage.setItem(key, JSON.stringify(value));
  }
}

// Remove the user's data from this browser (on sign out)
export function clearUserData(user: string) {
  for (const key of userKeys(user)) localStorage.removeItem(key);
}

export function purgeLegacyAuthKeys() {
  for (const key of LEGACY_AUTH_KEYS) localStorage.removeItem(key);
}

export function useAutoBackup(user: string | null) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerBackup = useCallback(() => {
    if (!user) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        await axios.post('/api/backup', { data: collectUserData(user) });
      } catch { /* silent — backup is best-effort */ }
    }, 1500); // debounce: wait 1.5s after last change
  }, [user]);

  // Watch localStorage via storage event (cross-tab) and also poll every 30s
  useEffect(() => {
    const onStorage = () => triggerBackup();
    window.addEventListener('storage', onStorage);
    const interval = setInterval(triggerBackup, 30_000);
    // Fire immediately on mount so we always have a fresh backup
    triggerBackup();
    return () => {
      window.removeEventListener('storage', onStorage);
      clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [triggerBackup]);

  return { triggerBackup };
}
