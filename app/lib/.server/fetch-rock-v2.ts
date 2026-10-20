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

export const isRockV2Enabled = (): boolean =>
  process.env.ROCK_V2_ENABLED === 'true';

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

/**
 * Rock 18.7 refuses number IDs in more places when Disable Predictable IDs is
 * on, so v2 paths must use a Guid or IdKey. Like the v1 by-id guard, this
 * throws outside production; in production the call falls back to v1.
 */
const findNumberIdProblem = (path: string): string | undefined => {
  const numberSegment = path
    .split('/')
    .find((segment) => /^\d+$/.test(segment));

  return numberSegment
    ? `Rock v2 path "${path}" uses the number ID ${numberSegment}. Use the ` +
        "entity's Guid or IdKey instead."
    : undefined;
};

interface FetchRockV2Options<T> {
  /** Path under /api/v2/models/, e.g. `campuses/{guid}` or `contentchannelitems/search/{searchKey}` */
  path: string;
  method?: 'GET' | 'POST';
  body?: Record<string, unknown>;
  ttl?: TTLValue;
  /** Converts the raw v2 response to the caller's (v1) shape, usually via toV1Shape */
  map: (data: unknown) => T;
  /** The existing v1 call, used when v2 is off or fails */
  fallback: () => Promise<T>;
}

export const fetchRockV2 = async <T>({
  path,
  method = 'GET',
  body,
  ttl = TTL.DEFAULT,
  map,
  fallback,
}: FetchRockV2Options<T>): Promise<T> => {
  if (!isRockV2Enabled()) return fallback();

  const normalizedPath = path.replace(/^\/+|\/+$/g, '');
  const numberIdProblem = findNumberIdProblem(normalizedPath);
  if (numberIdProblem) {
    if (process.env.NODE_ENV !== 'production') throw new Error(numberIdProblem);
    console.warn(`⚠️ ${numberIdProblem} Using v1 fallback.`);
    return fallback();
  }

  const endpoint = `v2/models/${normalizedPath}`;
  // v2 searches are POSTs whose query lives in the body, so the key hashes
  // method + body. The `v2/models/` endpoint keeps keys apart from v1's.
  const cacheKey = buildCacheKey(endpoint, {
    method,
    body: body ? JSON.stringify(body) : undefined,
  });
  const skipCache = isPreviewMode() || process.env.NODE_ENV === 'development';
  const effectiveTtl = skipCache ? TTL.NONE : ttl;

  try {
    if (redis && effectiveTtl > 0) {
      const cached = await redis.get(cacheKey);
      if (cached) return map(JSON.parse(cached));
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
    const mapped = map(data);

    // The raw v2 response is cached, so a mapper change needs no cache flush.
    if (redis && effectiveTtl > 0) {
      try {
        await redis.set(cacheKey, JSON.stringify(data), 'EX', effectiveTtl);
      } catch {
        console.error('⚠️ Redis cache storage failed');
      }
    }

    return mapped;
  } catch (error) {
    console.error('⚠️ Rock v2 request failed, using v1 fallback:', error);
    return fallback();
  }
};
