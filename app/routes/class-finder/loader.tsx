import { LoaderFunction } from 'react-router';
import { AuthenticationError } from '~/lib/.server/error-types';

export type LoaderReturnType = {
  ALGOLIA_APP_ID: string;
  ALGOLIA_SEARCH_API_KEY: string;
};

export const loader: LoaderFunction = async () => {
  const appId = process.env.ALGOLIA_APP_ID;
  const searchApiKey = process.env.ALGOLIA_SEARCH_API_KEY;

  if (!appId || !searchApiKey) {
    throw new AuthenticationError('Algolia credentials not found');
  }

  return Response.json({
    ALGOLIA_APP_ID: appId,
    ALGOLIA_SEARCH_API_KEY: searchApiKey,
  });
};
