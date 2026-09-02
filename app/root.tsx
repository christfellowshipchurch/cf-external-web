import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  data,
  useRouteLoaderData,
} from 'react-router-dom';
import { type ReactNode } from 'react';
import { type LoaderFunctionArgs } from 'react-router-dom';
import { randomUUID } from 'node:crypto';

import { Navbar, Footer } from './components';
import { AuthProvider } from './providers/auth-provider';
import { CookieConsentProvider } from './providers/cookie-consent-provider';

import './styles/tailwind.css';
import { loader as navbarLoader } from './routes/navbar/loader';
import { NavbarVisibilityProvider } from './providers/navbar-visibility-context';
import { setupDevWebVitalsLogging } from '~/lib/dev-web-vitals';
import { isPreviewMode } from '~/lib/.server/fetch-rock-data';
import { NavigationHistoryTracker } from '~/lib/navigation-history';

export { ErrorBoundary } from './error';

// Runs only in the browser (setup no-ops without window). Avoid import.meta.env.SSR here—
// client bundles can still evaluate oddly; window check inside setup is authoritative.
setupDevWebVitalsLogging();

export async function loader(args: LoaderFunctionArgs) {
  const nonce = randomUUID();
  const navbarData = await navbarLoader(args);
  const headers: Record<string, string> = {};
  // Preview deployments render Pending/unapproved content — keep it out of
  // search indexes even if Deployment Protection is ever misconfigured.
  if (isPreviewMode()) {
    headers['X-Robots-Tag'] = 'noindex, nofollow';
  }
  return data({ ...navbarData, nonce }, { headers });
}

export function Layout({ children }: { children: ReactNode }) {
  const loaderData = useRouteLoaderData<typeof loader>('root');
  const nonce = loaderData?.nonce;
  const algoliaAuditEnabled = loaderData?.algolia.auditEnabled === true;

  return (
    <html lang='en'>
      <head>
        {/* 1. CONSENT DEFAULT (Must be first) */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}

              // Set default consent to 'denied' immediately
              gtag('consent', 'default', {
                'ad_storage': 'denied',
                'ad_user_data': 'denied',
                'ad_personalization': 'denied',
                'analytics_storage': 'denied',
                'wait_for_update': 500 // Gives your React app 500ms to load cached consent
              });
            `,
          }}
        />
        {algoliaAuditEnabled && (
          <script
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: `
                (() => {
                  const requestUrls = new WeakMap();
                  const originalOpen = XMLHttpRequest.prototype.open;
                  const originalSend = XMLHttpRequest.prototype.send;

                  XMLHttpRequest.prototype.open = function(method, url, ...args) {
                    requestUrls.set(this, String(url));
                    return originalOpen.call(this, method, url, ...args);
                  };

                  XMLHttpRequest.prototype.send = function(body) {
                    try {
                      const requestUrl = new URL(requestUrls.get(this), location.origin);
                      if (requestUrl.hostname.endsWith('.algolia.net')) {
                        const endpoint = requestUrl.pathname;
                        const payload = typeof body === 'string' ? JSON.parse(body) : {};
                        const requests = Array.isArray(payload.requests) ? payload.requests : null;
                        const singleIndex = endpoint.match(/^\\/1\\/indexes\\/([^/]+)\\/query$/)?.[1];
                        const operations = requests?.length ?? (singleIndex ? 1 : 0);

                        if (operations > 0) {
                          console.info('[algolia-audit]', JSON.stringify({
                            source: location.pathname,
                            side: 'browser',
                            httpRequests: 1,
                            endpoint: requests ? '/1/indexes/*/queries' : '/1/indexes/:index/query',
                            indexes: requests
                              ? requests.map((request) => request.indexName).filter(Boolean)
                              : [decodeURIComponent(singleIndex)],
                            operations,
                            batched: Boolean(requests),
                          }));
                        }
                      }
                    } catch {}

                    return originalSend.call(this, body);
                  };
                })();
              `,
            }}
          />
        )}
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <Meta />
        <Links />
      </head>
      {/* suppressHydrationWarning: extensions (e.g. ColorZilla) inject attrs like cz-shortcut-listen on <body> */}
      <body suppressHydrationWarning>
        {children}
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CookieConsentProvider>
        <NavbarVisibilityProvider>
          {/* Records the previous route for back links. Safe to delete: see app/lib/navigation-history. */}
          <NavigationHistoryTracker />
          <div className='min-h-screen flex flex-col text-pretty'>
            <Navbar />
            <main>
              <Outlet />
            </main>
            <Footer />
          </div>
        </NavbarVisibilityProvider>
      </CookieConsentProvider>
    </AuthProvider>
  );
}
