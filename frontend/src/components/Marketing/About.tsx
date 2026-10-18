import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, Globe2, HeartHandshake, Mail, Target } from 'lucide-react';
import MarketingLayout from './MarketingLayout';
import { Container, PageHero, PrimaryButton, SecondaryButton, SectionHeading } from './ui';
import { LEGAL } from '../Legal/legalInfo';

const AUDIENCE = [
  { icon: Globe2, title: 'Cross-border investors', text: 'Indian investors who also hold US stocks and want one combined net worth.' },
  { icon: Target, title: 'SIP investors', text: 'People who want true annualised returns on their SIPs, not just absolute gains.' },
  { icon: HeartHandshake, title: 'Families', text: 'Households tracking holdings across several demat accounts and family members.' },
  { icon: Eye, title: 'FIRE planners', text: 'Anyone working towards financial independence who wants to measure real progress.' },
];

export default function About() {
  return (
    <MarketingLayout>
      <PageHero eyebrow="About" title="A calm, private place for your money"
        text="Finance Tracker shows everything you own in one view — without handing your bank passwords to anyone." />

      <section className="bg-white py-16 sm:py-24">
        <Container className="grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4">
            <SectionHeading eyebrow="Our story" title="Why we built it" />
          </div>
          <div className="lg:col-span-8 space-y-5 text-lg text-slate-600 leading-relaxed">
            <p>
              Most families spread their savings across several places: a demat account or two, a US brokerage, mutual
              fund SIPs, a flat or a plot of land, money lent to relatives, fixed deposits and gold. Each lives in a
              different app or statement, so answering a simple question — <em className="text-slate-900 not-italic font-semibold">“what are we actually worth?”</em> —
              means an evening with a spreadsheet.
            </p>
            <p>
              Finance Tracker started as that spreadsheet and grew into a full dashboard: every asset class in one view,
              returns calculated properly with XIRR, and a monthly expense log alongside, so you can see what you spend
              against what you have saved.
            </p>
          </div>
        </Container>
      </section>

      <section className="bg-slate-50 border-y border-slate-200/70 py-16 sm:py-24">
        <Container>
          <SectionHeading center eyebrow="Who it’s for" title="Made for people who take their money seriously" />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {AUDIENCE.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl bg-white ring-1 ring-slate-200 p-6">
                <span className="inline-flex p-2.5 rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100"><Icon className="w-5 h-5" /></span>
                <h3 className="mt-5 font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-white py-16 sm:py-24">
        <Container className="grid lg:grid-cols-2 gap-6">
          <div className="rounded-3xl bg-slate-950 text-white p-8 sm:p-10">
            <h2 className="text-2xl font-bold">How we treat your data</h2>
            <p className="mt-4 text-slate-300 leading-relaxed">
              You type in or import only what you want to track. We do not connect to banks or brokers, we do not show
              ads, and we do not run analytics trackers. Passwords are stored as one-way hashes, and you can export or
              permanently delete your data whenever you like.
            </p>
            <Link to="/privacy-policy/" className="mt-6 inline-flex text-sm font-semibold text-blue-300 hover:text-blue-200">
              Read the privacy policy →
            </Link>
          </div>
          <div className="rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 ring-1 ring-blue-100 p-8 sm:p-10">
            <h2 className="text-2xl font-bold text-slate-900">Get in touch</h2>
            <p className="mt-4 text-slate-600 leading-relaxed">
              Questions, feedback or a feature you would like to see? We read every email.
            </p>
            <a href={`mailto:${LEGAL.contactEmail}`} className="mt-6 inline-flex items-center gap-2 font-semibold text-blue-700 hover:text-blue-800">
              <Mail className="w-4 h-4" /> {LEGAL.contactEmail}
            </a>
          </div>
        </Container>
        <Container className="mt-14 flex flex-col sm:flex-row gap-3 justify-center">
          <PrimaryButton to="/signup/">Create free account</PrimaryButton>
          <SecondaryButton to="/features/">Explore features</SecondaryButton>
        </Container>
      </section>
    </MarketingLayout>
  );
}
