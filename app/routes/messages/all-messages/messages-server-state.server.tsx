import type { SearchClient } from 'algoliasearch';

import {
  getFinderServerState,
  type FinderServerState,
} from '~/components/finders/instant-search-ssr/get-finder-server-state.server';

import {
  ALL_MESSAGES_GRID_HITS_PER_PAGE,
  MESSAGES_SERMON_FILTER,
  SERMON_PRIMARY_CATEGORY_FACET,
} from './all-messages.constants';
import type { AllMessagesUrlState } from './all-messages-url-state';

export function buildMessagesInitialUiState(
  indexName: string,
  urlState: AllMessagesUrlState,
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

export function getMessagesServerState({
  searchClient,
  indexName,
  urlState,
}: {
  searchClient: SearchClient;
  indexName: string;
  urlState: AllMessagesUrlState;
}) {
  return getFinderServerState({
    searchClient,
    indexName,
    initialUiState: buildMessagesInitialUiState(indexName, urlState),
    configure: {
      filters: MESSAGES_SERMON_FILTER,
      hitsPerPage: ALL_MESSAGES_GRID_HITS_PER_PAGE,
    },
    refinementLists: [{ attribute: SERMON_PRIMARY_CATEGORY_FACET, limit: 50 }],
  });
}

export type MessagesServerState = FinderServerState;
