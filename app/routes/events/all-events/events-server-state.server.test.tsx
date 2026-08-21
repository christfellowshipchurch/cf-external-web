import type { SearchClient } from 'algoliasearch';
import { describe, expect, it, vi } from 'vitest';

import {
  EVENT_FACET_CATEGORIES,
  EVENT_FACET_LOCATIONS,
  MAIN_EVENTS_GRID_HITS_PER_PAGE,
} from './all-events.constants';
import { getEventsServerState } from './events-server-state.server';

const INDEX_NAME = 'test_content_items';

function createSearchClient() {
  const search = vi.fn(async (requests: Array<Record<string, unknown>>) => ({
    results: requests.map((request) => ({
      exhaustiveNbHits: true,
      exhaustiveFacetsCount: true,
      facets: {
        [EVENT_FACET_CATEGORIES]: { Kids: 1 },
        [EVENT_FACET_LOCATIONS]: { Gardens: 1 },
      },
      hits: [{ objectID: 'event-1', title: 'Family Night' }],
      hitsPerPage: MAIN_EVENTS_GRID_HITS_PER_PAGE,
      index: request.indexName,
      nbHits: 10,
      nbPages: 2,
      page: 1,
      params: '',
      processingTimeMS: 1,
      query: 'family',
    })),
  }));

  return { client: { search } as unknown as SearchClient, search };
}

describe('/events Algolia request count', () => {
  it('builds hydratable main-grid state with one search', async () => {
    const server = createSearchClient();
    const serverState = await getEventsServerState({
      searchClient: server.client,
      indexName: INDEX_NAME,
      urlState: {
        query: 'family',
        refinementList: {
          [EVENT_FACET_CATEGORIES]: ['Kids'],
          [EVENT_FACET_LOCATIONS]: ['Gardens'],
        },
        page: 1,
      },
    });

    expect(server.search).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(serverState)).toContain('event-1');
  });
});
