import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { TrendingUp, Lock, User, HelpCircle, KeyRound, ArrowLeft, CheckCircle } from 'lucide-react';
import { apiErrorMessage } from '../../services/api';

type ForgotStep = 'username' | 'hint' | 'reset' | 'done';

export default function Login() {
  const { login, resetPassword } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername]     = useState('');
  const [password, setPassword]     = useState('');
  const [error, setError]           = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [showForgot,  setShowForgot]  = useState(false);
  const [forgotStep,  setForgotStep]  = useState<ForgotStep>('username');
  const [fpUsername,  setFpUsername]  = useState('');
  const [fpHintInput, setFpHintInput] = useState('');
  const [fpNewPass,   setFpNewPass]   = useState('');
  const [fpConfirm,   setFpConfirm]   = useState('');
  const [fpError,     setFpError]     = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username || !password) { setError('All fields are required.'); return; }
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate('/dashboard');
    } catch (err) {
      setError(apiErrorMessage(err, 'Invalid username or password.'));
    } finally {
      setSubmitting(false);
    }
  };

  const openForgot = () => {
    setShowForgot(true); setForgotStep('username');
    setFpUsername(''); setFpHintInput('');
    setFpNewPass(''); setFpConfirm(''); setFpError('');
  };
  const closeForgot = () => setShowForgot(false);

  const handleFpUsername = (e: React.FormEvent) => {
    e.preventDefault(); setFpError('');
    if (!fpUsername.trim()) { setFpError('Please enter your username.'); return; }
    setForgotStep('hint');
  };

  // The hint is verified by the server together with the new password
  const handleFpHint = (e: React.FormEvent) => {
    e.preventDefault(); setFpError('');
    if (!fpHintInput.trim()) { setFpError('Please enter your password hint.'); return; }
    setForgotStep('reset');
  };

  const handleFpReset = async (e: React.FormEvent) => {
    e.preventDefault(); setFpError('');
    if (!fpNewPass || !fpConfirm) { setFpError('Both fields are required.'); return; }
    if (fpNewPass.length < 6) { setFpError('Password must be at least 6 characters.'); return; }
    if (fpNewPass !== fpConfirm) { setFpError('Passwords do not match.'); return; }
    setSubmitting(true);
    try {
      await resetPassword(fpUsername.trim(), fpHintInput.trim(), fpNewPass);
      setForgotStep('done');
    } catch (err) {
      const msg = apiErrorMessage(err, 'Reset failed. Please try again.');
      if (msg.includes('hint is incorrect')) { setForgotStep('hint'); setFpHintInput(''); }
      setFpError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (showForgot) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="bg-amber-100 p-3 rounded-full mb-3">
              <KeyRound className="text-amber-600 w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Forgot Password</h1>
            <p className="text-gray-500 text-sm mt-1">
              {forgotStep === 'username' && 'Enter your username to get started'}
              {forgotStep === 'hint'     && 'Verify it’s you with your password hint'}
              {forgotStep === 'reset'    && 'Set a new password'}
              {forgotStep === 'done'     && 'Password reset successfully!'}
            </p>
          </div>

          {forgotStep !== 'done' && (
            <div className="flex items-center justify-center gap-2 mb-6">
              {(['username', 'hint', 'reset'] as ForgotStep[]).map((s, i) => (
                <React.Fragment key={s}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    forgotStep === s ? 'bg-blue-600 text-white' :
                    (['username', 'hint', 'reset'].indexOf(forgotStep) > i) ? 'bg-green-500 text-white' :
                    'bg-gray-200 text-gray-500'
                  }`}>{i + 1}</div>
                  {i < 2 && <div className={`h-0.5 w-8 transition-colors ${
                    ['username', 'hint', 'reset'].indexOf(forgotStep) > i ? 'bg-green-400' : 'bg-gray-200'
                  }`} />}
                </React.Fragment>
              ))}
            </div>
          )}

          {fpError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{fpError}</div>
          )}

          {forgotStep === 'username' && (
            <form onSubmit={handleFpUsername} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input type="text" value={fpUsername} onChange={e => setFpUsername(e.target.value)}
                    placeholder="Enter your username" autoFocus
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors">Continue</button>
            </form>
          )}

          {forgotStep === 'hint' && (
            <form onSubmit={handleFpHint} className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                Enter the password hint you set when you created the account for <span className="font-medium">{fpUsername.trim()}</span>.
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Enter Password Hint</label>
                <div className="relative">
                  <HelpCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input type="text" value={fpHintInput} onChange={e => setFpHintInput(e.target.value)}
                    placeholder="Your password hint" autoFocus
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors">Continue</button>
            </form>
          )}

          {forgotStep === 'reset' && (
            <form onSubmit={handleFpReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input type="password" value={fpNewPass} onChange={e => setFpNewPass(e.target.value)}
                    placeholder="Min. 6 characters" autoFocus
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input type="password" value={fpConfirm} onChange={e => setFpConfirm(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <button type="submit" disabled={submitting} className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60">{submitting ? 'Resetting…' : 'Reset Password'}</button>
            </form>
          )}

          {forgotStep === 'done' && (
            <div className="text-center space-y-4">
              <div className="flex justify-center"><CheckCircle className="text-green-500 w-14 h-14" /></div>
              <p className="text-gray-600 text-sm">Password reset successfully. You can now sign in.</p>
              <button onClick={closeForgot} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors">Back to Sign In</button>
            </div>
          )}

          {forgotStep !== 'done' && (
            <button onClick={closeForgot} className="mt-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mx-auto">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 p-3 rounded-full mb-3">
            <TrendingUp className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Finance Tracker</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>
        )}

        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <button type="button" onClick={openForgot} className="text-xs text-blue-600 hover:underline font-medium">
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>

          <button type="submit" disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors duration-200 disabled:opacity-60">
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Don't have an account?{' '}
          <Link to="/signup/" className="text-blue-600 hover:underline font-medium">Sign up</Link>
        </p>
        <p className="text-center text-xs text-gray-400 mt-3">
          <Link to="/" className="hover:text-gray-600 hover:underline">← Back to home</Link>
          {' · '}
          <Link to="/privacy-policy/" className="hover:text-gray-600 hover:underline">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
