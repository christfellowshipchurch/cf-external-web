import { act } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import type { SearchClient } from 'algoliasearch';
import {
  Configure,
  InstantSearch,
  InstantSearchSSRProvider,
  useHits,
  usePagination,
  useRefinementList,
} from 'react-instantsearch';
import { describe, expect, it, vi } from 'vitest';

import {
  ALL_MESSAGES_GRID_HITS_PER_PAGE,
  MESSAGES_SERMON_FILTER,
  SERMON_PRIMARY_CATEGORY_FACET,
} from './all-messages.constants';
import {
  buildMessagesInitialUiState,
  getMessagesServerState,
  type MessagesServerState,
} from './messages-server-state.server';

const INDEX_NAME = 'test_content_items';
const urlState = {
  query: 'hope',
  refinementList: { [SERMON_PRIMARY_CATEGORY_FACET]: ['Faith'] },
  page: 2,
};

function createSearchClient() {
  const search = vi.fn(async (requests: Array<Record<string, unknown>>) => ({
    results: requests.map((request) => ({
      exhaustiveNbHits: true,
      exhaustiveFacetsCount: true,
      facets: { [SERMON_PRIMARY_CATEGORY_FACET]: { Faith: 1 } },
      hits: [{ objectID: 'message-1', title: 'Hope' }],
      hitsPerPage: ALL_MESSAGES_GRID_HITS_PER_PAGE,
      index: request.indexName,
      nbHits: 19,
      nbPages: 3,
      page: 2,
      params: '',
      processingTimeMS: 1,
      query: 'hope',
    })),
  }));

  return { client: { search } as unknown as SearchClient, search };
}

function TestWidgets() {
  const { items } = useHits();
  usePagination();
  useRefinementList({ attribute: SERMON_PRIMARY_CATEGORY_FACET, limit: 50 });
  return <div>{items.map((item) => item.objectID).join(',')}</div>;
}

function HydratableMessages({
  searchClient,
  serverState,
}: {
  searchClient: SearchClient;
  serverState: MessagesServerState;
}) {
  return (
    <InstantSearchSSRProvider {...serverState}>
      <InstantSearch
        indexName={INDEX_NAME}
        searchClient={searchClient}
        initialUiState={buildMessagesInitialUiState(INDEX_NAME, urlState)}
      >
        <Configure
          filters={MESSAGES_SERMON_FILTER}
          hitsPerPage={ALL_MESSAGES_GRID_HITS_PER_PAGE}
        />
        <TestWidgets />
      </InstantSearch>
    </InstantSearchSSRProvider>
  );
}

describe('/messages Algolia request count', () => {
  it('uses one grid search and no duplicate hydration search', async () => {
    const server = createSearchClient();
    const serverState = await getMessagesServerState({
      searchClient: server.client,
      indexName: INDEX_NAME,
      urlState,
    });

    const html = renderToString(
      <HydratableMessages
        searchClient={server.client}
        serverState={serverState}
      />,
    );
    expect(server.search).toHaveBeenCalledTimes(1);
    expect(html).toContain('message-1');

    const browser = createSearchClient();
    const container = document.createElement('div');
    container.innerHTML = html;
    let root: ReturnType<typeof hydrateRoot>;
    await act(async () => {
      root = hydrateRoot(
        container,
        <HydratableMessages
          searchClient={browser.client}
          serverState={serverState}
        />,
      );
    });

    expect(browser.search).not.toHaveBeenCalled();
    await act(async () => root.unmount());
  });
});
