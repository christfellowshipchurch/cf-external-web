/**
 * The standalone grid is entered from several places (the volunteer page's
 * "View all", the missions ministry page, direct links), so the header link is
 * a generic "Back" whose target is the page the visitor actually came from.
 */

export const COMMUNITY_OPPORTUNITIES_BACK_STORAGE_KEY =
  'communityOpportunitiesBack_v1';

/** Used until the entry point is known, and whenever it can't be trusted. */
export const COMMUNITY_OPPORTUNITIES_BACK_FALLBACK = '/volunteer#community';

/**
 * Resolves a referrer to a back target, or `null` when it isn't a real entry
 * point. Same-origin only, and never a `/volunteer/*` sub-route: the grid links
 * out to opportunity detail pages that link back here, so honouring those
 * referrers would bounce the visitor between the two.
 */
export function communityOpportunitiesBackHrefFromReferrer(
  referrer: string,
  origin: string,
): string | null {
  if (!referrer) return null;

  let url: URL;
  try {
    // `document.referrer` is always absolute; anything else is not a referrer.
    url = new URL(referrer);
  } catch {
    return null;
  }

  if (url.origin !== origin) return null;
  if (url.pathname.startsWith('/volunteer/')) return null;

  // The volunteer page's entry point is the community section, not its top.
  if (url.pathname === '/volunteer')
    return COMMUNITY_OPPORTUNITIES_BACK_FALLBACK;

  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Reads the entry point once and remembers it for the tab, so returning from an
 * opportunity detail page still offers the original "Back" target.
 */
export function resolveCommunityOpportunitiesBackHref(): string {
  if (typeof window === 'undefined')
    return COMMUNITY_OPPORTUNITIES_BACK_FALLBACK;

  const fromReferrer = communityOpportunitiesBackHrefFromReferrer(
    document.referrer,
    window.location.origin,
  );

  try {
    if (fromReferrer) {
      window.sessionStorage.setItem(
        COMMUNITY_OPPORTUNITIES_BACK_STORAGE_KEY,
        fromReferrer,
      );
      return fromReferrer;
    }
    return (
      window.sessionStorage.getItem(COMMUNITY_OPPORTUNITIES_BACK_STORAGE_KEY) ??
      COMMUNITY_OPPORTUNITIES_BACK_FALLBACK
    );
  } catch {
    /* private mode / quota */
    return fromReferrer ?? COMMUNITY_OPPORTUNITIES_BACK_FALLBACK;
  }
}
