import type { LoaderFunctionArgs } from 'react-router';
import { createAuditedServerAlgoliaClient } from '~/lib/.server/algolia-request-audit.server';

import { getServerAlgoliaIndexes } from '~/lib/.server/algolia-indexes.server';
import type { AlgoliaIndexMap } from '~/lib/algolia-indexes';
import type { ContentItemHit } from '~/routes/search/types';

import { parseEventsFinderUrlState } from '../events-url-state';
import {
  FEATURED_EVENTS_FILTER,
  FEATURED_EVENTS_HITS_PER_PAGE,
  moveFeaturedJourneyCardFirst,
} from '../featured-events';
import {
  getEventsServerState,
  type EventsServerState,
} from './events-server-state.server';

export type EventFinderFacetItem = {
  value: string;
  label: string;
  count: number;
};

export interface AllEventsLoaderData {
  ALGOLIA_APP_ID: string;
  ALGOLIA_SEARCH_API_KEY: string;
  algoliaIndexes: AlgoliaIndexMap;
  featuredHits: ContentItemHit[];
  serverState: EventsServerState;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const appId = process.env.ALGOLIA_APP_ID ?? '';
  const searchApiKey = process.env.ALGOLIA_SEARCH_API_KEY ?? '';
  const algoliaIndexes = getServerAlgoliaIndexes();

  let featuredHits: ContentItemHit[] = [];
  let serverState: EventsServerState = { initialResults: {} };

  const url = new URL(request.url);
  const urlState = parseEventsFinderUrlState(url.searchParams);

  if (appId && searchApiKey) {
    const client = createAuditedServerAlgoliaClient(
      appId,
      searchApiKey,
      'events.loader',
    );

    try {
      const [featuredRes, nextServerState] = await Promise.all([
        client.searchForHits<Record<string, unknown>>([
          {
            indexName: algoliaIndexes.contentItems,
            params: {
              filters: FEATURED_EVENTS_FILTER,
              hitsPerPage: FEATURED_EVENTS_HITS_PER_PAGE,
            },
          },
        ]),
        getEventsServerState({
          searchClient: client,
          indexName: algoliaIndexes.contentItems,
          urlState,
        }),
      ]);
      serverState = nextServerState;

      const rawFeatured = featuredRes.results[0]?.hits ?? [];
      featuredHits = moveFeaturedJourneyCardFirst(
        rawFeatured.map((h) => h as unknown as ContentItemHit),
      );
    } catch (error) {
      console.error('[events/all-events] Algolia loader fetch failed', error);
    }
  }

  return Response.json({
    ALGOLIA_APP_ID: appId,
    ALGOLIA_SEARCH_API_KEY: searchApiKey,
    algoliaIndexes,
    featuredHits,
    serverState,
  } satisfies AllEventsLoaderData);
};
