import { getServerAlgoliaIndexes } from '~/lib/.server/algolia-indexes.server';
import type { AlgoliaIndexMap } from '~/lib/algolia-indexes';

export type CommunityOpportunitiesLoaderData = {
  ALGOLIA_APP_ID: string;
  ALGOLIA_SEARCH_API_KEY: string;
  algoliaIndexes: AlgoliaIndexMap;
};

export async function loader() {
  return Response.json({
    ALGOLIA_APP_ID: process.env.ALGOLIA_APP_ID ?? '',
    ALGOLIA_SEARCH_API_KEY: process.env.ALGOLIA_SEARCH_API_KEY ?? '',
    algoliaIndexes: getServerAlgoliaIndexes(),
  } satisfies CommunityOpportunitiesLoaderData);
}
