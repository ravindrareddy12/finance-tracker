import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { SITE } from '../../seo';

export function Container({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

export function Eyebrow({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${dark ? 'text-blue-300' : 'text-blue-600'}`}>{children}</p>
  );
}

export function SectionHeading({ eyebrow, title, text, center = false, dark = false }: {
  eyebrow: string; title: React.ReactNode; text?: React.ReactNode; center?: boolean; dark?: boolean;
}) {
  return (
    <div className={center ? 'max-w-2xl mx-auto text-center' : 'max-w-2xl'}>
      <Eyebrow dark={dark}>{eyebrow}</Eyebrow>
      <h2 className={`mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-balance ${dark ? 'text-white' : 'text-slate-900'}`}>{title}</h2>
      {text && <p className={`mt-4 text-lg leading-relaxed ${dark ? 'text-slate-300' : 'text-slate-600'}`}>{text}</p>}
    </div>
  );
}

const BTN = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500';

export function PrimaryButton({ to, children, light = false, className = '' }: {
  to: string; children: React.ReactNode; light?: boolean; className?: string;
}) {
  const tone = light
    ? 'bg-white text-slate-900 hover:bg-blue-50 shadow-lg shadow-blue-950/20'
    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/25';
  return (
    <Link to={to} className={`${BTN} ${tone} px-6 py-3.5 group ${className}`}>
      {children}
      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  );
}

export function SecondaryButton({ to, children, dark = false, className = '' }: {
  to: string; children: React.ReactNode; dark?: boolean; className?: string;
}) {
  const tone = dark
    ? 'text-white ring-1 ring-inset ring-white/25 hover:bg-white/10'
    : 'text-slate-800 ring-1 ring-inset ring-slate-300 hover:ring-slate-400 hover:bg-slate-50';
  return <Link to={to} className={`${BTN} ${tone} px-6 py-3.5 ${className}`}>{children}</Link>;
}

function PlayLogo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 26" className={className} aria-hidden="true">
      <path d="M1.2.6 13.4 12.9 1.2 25.2C.7 24.9.4 24.3.4 23.6V2.2C.4 1.5.7.9 1.2.6Z" fill="#00D7FE" />
      <path d="m17.5 8.8-4.1 4.1 4.1 4.1 4.8-2.7c1.4-.8 1.4-2.1 0-2.9l-4.8-2.6Z" fill="#FFCE00" />
      <path d="M17.5 17 13.4 12.9 1.2 25.2c.5.3 1.2.3 1.9-.1L17.5 17Z" fill="#FF3A44" />
      <path d="M17.5 8.8 3.1.7C2.4.3 1.7.3 1.2.6l12.2 12.3 4.1-4.1Z" fill="#00F076" />
    </svg>
  );
}

/** "Get it on Google Play" badge linking to the store listing */
export function PlayBadge({ className = '' }: { className?: string }) {
  if (!SITE.playStoreUrl) return null;
  return (
    <a href={SITE.playStoreUrl} target="_blank" rel="noopener noreferrer" aria-label="Get it on Google Play"
      className={`inline-flex items-center gap-3 bg-black text-white rounded-xl pl-3.5 pr-5 py-2 ring-1 ring-white/15 hover:bg-slate-900 transition-colors ${className}`}>
      <PlayLogo className="w-6 h-6" />
      <span className="flex flex-col leading-none text-left">
        <span className="text-[10px] uppercase tracking-wide text-slate-300">Get it on</span>
        <span className="text-lg font-semibold mt-0.5">Google Play</span>
      </span>
    </a>
  );
}

/** Dark page header used by the inner marketing pages */
export function PageHero({ eyebrow, title, text, children }: {
  eyebrow: string; title: string; text: string; children?: React.ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-slate-950 text-white text-center">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" aria-hidden="true" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 -z-10 w-[56rem] h-[32rem] rounded-full bg-gradient-to-br from-blue-600/40 via-indigo-600/25 to-transparent blur-3xl" aria-hidden="true" />
      <Container className="py-20 sm:py-28">
        <Eyebrow dark>{eyebrow}</Eyebrow>
        <h1 className="mt-4 mx-auto max-w-3xl text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05] text-balance">{title}</h1>
        <p className="mt-6 mx-auto max-w-2xl text-lg sm:text-xl text-slate-300 leading-relaxed text-balance">{text}</p>
        {children}
      </Container>
    </section>
  );
}
