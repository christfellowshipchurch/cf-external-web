import camelCase from 'lodash/camelCase';
import pick from 'lodash/pick';
import { ensureArray, normalize } from '~/lib/utils';
import type { TTLValue } from './cache-utils';
import { fetchRockData } from './fetch-rock-data';
import {
  buildV2SearchBody,
  escapeDynamicLinq,
  fetchRockV2,
  getSearchItems,
  isRockGuid,
  keepMatchingRows,
  projectedToV1Shape,
  requestRockV2,
  searchPath,
  selectAttributeValues,
  toV1Shape,
} from './fetch-rock-v2';
import { escapeOData } from './rock-utils';

/**
 * Campus reads for the whole site. Each runs on Rock v2 with the v1 call it
 * replaced as the fallback (see docs/architecture/rock-v2-setup.md).
 */

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

/** The field and value a single-campus lookup must match, checked on v2 rows. */
const lookupKey = (filter: CampusFilter): [CampusField, string] | null => {
  if ('guid' in filter) return ['Guid', filter.guid];
  if ('name' in filter) return ['Name', filter.name];
  if ('url' in filter) return ['Url', filter.url];
  return null;
};

/** Search rows for this filter, minus any row Rock returned by ignoring `where`. */
const searchRows = (data: unknown, filter: CampusFilter) => {
  const rows = getSearchItems(data);
  const key = lookupKey(filter);
  return key ? keepMatchingRows(rows, key[0], key[1]) : rows;
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

  // The looked-up field is always selected, so the v2 rows can be checked.
  // Rock sorts after the select, so a sorted read must select Order too.
  const key = lookupKey(filter);
  const v2Fields: string[] =
    key && !fields.includes(key[0]) ? [...fields, key[0]] : [...fields];
  if (isOrdered(filter) && !v2Fields.includes('Order')) v2Fields.push('Order');

  return fetchRockV2<T[]>({
    path: searchPath('campuses'),
    method: 'POST',
    body: buildV2SearchBody({
      where: toV2Where(filter),
      select: `new (${v2Fields.join(', ')})`,
      ...(isOrdered(filter) && { sort: 'Order' }),
    }),
    ttl,
    // Return only the fields asked for, as v1's $select does.
    map: (data) =>
      searchRows(data, filter).map(
        (item) => pick(toV1Shape(item), fields.map(camelCase)) as T,
      ),
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
 * Attribute values come in the search itself. Location.Latitude is computed,
 * not a column, so the Location comes from a follow-up GET by Guid.
 */
const CAMPUS_DETAILS_SELECT = `new (Id, Guid, Name, Url, PhoneNumber, ServiceTimes, LeaderPersonAliasId, Order, Location.Guid as LocationGuid, ${selectAttributeValues('Campus')})`;

/** v2 read of campuses with attribute values and Location (1 + 1 call each). */
export const campusDetailsV2Read = (filter: CampusFilter, ttl?: TTLValue) => ({
  path: searchPath('campuses'),
  method: 'POST' as const,
  body: buildV2SearchBody({
    where: toV2Where(filter),
    select: CAMPUS_DETAILS_SELECT,
    ...(isOrdered(filter) && { sort: 'Order' }),
  }),
  ttl,
  map: async (data: unknown): Promise<RockCampus[]> => {
    const items = searchRows(data, filter);
    // A lookup that should hit one campus throws on a miss, so a bad search
    // falls back to v1 instead of 404ing a campus that exists.
    if (!items.length && !('active' in filter)) {
      throw new Error(`No campus matched ${toV2Where(filter)} in Rock v2`);
    }

    return Promise.all(
      items.map(async (found) => {
        const { locationGuid, ...campus } = projectedToV1Shape<
          RockCampus & { locationGuid?: string }
        >(found);
        const location = locationGuid
          ? await requestRockV2({ path: `locations/${locationGuid}`, ttl })
          : null;

        return {
          ...campus,
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
