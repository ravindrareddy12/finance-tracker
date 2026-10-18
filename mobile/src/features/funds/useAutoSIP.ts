import { useEffect, useRef } from 'react';
import { portfolioApi } from '@/api/portfolio';
import { useUpdateUserData, useUserData } from '@/features/portfolio/usePortfolio';
import { applyDueSIPs, collectDueDates, type NavsByCode } from './sip';

/**
 * Record due instalments of the user's future SIP schedules, once per session —
 * the web does the same when its Mutual Funds tab opens, so whichever app is
 * opened first adds them (auto-SIP ids are deterministic, so never twice).
 */
export function useAutoSIP() {
  const { userData, isSuccess } = useUserData();
  const { mutate } = useUpdateUserData();
  const ran = useRef(false);

  useEffect(() => {
    if (!isSuccess || ran.current) return;
    ran.current = true;

    const datesByCode: Record<string, Set<string>> = {};
    for (const s of userData.sipSchedules) {
      if (!s.active) continue;
      for (const d of collectDueDates(s)) (datesByCode[s.schemeCode] ??= new Set()).add(d);
    }
    if (Object.keys(datesByCode).length === 0) return;

    (async () => {
      const navs: NavsByCode = {};
      await Promise.all(Object.entries(datesByCode).map(async ([code, dates]) => {
        try {
          const results = await portfolioApi.navOnDates(code, [...dates]);
          navs[code] = Object.fromEntries(results.filter(r => r.nav != null).map(r => [r.requestedDate, r.nav as number]));
        } catch { /* NAVs unavailable — this scheme is retried next session */ }
      }));
      if (Object.keys(navs).length === 0) return;
      mutate(latest => {
        const result = applyDueSIPs(latest.funds, latest.sipSchedules, navs);
        return result.changed ? { mf: result.holdings, sip_schedules: result.schedules } : {};
      });
    })();
  }, [isSuccess, userData.sipSchedules, mutate]);
}
