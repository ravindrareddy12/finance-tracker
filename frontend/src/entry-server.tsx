import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { AuthProvider } from './context/AuthContext';
import { AppRoutes, SessionCheck } from './App';

// Used only at build time by scripts/prerender.mjs to produce static HTML
// for the public pages, so crawlers and link previews see real content.
export function render(url: string): string {
  if (url === '/dashboard') return renderToString(<SessionCheck />);
  return renderToString(
    <AuthProvider>
      <StaticRouter location={url}>
        <AppRoutes />
      </StaticRouter>
    </AuthProvider>
  );
}

export { PAGES, SITE, FAQ, canonicalFor } from './seo';
export { FEATURES } from './components/Marketing/featureList';
