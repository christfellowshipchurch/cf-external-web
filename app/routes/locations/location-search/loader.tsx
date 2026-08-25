import { AuthenticationError } from '~/lib/.server/error-types';
import { createAuditedServerAlgoliaClient } from '~/lib/.server/algolia-request-audit.server';
import { getServerAlgoliaIndexes } from '~/lib/.server/algolia-indexes.server';
import type { AlgoliaIndexMap } from '~/lib/algolia-indexes';

import {
  getLocationsServerState,
  type LocationsServerState,
} from './locations-server-state.server';

export type LocationSearchLoaderData = {
  ALGOLIA_APP_ID: string;
  ALGOLIA_SEARCH_API_KEY: string;
  algoliaIndexes: AlgoliaIndexMap;
  serverState: LocationsServerState;
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

  let serverState: LocationsServerState = { initialResults: {} };
  const client = createAuditedServerAlgoliaClient(
    appId,
    searchApiKey,
    'locations.loader',
  );

  try {
    serverState = await getLocationsServerState({
      searchClient: client,
      indexName: algoliaIndexes.locations,
    });
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
    serverState,
  } satisfies LocationSearchLoaderData);
}
