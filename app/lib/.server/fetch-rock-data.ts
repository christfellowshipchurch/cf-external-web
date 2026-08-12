import { normalize } from '~/lib/utils';
import redis from './redis-config';
import {
  buildCacheKey,
  extractContentItemIds,
  itemTagKey,
  TTL,
  type TTLValue,
} from './cache-utils';

export { TTL, deleteByPrefix, invalidateItem } from './cache-utils';
export type { TTLValue } from './cache-utils';
interface RockDataRequest {
  endpoint: string;
  body: Record<string, unknown> | string;
  contentType?: string;
}

const defaultHeaders = {
  'Content-Type': 'application/json',
  'Authorization-Token': `${process.env.ROCK_TOKEN}`,
};

/**
 * Single validated accessor for ROCK_API. Interpolating the env var directly
 * turns an absent value into the literal string "undefined" and builds every
 * request against it, which surfaces as Rock answering "user does not exist"
 * rather than as missing configuration.
 *
 * Read lazily rather than at module load: importing this module must not
 * require env to be present, or the test suite and the build break.
 */
export const getRockApiBaseUrl = (): string => {
  const baseUrl = process.env.ROCK_API?.trim();

  if (!baseUrl) {
    throw new Error(
      'ROCK_API is not set, so no Rock request can be built. .env and ' +
        '.env.local are gitignored, so `git worktree add` creates a tree with ' +
        'no env files at all and says nothing about it — copy them from your ' +
        'main checkout and start the app with `netlify dev`, which is what ' +
        'loads them.',
    );
  }

  return baseUrl;
};

/**
 * When true, this deployment shows Pending/unapproved content and skips the
 * shared Redis cache — used by the preview domain (CFDP-4143). Never set on prod.
 */
export const isPreviewMode = (): boolean =>
  process.env.SHOW_UNAPPROVED_CONTENT === 'true';

/**
 *
 * @param endpoint - the Rock endpoint to fetch data from
 * @param queryParams - query parameters to append to the request
 * @param customHeaders - additional headers to include in the request eg. Rock Cookie
 * @param cache - if true, the data will be cached. Default is true.
 * @returns Either the response data as JSON(array if multiple items, object if single item) or an error
 */

/**
 * Interface for Rock API query parameters
 */
interface RockQueryParams {
  /** Expands related entities inline */
  $expand?: string;

  /** Filters results based on Boolean condition (e.g. ContentChannelId eq 63) */
  $filter?: string;

  /** Selects which properties to include in response */
  $select?: string;

  /** Sorts results (e.g. StartDateTime desc) */
  $orderby?: string;

  /** Returns only first n results */
  $top?: string;

  /** Skips first n results */
  $skip?: string;

  /** Specify 'simple' or 'expanded' to load attributes */
  loadAttributes?: 'simple' | 'expanded';

  /** Comma-delimited list of attribute keys to limit specific attributes */
  attributeKey?: string;

  /** Value to filter by */
  value?: string;
}

/** Options for fetchRockData beyond query params */
interface FetchRockDataOptions {
  endpoint: string;
  queryParams?: RockQueryParams;
  customHeaders?: Record<string, string>;
  /** @deprecated Use `ttl` instead. Pass `ttl: TTL.NONE` to skip caching. */
  cache?: boolean;
  /** TTL in seconds. Use TTL.NONE to skip, TTL.SHORT/DEFAULT/LONG for presets. Defaults to TTL.DEFAULT (3600). */
  ttl?: TTLValue;
  /** When true, merge $filter so only items where now is within [StartDateTime, ExpireDateTime] are returned */
  filterByDateRange?: boolean;
  /** When true, merge $filter with Status eq 'Approved' */
  filterByStatusApproved?: boolean;
}

/**
 * Item with optional start/expire dates (camelCase or PascalCase from Rock API).
 * Use with isItemInDateRange to filter in-memory lists (e.g. by-ID fetches).
 */
export type ItemWithDateRange = {
  startDateTime?: string;
  expireDateTime?: string;
  StartDateTime?: string;
  ExpireDateTime?: string;
};

