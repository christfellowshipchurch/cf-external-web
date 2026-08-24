import type { SearchClient } from 'algoliasearch';

import {
  getFinderServerState,
  type FinderServerState,
} from '~/components/finders/instant-search-ssr/get-finder-server-state.server';

import {
  CLASS_FINDER_FACET_ATTRIBUTES,
  CLASS_FINDER_LOADER_HITS_PER_PAGE,
} from './components/build-class-finder-algolia-search';
import type { ClassFinderUrlState } from './components/class-finder-url-state';

export function buildClassFinderInitialUiState(
  indexName: string,
  urlState: ClassFinderUrlState,
) {
  const indexState: Record<string, unknown> = {};
  if (urlState.query) indexState.query = urlState.query;
  if (urlState.refinementList) {
    indexState.refinementList = urlState.refinementList;
  }

  return Object.keys(indexState).length > 0
    ? { [indexName]: indexState }
    : undefined;
}

export function getClassFinderServerState({
  searchClient,
  indexName,
  urlState,
}: {
  searchClient: SearchClient;
  indexName: string;
  urlState: ClassFinderUrlState;
}) {
  return getFinderServerState({
    searchClient,
    indexName,
    initialUiState: buildClassFinderInitialUiState(indexName, urlState),
    configure: { hitsPerPage: CLASS_FINDER_LOADER_HITS_PER_PAGE },
    refinementLists: CLASS_FINDER_FACET_ATTRIBUTES.map((attribute) => ({
      attribute,
      limit: 50,
    })),
    collectPagination: false,
  });
}

export type ClassFinderServerState = FinderServerState;
