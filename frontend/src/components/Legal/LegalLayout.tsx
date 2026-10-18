import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { LEGAL } from './legalInfo';

export default function LegalLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="bg-blue-600 p-1.5 rounded-lg"><TrendingUp className="text-white w-4 h-4" /></span>
            <span className="font-bold text-gray-800">{LEGAL.appName}</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/privacy-policy/" className="text-gray-600 hover:text-blue-700">Privacy</Link>
            <Link to="/delete-account/" className="text-gray-600 hover:text-blue-700">Delete account</Link>
          </nav>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h1>
        <div className="mt-6 text-gray-700 leading-relaxed space-y-4">{children}</div>
      </main>
      <footer className="border-t border-gray-200 py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} {LEGAL.publisher || LEGAL.appName} · <a href={`mailto:${LEGAL.contactEmail}`} className="hover:text-gray-600">{LEGAL.contactEmail}</a>
      </footer>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="pt-4 space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {children}
    </section>
  );
}

export function List({ items }: { items: React.ReactNode[] }) {
  return <ul className="list-disc pl-5 space-y-1.5">{items.map((item, i) => <li key={i}>{item}</li>)}</ul>;
}
