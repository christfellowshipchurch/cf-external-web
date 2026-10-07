import { useSearchParams } from 'react-router';

const GROUP_SEARCH_PATH = '/group-finder';

/**
 * Back-link target for the Group Single page.
 *
 * Group Search cards forward their active filters as a `from` query param (the
 * Group Search URL's query string — see `GroupHit`). Restoring it here returns
 * the user to the same filtered results they came from.
 *
 * - Stateless: reads from the URL, so it survives refreshes and shared links.
 * - Direct-link arrivals (no `from`) fall back to the bare search page.
 * - Always targets the search page (never history `-1`), keeping the
 *   Single↔Single navigation loop resolved.
 */
export function useGroupSearchBackUrl(): string {
  const [searchParams] = useSearchParams();
  const from = searchParams.get('from')?.trim();
  return from ? `${GROUP_SEARCH_PATH}?${from}` : GROUP_SEARCH_PATH;
}
