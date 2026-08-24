import type { SearchClient } from 'algoliasearch';

import {
  getFinderServerState,
  type FinderServerState,
} from '~/components/finders/instant-search-ssr/get-finder-server-state.server';

import {
  EVENT_FACET_CATEGORIES,
  EVENT_FACET_LOCATIONS,
  MAIN_EVENTS_GRID_HITS_PER_PAGE,
  MAIN_EVENTS_TYPE_FILTER,
} from './all-events.constants';
import type { EventsFinderUrlState } from '../events-url-state';

export function buildEventsInitialUiState(
  indexName: string,
  urlState: EventsFinderUrlState,
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

export function getEventsServerState({
  searchClient,
  indexName,
  urlState,
}: {
  searchClient: SearchClient;
  indexName: string;
  urlState: EventsFinderUrlState;
}) {
  return getFinderServerState({
    searchClient,
    indexName,
    initialUiState: buildEventsInitialUiState(indexName, urlState),
    configure: {
      filters: MAIN_EVENTS_TYPE_FILTER,
      hitsPerPage: MAIN_EVENTS_GRID_HITS_PER_PAGE,
    },
    refinementLists: [
      { attribute: EVENT_FACET_CATEGORIES, limit: 50 },
      { attribute: EVENT_FACET_LOCATIONS, limit: 50 },
    ],
  });
}

export type EventsServerState = FinderServerState;
