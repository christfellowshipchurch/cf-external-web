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

/** `location.state` shape written by in-app links into the grid. */
export type CommunityOpportunitiesBackState = { backHref?: string };

function readStoredBackHref(): string | null {
  try {
    return window.sessionStorage.getItem(
      COMMUNITY_OPPORTUNITIES_BACK_STORAGE_KEY,
    );
  } catch {
    return null;
  }
}

function writeStoredBackHref(href: string | null): void {
  try {
    if (href === null) {
      window.sessionStorage.removeItem(
        COMMUNITY_OPPORTUNITIES_BACK_STORAGE_KEY,
      );
      return;
    }
    window.sessionStorage.setItem(
      COMMUNITY_OPPORTUNITIES_BACK_STORAGE_KEY,
      href,
    );
  } catch {
    /* private mode / quota */
  }
}

/**
 * Resolves the "Back" target for the grid page.
 *
 * `document.referrer` describes the *document*, not the previous client-side
 * route, so it is only consulted on a document load (`POP`) — on a `Link` click
 * it still names whatever page loaded the tab. In-app links pass their own
 * target through `location.state` instead. The result is remembered for the tab
 * so returning from an opportunity detail page still offers the entry point.
 */
export function resolveCommunityOpportunitiesBackHref(
  state: CommunityOpportunitiesBackState | null | undefined,
  navigationType: string,
): string {
  if (typeof window === 'undefined') {
    return COMMUNITY_OPPORTUNITIES_BACK_FALLBACK;
  }

  const fromState = state?.backHref;
  if (typeof fromState === 'string' && fromState.startsWith('/')) {
    writeStoredBackHref(fromState);
    return fromState;
  }

  if (navigationType === 'POP') {
    const fromReferrer = communityOpportunitiesBackHrefFromReferrer(
      document.referrer,
      window.location.origin,
    );
    // A typed URL or an off-site referrer is a new entry: an older one is stale.
    writeStoredBackHref(fromReferrer);
    return fromReferrer ?? COMMUNITY_OPPORTUNITIES_BACK_FALLBACK;
  }

  return readStoredBackHref() ?? COMMUNITY_OPPORTUNITIES_BACK_FALLBACK;
}
