import { type ActionFunction, data } from 'react-router-dom';
import redis from '~/lib/.server/redis-config';
import {
  extractContentItemRelationships,
  invalidateItem,
  TTL,
} from '~/lib/.server/cache-utils';
import { fetchRockData } from '~/lib/.server/fetch-rock-data';

/**
 * Admin cache-invalidation endpoint.
 *
 * POST /api/admin/cache?id=<contentChannelItemId>
 *   Header: x-cache-secret: <CACHE_INVALIDATION_SECRET>
 *
 * `id` is read from the query string first (what a Rock webhook sends), falling
 * back to a JSON body `{ "id": <contentChannelItemId> }` for manual/curl testing.
 *
 * Invalidates every cache entry containing the given content item or a current
 * or formerly associated descendant. Designed to be called both
 * manually by a developer and by a Rock RMS webhook on content publish/update.
 *
 * Channel id is not required — Rock ContentChannelItem ids are globally unique.
 */
export const action: ActionFunction = async ({ request }) => {
  if (request.method !== 'POST') {
    return data({ error: 'Method not allowed' }, { status: 405 });
  }

  const secret = process.env.CACHE_INVALIDATION_SECRET;
  const provided = request.headers.get('x-cache-secret');
  if (!secret || !provided || provided !== secret) {
    return data({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  let id = url.searchParams.get('id');

  // Fallback to a JSON body for curl/manual testing.
  if (!id) {
    try {
      const body: { id?: string | number } = await request.json();
      id = body?.id != null ? String(body.id) : null;
    } catch {
      // no/invalid body — id stays null and is handled below
    }
  }

  if (!id) {
    return data({ error: 'Missing required field: id' }, { status: 400 });
  }

  if (!/^\d+$/.test(id)) {
    return data({ error: 'Invalid id' }, { status: 400 });
  }
  const numericId = Number(id);

  if (!redis) {
    return data(
      { success: false, error: 'cache_unavailable' },
      { status: 503 },
    );
  }

  try {
    const result = await invalidateItem(redis, numericId, {
      resolveChildItemIds: async (parentId) => {
        const relationships = extractContentItemRelationships(
          await fetchRockData({
            endpoint: 'ContentChannelItemAssociations',
            queryParams: {
              $filter: `ContentChannelItemId eq ${parentId}`,
              $orderby: 'Order',
            },
            ttl: TTL.NONE,
          }),
        );

        return relationships
          .filter(
            ({ parentId: relationshipParentId }) =>
              relationshipParentId === parentId,
          )
          .map(({ childId }) => childId);
      },
    });

    return data({
      success: true,
      id: String(numericId),
      deletedKeys: result.deletedKeys,
      visitedItems: result.visitedItemIds.length,
      cachedRelationships: result.cachedRelationships,
      liveRelationships: result.liveRelationships,
    });
  } catch (error) {
    console.error('Content-item relationship discovery failed', {
      itemId: numericId,
      error: error instanceof Error ? error.message : String(error),
    });
    return data(
      { success: false, error: 'relationship_discovery_failed' },
      { status: 502 },
    );
  }
};
