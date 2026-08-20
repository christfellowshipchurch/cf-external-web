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
import {
  FEATURED_EVENTS_FILTER,
  FEATURED_EVENTS_HITS_PER_PAGE,
  moveFeaturedJourneyCardFirst,
} from '~/routes/events/featured-events';
import type { ContentItemHit } from '~/routes/search/types';

/** Content types listed above the featured events, in display order. */
const LATEST_CONTENT_TYPES = ['Sermon', 'Article', 'Podcast'] as const;

function hasResolvableLink(hit: ContentItemHit): boolean {
  return resolveSearchHitLinkFromHit(hit).to.trim().length > 0;
}

export async function fetchDefaultSearchHits(
  contentItemsIndexName: string,
): Promise<ContentItemHit[]> {
  const appId = process.env.ALGOLIA_APP_ID;
  const searchApiKey = process.env.ALGOLIA_SEARCH_API_KEY;

  if (!appId || !searchApiKey || !contentItemsIndexName) {
    return [];
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
    ]);

    const hitsAt = (index: number) =>
      (results[index]?.hits ?? []).map((h) => h as unknown as ContentItemHit);

    const latestHits = LATEST_CONTENT_TYPES.flatMap((_, index) =>
      hitsAt(index),
    );
    const featuredEventHits = moveFeaturedJourneyCardFirst(
      hitsAt(LATEST_CONTENT_TYPES.length),
    );

    return [...latestHits, ...featuredEventHits].filter(hasResolvableLink);
  } catch (error) {
    console.error('[navbar] default search hits fetch failed', error);
    return [];
  }
}
