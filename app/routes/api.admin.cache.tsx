import {
  type ActionFunction,
  type LoaderFunction,
  data,
} from 'react-router-dom';
import redis from '~/lib/.server/redis-config';
import {
  collectItemCacheFootprint,
  deleteByPrefix,
  invalidateItem,
} from '~/lib/.server/cache-utils';

const MAX_RETURNED_CACHE_KEYS = 100;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CACHE_INVALIDATION_SECRET;
  const provided = request.headers.get('x-cache-secret');
  return Boolean(secret && provided && provided === secret);
}

/**
 * Admin cache-invalidation endpoint.
 *
 * POST /api/admin/cache?id=<contentChannelItemId>
 *   Header: x-cache-secret: <CACHE_INVALIDATION_SECRET>
 *
 * `id` is read from the query string first (what a Rock webhook sends), falling
 * back to a JSON body `{ "id": <contentChannelItemId> }` for manual/curl testing.
 *
 * Invalidates every cache entry containing the given content item or a known
 * descendant. Designed to be called both
 * manually by a developer and by a Rock RMS webhook on content publish/update.
 *
 * Channel id is not required — Rock ContentChannelItem ids are globally unique.
 *
 * POST /api/admin/cache?target=attribute-matrices
 *   Flushes every cached Attribute Matrix (`AttributeMatrices` and
 *   `AttributeMatrixItems`). Site-wide: this also clears matrix data used by
 *   locations (During the Week), events, page-builder, ministry-builder and
 *   studies. Cannot be combined with `id`; a blank `target=` is ignored.
 *   Responds `{ success, target, deletedKeys }`.
 */
export const action: ActionFunction = async ({ request }) => {
  if (request.method !== 'POST') {
    return data({ error: 'Method not allowed' }, { status: 405 });
  }

  if (!isAuthorized(request)) {
    return data({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  let id = url.searchParams.get('id');
  // A Rock Web Request with a blank attribute renders `target=`; treat as absent.
  const target = url.searchParams.get('target') || null;

  if (target) {
    if (id) {
      return data(
        { error: 'Provide either id or target, not both' },
        { status: 400 },
      );
    }
    if (target !== 'attribute-matrices') {
      return data({ error: 'Invalid target' }, { status: 400 });
    }
    if (!redis) {
      return data(
        { success: false, error: 'cache_unavailable' },
        { status: 503 },
      );
    }
    try {
      // Both prefixes: the parent `$expand` lists which item ids exist, the
      // items carry the values — flushing only one leaves add/remove stale.
      const deletedKeys =
        (await deleteByPrefix(redis, 'AttributeMatrices')) +
        (await deleteByPrefix(redis, 'AttributeMatrixItems'));
      return data({ success: true, target, deletedKeys });
    } catch {
      return data({ success: false, error: 'internal_error' }, { status: 500 });
    }
  }

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

  const numericId = parseInt(id, 10);
  if (Number.isNaN(numericId)) {
    return data({ error: 'Invalid id' }, { status: 400 });
  }

  if (!redis) {
    return data(
      { success: false, error: 'cache_unavailable' },
      { status: 503 },
    );
  }

  try {
    const deletedKeys = await invalidateItem(redis, numericId);
    return data({ success: true, id: String(numericId), deletedKeys });
  } catch {
    return data({ success: false, error: 'internal_error' }, { status: 500 });
  }
};

/**
 * Read-only preview of what `POST` would invalidate for a given content item,
 * without deleting anything. Lets a caller verify the footprint before
 * committing to a destructive cache clear.
 *
 * GET /api/admin/cache?id=<contentChannelItemId>
 *   Header: x-cache-secret: <CACHE_INVALIDATION_SECRET>
 *
 * `id` is read from the query string only — the action's JSON-body fallback
 * exists solely for the Rock webhook, and a GET body is a non-feature.
 */
export const loader: LoaderFunction = async ({ request }) => {
  if (!isAuthorized(request)) {
    return data({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) {
    return data(
      { success: false, error: 'Missing required field: id' },
      { status: 400 },
    );
  }

  const numericId = parseInt(id, 10);
  if (Number.isNaN(numericId)) {
    return data({ success: false, error: 'Invalid id' }, { status: 400 });
  }

  if (!redis) {
    return data(
      { success: false, error: 'cache_unavailable' },
      { status: 503 },
    );
  }

  try {
    const footprint = await collectItemCacheFootprint(redis, numericId);
    const cacheKeysTruncated =
      footprint.cacheKeys.length > MAX_RETURNED_CACHE_KEYS;
    const returnedCacheKeys = cacheKeysTruncated
      ? footprint.cacheKeys.slice(0, MAX_RETURNED_CACHE_KEYS)
      : footprint.cacheKeys;

    let liveCacheKeyCount = 0;
    if (footprint.cacheKeys.length > 0) {
      const existsResults = await redis
        .pipeline(footprint.cacheKeys.map((key) => ['exists', key]))
        .exec();
      liveCacheKeyCount = (existsResults ?? []).reduce(
        (sum, [, exists]) => sum + (typeof exists === 'number' ? exists : 0),
        0,
      );
    }

    return data(
      {
        success: true,
        id: String(numericId),
        itemIds: footprint.itemIds,
        descendantIds: footprint.descendantIds,
        indexedCacheKeyCount: footprint.cacheKeys.length,
        liveCacheKeyCount,
        indexKeyCount: footprint.indexKeys.length,
        cacheKeys: returnedCacheKeys,
        cacheKeysTruncated,
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store', Vary: 'x-cache-secret' },
      },
    );
  } catch {
    return data({ success: false, error: 'internal_error' }, { status: 500 });
  }
};
