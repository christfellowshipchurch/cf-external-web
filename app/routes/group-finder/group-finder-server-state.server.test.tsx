import type { SearchClient } from 'algoliasearch';
import { describe, expect, it, vi } from 'vitest';

import {
  GROUP_FINDER_FACET_ATTRIBUTES,
  GROUP_FINDER_LOADER_HITS_PER_PAGE,
} from './components/build-group-finder-algolia-search';
import { getGroupFinderServerState } from './group-finder-server-state.server';

const INDEX_NAME = 'test_groups';

function createSearchClient() {
  const search = vi.fn(async (requests: Array<Record<string, unknown>>) => ({
    results: requests.map((request) => ({
      exhaustiveNbHits: true,
      exhaustiveFacetsCount: true,
      facets: Object.fromEntries(
        GROUP_FINDER_FACET_ATTRIBUTES.map((attribute) => [
          attribute,
          { Test: 1 },
        ]),
      ),
      hits: [{ objectID: 'group-1', name: 'Test Group' }],
      hitsPerPage: GROUP_FINDER_LOADER_HITS_PER_PAGE,
      index: request.indexName,
      nbHits: 13,
      nbPages: 2,
      page: 1,
      params: '',
      processingTimeMS: 1,
      query: 'bible',
    })),
  }));

  return { client: { search } as unknown as SearchClient, search };
}

describe('/group-finder Algolia request count', () => {
  it('builds deep-linked main-grid state with one batched search', async () => {
    const server = createSearchClient();
    const serverState = await getGroupFinderServerState({
      searchClient: server.client,
      indexName: INDEX_NAME,
      minMaxAgeValues: ['18 to 25', '26 to 35'],
      urlState: {
        query: 'bible',
        refinementList: { meetingType: ['In Person'] },
        age: '21',
        lat: 26.8234,
        lng: -80.1387,
        page: 1,
      },
    });

    expect(server.search).toHaveBeenCalledTimes(1);
    const requests = server.search.mock.calls[0]?.[0];
    expect(requests?.[0]).toEqual(
      expect.objectContaining({
        indexName: INDEX_NAME,
        params: expect.objectContaining({
          aroundLatLng: '26.8234, -80.1387',
          filters: 'minMaxAge:"18 to 25"',
          hitsPerPage: GROUP_FINDER_LOADER_HITS_PER_PAGE,
          page: 1,
          query: 'bible',
        }),
      }),
    );
    expect(JSON.stringify(serverState)).toContain('group-1');
  });
});
