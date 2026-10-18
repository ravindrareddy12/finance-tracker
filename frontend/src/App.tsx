import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Auth/Login';
import Signup from './components/Auth/Signup';
import Home from './components/Marketing/Home';
import Features from './components/Marketing/Features';
import About from './components/Marketing/About';
import Seo from './components/Seo';
import PrivacyPolicy from './components/Legal/PrivacyPolicy';
import DeleteAccount from './components/Legal/DeleteAccount';

// Loaded on demand so the public pages stay light
const Dashboard = lazy(() => import('./components/Dashboard/Dashboard'));

export function SessionCheck() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center">
      <div className="flex items-center gap-3 text-white/80 text-sm">
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        Checking your session…
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  if (status === 'checking') return <SessionCheck />;
  return status === 'authenticated' ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  if (status === 'checking') return <SessionCheck />;
  return status === 'anonymous' ? <>{children}</> : <Navigate to="/dashboard" replace />;
}

// Shared by the browser app and the prerender step (src/entry-server.tsx)
export function AppRoutes() {
  return (
    <>
      <Seo />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/features" element={<Features />} />
        <Route path="/about" element={<About />} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
        <Route path="/dashboard" element={
          <ProtectedRoute><Suspense fallback={<SessionCheck />}><Dashboard /></Suspense></ProtectedRoute>
        } />
        {/* Public pages (linked from Google Play) — reachable signed in or out */}
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/delete-account" element={<DeleteAccount />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