export const isItemInDateRange = (
  item: ItemWithDateRange,
  now: Date,
): boolean => {
  const start = item.startDateTime ?? item.StartDateTime;
  const expire = item.expireDateTime ?? item.ExpireDateTime;
  if (start) {
    const startDate = new Date(start);
    if (now < startDate) return false;
  }
  if (expire) {
    const expireDate = new Date(expire);
    if (now > expireDate) return false;
  }
  return true;
};

const buildMergedFilter = (
  existingFilter: string | undefined,
  filterByDateRange: boolean,
  filterByStatusApproved: boolean,
): string | undefined => {
  const clauses: string[] = [];

  if (filterByDateRange) {
    const isoNow = new Date().toISOString();
    clauses.push(
      `StartDateTime le datetime'${isoNow}' and (ExpireDateTime eq null or ExpireDateTime ge datetime'${isoNow}')`,
    );
  }
  if (filterByStatusApproved) {
    clauses.push("Status eq 'Approved'");
  }
  if (clauses.length === 0) {
    return existingFilter;
  }
  const newClause = clauses.join(' and ');
  return existingFilter ? `(${existingFilter}) and (${newClause})` : newClause;
};

const isSingleItemAttributeValueFetch = (endpoint: string): boolean =>
  endpoint.replace(/^\/+|\/+$/g, '') ===
  'ContentChannelItems/GetByAttributeValue';

/**
 * Removes a literal Status eq 'Approved' clause from a caller-built $filter
 * string. Several loaders embed this clause directly rather than going
 * through `filterByStatusApproved`, so preview mode strips it here instead
 * of touching every call site.
 */
const stripApprovedStatusFilter = (
  filter: string | undefined,
): string | undefined => {
  if (!filter) return filter;
  const stripped = filter
    .replace(/\s+and\s+Status eq 'Approved'/gi, '')
    .replace(/Status eq 'Approved'\s+and\s+/gi, '')
    .replace(/Status eq 'Approved'/gi, '')
    .trim();
  return stripped || undefined;
};

/**
 * True for Entity/{id} route shapes — a path segment after the first that is
 * bare digits or a GUID. The defect below belongs to that route shape, not to
 * single-entity fetches as a class: People/GetByAttributeValue returns one row
 * and does honor $expand, and its second segment is a word, not an id.
 */
