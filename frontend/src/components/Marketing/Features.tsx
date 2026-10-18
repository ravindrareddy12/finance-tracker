import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import MarketingLayout from './MarketingLayout';
import { FEATURES } from './featureList';

export default function Features() {
  return (
    <MarketingLayout>
      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight max-w-3xl">
            Features built for how Indians actually invest
          </h1>
          <p className="mt-5 text-lg text-blue-100/90 max-w-2xl">
            Stocks on two continents, mutual fund SIPs, property, money lent to family and friends, and the monthly
            budget — Finance Tracker covers all of it.
          </p>
          <nav className="mt-8 flex flex-wrap gap-2" aria-label="Jump to feature">
            {FEATURES.map(f => (
              <a key={f.id} href={`#${f.id}`} className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full">{f.title}</a>
            ))}
          </nav>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 space-y-8">
        {FEATURES.map(f => (
          <section key={f.id} id={f.id} className="scroll-mt-20 grid md:grid-cols-5 gap-6 rounded-2xl border border-gray-200 p-6 sm:p-8">
            <div className="md:col-span-2">
              <span className="inline-flex p-2.5 rounded-xl bg-blue-50 text-blue-700">{f.icon}</span>
              <h2 className="mt-4 text-2xl font-bold">{f.title}</h2>
              <p className="mt-2 text-gray-600 leading-relaxed">{f.summary}</p>
            </div>
            <ul className="md:col-span-3 space-y-3 md:pt-2">
              {f.points.map(p => (
                <li key={p} className="flex gap-3 text-gray-700">
                  <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />{p}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="pb-16 sm:pb-24 px-4 sm:px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight">Ready to see the full picture?</h2>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/signup/" className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg">
            Get started free <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/login/" className="inline-flex items-center justify-center font-semibold px-6 py-3 rounded-lg border border-gray-300 hover:border-blue-300 text-gray-700">
            Log in
          </Link>
        </div>
      </section>
    </MarketingLayout>
  );
}
