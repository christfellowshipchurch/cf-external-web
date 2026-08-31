import { type ActionFunction, data } from 'react-router-dom';
import redis from '~/lib/.server/redis-config';
import { invalidateItem } from '~/lib/.server/cache-utils';

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

  const numericId = parseInt(id, 10);
  if (Number.isNaN(numericId)) {
    return data({ error: 'Invalid id' }, { status: 400 });
  }

  const deletedKeys = await invalidateItem(redis, numericId);
  return data({ success: true, id: String(numericId), deletedKeys });
};
