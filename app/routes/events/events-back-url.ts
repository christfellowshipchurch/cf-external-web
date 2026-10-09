import { useSearchParams } from 'react-router';

const EVENTS_PATH = '/events';

/**
 * Build an Event Single URL, forwarding the active Event Finder filters (the
 * finder URL's query string) as a stateless `from` param so the detail page's
 * back button can restore them.
 *
 * `fromEventsUrl` is the finder URL (path + search), e.g.
 * `/events?q=baptism&eventLocations=Main+Campus`. Using a query param (not
 * router `state`) keeps it working across refreshes and shared links.
 */
export function buildEventSingleUrl(
  eventPath: string,
  fromEventsUrl?: string,
): string {
  const base = `/events/${eventPath}`;
  if (!fromEventsUrl) return base;
  const qIndex = fromEventsUrl.indexOf('?');
  const search = qIndex >= 0 ? fromEventsUrl.slice(qIndex + 1) : '';
  return search ? `${base}?from=${encodeURIComponent(search)}` : base;
}

/**
 * Back-link target for the Event Single page.
 *
 * Restores the forwarded Event Finder filters (the `from` param set by
 * {@link buildEventSingleUrl}), falling back to the bare finder for direct-link
 * arrivals. Always targets the finder page (never history `-1`), so the back
 * button is consistent regardless of how the user reached the event.
 */
export function useEventsBackUrl(): string {
  const [searchParams] = useSearchParams();
  const from = searchParams.get('from')?.trim();
  return from ? `${EVENTS_PATH}?${from}` : EVENTS_PATH;
}
