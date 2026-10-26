import isEqual from 'lodash/isEqual';
import mapValues from 'lodash/mapValues';
import { normalize } from '~/lib/utils';
import redis from './redis-config';
import { buildCacheKey, TTL, type TTLValue } from './cache-utils';
import { buildRockUrl, isPreviewMode } from './fetch-rock-data';

/**
 * Rock REST v2 (`/api/v2/models/...`) reads, run beside the v1 helpers.
 * Every call carries a v1 fallback: it runs when ROCK_V2_ENABLED is off or the
 * v2 call fails, so turning v2 on can never take a page down.
 */

// TODO: temporary for local testing; restore the ROCK_V2_ENABLED check before merging.
export const isRockV2Enabled = (): boolean => true;

/** One attribute as v2's `/{id}/attributevalues` returns it. */
export interface RockV2AttributeValue {
  value?: string;
  textValue?: string;
  htmlValue?: string;
  condensedTextValue?: string;
  condensedHtmlValue?: string;
}

export interface RockV2SearchQuery {
  where?: string;
  select?: string;
  sort?: string;
  offset?: number;
  limit?: number;
}

/**
 * Rock's docs name the paging fields skip/take, its source names them
 * offset/limit. Switch here once CFDP-4465 confirms which one our server takes.
 */
const V2_PAGING_FIELDS = { offset: 'offset', limit: 'limit' } as const;

export const buildV2SearchBody = ({
  offset,
  limit,
  ...query
}: RockV2SearchQuery): Record<string, unknown> => ({
  ...query,
  ...(offset !== undefined && { [V2_PAGING_FIELDS.offset]: offset }),
  ...(limit !== undefined && { [V2_PAGING_FIELDS.limit]: limit }),
});

/**
 * Converts a v2 entity (and its attribute values) to the shape loaders read
 * from v1 today: camelCase keys and `attributeValues.{key}.value` /
 * `.valueFormatted`. v2 has no `attributes` definitions, so callers that need
 * them (e.g. image field types) stay on v1.
 */
export const toV1Shape = (
  entity: Record<string, unknown>,
  attributeValues?: Record<string, RockV2AttributeValue>,
): Record<string, unknown> => ({
  ...(normalize(entity) as Record<string, unknown>),
  ...(attributeValues && {
    attributeValues: normalize(
      mapValues(attributeValues, (attribute) => ({
        value: attribute.value ?? '',
        valueFormatted: attribute.textValue ?? '',
      })),
    ),
  }),
});

/** Escapes a value for a double-quoted string in an Entity Search `where`. */
export const escapeDynamicLinq = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

/** Saved Entity Searches return `{ count, items }`. */
export const getSearchItems = (data: unknown): Record<string, unknown>[] =>
  (data as { items?: Record<string, unknown>[] } | null)?.items ?? [];

/**
 * Rock 18.7 refuses number IDs in more places when Disable Predictable IDs is
 * on, so v2 paths must use a Guid or IdKey. Like the v1 by-id guard, this
 * throws outside production; in production the call falls back to v1.
 */
class RockV2NumberIdError extends Error {}

const assertNoNumberId = (path: string): void => {
  const numberSegment = path
    .split('/')
    .find((segment) => /^\d+$/.test(segment));

  if (numberSegment) {
    throw new RockV2NumberIdError(
      `Rock v2 path "${path}" uses the number ID ${numberSegment}. Use the ` +
        "entity's Guid or IdKey instead.",
    );
  }
};

interface RockV2Request {
  /** Path under /api/v2/models/, e.g. `campuses/{guid}` or `contentchannelitems/search/{searchKey}` */
  path: string;
  method?: 'GET' | 'POST';
  body?: Record<string, unknown>;
  ttl?: TTLValue;
}

/**
 * One cached v2 call that throws on failure. Use it inside a fetchRockV2 `map`
 * for follow-up reads (e.g. `/attributevalues`), so any failure there still
 * falls back to v1 for the whole read.
 */
