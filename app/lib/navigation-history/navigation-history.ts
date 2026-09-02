/**
 * Remembers the route the visitor came from, which the browser will not tell us:
 * `document.referrer` describes the document, so it is stale after any
 * client-side navigation, and history entries are not readable by design. The
 * Navigation API would answer this but is Chromium-only.
 *
 * Plain module state, deliberately free of React and of any app concept — the
 * only writer is `<NavigationHistoryTracker />`. In-memory by design: it
 * describes this document's navigation, so a full page load correctly starts
 * empty and callers fall back to `document.referrer`.
 *
 * To remove this feature entirely: delete this directory and the
 * `<NavigationHistoryTracker />` line in `app/root.tsx`.
 */

type NavigationEntry = {
  /** Identity of the page. Two locations that differ only by search are one entry. */
  pathname: string;
  /** Full `pathname + search + hash`, so a caller can return to the exact view. */
  href: string;
};

let currentEntry: NavigationEntry | null = null;
let previousEntry: NavigationEntry | null = null;

/**
 * Records a visited location. Repeated calls for the same pathname update the
 * current entry rather than pushing a new one: finders rewrite their own search
 * params constantly, and treating those as navigation would make "the previous
 * page" mean "this page, one filter ago".
 */
export function recordNavigation(pathname: string, href: string): void {
  if (currentEntry?.pathname === pathname) {
    currentEntry = { pathname, href };
    return;
  }
  previousEntry = currentEntry;
  currentEntry = { pathname, href };
}

/**
 * The location visited before `currentPathname`, or `null` if this document has
 * not navigated yet.
 *
 * `currentPathname` is required because the tracker lives at the root and its
 * effect runs *after* the effects of the page asking the question — so during a
 * page's first render the recorded "current" entry is still the previous page.
 * Passing the caller's own pathname makes the answer independent of that timing.
 */
export function getPreviousNavigationHref(
  currentPathname: string,
): string | null {
  if (currentEntry && currentEntry.pathname !== currentPathname) {
    return currentEntry.href;
  }
  return previousEntry?.href ?? null;
}

/** Test-only: module state outlives a component tree. */
export function resetNavigationHistory(): void {
  currentEntry = null;
  previousEntry = null;
}
