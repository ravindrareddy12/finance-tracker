import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, TrendingUp, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LEGAL } from '../Legal/legalInfo';

const NAV = [
  { to: '/features/', label: 'Features' },
  { to: '/about/', label: 'About' },
  { to: '/#faq', label: 'FAQ' },
];

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label={`${LEGAL.appName} home`}>
      <span className="bg-blue-600 p-1.5 rounded-lg"><TrendingUp className="text-white w-5 h-5" /></span>
      <span className={`font-bold text-lg ${light ? 'text-white' : 'text-gray-900'}`}>{LEGAL.appName}</span>
    </Link>
  );
}

function AuthButtons({ onClick }: { onClick?: () => void }) {
  const { status } = useAuth();
  if (status === 'authenticated') {
    return (
      <Link to="/dashboard" onClick={onClick}
        className="inline-flex justify-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
        Open dashboard
      </Link>
    );
  }
  return (
    <>
      <Link to="/login/" onClick={onClick}
        className="inline-flex justify-center text-sm font-semibold text-gray-700 hover:text-blue-700 border border-gray-300 hover:border-blue-300 px-4 py-2 rounded-lg transition-colors">
        Log in
      </Link>
      <Link to="/signup/" onClick={onClick}
        className="inline-flex justify-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
        Get started
      </Link>
    </>
  );
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  // The FAQ anchor lives on the home page, so it is never shown as the active page
  const linkClass = (to: string) => ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors ${isActive && !to.includes('#') ? 'text-blue-700' : 'text-gray-600 hover:text-blue-700'}`;

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-8" aria-label="Main">
            {NAV.map(n => <NavLink key={n.to} to={n.to} className={linkClass(n.to)} end>{n.label}</NavLink>)}
          </nav>
          <div className="hidden md:flex items-center gap-3"><AuthButtons /></div>
          <button onClick={() => setOpen(o => !o)} className="md:hidden p-2 -mr-2 text-gray-600"
            aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        {open && (
          <div className="md:hidden border-t border-gray-200 bg-white px-4 py-4 space-y-4">
            <nav className="flex flex-col gap-3" aria-label="Main">
              {NAV.map(n => <NavLink key={n.to} to={n.to} onClick={close} className={linkClass(n.to)} end>{n.label}</NavLink>)}
            </nav>
            <div className="grid grid-cols-2 gap-3"><AuthButtons onClick={close} /></div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-gray-950 text-gray-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3 lg:col-span-2">
            <Logo light />
            <p className="text-sm max-w-sm">
              One private dashboard for your stocks, mutual funds, property, loans and expenses — across India and the US.
            </p>
          </div>
          <div>
            <h2 className="text-white text-sm font-semibold mb-3">Product</h2>
            <ul className="space-y-2 text-sm">
              <li><Link to="/features/" className="hover:text-white">Features</Link></li>
              <li><Link to="/about/" className="hover:text-white">About</Link></li>
              <li><Link to="/#faq" className="hover:text-white">FAQ</Link></li>
              <li><Link to="/signup/" className="hover:text-white">Create account</Link></li>
              <li><Link to="/login/" className="hover:text-white">Log in</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="text-white text-sm font-semibold mb-3">Legal &amp; support</h2>
            <ul className="space-y-2 text-sm">
              <li><Link to="/privacy-policy/" className="hover:text-white">Privacy policy</Link></li>
              <li><Link to="/delete-account/" className="hover:text-white">Delete account</Link></li>
              <li><a href={`mailto:${LEGAL.contactEmail}`} className="hover:text-white">{LEGAL.contactEmail}</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 py-5 text-center text-xs">
          © {new Date().getFullYear()} {LEGAL.publisher || LEGAL.appName}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