const isByIdEndpoint = (endpoint: string): boolean => {
  const segments = endpoint.replace(/^\/+|\/+$/g, '').split('/');
  const idPattern =
    /^(\d+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

  return segments.slice(1).some((segment) => idPattern.test(segment));
};

/**
 * Rock silently ignores $expand and $select on Entity/{id} routes — no error,
 * no warning, the full entity comes back. An ignored $select is ~17x payload
 * waste (3.1 KB vs 187 B per row); an ignored $expand of a navigation property
 * returns null, so the fetch succeeds and the failure surfaces later in
 * whatever reads a field off it.
 *
 * Use the collection form instead, where both are honored:
 *   People?$filter=Id eq {id}&$select=Email
 *
 * Throws outside production because a warning in a server log is exactly what
 * the next generated call site will slip past. In production it only warns —
 * the consequence there is waste, which is not worth an outage.
 */
const assertByIdEndpointHasNoIgnoredParams = (
  endpoint: string,
  queryParams: RockQueryParams,
): void => {
  if (!isByIdEndpoint(endpoint)) return;

  const ignoredParams = (['$expand', '$select'] as const).filter(
    (param) => queryParams[param],
  );
  if (ignoredParams.length === 0) return;

  const message =
    `⚠️ Rock silently ignores ${ignoredParams.join(' and ')} on the by-id ` +
    `endpoint "${endpoint}" — the full entity is returned and an $expand ` +
    'resolves to null. Use the collection form instead, e.g. ' +
    'People?$filter=Id eq 123&$select=Email';

  console.warn(message);

  if (process.env.NODE_ENV !== 'production') {
    throw new Error(message);
  }
};

const applyDateRangeFilter = <T>(data: T, now: Date): T | [] => {
  if (Array.isArray(data)) {
    const filteredData = data.filter((item) =>
      isItemInDateRange(item as ItemWithDateRange, now),
    );

    return filteredData.length === 1 ? filteredData[0] : (filteredData as T);
  }

  if (
    data &&
    typeof data === 'object' &&
    !isItemInDateRange(data as ItemWithDateRange, now)
  ) {
    return [];
  }

  return data;
};

export const fetchRockData = async ({
  endpoint,
  queryParams = {},
  customHeaders = {},
  cache = true,
  ttl,
  filterByDateRange = false,
  filterByStatusApproved = false,
}: FetchRockDataOptions) => {
  assertByIdEndpointHasNoIgnoredParams(endpoint, queryParams);

  const previewMode = isPreviewMode();
  // Local/dev: always bypass Redis so CMS edits (e.g. new child items) show up
  // without waiting on TTL or manual cache invalidation.
  const skipCache = previewMode || process.env.NODE_ENV === 'development';
  // Preview mode only bypasses the Status filter — date-range filtering still
  // applies, so a not-yet-scheduled or already-expired item stays hidden.
  const effectiveFilterByDateRange = filterByDateRange;
  const effectiveFilterByStatusApproved =
    filterByStatusApproved && !previewMode;

  const mergedQueryParams = { ...queryParams };
  const shouldFilterDateRangeInMemory =
    effectiveFilterByDateRange && isSingleItemAttributeValueFetch(endpoint);

  if (effectiveFilterByDateRange || effectiveFilterByStatusApproved) {
    mergedQueryParams.$filter = buildMergedFilter(
      queryParams.$filter,
      shouldFilterDateRangeInMemory ? false : effectiveFilterByDateRange,
      effectiveFilterByStatusApproved,
    );
  }

  // Some loaders embed Status eq 'Approved' directly in their $filter string
  // instead of using filterByStatusApproved — strip it here too.
  if (previewMode) {
    mergedQueryParams.$filter = stripApprovedStatusFilter(
      mergedQueryParams.$filter,
    );
  }

  const cacheKey = buildCacheKey(
    endpoint,
    mergedQueryParams as Record<string, string>,
  );
  // Preview never reads or writes the shared Redis cache — this deployment's
  // results (unapproved content) must never be served to or poison prod's cache.
  // Local development also skips cache so Rock CMS changes are immediately visible.
  const effectiveTtl: number = skipCache
    ? TTL.NONE
    : ttl !== undefined
      ? ttl
      : cache === false
        ? TTL.NONE
        : TTL.DEFAULT;

  // Try to use Redis cache if available and TTL > 0
  if (redis && effectiveTtl > 0) {
    try {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        return shouldFilterDateRangeInMemory
          ? applyDateRangeFilter(parsedData, new Date())
          : parsedData;
      }
    } catch {
      console.error(
        '⚠️ Redis cache retrieval failed, falling back to API call',
      );
    }
  }

  try {
    // Filter merging and preview-mode stripping can leave a param set to
    // undefined. URLSearchParams would serialize that as the literal string
    // "undefined" (e.g. `$filter=undefined`), which Rock rejects with a 400, so
    // drop empty params here — matching how buildCacheKey already ignores them.
    const definedQueryParams = Object.fromEntries(
      Object.entries(mergedQueryParams).filter(
        ([, value]) => value !== undefined && value !== null,
      ),
    ) as Record<string, string>;

    const queryString = new URLSearchParams(definedQueryParams).toString();
    const url = `${getRockApiBaseUrl()}${endpoint}?${queryString}`;

    const res = await fetch(url, {
      headers: {
        ...defaultHeaders,
        ...customHeaders,
      },
    });

    if (!res.ok) {
      const errorDetails = await res.text();
      throw new Error(
        `⚠️ Error Fetching Rock Data status: ${res.status}, details: ${errorDetails}, path: ${url}`,
      );
    }

    const data = await res
      .json()
      .then((data) => normalize(data))
      .then((data: unknown) =>
        Array.isArray(data) && data?.length === 1 ? data[0] : data,
      );

    // Cache the response if Redis is available and TTL > 0
    if (redis && effectiveTtl > 0) {
      try {
        const itemIds = extractContentItemIds(data);
        if (itemIds.length === 0) {
          await redis.set(cacheKey, JSON.stringify(data), 'EX', effectiveTtl);
        } else {
          // Cache the entry and record it in each item's reverse index in one
          // round-trip. The index lets us later invalidate a single item by
          // deleting exactly the keys that contain it. EXPIRE caps the index so
          // it can't grow unbounded after the entries it references age out.
          const pipeline = redis.pipeline();
          pipeline.set(cacheKey, JSON.stringify(data), 'EX', effectiveTtl);
          for (const id of itemIds) {
            const tag = itemTagKey(id);
            pipeline.sadd(tag, cacheKey);
            pipeline.expire(tag, TTL.LONG);
          }
          await pipeline.exec();
        }
      } catch {
        console.error('⚠️ Redis cache storage failed');
      }
    }

    return shouldFilterDateRangeInMemory
      ? applyDateRangeFilter(data, new Date())
      : data;
  } catch (error) {
    console.error('Error fetching rock data:', error);
    throw error;
  }
};

