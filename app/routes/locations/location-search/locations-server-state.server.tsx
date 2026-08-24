import type { SearchClient } from 'algoliasearch';

import {
  getFinderServerState,
  type FinderServerState,
} from '~/components/finders/instant-search-ssr/get-finder-server-state.server';

import { LOCATION_SEARCH_INITIAL_HITS_PER_PAGE } from './location-search.constants';

export function getLocationsServerState({
  searchClient,
  indexName,
}: {
  searchClient: SearchClient;
  indexName: string;
}) {
  return getFinderServerState({
    searchClient,
    indexName,
    configure: {
      hitsPerPage: LOCATION_SEARCH_INITIAL_HITS_PER_PAGE,
      aroundRadius: 'all',
      aroundLatLngViaIP: false,
      getRankingInfo: true,
    },
    collectPagination: false,
  });
}

export type LocationsServerState = FinderServerState;
