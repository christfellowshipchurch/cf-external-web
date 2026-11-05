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
 * Defined Value reads for the whole site. Each runs on Rock v2 with the v1
 * call it replaced as the fallback (see docs/architecture/rock-v2-setup.md).
 */

/** Entity Search: Defined Value, refinement allowed, max 100, no fixed Where. */
export const DEFINED_VALUES_SEARCH_KEY = 'cf-web-defined-values';

/** Fields a read can select. Add one here before selecting it. */
export type DefinedValueField =
  | 'Id'
  | 'Guid'
  | 'Value'
  | 'Description'
  | 'Order'
  | 'IsActive'
  | 'DefinedTypeId';

/** What a search selects when the caller wants whole records. */
const ALL_FIELDS: DefinedValueField[] = [
  'Id',
  'Guid',
  'Value',
  'Description',
  'Order',
  'IsActive',
  'DefinedTypeId',
];

export type DefinedValueQuery = {
  /** One value by Guid. Combine with `definedTypeId` to also check its type. */
  guid?: string;
  /** Every value of a Defined Type. */
  definedTypeId?: number;
  activeOnly?: boolean;
  orderBy?: 'Order' | 'Order desc';
  limit?: number;
  /** Omit for whole records. v1 only returns these; v2 GETs return all fields. */
  fields?: DefinedValueField[];
  /** v1's `loadAttributes`; v2 reads `/attributevalues` (values only, no definitions). */
  attributes?: 'simple' | 'expanded';
  ttl?: TTLValue;
};

export type RockDefinedValue = {
  id?: number;
  guid?: string;
  value?: string;
  description?: string;
  order?: number;
  isActive?: boolean;
  definedTypeId?: number;
  attributeValues?: Record<
    string,
    { value?: string | null; valueFormatted?: string | null } | undefined
  >;
};

const toV1Filter = ({
  guid,
  definedTypeId,
  activeOnly,
}: DefinedValueQuery): string =>
  [
    definedTypeId !== undefined && `DefinedTypeId eq ${definedTypeId}`,
    activeOnly && 'IsActive eq true',
    guid && `Guid eq guid'${escapeOData(guid)}'`,
  ]
    .filter(Boolean)
    .join(' and ');

const toV2Where = ({
  guid,
  definedTypeId,
  activeOnly,
}: DefinedValueQuery): string =>
  [
    definedTypeId !== undefined && `DefinedTypeId == ${definedTypeId}`,
    activeOnly && 'IsActive == true',
    guid && `Guid == "${escapeDynamicLinq(guid)}"`,
  ]
    .filter(Boolean)
    .join(' && ');

const fetchV1 = async (query: DefinedValueQuery) =>
  ensureArray(
    await fetchRockData({
      endpoint: 'DefinedValues',
      queryParams: {
        $filter: toV1Filter(query),
        ...(query.orderBy && { $orderby: query.orderBy }),
        ...(query.limit !== undefined && { $top: String(query.limit) }),
        ...(query.fields && { $select: query.fields.join(', ') }),
        ...(query.attributes && { loadAttributes: query.attributes }),
      },
      ttl: query.ttl,
    }),
  ).filter(Boolean) as RockDefinedValue[];

const withAttributeValues = async (
  entity: Record<string, unknown>,
  query: DefinedValueQuery,
): Promise<RockDefinedValue> => {
  if (!query.attributes) return toV1Shape(entity) as RockDefinedValue;

  const { guid } = normalize(entity) as { guid: string };
  const attributeValues = await requestRockV2({
    path: `definedvalues/${guid}/attributevalues`,
    ttl: query.ttl,
  });
  return toV1Shape(
    entity,
    attributeValues as Record<string, RockV2AttributeValue>,
  ) as RockDefinedValue;
};

/**
 * A lone Guid lookup is a plain GET; anything that filters by type or
 * active state goes through the Entity Search.
 */
export const definedValuesV2Read = (query: DefinedValueQuery) => {
  const isGuidOnly =
    !!query.guid && query.definedTypeId === undefined && !query.activeOnly;

  if (isGuidOnly) {
    return {
      path: `definedvalues/${query.guid}`,
      ttl: query.ttl,
      map: async (data: unknown) => [
        await withAttributeValues(data as Record<string, unknown>, query),
      ],
    };
  }

  return {
    path: `definedvalues/search/${DEFINED_VALUES_SEARCH_KEY}`,
    method: 'POST' as const,
    body: buildV2SearchBody({
      where: toV2Where(query),
      select: `new (${(query.fields ?? ALL_FIELDS).join(', ')})`,
      ...(query.orderBy && { sort: query.orderBy }),
      ...(query.limit !== undefined && { limit: query.limit }),
    }),
    ttl: query.ttl,
    map: (data: unknown) =>
      Promise.all(
        getSearchItems(data).map((item) => withAttributeValues(item, query)),
      ),
  };
};

/** Defined Values matching the query. Always an array. */
export const fetchDefinedValues = async <T = RockDefinedValue>(
  query: DefinedValueQuery,
): Promise<T[]> => {
  // A malformed Guid can't match a value; skip Rock rather than send it.
  if (query.guid !== undefined && !isRockGuid(query.guid)) return [];

  return (await fetchRockV2({
    ...definedValuesV2Read(query),
    fallback: () => fetchV1(query),
  })) as T[];
};

/** One Defined Value by Guid, or null. */
export const fetchDefinedValueByGuid = async <T = RockDefinedValue>(
  guid: string,
  options: Omit<DefinedValueQuery, 'guid'> = {},
): Promise<T | null> =>
  (await fetchDefinedValues<T>({ ...options, guid: guid.trim() }))[0] ?? null;