/**
 *
 * @param endpoint - a string representing the Rock endpoint to delete
 * @returns the status code of the response
 */
export const deleteRockData = async (endpoint: string) => {
  try {
    const response = await fetch(`${getRockApiBaseUrl()}/${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Authorization-Token': `${process.env.ROCK_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorDetails = await response.text();
      console.error('Error details:', errorDetails);
      throw new Error(
        `Failed to delete resource: ${response.status}, details: ${errorDetails}`,
      );
    }

    return response.status;
  } catch (error) {
    console.error('Error in deleteRockData:', error);
    throw error;
  }
};

/**
 * Posts data to a Rock endpoint
 * @param params.endpoint - Rock endpoint to post to
 * @param params.body - the body of the post request
 * @returns response body parsed as JSON when present
 */
export const postRockData = async ({
  endpoint,
  body,
  contentType = 'application/json',
}: RockDataRequest) => {
  const response = await fetch(`${getRockApiBaseUrl()}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      'Authorization-Token': `${process.env.ROCK_TOKEN}`,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

  if (!response.ok) {
    const errorDetails = await response.text();
    throw new Error(
      `Failed to post data: ${response.status}, details: ${errorDetails}`,
    );
  }

  const responseBody = await response.text();
  if (!responseBody) {
    return {};
  }

  return JSON.parse(responseBody);
};

/**
 * Updates data at a Rock endpoint using PUT
 * @param params.endpoint - Rock endpoint to put to
 * @param params.body - the body of the put request
 * @returns response body as JSON
 */
export const putRockData = async ({ endpoint, body }: RockDataRequest) => {
  const response = await fetch(`${getRockApiBaseUrl()}${endpoint}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization-Token': `${process.env.ROCK_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorDetails = await response.text();
    throw new Error(
      `Failed to put data: ${response.status}, details: ${errorDetails}`,
    );
  }

  const responseBody = await response.text();
  return responseBody ? JSON.parse(responseBody) : {};
};

/**
 * Updates data at a Rock endpoint using PATCH
 * @param params.endpoint - Rock endpoint to patch
 * @param params.body - the body of the patch request
 * @returns response status code
 */
export const patchRockData = async ({ endpoint, body }: RockDataRequest) => {
  const response = await fetch(`${getRockApiBaseUrl()}/${endpoint}`, {
    method: 'PATCH',
    headers: {
      ...defaultHeaders,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorDetails = await response.text();
    throw new Error(
      `Failed to patch data: ${response.status}, details: ${errorDetails}`,
    );
  }

  return response.status;
};

/**
 * Deletes a specific cache key from Redis
 * @param endpoint - The Rock endpoint that was cached
 * @param queryParams - The query parameters that were used in the original request
 * @returns boolean indicating whether the deletion was successful
 */
export const deleteCacheKey = async ({
  endpoint,
  queryParams = {},
}: {
  endpoint: string;
  queryParams?: RockQueryParams;
}): Promise<boolean> => {
  if (!redis) {
    console.error('⚠️ Redis not available for cache deletion');
    return false;
  }

  try {
    const cacheKey = buildCacheKey(
      endpoint,
      queryParams as Record<string, string>,
    );
    await redis.del(cacheKey);
    return true;
  } catch (error) {
    console.error('Error deleting cache key:', error);
    return false;
  }
};
