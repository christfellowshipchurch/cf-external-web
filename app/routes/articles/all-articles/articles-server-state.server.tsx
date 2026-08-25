import type { SearchClient } from 'algoliasearch';

import {
  getFinderServerState,
  type FinderServerState,
} from '~/components/finders/instant-search-ssr/get-finder-server-state.server';

import {
  ALL_ARTICLES_CATEGORY_FACET,
  ALL_ARTICLES_HITS_PER_PAGE,
  ALL_ARTICLES_TYPE_FILTER,
} from './all-articles.constants';
import type { AllArticlesUrlState } from './all-articles-url-state';

export function buildArticlesInitialUiState(
  indexName: string,
  urlState: AllArticlesUrlState,
) {
  const indexState: Record<string, unknown> = {};
  if (urlState.query) indexState.query = urlState.query;
  if (urlState.refinementList) {
    indexState.refinementList = urlState.refinementList;
  }
  if (urlState.page != null && urlState.page > 0) {
    indexState.page = urlState.page;
  }

  return Object.keys(indexState).length > 0
    ? { [indexName]: indexState }
    : undefined;
}

export function getArticlesServerState({
  searchClient,
  indexName,
  urlState,
}: {
  searchClient: SearchClient;
  indexName: string;
  urlState: AllArticlesUrlState;
}) {
  return getFinderServerState({
    searchClient,
    indexName,
    initialUiState: buildArticlesInitialUiState(indexName, urlState),
    configure: {
      filters: ALL_ARTICLES_TYPE_FILTER,
      hitsPerPage: ALL_ARTICLES_HITS_PER_PAGE,
      distinct: true,
    },
    refinementLists: [{ attribute: ALL_ARTICLES_CATEGORY_FACET, limit: 50 }],
  });
}

export type ArticlesServerState = FinderServerState;
