import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, EyeOff, FileSpreadsheet, KeyRound, ShieldCheck, Smartphone } from 'lucide-react';
import MarketingLayout from './MarketingLayout';
import { FEATURES } from './featureList';
import { FAQ, SITE } from '../../seo';

// Illustrative numbers for the hero preview — not real user data
const PREVIEW = [
  { label: 'Indian equity', value: '₹18.4L', pct: 34, color: 'bg-blue-500' },
  { label: 'Mutual funds', value: '₹14.1L', pct: 26, color: 'bg-indigo-500' },
  { label: 'Real estate', value: '₹12.0L', pct: 22, color: 'bg-emerald-500' },
  { label: 'US equity', value: '₹6.5L', pct: 12, color: 'bg-sky-500' },
  { label: 'Other', value: '₹3.2L', pct: 6, color: 'bg-amber-500' },
];

function DashboardPreview() {
  return (
    <div className="relative" aria-label="Sample dashboard preview" role="img">
      <div className="absolute -inset-4 bg-gradient-to-tr from-blue-500/30 to-indigo-500/30 blur-2xl rounded-3xl" aria-hidden="true" />
      <div className="relative bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 p-5 sm:p-6 text-left">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Net worth</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">₹54.2L</p>
          </div>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">XIRR 14.8%</span>
        </div>
        <div className="flex h-3 rounded-full overflow-hidden mt-5" aria-hidden="true">
          {PREVIEW.map(p => <div key={p.label} className={p.color} style={{ width: `${p.pct}%` }} />)}
        </div>
        <ul className="mt-5 space-y-2.5">
          {PREVIEW.map(p => (
            <li key={p.label} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-gray-600">
                <span className={`w-2.5 h-2.5 rounded-full ${p.color}`} aria-hidden="true" />{p.label}
              </span>
              <span className="font-semibold text-gray-900">{p.value}</span>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-[11px] text-gray-400">Sample data for illustration</p>
      </div>
    </div>
  );
}

const STEPS = [
  { title: 'Create a free account', text: 'Just a username and password — no bank or broker login needed.' },
  { title: 'Add or import your holdings', text: 'Enter transactions by hand or import your existing Excel sheets.' },
  { title: 'Watch your net worth', text: 'Live prices, XIRR returns and allocation update automatically.' },
];

const TRUST = [
  { icon: <EyeOff className="w-5 h-5" />, title: 'No bank linking', text: 'You never share bank, broker or demat credentials.' },
  { icon: <KeyRound className="w-5 h-5" />, title: 'Hashed passwords', text: 'Passwords are stored only as bcrypt hashes.' },
  { icon: <ShieldCheck className="w-5 h-5" />, title: 'No ads or trackers', text: 'Your data is never sold or used for advertising.' },
  { icon: <FileSpreadsheet className="w-5 h-5" />, title: 'Your data, portable', text: 'Export to Excel or download a full backup any time.' },
];

export default function Home() {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 text-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-200 bg-white/10 px-3 py-1 rounded-full">
              Personal finance tracker for India &amp; the US
            </p>
            <h1 className="mt-5 text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight">
              All your investments and expenses in one dashboard
            </h1>
            <p className="mt-5 text-lg text-blue-100/90 max-w-xl">
              Track US and Indian stocks, mutual funds and SIPs, real estate, loans and monthly expenses.
              See your real net worth, XIRR returns and progress towards financial independence.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link to="/signup/" className="inline-flex items-center justify-center gap-2 bg-white text-blue-900 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors">
                Get started free <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/login/" className="inline-flex items-center justify-center font-semibold px-6 py-3 rounded-lg border border-white/30 hover:bg-white/10 transition-colors">
                Log in
              </Link>
            </div>
            <ul className="mt-8 grid sm:grid-cols-2 gap-2 text-sm text-blue-100/90">
              {['NYSE, NASDAQ & NSE live prices', 'Mutual fund XIRR & SIPs', 'Excel import & export'].map(t => (
                <li key={t} className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-300" />{t}</li>
              ))}
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <a href={SITE.playStoreUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-white">
                  Web + Android app
                </a>
              </li>
            </ul>
          </div>
          <DashboardPreview />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Everything you own, tracked in one place</h2>
            <p className="mt-4 text-lg text-gray-600">
              Stop juggling broker apps, fund statements and spreadsheets. Finance Tracker brings every asset class
              together so you always know where you stand.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(f => (
              <Link key={f.id} to={`/features/#${f.id}`}
                className="group rounded-2xl border border-gray-200 p-6 hover:border-blue-300 hover:shadow-lg transition">
                <span className="inline-flex p-2.5 rounded-xl bg-blue-50 text-blue-700">{f.icon}</span>
                <h3 className="mt-4 text-lg font-semibold group-hover:text-blue-700">{f.title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{f.summary}</p>
              </Link>
            ))}
          </div>
          <div className="mt-10">
            <Link to="/features/" className="inline-flex items-center gap-1.5 font-semibold text-blue-700 hover:text-blue-800">
              See all features <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center">Up and running in minutes</h2>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="bg-white rounded-2xl border border-gray-200 p-6">
                <span className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 text-white font-bold">{i + 1}</span>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Privacy */}
      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-3 gap-10">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Private by design</h2>
            <p className="mt-4 text-gray-600">
              Your financial data is personal. Finance Tracker only stores what you choose to enter, and you can
              delete your account and everything in it at any time.
            </p>
            <Link to="/privacy-policy/" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800">
              Read the privacy policy <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="lg:col-span-2 grid sm:grid-cols-2 gap-6">
            {TRUST.map(t => (
              <div key={t.title} className="flex gap-4">
                <span className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700">{t.icon}</span>
                <div>
                  <h3 className="font-semibold">{t.title}</h3>
                  <p className="mt-1 text-sm text-gray-600">{t.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile */}
      <section className="bg-blue-50 py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center gap-6 justify-between">
          <div className="flex items-start gap-4">
            <span className="shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white"><Smartphone className="w-6 h-6" /></span>
            <div>
              <h2 className="text-xl font-bold">Take it with you on Android</h2>
              <p className="mt-1 text-gray-600">Download Finance Tracker from Google Play and sign in with the same account — your data stays in sync with the website.</p>
            </div>
          </div>
          {SITE.playStoreUrl && (
            <a href={SITE.playStoreUrl} target="_blank" rel="noopener noreferrer"
              className="shrink-0 bg-gray-900 hover:bg-black text-white font-semibold px-5 py-3 rounded-lg">
              Get it on Google Play
            </a>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 sm:py-24 scroll-mt-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center">Frequently asked questions</h2>
          <div className="mt-10 divide-y divide-gray-200 border-y border-gray-200">
            {FAQ.map(f => (
              <details key={f.q} className="group py-5">
                <summary className="flex items-center justify-between cursor-pointer list-none font-semibold text-gray-900">
                  {f.q}
                  <span className="ml-4 text-gray-400 group-open:rotate-45 transition-transform text-2xl leading-none" aria-hidden="true">+</span>
                </summary>
                <p className="mt-3 text-gray-600 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-16 sm:pb-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto rounded-3xl bg-gradient-to-br from-blue-700 to-indigo-800 text-white px-6 py-12 sm:p-14 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Know your net worth today</h2>
          <p className="mt-4 text-blue-100 max-w-xl mx-auto">Create an account in under a minute and start adding your investments.</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/signup/" className="inline-flex items-center justify-center gap-2 bg-white text-blue-900 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50">
              Create free account <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login/" className="inline-flex items-center justify-center font-semibold px-6 py-3 rounded-lg border border-white/40 hover:bg-white/10">
              I already have an account
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
