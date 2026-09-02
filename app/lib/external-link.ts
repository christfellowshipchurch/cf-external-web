import { PRODUCTION_HOSTS } from './analytics-host';

/**
 * True when an href leaves our site.
 *
 * Relative paths are internal. `mailto:` / `tel:` are not web navigation and are
 * left to the OS, so they are not treated as external either. Absolute URLs are
 * external unless they point at one of our own production hostnames — CMS
 * authors routinely write the full `https://www.christfellowship.church/...`
 * URL for an internal page.
 *
 * Deliberately does not consult `window.location`: the answer must be identical
 * on the server and the client, and a preview deployment must resolve an
 * absolute production URL the same way production does.
 */
export function isExternalHref(href: string | null | undefined): boolean {
  const trimmed = href?.trim();
  if (!trimmed) return false;
  if (!/^https?:\/\//i.test(trimmed)) return false;

  try {
    const { hostname } = new URL(trimmed);
    return !(PRODUCTION_HOSTS as readonly string[]).includes(hostname);
  } catch {
    return false;
  }
}

/**
 * `target` for a link: a new tab for off-site destinations, the current tab for
 * our own pages. Returns `'_self'` rather than `undefined` so it overrides
 * `Button`'s fallback, which opens any href containing "http" in a new tab and
 * so would wrongly do that for an absolute URL to one of our own pages.
 */
export function linkTargetForHref(href: string | null | undefined): string {
  return isExternalHref(href) ? '_blank' : '_self';
}
