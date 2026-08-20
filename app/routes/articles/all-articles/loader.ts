import type { LoaderFunctionArgs } from 'react-router';

import { escapeAlgoliaFilterString } from '~/components/finders/finder-algolia.utils';
import { createAuditedServerAlgoliaClient } from '~/lib/.server/algolia-request-audit.server';
import { getServerAlgoliaIndexes } from '~/lib/.server/algolia-indexes.server';
import { AuthenticationError } from '~/lib/.server/error-types';
import type { AlgoliaIndexMap } from '~/lib/algolia-indexes';
import type { ContentItemHit } from '~/routes/search/types';

import { ALL_ARTICLES_TYPE_FILTER } from './all-articles.constants';
import { parseAllArticlesUrlState } from './all-articles-url-state';

/** Matches largest grid column count in `all-articles.partial.tsx`. */
const ALL_ARTICLES_LOADER_HITS_PER_PAGE = 12;

export type AllArticlesReturnType = {
  ALGOLIA_APP_ID: string;
  ALGOLIA_SEARCH_API_KEY: string;
  algoliaIndexes: AlgoliaIndexMap;
  initialArticleHits: ContentItemHit[];
  articlesNbPages: number;
  articlesPage: number;
};

function refinementListToFacetFilters(
  refinementList: Record<string, string[]> | undefined,
): string[][] | undefined {
  if (!refinementList || Object.keys(refinementList).length === 0) {
    return undefined;
  }
  const groups: string[][] = [];
  for (const [attr, values] of Object.entries(refinementList)) {
    if (!values?.length) {
      continue;
    }
    groups.push(values.map((v) => `${attr}:"${escapeAlgoliaFilterString(v)}"`));
  }
  return groups.length > 0 ? groups : undefined;
}

function buildArticlesSearchParams(
  urlState: ReturnType<typeof parseAllArticlesUrlState>,
): {
  filters: string;
  hitsPerPage: number;
  page: number;
  distinct: boolean;
  query?: string;
  facetFilters?: string[][];
} {
  const params: {
    filters: string;
    hitsPerPage: number;
    page: number;
    distinct: boolean;
    query?: string;
    facetFilters?: string[][];
  } = {
    filters: ALL_ARTICLES_TYPE_FILTER,
    hitsPerPage: ALL_ARTICLES_LOADER_HITS_PER_PAGE,
    page: urlState.page ?? 0,
    distinct: true,
  };
  const q = urlState.query?.trim();
  if (q) {
    params.query = q;
  }
  const facetFilters = refinementListToFacetFilters(urlState.refinementList);
  if (facetFilters) {
    params.facetFilters = facetFilters;
  }
  return params;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const appId = process.env.ALGOLIA_APP_ID;
  const searchApiKey = process.env.ALGOLIA_SEARCH_API_KEY;
  const algoliaIndexes = getServerAlgoliaIndexes();

  if (!appId || !searchApiKey) {
    throw new AuthenticationError('Algolia credentials not found');
  }

  let initialArticleHits: ContentItemHit[] = [];
  let articlesNbPages = 0;

  const url = new URL(request.url);
  const urlState = parseAllArticlesUrlState(url.searchParams);
  const articlesPage = urlState.page ?? 0;
  const client = createAuditedServerAlgoliaClient(
    appId,
    searchApiKey,
    'articles.loader',
  );

  try {
    const hitsRes = await client.searchSingleIndex({
      indexName: algoliaIndexes.contentItems,
      searchParams: buildArticlesSearchParams(urlState),
    });

    initialArticleHits = (hitsRes.hits ?? []).map(
      (h) => h as unknown as ContentItemHit,
    );
    articlesNbPages = hitsRes.nbPages ?? 0;
  } catch (error) {
    console.error('[articles/all-articles] Algolia loader fetch failed', error);
  }

  return Response.json({
    ALGOLIA_APP_ID: appId,
    ALGOLIA_SEARCH_API_KEY: searchApiKey,
    algoliaIndexes,
    initialArticleHits,
    articlesNbPages,
    articlesPage,
  } satisfies AllArticlesReturnType);
};
