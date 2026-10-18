import React from 'react';
import { Link } from 'react-router-dom';
import { Check, TrendingUp } from 'lucide-react';
import { Donut } from '../Marketing/mockups';

const POINTS = [
  'US & Indian stocks with live prices',
  'Mutual fund SIPs with true XIRR returns',
  'Real estate, loans, FDs and expenses',
  'Synced between web and Android',
];

/** Split-screen frame for the sign-in and sign-up screens */
export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50">
      <aside className="relative isolate hidden lg:flex flex-col justify-between overflow-hidden bg-slate-950 text-white p-12">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_top_left,black_30%,transparent_75%)]" aria-hidden="true" />
        <div className="absolute -top-32 -left-32 -z-10 w-[36rem] h-[36rem] rounded-full bg-blue-600/30 blur-3xl" aria-hidden="true" />
        <Link to="/" className="flex items-center gap-2.5 w-fit">
          <span className="bg-gradient-to-br from-blue-500 to-blue-700 p-1.5 rounded-lg"><TrendingUp className="w-5 h-5" /></span>
          <span className="font-bold text-lg tracking-tight">Finance Tracker</span>
        </Link>
        <div className="max-w-md">
          <h2 className="text-4xl font-extrabold tracking-tight leading-tight">Your entire net worth, in one dashboard.</h2>
          <ul className="mt-8 space-y-3.5">
            {POINTS.map(p => (
              <li key={p} className="flex items-center gap-3 text-slate-300">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/20 ring-1 ring-blue-400/40">
                  <Check className="w-3 h-3 text-blue-300" strokeWidth={3} />
                </span>
                {p}
              </li>
            ))}
          </ul>
          <div className="mt-10 flex items-center gap-5 rounded-2xl bg-white/5 ring-1 ring-white/10 p-5 w-fit" aria-hidden="true">
            <Donut size="w-16 h-16" track="#0f172a" />
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Net worth</p>
              <p className="text-2xl font-bold">₹54.2L</p>
              <p className="text-xs font-semibold text-emerald-400">▲ 4.6% this month</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-500">No bank linking · No ads · Passwords stored as one-way hashes</p>
      </aside>
      <main className="flex items-center justify-center p-4 sm:p-8">{children}</main>
    </div>
  );
}
