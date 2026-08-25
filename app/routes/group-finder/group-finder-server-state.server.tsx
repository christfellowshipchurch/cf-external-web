import type { SearchClient } from 'algoliasearch';

import {
  getFinderServerState,
  type FinderServerState,
} from '~/components/finders/instant-search-ssr/get-finder-server-state.server';

import {
  buildMinMaxAgeFilter,
  GROUP_FINDER_FACET_ATTRIBUTES,
  GROUP_FINDER_LOADER_HITS_PER_PAGE,
} from './components/build-group-finder-algolia-search';
import type { GroupFinderUrlState } from './group-finder-url-state';

export function buildGroupFinderServerUiState(
  indexName: string,
  urlState: GroupFinderUrlState,
) {
  const indexState: Record<string, unknown> = {};
  if (urlState.query) indexState.query = urlState.query;
  if (urlState.refinementList) {
    indexState.refinementList = urlState.refinementList;
  }
  if (urlState.page != null && urlState.page > 0) {
    indexState.page = urlState.page + 1;
  }

  return Object.keys(indexState).length > 0
    ? { [indexName]: indexState }
    : undefined;
}

export function getGroupFinderServerState({
  searchClient,
  indexName,
  urlState,
  minMaxAgeValues,
}: {
  searchClient: SearchClient;
  indexName: string;
  urlState: GroupFinderUrlState;
  minMaxAgeValues: string[];
}) {
  const hasCoordinates = urlState.lat != null && urlState.lng != null;

  return getFinderServerState({
    searchClient,
    indexName,
    initialUiState: buildGroupFinderServerUiState(indexName, urlState),
    configure: {
      hitsPerPage: GROUP_FINDER_LOADER_HITS_PER_PAGE,
      filters: buildMinMaxAgeFilter(urlState.age, minMaxAgeValues),
      query: urlState.query ?? '',
      aroundLatLng: hasCoordinates
        ? `${urlState.lat}, ${urlState.lng}`
        : undefined,
      aroundRadius: 'all',
      aroundLatLngViaIP: false,
      getRankingInfo: true,
    },
    refinementLists: GROUP_FINDER_FACET_ATTRIBUTES.map((attribute) => ({
      attribute,
      limit: 50,
    })),
  });
}

export type GroupFinderServerState = FinderServerState;
