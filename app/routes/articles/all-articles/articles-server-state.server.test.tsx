import { act } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import {
  Configure,
  InstantSearch,
  InstantSearchSSRProvider,
  useHits,
  usePagination,
  useRefinementList,
} from 'react-instantsearch';
import { describe, expect, it, vi } from 'vitest';
import type { SearchClient } from 'algoliasearch';

import {
  ALL_ARTICLES_CATEGORY_FACET,
  ALL_ARTICLES_HITS_PER_PAGE,
  ALL_ARTICLES_TYPE_FILTER,
} from './all-articles.constants';
import {
  buildArticlesInitialUiState,
  getArticlesServerState,
  type ArticlesServerState,
} from './articles-server-state.server';

const INDEX_NAME = 'test_content_items';

function createSearchClient() {
  const search = vi.fn(async (requests: Array<Record<string, unknown>>) => ({
    results: requests.map((request) => ({
      exhaustiveNbHits: true,
      exhaustiveFacetsCount: true,
      facets: { [ALL_ARTICLES_CATEGORY_FACET]: { Leadership: 1 } },
      hits: [{ objectID: 'article-1', title: 'Leadership' }],
      hitsPerPage: ALL_ARTICLES_HITS_PER_PAGE,
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

function TestWidgets() {
  const { items } = useHits();
  usePagination();
  useRefinementList({ attribute: ALL_ARTICLES_CATEGORY_FACET, limit: 50 });
  return <div>{items.map((item) => item.objectID).join(',')}</div>;
}

function HydratableArticles({
  searchClient,
  serverState,
}: {
  searchClient: SearchClient;
  serverState: ArticlesServerState;
}) {
  const urlState = {
    query: 'leadership',
    refinementList: { [ALL_ARTICLES_CATEGORY_FACET]: ['Leadership'] },
  };

  return (
    <InstantSearchSSRProvider {...serverState}>
      <InstantSearch
        indexName={INDEX_NAME}
        searchClient={searchClient}
        initialUiState={buildArticlesInitialUiState(INDEX_NAME, urlState)}
      >
        <Configure
          filters={ALL_ARTICLES_TYPE_FILTER}
          hitsPerPage={ALL_ARTICLES_HITS_PER_PAGE}
          distinct
        />
        <TestWidgets />
      </InstantSearch>
    </InstantSearchSSRProvider>
  );
}

describe('/articles Algolia request count', () => {
  it('uses one server search and no duplicate hydration search', async () => {
    const server = createSearchClient();
    const urlState = {
      query: 'leadership',
      refinementList: { [ALL_ARTICLES_CATEGORY_FACET]: ['Leadership'] },
    };
    const serverState = await getArticlesServerState({
      searchClient: server.client,
      indexName: INDEX_NAME,
      urlState,
    });

    const html = renderToString(
      <HydratableArticles
        searchClient={server.client}
        serverState={serverState}
      />,
    );
    expect(server.search).toHaveBeenCalledTimes(1);
    expect(html).toContain('article-1');

    const browser = createSearchClient();
    const container = document.createElement('div');
    container.innerHTML = html;
    let root: ReturnType<typeof hydrateRoot>;
    await act(async () => {
      root = hydrateRoot(
        container,
        <HydratableArticles
          searchClient={browser.client}
          serverState={serverState}
        />,
      );
    });

    expect(browser.search).not.toHaveBeenCalled();
    await act(async () => root.unmount());
  });
});