export const requestRockV2 = async ({
  path,
  method = 'GET',
  body,
  ttl = TTL.DEFAULT,
}: RockV2Request): Promise<unknown> => {
  const normalizedPath = path.replace(/^\/+|\/+$/g, '');
  assertNoNumberId(normalizedPath);

  const endpoint = `v2/models/${normalizedPath}`;
  // v2 searches are POSTs whose query lives in the body, so the key hashes
  // method + body. The `v2/models/` endpoint keeps keys apart from v1's.
  const cacheKey = buildCacheKey(endpoint, {
    method,
    body: body ? JSON.stringify(body) : undefined,
  });
  const skipCache = isPreviewMode() || process.env.NODE_ENV === 'development';
  const effectiveTtl = skipCache ? TTL.NONE : ttl;

  if (redis && effectiveTtl > 0) {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }

  const res = await fetch(buildRockUrl(endpoint), {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization-Token': `${process.env.ROCK_TOKEN}`,
    },
    ...(body && { body: JSON.stringify(body) }),
  });

  if (!res.ok) {
    throw new Error(
      `Rock v2 ${method} ${endpoint} failed: ${res.status}, details: ${await res.text()}`,
    );
  }

  const data = await res.json();

  // The raw v2 response is cached, so a mapper change needs no cache flush.
  if (redis && effectiveTtl > 0) {
    try {
      await redis.set(cacheKey, JSON.stringify(data), 'EX', effectiveTtl);
    } catch {
      console.error('⚠️ Redis cache storage failed');
    }
  }

  return data;
};

interface FetchRockV2Options<T> extends RockV2Request {
  /** Converts the raw v2 response to the caller's (v1) shape, usually via toV1Shape */
  map: (data: unknown) => T | Promise<T>;
  /** The existing v1 call, used when v2 is off or fails */
  fallback: () => Promise<T>;
}

const preview = (value: unknown): string =>
  JSON.stringify(value)?.slice(0, 120) ?? 'undefined';

/** Where the v2 result differs from v1, over the fields v2 returns. */
export const diffAgainstV1 = (
  v2: unknown,
  v1: unknown,
  path = '',
): string[] => {
  if (isEqual(v1, v2)) return [];
  if (v1 && v2 && typeof v1 === 'object' && typeof v2 === 'object') {
    return Object.keys(v2).flatMap((key) =>
      diffAgainstV1(
        (v2 as Record<string, unknown>)[key],
        (v1 as Record<string, unknown>)[key],
        path ? `${path}.${key}` : key,
      ),
    );
  }
  return [`${path || '(root)'}: v1=${preview(v1)} v2=${preview(v2)}`];
};

/** Dev only: also runs the v1 read and logs how the v2 result differs. */
const logV1Comparison = async (
  path: string,
  v2: unknown,
  fallback: () => Promise<unknown>,
): Promise<void> => {
  try {
    const v1 = await fallback();
    const differences = diffAgainstV1(v2, v1);
    const v1Only =
      v1 && v2 && typeof v1 === 'object' && typeof v2 === 'object'
        ? Object.keys(v1).filter((key) => !(key in v2))
        : [];
    console.warn(
      [
        `🔍 Rock v2 vs v1 (${path}): ${differences.length} differences`,
        ...differences,
        ...(v1Only.length ? [`Only in v1: ${v1Only.join(', ')}`] : []),
      ].join('\n'),
    );
  } catch (error) {
    console.error('⚠️ Rock v1 comparison read failed:', error);
  }
};

export const fetchRockV2 = async <T>({
  map,
  fallback,
  ...request
}: FetchRockV2Options<T>): Promise<T> => {
  if (!isRockV2Enabled()) return fallback();

  try {
    const result = await map(await requestRockV2(request));
    if (process.env.NODE_ENV === 'development') {
      await logV1Comparison(request.path, result, fallback);
    }
    return result;
  } catch (error) {
    if (error instanceof RockV2NumberIdError) {
      if (process.env.NODE_ENV !== 'production') throw error;
      console.warn(`⚠️ ${error.message} Using v1 fallback.`);
      return fallback();
    }
    console.error('⚠️ Rock v2 request failed, using v1 fallback:', error);
    return fallback();
  }
};
