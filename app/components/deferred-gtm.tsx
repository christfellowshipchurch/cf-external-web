import { useEffect } from 'react';

/**
 * Loads GTM after idle so first paint is not blocked by googletagmanager.com.
 * Consent defaults remain in root Layout (inline, before any GTM network).
 * Idempotent: does not inject a second script for the same container ID.
 */
export function DeferredGtm({ gtmId }: { gtmId: string }) {
  useEffect(() => {
    const load = () => {
      const existingScript = document.querySelector(
        `script[src*="googletagmanager.com/gtm.js"][src*="id=${gtmId}"]`,
      );
      if (existingScript) {
        return;
      }

      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        'gtm.start': new Date().getTime(),
        event: 'gtm.js',
      });

      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;
      document.head.appendChild(script);
    };
    const id = window.setTimeout(load, 0);
    return () => clearTimeout(id);
  }, [gtmId]);

  return null;
}
