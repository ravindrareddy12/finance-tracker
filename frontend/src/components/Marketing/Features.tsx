import React from 'react';
import { Check } from 'lucide-react';
import MarketingLayout from './MarketingLayout';
import { FEATURES } from './featureList';
import { Container, PageHero, PrimaryButton, SecondaryButton } from './ui';

export default function Features() {
  return (
    <MarketingLayout>
      <PageHero eyebrow="Features" title="Every asset. Every return. One place."
        text="Stocks on two continents, mutual fund SIPs, property, money lent to family and friends, and the monthly budget — Finance Tracker covers all of it.">
        <nav className="mt-10 flex flex-wrap justify-center gap-2" aria-label="Jump to feature">
          {FEATURES.map(f => (
            <a key={f.id} href={`#${f.id}`}
              className="text-sm text-slate-200 bg-white/5 ring-1 ring-white/15 hover:bg-white/10 px-3.5 py-1.5 rounded-full transition-colors">
              {f.title}
            </a>
          ))}
        </nav>
      </PageHero>

      <section className="bg-slate-50 py-16 sm:py-24">
        <Container className="space-y-5">
          {FEATURES.map((f, i) => (
            <article key={f.id} id={f.id}
              className="scroll-mt-24 grid md:grid-cols-12 gap-8 rounded-3xl bg-white ring-1 ring-slate-200 p-6 sm:p-10">
              <div className="md:col-span-5">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex p-2.5 rounded-xl ring-1 ${f.tone}`}>{f.icon}</span>
                  <span className="text-xs font-semibold text-slate-400 tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                </div>
                <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">{f.title}</h2>
                <p className="mt-3 text-slate-600 leading-relaxed">{f.summary}</p>
              </div>
              <ul className="md:col-span-7 grid sm:grid-cols-2 gap-3 content-start">
                {f.points.map(p => (
                  <li key={p} className="flex gap-3 rounded-xl bg-slate-50 ring-1 ring-slate-100 p-4 text-sm text-slate-700 leading-relaxed">
                    <span className="mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 shrink-0">
                      <Check className="w-3 h-3 text-white" strokeWidth={3} aria-hidden="true" />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </Container>
      </section>

      <section className="bg-white py-20 sm:py-24 text-center">
        <Container>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">Ready to see the full picture?</h2>
          <p className="mt-4 text-lg text-slate-600">Free to start. No bank linking required.</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <PrimaryButton to="/signup/">Get started free</PrimaryButton>
            <SecondaryButton to="/login/">Log in</SecondaryButton>
          </div>
        </Container>
      </section>
    </MarketingLayout>
  );
}
