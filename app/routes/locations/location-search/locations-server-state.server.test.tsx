import { act } from '@testing-library/react';
import type { SearchClient } from 'algoliasearch';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import {
  Configure,
  InstantSearch,
  InstantSearchSSRProvider,
  useHits,
} from 'react-instantsearch';
import { describe, expect, it, vi } from 'vitest';

import { LOCATION_SEARCH_INITIAL_HITS_PER_PAGE } from './location-search.constants';
import {
  getLocationsServerState,
  type LocationsServerState,
} from './locations-server-state.server';

const INDEX_NAME = 'test_locations';

function createSearchClient() {
  const search = vi.fn(async (requests: Array<Record<string, unknown>>) => ({
    results: requests.map((request) => ({
      exhaustiveNbHits: true,
      hits: [{ objectID: 'campus-1', campusName: 'Palm Beach Gardens' }],
      hitsPerPage: LOCATION_SEARCH_INITIAL_HITS_PER_PAGE,
      index: request.indexName,
      nbHits: 1,
      nbPages: 1,
      page: 0,
      params: '',
      processingTimeMS: 1,
      query: '',
    })),
  }));

  return { client: { search } as unknown as SearchClient, search };
}

function LocationHits() {
  const { items } = useHits();
  return <div>{items.map((item) => item.objectID).join(',')}</div>;
}

function HydratableLocations({
  searchClient,
  serverState,
}: {
  searchClient: SearchClient;
  serverState: LocationsServerState;
}) {
  return (
    <InstantSearchSSRProvider {...serverState}>
      <InstantSearch indexName={INDEX_NAME} searchClient={searchClient}>
        <Configure
          hitsPerPage={LOCATION_SEARCH_INITIAL_HITS_PER_PAGE}
          aroundRadius='all'
          aroundLatLngViaIP={false}
          getRankingInfo
        />
        <LocationHits />
      </InstantSearch>
    </InstantSearchSSRProvider>
  );
}

describe('/locations Algolia request count', () => {
  it('uses one 20-hit server search and no bootstrap or hydration search', async () => {
    const server = createSearchClient();
    const serverState = await getLocationsServerState({
      searchClient: server.client,
      indexName: INDEX_NAME,
    });

    expect(server.search).toHaveBeenCalledTimes(1);
    expect(server.search.mock.calls[0]?.[0]).toEqual([
      expect.objectContaining({
        indexName: INDEX_NAME,
        params: expect.objectContaining({
          hitsPerPage: LOCATION_SEARCH_INITIAL_HITS_PER_PAGE,
        }),
      }),
    ]);

    const html = renderToString(
      <HydratableLocations
        searchClient={server.client}
        serverState={serverState}
      />,
    );
    expect(html).toContain('campus-1');

    const browser = createSearchClient();
    const container = document.createElement('div');
    container.innerHTML = html;
    let root: ReturnType<typeof hydrateRoot>;
    await act(async () => {
      root = hydrateRoot(
        container,
        <HydratableLocations
          searchClient={browser.client}
          serverState={serverState}
        />,
      );
    });

    expect(browser.search).not.toHaveBeenCalled();
    await act(async () => root.unmount());
  });
});
