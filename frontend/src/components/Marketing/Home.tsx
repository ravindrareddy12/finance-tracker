import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ChevronDown, EyeOff, FileSpreadsheet, KeyRound, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import MarketingLayout from './MarketingLayout';
import { FEATURES } from './featureList';
import { AppWindowMockup, CurrencyCard, FireCard, PhoneMockup, SipCard } from './mockups';
import { Container, Eyebrow, PlayBadge, PrimaryButton, SecondaryButton, SectionHeading } from './ui';
import { FAQ, SITE } from '../../seo';
import { LEGAL } from '../Legal/legalInfo';

const COVERAGE = ['NYSE', 'NASDAQ', 'NSE', 'Mutual funds & SIPs', 'Real estate', 'FDs, PPF & gold', 'Loans given', 'Monthly expenses'];

const SPOTLIGHTS = [
  {
    eyebrow: 'Returns that tell the truth',
    title: 'XIRR on every fund, SIP and portfolio',
    text: 'Absolute returns flatter SIPs and lump sums alike. Finance Tracker uses XIRR — the same annualised method fund houses use — so you can compare a 3-year SIP with a 6-month lump sum fairly.',
    points: ['SIP instalments recorded automatically at the right NAV', 'Per-fund and whole-portfolio XIRR', 'Realised and unrealised gains kept separate'],
    visual: <SipCard />,
  },
  {
    eyebrow: 'India and the US, together',
    title: 'One net worth across two markets',
    text: 'Hold Reliance on NSE and Apple on NASDAQ? Both are priced live and your US holdings are converted at the current USD/INR rate, so the total is always in one currency.',
    points: ['Live quotes for NYSE, NASDAQ and NSE', 'Separate portfolios per demat or family member', 'Cash balances tracked per account'],
    visual: <CurrencyCard />,
  },
  {
    eyebrow: 'Plan the finish line',
    title: 'Know how far you are from FIRE',
    text: 'Set your monthly expenses, withdrawal rate and inflation. The FIRE calculator measures progress against your real portfolio — not a number you typed in once and forgot.',
    points: ['Target corpus from your own expenses', 'Progress updates as your portfolio moves', 'Tune inflation and return assumptions'],
    visual: <FireCard />,
  },
];

const STEPS = [
  { title: 'Create your account', text: 'Just a username and password. No bank, broker or demat login — ever.' },
  { title: 'Add or import holdings', text: 'Type in transactions or import the Excel sheets you already keep.' },
  { title: 'See the whole picture', text: 'Live prices, XIRR and allocation update on their own, on web and Android.' },
];

const TRUST = [
  { icon: EyeOff, title: 'No bank linking', text: 'You never share bank, broker or demat credentials with us.' },
  { icon: KeyRound, title: 'Hashed passwords', text: 'Passwords and hints are stored only as one-way bcrypt hashes.' },
  { icon: ShieldCheck, title: 'No ads, no trackers', text: 'No advertising or analytics SDKs. Your data is never sold.' },
  { icon: FileSpreadsheet, title: 'Leave any time', text: 'Export to Excel, download a full backup, or delete everything.' },
];

function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-slate-950 text-white">
      {/* Background: grid + glow */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" aria-hidden="true" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 -z-10 w-[64rem] h-[40rem] rounded-full bg-gradient-to-br from-blue-600/40 via-indigo-600/30 to-transparent blur-3xl" aria-hidden="true" />

      <Container className="pt-16 sm:pt-24 text-center">
        {SITE.playStoreUrl && (
          <a href={SITE.playStoreUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-white/5 ring-1 ring-white/15 pl-1.5 pr-3.5 py-1.5 text-xs sm:text-sm text-slate-200 hover:bg-white/10 transition-colors">
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500 px-2 py-0.5 text-[11px] font-semibold text-white"><Sparkles className="w-3 h-3" />New</span>
            Now on Google Play for Android <ArrowRight className="w-3.5 h-3.5" />
          </a>
        )}
        <h1 className="mt-7 mx-auto max-w-4xl text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05] text-balance">
          Your entire net worth,{' '}
          <span className="bg-gradient-to-r from-blue-300 via-sky-300 to-indigo-300 bg-clip-text text-transparent">in one dashboard</span>
        </h1>
        <p className="mt-6 mx-auto max-w-2xl text-lg sm:text-xl text-slate-300 leading-relaxed text-balance">
          Track US and Indian stocks, mutual fund SIPs, real estate, money you have lent and monthly expenses —
          with live prices, true XIRR returns and a FIRE plan.
        </p>
        <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
          <PrimaryButton to="/signup/" light>Get started — it’s free</PrimaryButton>
          <SecondaryButton to="/login/" dark>Log in</SecondaryButton>
        </div>
        <p className="mt-5 text-sm text-slate-400">No bank linking · No ads · Web and Android</p>
      </Container>
    </section>
  );
}

