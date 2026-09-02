import type { SearchClient } from 'algoliasearch';
import { describe, expect, it, vi } from 'vitest';

import {
  CLASS_FINDER_FACET_ATTRIBUTES,
  CLASS_FINDER_LOADER_HITS_PER_PAGE,
} from './components/build-class-finder-algolia-search';
import { getClassFinderServerState } from './class-finder-server-state.server';

const INDEX_NAME = 'test_classes';

function createSearchClient() {
  const search = vi.fn(async (requests: Array<Record<string, unknown>>) => ({
    results: requests.map((request) => ({
      exhaustiveNbHits: true,
      exhaustiveFacetsCount: true,
      facets: Object.fromEntries(
        CLASS_FINDER_FACET_ATTRIBUTES.map((attribute) => [
          attribute,
          { Leadership: 1 },
        ]),
      ),
      hits: [{ objectID: 'class-1', title: 'Leadership Class' }],
      hitsPerPage: CLASS_FINDER_LOADER_HITS_PER_PAGE,
      index: request.indexName,
      nbHits: 1,
      nbPages: 1,
      page: 0,
      params: '',
      processingTimeMS: 1,
      query: 'leadership',
    })),
  }));

  return { client: { search } as unknown as SearchClient, search };
}

describe('/class-finder Algolia request count', () => {
  it('builds hydratable grouped-grid state with one search', async () => {
    const server = createSearchClient();
    const serverState = await getClassFinderServerState({
      searchClient: server.client,
      indexName: INDEX_NAME,
      urlState: {
        query: 'leadership',
        refinementList: { topic: ['Leadership'] },
      },
    });

    expect(server.search).toHaveBeenCalledTimes(1);
    const requests = server.search.mock.calls[0]?.[0];
    expect(requests?.[0]).toEqual(
      expect.objectContaining({
        indexName: INDEX_NAME,
        params: expect.objectContaining({
          facets: expect.arrayContaining([...CLASS_FINDER_FACET_ATTRIBUTES]),
          hitsPerPage: CLASS_FINDER_LOADER_HITS_PER_PAGE,
          query: 'leadership',
        }),
      }),
    );
    expect(JSON.stringify(serverState)).toContain('class-1');
  });
});
