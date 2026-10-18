import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AlertTriangle, CheckCircle, Lock, User } from 'lucide-react';
import LegalLayout, { List, Section } from './LegalLayout';
import { LEGAL } from './legalInfo';
import { useAuth } from '../../context/AuthContext';
import { apiErrorMessage, tokenStore } from '../../services/api';
import { clearUserData } from '../../hooks/useAutoBackup';

// Public page (linked from Google Play): sign in and permanently delete the account.
export default function DeleteAccount() {
  const { currentUser, status, signOutLocal } = useAuth();
  const signedIn = status === 'authenticated' && !!currentUser;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const name = signedIn ? currentUser! : username.trim();
    if (!name || !password) { setError('Enter your username and password.'); return; }
    if (!confirmed) { setError('Please confirm that you understand this cannot be undone.'); return; }
    setSubmitting(true);
    try {
      // Get a token for this account (the signed-in one, or by signing in here)
      const token = signedIn
        ? tokenStore.get()
        : (await axios.post<{ token: string }>('/api/auth/login', { username: name, password })).data.token;
      await axios.delete('/api/auth/me', { data: { password }, headers: { Authorization: `Bearer ${token}` } });
      clearUserData(name);
      if (signedIn) signOutLocal();
      setDeleted(true);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not delete the account. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LegalLayout title="Delete your account">
      {deleted ? (
        <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4">
          <CheckCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Your account has been deleted.</p>
            <p className="text-sm mt-1">Your account and all of its data have been permanently removed. You can close this page.</p>
          </div>
        </div>
      ) : (
        <>
          <p>
            You can permanently delete your {LEGAL.appName} account and all of its data here, or in the Android app under
            <em> More → Delete account</em>.
          </p>

          <Section title="What gets deleted">
            <List items={[
              'Your account: username, password and password hint.',
              'All of your data: stock transactions and cash balances, mutual funds and SIPs, real estate, loans, other investments, monthly expenses, FIRE calculator inputs and settings.',
            ]} />
            <p>
              Deletion is immediate and permanent — it cannot be undone. Server request logs (which contain IP addresses,
              not your financial data) are discarded after a limited period. If you want a copy of your data first, sign
              in on the website and use <strong>Export Excel</strong>.
            </p>
          </Section>

          <Section title="Delete account">
            <form onSubmit={submit} className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 space-y-4 max-w-md">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}

              {signedIn ? (
                <p className="text-sm">Signed in as <strong>{currentUser}</strong>.</p>
              ) : (
                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-1">Username</span>
                  <span className="relative block">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input type="text" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400" />
                  </span>
                </label>
              )}

              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Password</span>
                <span className="relative block">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400" />
                </span>
              </label>

              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-1" />
                <span>I understand my account and all of its data will be permanently deleted.</span>
              </label>

              <button type="submit" disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60">
                <AlertTriangle className="w-4 h-4" />
                {submitting ? 'Deleting…' : 'Permanently delete my account'}
              </button>

              <p className="text-xs text-gray-500">
                Forgot your password? Reset it from the <Link to="/login/" className="text-blue-700 underline">sign-in page</Link>, or email{' '}
                <a href={`mailto:${LEGAL.contactEmail}?subject=Account%20deletion%20request`} className="text-blue-700 underline">{LEGAL.contactEmail}</a>{' '}
                from the address you want to be contacted at, with your username, and we will verify and delete the account.
              </p>
            </form>
          </Section>
        </>
      )}
    </LegalLayout>
  );
}