// Dashboard preview straddling the dark hero and the white page below
function HeroPreview() {
  return (
    <section className="bg-[linear-gradient(to_bottom,#020617_0%,#020617_55%,#ffffff_55%)]">
      <Container className="pt-14 sm:pt-16">
        <div className="relative mx-auto max-w-5xl">
          <div className="absolute -inset-x-8 -top-8 h-1/2 bg-blue-500/25 blur-3xl rounded-[3rem]" aria-hidden="true" />
          <div className="relative rounded-[1.25rem] bg-white/5 p-1.5 sm:p-2 ring-1 ring-white/10 shadow-2xl shadow-slate-900/20">
            <AppWindowMockup />
          </div>
        </div>
      </Container>
    </section>
  );
}

export default function Home() {
  return (
    <MarketingLayout>
      <Hero />
      <HeroPreview />

      {/* Coverage strip */}
      <section className="pt-14 sm:pt-16 pb-14 bg-white">
        <Container>
          <p className="text-center text-sm font-medium text-slate-500">Everything you own, tracked in one place</p>
          <ul className="mt-5 flex flex-wrap justify-center gap-2 sm:gap-3">
            {COVERAGE.map(c => (
              <li key={c} className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-sm font-medium text-slate-600">{c}</li>
            ))}
          </ul>
          <p className="mt-6 text-center text-xs text-slate-400">Dashboard above shows sample data for illustration.</p>
        </Container>
      </section>

      {/* Features grid */}
      <section id="features" className="py-20 sm:py-28 bg-slate-50 border-y border-slate-200/70">
        <Container>
          <SectionHeading center eyebrow="Features"
            title="Built for the way families in India actually invest"
            text="Broker apps show one account. Fund statements show one AMC. Finance Tracker shows all of it — and how it adds up." />
          <div className="mt-14 grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(f => (
              <Link key={f.id} to={`/features/#${f.id}`}
                className="group relative rounded-2xl bg-white p-6 ring-1 ring-slate-200 hover:ring-blue-300 hover:shadow-xl hover:shadow-blue-900/5 hover:-translate-y-0.5 transition-all">
                <span className={`inline-flex p-2.5 rounded-xl ring-1 ${f.tone}`}>{f.icon}</span>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{f.summary}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Learn more <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* Spotlights */}
      <section className="py-20 sm:py-28 bg-white">
        <Container className="space-y-24 sm:space-y-32">
          {SPOTLIGHTS.map((s, i) => (
            <div key={s.title} className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              <div className={i % 2 ? 'lg:order-2' : ''}>
                <SectionHeading eyebrow={s.eyebrow} title={s.title} text={s.text} />
                <ul className="mt-7 space-y-3">
                  {s.points.map(p => (
                    <li key={p} className="flex gap-3 text-slate-700">
                      <span className="mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 shrink-0">
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={`relative ${i % 2 ? 'lg:order-1' : ''}`}>
                <div className="absolute inset-6 bg-gradient-to-tr from-blue-200/60 to-indigo-200/60 blur-3xl rounded-full" aria-hidden="true" />
                <div className="relative max-w-md mx-auto">{s.visual}</div>
              </div>
            </div>
          ))}
        </Container>
      </section>

      {/* How it works */}
      <section className="py-20 sm:py-28 bg-slate-50 border-y border-slate-200/70">
        <Container>
          <SectionHeading center eyebrow="How it works" title="Up and running in five minutes" />
          <ol className="mt-14 grid gap-8 md:grid-cols-3 relative">
            <div className="hidden md:block absolute top-6 left-[16%] right-[16%] h-px bg-gradient-to-r from-blue-200 via-blue-300 to-blue-200" aria-hidden="true" />
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative text-center">
                <span className="relative mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-white ring-1 ring-blue-200 shadow-sm text-blue-600 font-bold text-lg">
                  {i + 1}
                </span>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-slate-600 max-w-xs mx-auto">{s.text}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Privacy */}
      <section className="py-20 sm:py-28 bg-white">
        <Container>
          <div className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-12 sm:p-14">
            <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-emerald-500/15 blur-3xl" aria-hidden="true" />
            <div className="relative grid lg:grid-cols-5 gap-10">
              <div className="lg:col-span-2">
                <SectionHeading dark eyebrow="Privacy first" title="Your money is your business"
                  text="We only store what you choose to enter. No bank connections, no selling data, no ad networks." />
                <Link to="/privacy-policy/" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-300 hover:text-blue-200">
                  Read the privacy policy <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="lg:col-span-3 grid sm:grid-cols-2 gap-4">
                {TRUST.map(({ icon: Icon, title, text }) => (
                  <div key={title} className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-5">
                    <span className="inline-flex p-2 rounded-lg bg-emerald-400/10 text-emerald-300"><Icon className="w-5 h-5" /></span>
                    <h3 className="mt-4 font-semibold text-white">{title}</h3>
                    <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Android app */}
      <section className="pb-20 sm:pb-28 bg-white">
        <Container>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-6 pt-12 sm:px-14 sm:pt-14 grid lg:grid-cols-2 gap-10 items-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_55%)]" aria-hidden="true" />
            <div className="relative lg:pb-14 text-white">
              <Eyebrow dark>Android app</Eyebrow>
              <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">Your portfolio, in your pocket</h2>
              <p className="mt-4 text-lg text-blue-100 leading-relaxed max-w-lg">
                Add a SIP, log an expense or check your net worth on the go. Sign in with the same account and
                everything stays in sync with the website.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <PlayBadge />
                <Link to="/signup/" className="text-sm font-semibold text-white/90 hover:text-white inline-flex items-center gap-1">
                  Or create an account on the web <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
            <div className="relative self-end h-[300px] sm:h-[340px] overflow-hidden">
              <PhoneMockup />
            </div>
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 sm:py-28 bg-slate-50 border-t border-slate-200/70 scroll-mt-16">
        <Container className="grid lg:grid-cols-3 gap-12">
          <div>
            <SectionHeading eyebrow="FAQ" title="Questions, answered" />
            <p className="mt-4 text-slate-600">Can’t find what you’re looking for?</p>
            <a href={`mailto:${LEGAL.contactEmail}`} className="mt-3 inline-flex items-center gap-2 font-semibold text-blue-600 hover:text-blue-700">
              <Mail className="w-4 h-4" /> {LEGAL.contactEmail}
            </a>
          </div>
          <div className="lg:col-span-2 space-y-3">
            {FAQ.map(f => (
              <details key={f.q} className="group rounded-2xl bg-white ring-1 ring-slate-200 open:ring-blue-200 open:shadow-sm transition">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none px-6 py-5 font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <ChevronDown className="w-5 h-5 shrink-0 text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true" />
                </summary>
                <p className="px-6 pb-5 -mt-1 text-slate-600 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      {/* Final CTA */}
      <section className="relative isolate overflow-hidden bg-slate-950 py-20 sm:py-28 text-center">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -z-10 w-[48rem] h-[24rem] rounded-full bg-blue-600/30 blur-3xl" aria-hidden="true" />
        <Container>
          <h2 className="mx-auto max-w-2xl text-3xl sm:text-5xl font-bold tracking-tight text-white text-balance">
            Know exactly where you stand — today
          </h2>
          <p className="mt-5 mx-auto max-w-xl text-lg text-slate-300">
            Create a free account in under a minute and add your first investment.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
            <PrimaryButton to="/signup/" light>Create free account</PrimaryButton>
            <SecondaryButton to="/login/" dark>I already have an account</SecondaryButton>
          </div>
        </Container>
      </section>
    </MarketingLayout>
  );
}
