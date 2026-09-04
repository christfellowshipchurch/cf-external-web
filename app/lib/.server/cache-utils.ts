import { createHash } from 'crypto';
import type Redis from 'ioredis';

/** TTL presets in seconds */
export const TTL = {
  /** Skip caching entirely */
  NONE: 0,
  /** 5 minutes — time-sensitive data */
  SHORT: 300,
  /** 1 hour — standard content */
  DEFAULT: 3600,
  /** 24 hours — rarely changing reference data */
  LONG: 86400,
} as const;

export type TTLValue = (typeof TTL)[keyof typeof TTL] | number;

/**
 * Matches the volatile date-range clause that `buildMergedFilter` injects into
 * Rock `$filter` values (`StartDateTime le datetime'<iso>' and ...`).
 *
 * Those timestamps change on every request, so hashing them verbatim produces a
 * unique cache key each time (effectively disabling cache and orphaning keys).
 */
const VOLATILE_DATE_RANGE_FILTER_PATTERN =
  /StartDateTime le datetime'[^']+' and \(ExpireDateTime eq null or ExpireDateTime ge datetime'[^']+'\)/g;

/** Stable placeholder substituted before hashing so date-range queries share a key. */
const STABLE_DATE_RANGE_FILTER =
  "StartDateTime le datetime'{now}' and (ExpireDateTime eq null or ExpireDateTime ge datetime'{now}')";

/**
 * Replaces live date-range timestamps in a `$filter` with a stable placeholder.
 * The live filter is still sent to Rock; only the cache-key hash input is stabilized.
 */
export function stabilizeFilterForCacheKey(
  filter: string | undefined,
): string | undefined {
  if (filter === undefined) return undefined;
  return filter.replace(
    VOLATILE_DATE_RANGE_FILTER_PATTERN,
    STABLE_DATE_RANGE_FILTER,
  );
}

/**
 * Builds a deterministic, namespaced Redis cache key.
 *
 * Format: `rock:{endpoint}:{hash12}`
 * - Endpoint is normalized (no leading/trailing slashes)
 * - Query params are sorted alphabetically and hashed (SHA-256, first 12 hex chars)
 * - Identical params in any order produce the same key
 * - Volatile `filterByDateRange` timestamps in `$filter` are normalized so
 *   repeat requests for the same logical query reuse one key (CFDP-4087)
 */
export function buildCacheKey(
  endpoint: string,
  queryParams: Record<string, string | undefined>,
): string {
  const normalizedEndpoint = endpoint.replace(/^\/+|\/+$/g, '');

  const sortedEntries = Object.entries(queryParams)
    .filter((entry): entry is [string, string] => entry[1] !== undefined)
    .map(([key, value]): [string, string] => [
      key,
      key === '$filter' ? (stabilizeFilterForCacheKey(value) ?? value) : value,
    ])
    .sort(([a], [b]) => a.localeCompare(b));

  const paramString = JSON.stringify(sortedEntries);
  const hash = createHash('sha256')
    .update(paramString)
    .digest('hex')
    .slice(0, 12);

  return `rock:${normalizedEndpoint}:${hash}`;
}

/**
 * Redis key namespace for the per-item reverse index (a Set of cache keys that
 * contain the given content item). Kept separate from the `rock:` cache namespace
 * so a future full flush of `rock:*` won't clear the index, and vice versa.
 */
export const itemTagKey = (id: string | number): string => `cfitem:${id}`;

/** Child content-item ids associated with a parent content item. */
export const childItemTagKey = (id: string | number): string =>
  `cfchildren:${id}`;

export interface ContentItemRelationship {
  parentId: string;
  childId: string;
}

/** Extracts Rock ContentChannelItemAssociation parent-child pairs. */
export function extractContentItemRelationships(
  data: unknown,
): ContentItemRelationship[] {
  const items = Array.isArray(data) ? data : [data];
  return items.flatMap((item) => {
    if (
      !item ||
      typeof item !== 'object' ||
      !('contentChannelItemId' in item) ||
      !('childContentChannelItemId' in item)
    ) {
      return [];
    }

    const { contentChannelItemId, childContentChannelItemId } = item as {
      contentChannelItemId: unknown;
      childContentChannelItemId: unknown;
    };
    if (contentChannelItemId == null || childContentChannelItemId == null) {
      return [];
    }

    return [
      {
        parentId: String(contentChannelItemId),
        childId: String(childContentChannelItemId),
      },
    ];
  });
}

