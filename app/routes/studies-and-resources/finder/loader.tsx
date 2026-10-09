import { LoaderFunction } from 'react-router';
import { AuthenticationError } from '~/lib/.server/error-types';
import { getServerAlgoliaIndexes } from '~/lib/.server/algolia-indexes.server';
import type { AlgoliaIndexMap } from '~/lib/algolia-indexes';

export type LoaderReturnType = {
  ALGOLIA_APP_ID: string;
  ALGOLIA_SEARCH_API_KEY: string;
  algoliaIndexes: AlgoliaIndexMap;
};

export const loader: LoaderFunction = async () => {
  const appId = process.env.ALGOLIA_APP_ID;
  const searchApiKey = process.env.ALGOLIA_SEARCH_API_KEY;

  if (!appId || !searchApiKey) {
    throw new AuthenticationError('Algolia credentials not found');
  }

  return {
    ALGOLIA_APP_ID: appId,
    ALGOLIA_SEARCH_API_KEY: searchApiKey,
    algoliaIndexes: getServerAlgoliaIndexes(),
  };
};
