import { AuthenticationError } from '~/lib/.server/error-types';
import { createAuditedServerAlgoliaClient } from '~/lib/.server/algolia-request-audit.server';
import { getServerAlgoliaIndexes } from '~/lib/.server/algolia-indexes.server';
import type { AlgoliaIndexMap } from '~/lib/algolia-indexes';

import type { CampusHit } from './partials/location-card-list.partial';
import { LOCATION_SEARCH_INITIAL_HITS_PER_PAGE } from './location-search.constants';

export type LocationSearchLoaderData = {
  ALGOLIA_APP_ID: string;
  ALGOLIA_SEARCH_API_KEY: string;
  algoliaIndexes: AlgoliaIndexMap;
  initialLocationHits: CampusHit[];
};

/**
 * Initial Algolia fetch for `/locations`.
 * This seeds first paint from the loader; after hydration, InstantSearch owns
 * zip/current-location searches and geo-ranking on the client.
 */
export async function loader() {
  const appId = process.env.ALGOLIA_APP_ID;
  const searchApiKey = process.env.ALGOLIA_SEARCH_API_KEY;
  const algoliaIndexes = getServerAlgoliaIndexes();

  if (!appId || !searchApiKey) {
    throw new AuthenticationError('Algolia credentials not found');
  }

  let initialLocationHits: CampusHit[] = [];
  const client = createAuditedServerAlgoliaClient(
    appId,
    searchApiKey,
    'locations.loader',
  );

  try {
    const res = await client.searchSingleIndex({
      indexName: algoliaIndexes.locations,
      searchParams: {
        hitsPerPage: LOCATION_SEARCH_INITIAL_HITS_PER_PAGE,
        query: '',
        aroundLatLngViaIP: false,
        getRankingInfo: true,
      },
    });

    initialLocationHits = (res.hits ?? []).map(
      (h) => h as unknown as CampusHit,
    );
  } catch (error) {
    console.error(
      '[locations/location-search] Algolia loader fetch failed',
      error,
    );
  }

  return Response.json({
    ALGOLIA_APP_ID: appId,
    ALGOLIA_SEARCH_API_KEY: searchApiKey,
    algoliaIndexes,
    initialLocationHits,
  } satisfies LocationSearchLoaderData);
}
