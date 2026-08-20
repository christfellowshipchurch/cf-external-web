import type { LoaderFunctionArgs } from 'react-router';
import { createAuditedServerAlgoliaClient } from '~/lib/.server/algolia-request-audit.server';

import { escapeAlgoliaFilterString } from '~/components/finders/finder-algolia.utils';
import { getServerAlgoliaIndexes } from '~/lib/.server/algolia-indexes.server';
import type { AlgoliaIndexMap } from '~/lib/algolia-indexes';
import type { ContentItemHit } from '~/routes/search/types';

import {
  MAIN_EVENTS_GRID_HITS_PER_PAGE,
  MAIN_EVENTS_TYPE_FILTER,
} from './all-events.constants';
import {
  parseEventsFinderUrlState,
  type EventsFinderUrlState,
} from '../events-url-state';
import {
  FEATURED_EVENTS_FILTER,
  FEATURED_EVENTS_HITS_PER_PAGE,
  moveFeaturedJourneyCardFirst,
} from '../featured-events';

export type EventFinderFacetItem = {
  value: string;
  label: string;
  count: number;
};

export interface AllEventsLoaderData {
  ALGOLIA_APP_ID: string;
  ALGOLIA_SEARCH_API_KEY: string;
  algoliaIndexes: AlgoliaIndexMap;
  featuredHits: ContentItemHit[];
  mainEventHits: ContentItemHit[];
  eventsNbPages: number;
  eventsPage: number;
}

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

function buildMainEventsSearchParams(urlState: EventsFinderUrlState): {
  filters: string;
  hitsPerPage: number;
  page: number;
  query?: string;
  facetFilters?: string[][];
} {
  const params: {
    filters: string;
    hitsPerPage: number;
    page: number;
    query?: string;
    facetFilters?: string[][];
  } = {
    filters: MAIN_EVENTS_TYPE_FILTER,
    hitsPerPage: MAIN_EVENTS_GRID_HITS_PER_PAGE,
    page: urlState.page ?? 0,
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
  const appId = process.env.ALGOLIA_APP_ID ?? '';
  const searchApiKey = process.env.ALGOLIA_SEARCH_API_KEY ?? '';
  const algoliaIndexes = getServerAlgoliaIndexes();

  let featuredHits: ContentItemHit[] = [];
  let mainEventHits: ContentItemHit[] = [];
  let eventsNbPages = 0;

  const url = new URL(request.url);
  const urlState = parseEventsFinderUrlState(url.searchParams);
  const eventsPage = urlState.page ?? 0;

  if (appId && searchApiKey) {
    const client = createAuditedServerAlgoliaClient(
      appId,
      searchApiKey,
      'events.loader',
    );

    try {
      const [featuredRes, mainRes] = await Promise.all([
        client.searchForHits<Record<string, unknown>>([
          {
            indexName: algoliaIndexes.contentItems,
            params: {
              filters: FEATURED_EVENTS_FILTER,
              hitsPerPage: FEATURED_EVENTS_HITS_PER_PAGE,
            },
          },
        ]),
        client.searchSingleIndex({
          indexName: algoliaIndexes.contentItems,
          searchParams: buildMainEventsSearchParams(urlState),
        }),
      ]);

      const rawFeatured = featuredRes.results[0]?.hits ?? [];
      featuredHits = moveFeaturedJourneyCardFirst(
        rawFeatured.map((h) => h as unknown as ContentItemHit),
      );

      const rawMain = mainRes.hits ?? [];
      mainEventHits = rawMain.map((h) => h as unknown as ContentItemHit);
      eventsNbPages = mainRes.nbPages ?? 0;
    } catch (error) {
      console.error('[events/all-events] Algolia loader fetch failed', error);
    }
  }

  return Response.json({
    ALGOLIA_APP_ID: appId,
    ALGOLIA_SEARCH_API_KEY: searchApiKey,
    algoliaIndexes,
    featuredHits,
    mainEventHits,
    eventsNbPages,
    eventsPage,
  } satisfies AllEventsLoaderData);
};
