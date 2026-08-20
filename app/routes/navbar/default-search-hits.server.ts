/**
 * Initial-open state for the desktop navbar site search (before a query is typed):
 * latest message, latest article, latest podcast, then the featured events with
 * "Journey" first.
 *
 * "Latest" comes from the contentItems index default ranking with a contentType
 * filter — the same assumption the messages and events pages already make when
 * they read the current series / featured cards.
 */
import { resolveSearchHitLinkFromHit } from '~/components/navbar/search-hit-links';
import { createAuditedServerAlgoliaClient } from '~/lib/.server/algolia-request-audit.server';
import redis from '~/lib/.server/redis-config';
import { TTL } from '~/lib/.server/cache-utils';
import {
  FEATURED_EVENTS_FILTER,
  FEATURED_EVENTS_HITS_PER_PAGE,
  moveFeaturedJourneyCardFirst,
} from '~/routes/events/featured-events';
import type { ContentItemHit } from '~/routes/search/types';
import type { GlobalSearchLocationHit } from '~/components/navbar/search-locations';

/** Content types listed above the featured events, in display order. */
const LATEST_CONTENT_TYPES = ['Sermon', 'Article', 'Podcast'] as const;

export type NavbarSearchData = {
  defaultSearchHits: ContentItemHit[];
  locationSearchHits: GlobalSearchLocationHit[];
};

const EMPTY_NAVBAR_SEARCH_DATA: NavbarSearchData = {
  defaultSearchHits: [],
  locationSearchHits: [],
};

function hasResolvableLink(hit: ContentItemHit): boolean {
  return resolveSearchHitLinkFromHit(hit).to.trim().length > 0;
}

export async function fetchDefaultSearchHits(
  contentItemsIndexName: string,
  locationsIndexName: string,
): Promise<NavbarSearchData> {
  const appId = process.env.ALGOLIA_APP_ID;
  const searchApiKey = process.env.ALGOLIA_SEARCH_API_KEY;

  if (
    !appId ||
    !searchApiKey ||
    !contentItemsIndexName ||
    !locationsIndexName
  ) {
    return EMPTY_NAVBAR_SEARCH_DATA;
  }

  const cacheKey = `navbar-search:${contentItemsIndexName}:${locationsIndexName}`;

  if (process.env.SHOW_UNAPPROVED_CONTENT !== 'true' && redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached) as NavbarSearchData;
    } catch (error) {
      console.error('[navbar] search cache read failed', error);
    }
  }

  try {
    const client = createAuditedServerAlgoliaClient(
      appId,
      searchApiKey,
      'root.navbar-default-search',
    );

    const { results } = await client.searchForHits<Record<string, unknown>>([
      ...LATEST_CONTENT_TYPES.map((contentType) => ({
        indexName: contentItemsIndexName,
        params: {
          filters: `contentType:"${contentType}"`,
          hitsPerPage: 1,
        },
      })),
      {
        indexName: contentItemsIndexName,
        params: {
          filters: FEATURED_EVENTS_FILTER,
          hitsPerPage: FEATURED_EVENTS_HITS_PER_PAGE,
        },
      },
      {
        indexName: locationsIndexName,
        params: {
          query: '',
          hitsPerPage: 20,
        },
      },
    ]);

    const hitsAt = (index: number) =>
      (results[index]?.hits ?? []).map((h) => h as unknown as ContentItemHit);

    const latestHits = LATEST_CONTENT_TYPES.flatMap((_, index) =>
      hitsAt(index),
    );
    const featuredEventHits = moveFeaturedJourneyCardFirst(
      hitsAt(LATEST_CONTENT_TYPES.length),
    );

    const data = {
      defaultSearchHits: [...latestHits, ...featuredEventHits].filter(
        hasResolvableLink,
      ),
      locationSearchHits: (results[LATEST_CONTENT_TYPES.length + 1]?.hits ??
        []) as GlobalSearchLocationHit[],
    };

    if (process.env.SHOW_UNAPPROVED_CONTENT !== 'true' && redis) {
      try {
        await redis.set(cacheKey, JSON.stringify(data), 'EX', TTL.SHORT);
      } catch (error) {
        console.error('[navbar] search cache write failed', error);
      }
    }

    return data;
  } catch (error) {
    console.error('[navbar] default search hits fetch failed', error);
    return EMPTY_NAVBAR_SEARCH_DATA;
  }
}
