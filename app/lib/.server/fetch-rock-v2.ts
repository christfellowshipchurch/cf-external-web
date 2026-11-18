import camelCase from 'lodash/camelCase';
import mapValues from 'lodash/mapValues';
import { normalize } from '~/lib/utils';
import redis from './redis-config';
import {
  buildCacheKey,
  storeIndexedResponse,
  TTL,
  type ContentItemRelationship,
  type TTLValue,
} from './cache-utils';
import { RockAPIError } from './error-types';
import { buildRockUrl, isPreviewMode } from './fetch-rock-data';

/**
 * Rock REST v2 (`/api/v2/models/...`) reads and writes. A failed call throws;
 * there is no v1 fallback (reads still on v1 are listed in
 * docs/architecture/rock-v2-setup.md, "Staying on v1").
 */

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
 * Converts a v2 entity (and its attribute values) to the shape loaders read:
 * camelCase keys and `attributeValues.{key}.value` / `.valueFormatted`, as v1
 * returned them. v2 has no `attributes` definitions (see `withAttributeKeys`).
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
 * One saved Entity Search per entity, with query refinement on so the caller
 * owns the `where`. Shared with My Groups. Older keys equal the v2 route name;
 * newer ones are camelCase (see the setup doc's search key table).
 */
export const searchPath = (model: string, searchKey = model): string =>
  `${model}/search/${searchKey}`;

/**
 * Selects an entity's attribute values inside a search, so reads need no
 * per-record `/attributevalues` call (or its Unrestricted Read grant).
 * `entityName` is the C# name, e.g. `Campus`, `DefinedValue`.
 */
export const selectAttributeValues = (
  entityName: string,
  keys?: string[],
): string => {
  const only = keys?.length
    ? `.Where(av => ${keys.map((key) => `av.Key == "${escapeDynamicLinq(key)}"`).join(' || ')})`
    : '';
  return `${entityName}AttributeValues${only}.Select(av => new (av.Key, av.Value, av.PersistedTextValue as TextValue)) as AttributeValues`;
};

/**
 * Converts a search row to the v1 shape. Rows that selected
 * `selectAttributeValues` get `attributeValues`; others get none, as on v1.
 */
export const projectedToV1Shape = <T = Record<string, unknown>>(
  row: Record<string, unknown>,
): T => {
  const { attributeValues, ...entity } = normalize(row) as {
    attributeValues?: (RockV2AttributeValue & { key: string })[];
  };
  return toV1Shape(
    entity,
    attributeValues &&
      Object.fromEntries(
        attributeValues.map(({ key, ...value }) => [key, value]),
      ),
  ) as T;
};

/**
 * Search rows whose `field` equals `expected` (case-insensitive). If Rock
 * ignored the refinement `where`, a search returns unrelated rows; throwing
 * then fails the read instead of using the wrong record. Rock returns
 * camelCase keys, so `field` (`Guid`) is read as given, then as `guid`.
 */
export const keepMatchingRows = (
  rows: Record<string, unknown>[],
  field: string,
  expected: string,
): Record<string, unknown>[] => {
  const wanted = expected.toLowerCase();
  const camelField = camelCase(field);
  const matching = rows.filter(
    (row) =>
      String(row[field] ?? row[camelField] ?? '').toLowerCase() === wanted,
  );
  if (matching.length !== rows.length) {
    // No value: it can be a name or an email.
    throw new Error(
      `Rock v2 search returned rows whose ${field} doesn't match`,
    );
  }
  return matching;
};

/** Escapes a value for a double-quoted string in an Entity Search `where`. */
export const escapeDynamicLinq = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

/** Saved Entity Searches return `{ count, items }`. */
export const getSearchItems = (data: unknown): Record<string, unknown>[] =>
  (data as { items?: Record<string, unknown>[] } | null)?.items ?? [];

/**
 * Rock 18.7 refuses number IDs in more places when Disable Predictable IDs is
 * on, so v2 paths must use a Guid or IdKey.
 */
const assertNoNumberId = (path: string): void => {
  const numberSegment = path
    .split('/')
    .find((segment) => /^\d+$/.test(segment));

  if (numberSegment) {
    throw new Error(
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
  /** Content items the response holds, for the per-item reverse index */
  index?: (data: unknown) => ItemIndex;
}

export interface ItemIndex {
  itemIds: string[];
  relationships?: ContentItemRelationship[];
}

/**
 * "Now" literals in a `where` change every request; hashing them would give
 * each request its own cache key. The live value is still sent to Rock.
 */
const stableCacheBody = (body: Record<string, unknown>): string =>
  JSON.stringify(body).replace(/DateTime\([\d, ]+\)/g, 'DateTime(now)');

/** The Redis key a v2 request is cached under. */
export const buildV2CacheKey = ({
  path,
  method = 'GET',
  body,
}: Pick<RockV2Request, 'path' | 'method' | 'body'>): string =>
  // v2 searches are POSTs whose query lives in the body, so the key hashes
  // method + body. The `v2/models/` endpoint keeps keys apart from v1's.
  buildCacheKey(`v2/models/${path.replace(/^\/+|\/+$/g, '')}`, {
    method,
    body: body ? stableCacheBody(body) : undefined,
  });

/** One cached v2 call that throws on failure. */
export const requestRockV2 = async ({
  path,
  method = 'GET',
  body,
  ttl = TTL.DEFAULT,
  index,
}: RockV2Request): Promise<unknown> => {
  const normalizedPath = path.replace(/^\/+|\/+$/g, '');
  assertNoNumberId(normalizedPath);

  const endpoint = `v2/models/${normalizedPath}`;
  const cacheKey = buildV2CacheKey({ path: normalizedPath, method, body });
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
    // A search's error body can quote its `where`, which may hold a person's
    // name or email, so only GET errors carry Rock's details.
    const details = method === 'GET' ? `, details: ${await res.text()}` : '';
    throw new Error(
      `Rock v2 ${method} ${endpoint} failed: ${res.status}${details}`,
    );
  }

  const data = await res.json();

  // The raw v2 response is cached, so a mapper change needs no cache flush.
  if (redis && effectiveTtl > 0) {
    try {
      const { itemIds, relationships = [] } = index?.(data) ?? {
        itemIds: [],
      };
      await storeIndexedResponse(
        redis,
        cacheKey,
        JSON.stringify(data),
        effectiveTtl,
        [...new Set(itemIds)],
        relationships,
      );
    } catch {
      console.error('⚠️ Redis cache storage failed');
    }
  }

  return data;
};

const V2_WRITE_TIMEOUT_MS = 10_000;

/**
 * A v2 call that changes data (a create, a PATCH, a workflow launch): never
 * cached and never retried. A Rock error throws a RockAPIError with Rock's
 * status (not its body, which can echo the posted values). Returns the parsed
 * body, e.g. a create's `{ id, guid, idKey }`, or null when there is none or it
 * isn't JSON, so an odd body can't turn a done write into an error.
 */
export const sendRockV2 = async (
  method: 'POST' | 'PATCH',
  path: string,
  body: Record<string, unknown>,
): Promise<unknown> => {
  const normalizedPath = path.replace(/^\/+|\/+$/g, '');
  assertNoNumberId(normalizedPath);

  const endpoint = `v2/models/${normalizedPath}`;
  const res = await fetch(buildRockUrl(endpoint), {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization-Token': `${process.env.ROCK_TOKEN}`,
    },
    body: JSON.stringify(body),
    // Never retried: a timeout may come after Rock wrote.
    signal: globalThis.AbortSignal.timeout(V2_WRITE_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new RockAPIError(
      `Rock v2 ${method} ${endpoint} failed: ${res.status}`,
      res.status,
    );
  }

  try {
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
};

/** The Guid a v2 write path needs; throws when the record has none. */
export const requireV2Guid = (
  guid: string | null | undefined,
  what: string,
): string => {
  if (!guid) throw new RockAPIError(`No Guid for the ${what}`, 404);
  return guid;
};

interface FetchRockV2Options<T> extends RockV2Request {
  /** Converts the raw v2 response to the caller's (v1) shape, usually via toV1Shape */
  map: (data: unknown) => T | Promise<T>;
}

/** One v2 read, mapped to the caller's shape. Throws on any failure. */
export const fetchRockV2 = async <T>({
  map,
  ...request
}: FetchRockV2Options<T>): Promise<T> => map(await requestRockV2(request));

const ROCK_GUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Guids go into v2 paths and `where` strings, so check the format first. */
export const isRockGuid = (value: string): boolean => ROCK_GUID_RE.test(value);

interface EntityByGuidOptions {
  /** v2 route name, e.g. `contentchannels` */
  v2Model: string;
  guid: string;
  /**
   * Fields to read, e.g. `Id, Name`. Given, v2 reads through the entity's
   * saved search (for controllers granted only `search/{searchKey}`); omitted,
   * it's a plain `GET {model}/{guid}` returning every field.
   */
  select?: string;
  ttl?: TTLValue;
}

/** One record by Guid. Null when the Guid is malformed or nothing matches. */
export const fetchRockEntityByGuid = async <T = Record<string, unknown>>({
  v2Model,
  guid,
  select,
  ttl,
}: EntityByGuidOptions): Promise<T | null> => {
  const trimmed = guid.trim();
  if (!isRockGuid(trimmed)) return null;

  const v2Read = select
    ? {
        path: searchPath(v2Model),
        method: 'POST' as const,
        body: buildV2SearchBody({
          where: `Guid == "${trimmed}"`,
          select: `new (Guid, ${select})`,
        }),
        map: (data: unknown) => {
          const [found] = keepMatchingRows(
            getSearchItems(data),
            'Guid',
            trimmed,
          );
          return found ? (toV1Shape(found) as T) : null;
        },
      }
    : {
        path: `${v2Model}/${trimmed}`,
        map: (data: unknown) => toV1Shape(data as Record<string, unknown>) as T,
      };

  return fetchRockV2<T | null>({ ...v2Read, ttl });
};
