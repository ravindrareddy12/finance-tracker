import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Mail } from 'lucide-react';
import MarketingLayout from './MarketingLayout';
import { LEGAL } from '../Legal/legalInfo';

export default function About() {
  return (
    <MarketingLayout>
      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">About Finance Tracker</h1>
          <p className="mt-5 text-lg text-blue-100/90">
            A simple, private place to see everything you own — without handing your bank passwords to anyone.
          </p>
        </div>
      </section>

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-16 space-y-10 text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-2xl font-bold text-gray-900">Why we built it</h2>
          <p className="mt-3">
            Most families spread their savings across several places: a demat account or two, a US brokerage, mutual
            fund SIPs, a flat or a plot of land, money lent to relatives, fixed deposits and gold. Each lives in a
            different app or statement, so answering a simple question — <em>“what are we actually worth?”</em> — means
            an evening with a spreadsheet.
          </p>
          <p className="mt-3">
            Finance Tracker started as that spreadsheet and grew into a full dashboard: every asset class in one view,
            returns calculated properly with XIRR, and a monthly expense log alongside so you can see what you spend
            against what you have saved.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">Who it is for</h2>
          <ul className="mt-3 list-disc pl-5 space-y-2">
            <li>Investors in India who also hold US stocks and want one combined net worth.</li>
            <li>Mutual fund SIP investors who want true annualised returns, not just absolute gains.</li>
            <li>Families tracking holdings across several demat accounts and family members.</li>
            <li>Anyone working towards FIRE who wants to measure progress against real numbers.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">How we treat your data</h2>
          <p className="mt-3">
            You type in or import only what you want to track. We do not connect to banks or brokers, we do not show
            ads, and we do not run analytics trackers. Passwords are stored as one-way hashes, and you can export or
            permanently delete your data whenever you like. The details are in our{' '}
            <Link to="/privacy-policy/" className="text-blue-700 underline">privacy policy</Link>.
          </p>
        </section>

        <section className="rounded-2xl bg-gray-50 border border-gray-200 p-6 sm:p-8">
          <h2 className="text-xl font-bold text-gray-900">Get in touch</h2>
          <p className="mt-2">Questions, feedback or a feature you would like to see? We read every email.</p>
          <a href={`mailto:${LEGAL.contactEmail}`} className="mt-4 inline-flex items-center gap-2 font-semibold text-blue-700 hover:text-blue-800">
            <Mail className="w-4 h-4" /> {LEGAL.contactEmail}
          </a>
        </section>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link to="/signup/" className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg">
            Create free account <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/features/" className="inline-flex items-center justify-center font-semibold px-6 py-3 rounded-lg border border-gray-300 hover:border-blue-300 text-gray-700">
            Explore features
          </Link>
        </div>
      </article>
    </MarketingLayout>
  );
}
