import type { LoaderFunctionArgs } from 'react-router';

import { createAuditedServerAlgoliaClient } from '~/lib/.server/algolia-request-audit.server';
import { getServerAlgoliaIndexes } from '~/lib/.server/algolia-indexes.server';
import { AuthenticationError } from '~/lib/.server/error-types';
import type { AlgoliaIndexMap } from '~/lib/algolia-indexes';
import { parseAllArticlesUrlState } from './all-articles-url-state';
import {
  getArticlesServerState,
  type ArticlesServerState,
} from './articles-server-state.server';

export type AllArticlesReturnType = {
  ALGOLIA_APP_ID: string;
  ALGOLIA_SEARCH_API_KEY: string;
  algoliaIndexes: AlgoliaIndexMap;
  serverState: ArticlesServerState;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const appId = process.env.ALGOLIA_APP_ID;
  const searchApiKey = process.env.ALGOLIA_SEARCH_API_KEY;
  const algoliaIndexes = getServerAlgoliaIndexes();

  if (!appId || !searchApiKey) {
    throw new AuthenticationError('Algolia credentials not found');
  }

  const url = new URL(request.url);
  const urlState = parseAllArticlesUrlState(url.searchParams);
  const client = createAuditedServerAlgoliaClient(
    appId,
    searchApiKey,
    'articles.loader',
  );

  let serverState: ArticlesServerState = { initialResults: {} };
  try {
    serverState = await getArticlesServerState({
      searchClient: client,
      indexName: algoliaIndexes.contentItems,
      urlState,
    });
  } catch (error) {
    console.error('[articles/all-articles] Algolia SSR fetch failed', error);
  }

  return Response.json({
    ALGOLIA_APP_ID: appId,
    ALGOLIA_SEARCH_API_KEY: searchApiKey,
    algoliaIndexes,
    serverState,
  } satisfies AllArticlesReturnType);
};
