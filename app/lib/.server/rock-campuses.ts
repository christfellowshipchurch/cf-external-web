import { ensureArray, normalize } from '~/lib/utils';
import type { TTLValue } from './cache-utils';
import { fetchRockData } from './fetch-rock-data';
import {
  buildV2SearchBody,
  escapeDynamicLinq,
  fetchRockV2,
  getSearchItems,
  isRockGuid,
  requestRockV2,
  toV1Shape,
  type RockV2AttributeValue,
} from './fetch-rock-v2';
import { escapeOData } from './rock-utils';

/**
 * Campus reads for the whole site. Each runs on Rock v2 with the v1 call it
 * replaced as the fallback (see docs/architecture/rock-v2-setup.md).
 */

/** Entity Search: Campus, refinement allowed, max 50, no fixed Where. */
export const CAMPUSES_SEARCH_KEY = 'cf-web-campuses';

export type CampusFilter =
  | { active: true }
  | { guid: string }
  | { name: string }
  | { url: string };

/** A campus as form dropdowns read it (`Name, Guid`, sometimes `Url`). */
export type CampusOption = { guid: string; name: string; url?: string };

/** Fields a list read can select. Add one here before selecting it. */
export type CampusField = 'Id' | 'Guid' | 'Name' | 'Url';

type RockAttribute = {
  value?: string | null;
  valueFormatted?: string | null;
};

export type RockCampus = {
  id: number;
  guid: string;
  leaderPersonAliasId?: number | null;
  name: string;
  url: string;
  phoneNumber?: string | null;
  serviceTimes?: string | null;
  location?: {
    street1?: string | null;
    street2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  attributeValues?: Record<string, RockAttribute | undefined>;
};

const toV1Filter = (filter: CampusFilter): string => {
  if ('active' in filter) return 'IsActive eq true';
  if ('guid' in filter) return `Guid eq guid'${escapeOData(filter.guid)}'`;
  if ('name' in filter) return `Name eq '${escapeOData(filter.name)}'`;
  return `Url eq '${escapeOData(filter.url)}'`;
};

const toV2Where = (filter: CampusFilter): string => {
  if ('active' in filter) return 'IsActive == true';
  if ('guid' in filter) return `Guid == "${escapeDynamicLinq(filter.guid)}"`;
  if ('name' in filter) return `Name == "${escapeDynamicLinq(filter.name)}"`;
  return `Url == "${escapeDynamicLinq(filter.url)}"`;
};

/** A malformed Guid can't match a campus; skip Rock rather than send it. */
const isUnmatchable = (filter: CampusFilter): boolean =>
  'guid' in filter && !isRockGuid(filter.guid);

/** Every active-campus list on the site is shown in Rock's campus Order. */
const isOrdered = (filter: CampusFilter): boolean => 'active' in filter;

/**
 * Campuses with only the given fields, e.g. a form's campus dropdown or an
 * action's Guid → Id lookup. Always an array.
 */
export const fetchCampuses = async <T = Record<string, unknown>>(
  filter: CampusFilter,
  fields: CampusField[],
  ttl?: TTLValue,
): Promise<T[]> => {
  if (isUnmatchable(filter)) return [];

  return fetchRockV2<T[]>({
    path: `campuses/search/${CAMPUSES_SEARCH_KEY}`,
    method: 'POST',
    body: buildV2SearchBody({
      where: toV2Where(filter),
      select: `new (${fields.join(', ')})`,
      ...(isOrdered(filter) && { sort: 'Order' }),
    }),
    ttl,
    map: (data) => getSearchItems(data).map((item) => toV1Shape(item) as T),
    fallback: async () =>
      ensureArray(
        await fetchRockData({
          endpoint: 'Campuses',
          queryParams: {
            $filter: toV1Filter(filter),
            $select: fields.join(', '),
            ...(isOrdered(filter) && { $orderby: 'Order' }),
          },
          ttl,
        }),
      ).filter(Boolean) as T[],
  });
};

/**
 * IdKey and Location.Latitude are computed, not columns, so the search selects
 * Guids and the follow-up GETs return attribute values and the full Location.
 */
const CAMPUS_DETAILS_SELECT =
  'new (Id, Guid, Name, Url, PhoneNumber, ServiceTimes, LeaderPersonAliasId, Location.Guid as LocationGuid)';

/** v2 read of campuses with attribute values and Location (1 + 2 calls each). */
export const campusDetailsV2Read = (filter: CampusFilter, ttl?: TTLValue) => ({
  path: `campuses/search/${CAMPUSES_SEARCH_KEY}`,
  method: 'POST' as const,
  body: buildV2SearchBody({
    where: toV2Where(filter),
    select: CAMPUS_DETAILS_SELECT,
    ...(isOrdered(filter) && { sort: 'Order' }),
  }),
  ttl,
  map: async (data: unknown): Promise<RockCampus[]> => {
    const items = getSearchItems(data);
    // A lookup that should hit one campus throws on a miss, so a bad search
    // falls back to v1 instead of 404ing a campus that exists.
    if (!items.length && !('active' in filter)) {
      throw new Error(`No campus matched ${toV2Where(filter)} in Rock v2`);
    }

    return Promise.all(
      items.map(async (found) => {
        const { guid, locationGuid } = normalize(found) as {
          guid: string;
          locationGuid?: string;
        };
        const [attributeValues, location] = await Promise.all([
          requestRockV2({ path: `campuses/${guid}/attributevalues`, ttl }),
          locationGuid
            ? requestRockV2({ path: `locations/${locationGuid}`, ttl })
            : Promise.resolve(null),
        ]);

        return {
          ...toV1Shape(
            found,
            attributeValues as Record<string, RockV2AttributeValue>,
          ),
          location: location ? normalize(location) : null,
        } as RockCampus;
      }),
    );
  },
});

/**
 * Campuses with attribute values and Location, as v1's
 * `$expand=Location&loadAttributes=simple` returns them. Always an array.
 */
export const fetchCampusesWithDetails = async (
  filter: CampusFilter,
  ttl?: TTLValue,
): Promise<RockCampus[]> => {
  if (isUnmatchable(filter)) return [];

  return fetchRockV2({
    ...campusDetailsV2Read(filter, ttl),
    fallback: async () =>
      ensureArray(
        await fetchRockData({
          endpoint: 'Campuses',
          queryParams: {
            $filter: toV1Filter(filter),
            $expand: 'Location',
            loadAttributes: 'simple',
            ...(isOrdered(filter) && { $orderby: 'Order' }),
          },
          ttl,
        }),
      ).filter(Boolean) as RockCampus[],
  });
};

/** One campus with attribute values and Location, or null. */
export const fetchCampusWithDetails = async (
  filter: CampusFilter,
  ttl?: TTLValue,
): Promise<RockCampus | null> =>
  (await fetchCampusesWithDetails(filter, ttl))[0] ?? null;
