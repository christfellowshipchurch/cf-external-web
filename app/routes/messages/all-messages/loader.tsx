import type { LoaderFunctionArgs } from 'react-router';

import { createAuditedServerAlgoliaClient } from '~/lib/.server/algolia-request-audit.server';
import { getServerAlgoliaIndexes } from '~/lib/.server/algolia-indexes.server';
import { AuthenticationError } from '~/lib/.server/error-types';
import { fetchRockData } from '~/lib/.server/fetch-rock-data';
import type { AlgoliaIndexMap } from '~/lib/algolia-indexes';
import type { ContentItemHit } from '~/routes/search/types';

import {
  CURRENT_SERIES_LOADER_HITS_PER_PAGE,
  MESSAGES_SERMON_FILTER,
} from './all-messages.constants';
import { parseAllMessagesUrlState } from './all-messages-url-state';
import {
  getMessagesServerState,
  type MessagesServerState,
} from './messages-server-state.server';

export type AllMessagesLoaderReturnType = {
  ALGOLIA_APP_ID: string;
  ALGOLIA_SEARCH_API_KEY: string;
  algoliaIndexes: AlgoliaIndexMap;
  currentSeriesHit: ContentItemHit | null;
  currentSeriesUrl: string;
  serverState: MessagesServerState;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const appId = process.env.ALGOLIA_APP_ID;
  const searchApiKey = process.env.ALGOLIA_SEARCH_API_KEY;
  const algoliaIndexes = getServerAlgoliaIndexes();

  if (!appId || !searchApiKey) {
    throw new AuthenticationError('Algolia credentials not found');
  }

  let currentSeriesHit: ContentItemHit | null = null;
  let currentSeriesUrl = '';
  let serverState: MessagesServerState = { initialResults: {} };

  const url = new URL(request.url);
  const urlState = parseAllMessagesUrlState(url.searchParams);

  const client = createAuditedServerAlgoliaClient(
    appId,
    searchApiKey,
    'messages.loader',
  );

  try {
    const [seriesRes, nextServerState] = await Promise.all([
      client.searchSingleIndex({
        indexName: algoliaIndexes.contentItems,
        searchParams: {
          filters: MESSAGES_SERMON_FILTER,
          hitsPerPage: CURRENT_SERIES_LOADER_HITS_PER_PAGE,
        },
      }),
      getMessagesServerState({
        searchClient: client,
        indexName: algoliaIndexes.contentItems,
        urlState,
      }),
    ]);
    serverState = nextServerState;

    const seriesHits = seriesRes.hits ?? [];
    currentSeriesHit =
      seriesHits.length > 0
        ? (seriesHits[0] as unknown as ContentItemHit)
        : null;

    if (currentSeriesHit?.sermonSeriesGuid) {
      const seriesData = await fetchRockData({
        endpoint: `DefinedValues/`,
        queryParams: {
          $filter: `Guid eq guid'${currentSeriesHit.sermonSeriesGuid}'`,
          loadAttributes: 'simple',
        },
      });
      currentSeriesUrl = seriesData?.attributeValues?.url?.value || '';
    }
  } catch (error) {
    console.error('[messages/all-messages] Algolia loader fetch failed', error);
  }

  return Response.json({
    ALGOLIA_APP_ID: appId,
    ALGOLIA_SEARCH_API_KEY: searchApiKey,
    algoliaIndexes,
    currentSeriesHit,
    currentSeriesUrl,
    serverState,
  } satisfies AllMessagesLoaderReturnType);
};