/**
 * Extracts top-level Rock ContentChannelItem ids from a normalized fetchRockData
 * response (which is either a single item object or an array of items).
 *
 * An item is only counted when it carries BOTH `id` and `contentChannelId`, which
 * is unique to content-channel items. This skips non-content endpoints (People,
 * Campuses, DefinedValues) and nested entities (authors, defined values) so we
 * only tag cache entries by the content items they actually contain.
 */
export function extractContentItemIds(data: unknown): string[] {
  const items = Array.isArray(data) ? data : [data];
  const ids: string[] = [];
  for (const item of items) {
    if (
      item &&
      typeof item === 'object' &&
      'contentChannelId' in item &&
      'id' in item &&
      (item as { id: unknown }).id != null
    ) {
      ids.push(String((item as { id: unknown }).id));
    }
  }
  return ids;
}

/**
 * Invalidates every cache entry that contains content item `id` or any cached
 * or live descendant. Uses reverse indexes for exact key lookup — no KEYS/SCAN
 * — then clears item and relationship indexes.
 */
export type ResolveChildItemIds = (
  parentId: string,
) => Promise<readonly string[]>;

export interface InvalidateItemOptions {
  resolveChildItemIds?: ResolveChildItemIds;
}

export interface InvalidationResult {
  deletedKeys: number;
  visitedItemIds: string[];
  cachedRelationships: number;
  liveRelationships: number;
}

export async function invalidateItem(
  redis: Redis | null,
  id: string | number,
  { resolveChildItemIds }: InvalidateItemOptions = {},
): Promise<InvalidationResult> {
  if (!redis) {
    return {
      deletedKeys: 0,
      visitedItemIds: [],
      cachedRelationships: 0,
      liveRelationships: 0,
    };
  }

  const pending = [String(id)];
  const itemIds = new Set<string>();
  const keys = new Set<string>();
  const cachedRelationships = new Set<string>();
  const liveRelationships = new Set<string>();

  while (pending.length > 0) {
    const itemId = pending.shift()!;
    if (itemIds.has(itemId)) continue;
    itemIds.add(itemId);

    const [itemKeys, cachedChildIds, liveChildIds] = await Promise.all([
      redis.smembers(itemTagKey(itemId)),
      redis.smembers(childItemTagKey(itemId)),
      resolveChildItemIds?.(itemId) ?? Promise.resolve([]),
    ]);
    itemKeys.forEach((key) => keys.add(key));
    cachedChildIds.forEach((childId) =>
      cachedRelationships.add(`${itemId}:${childId}`),
    );
    liveChildIds.forEach((childId) =>
      liveRelationships.add(`${itemId}:${childId}`),
    );
    pending.push(...new Set([...cachedChildIds, ...liveChildIds]));
  }

  const pipeline = redis.pipeline();
  const deletesCacheKeys = keys.size > 0;
  if (deletesCacheKeys) pipeline.del(...keys);
  for (const itemId of itemIds) {
    pipeline.del(itemTagKey(itemId));
    pipeline.del(childItemTagKey(itemId));
  }
  const results = await pipeline.exec();

  const deletedKeys = deletesCacheKeys ? results?.[0]?.[1] : 0;
  return {
    deletedKeys: typeof deletedKeys === 'number' ? deletedKeys : 0,
    visitedItemIds: [...itemIds],
    cachedRelationships: cachedRelationships.size,
    liveRelationships: liveRelationships.size,
  };
}

/**
 * Deletes all cache keys matching a given endpoint prefix.
 * Useful for invalidating all cached data for a specific Rock endpoint.
 *
 * Uses SCAN instead of KEYS to walk the keyspace in small increments —
 * KEYS blocks the single-threaded Redis server for the full scan duration,
 * which is risky once the keyspace grows.
 *
 * @returns Number of keys deleted
 */
export async function deleteByPrefix(
  redis: Redis | null,
  endpointPrefix: string,
): Promise<number> {
  if (!redis) return 0;

  const normalizedPrefix = endpointPrefix.replace(/^\/+|\/+$/g, '');
  const pattern = `rock:${normalizedPrefix}:*`;

  const keys: string[] = [];
  let cursor = '0';

  do {
    const [nextCursor, batch] = await redis.scan(
      cursor,
      'MATCH',
      pattern,
      'COUNT',
      100,
    );
    keys.push(...batch);
    cursor = nextCursor;
  } while (cursor !== '0');

  if (keys.length === 0) return 0;
  return redis.del(...keys);
}
