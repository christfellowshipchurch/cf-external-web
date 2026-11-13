import mapValues from 'lodash/mapValues';
import { normalize } from '~/lib/utils';
import { toRockDateTimeLiteral } from './rock-datetime';
import {
  fetchRockData,
  isItemInDateRange,
  resolveRockQuery,
  type FetchRockDataOptions,
  type ItemWithDateRange,
} from './fetch-rock-data';
import {
  buildV2SearchBody,
  escapeDynamicLinq,
  fetchRockV2,
  getSearchItems,
  isRockV2Enabled,
  keepMatchingRows,
  projectedToV1Shape,
  searchPath,
  selectAttributeValues,
  type ItemIndex,
} from './fetch-rock-v2';

/**
 * Runs an existing v1 `fetchRockData` call as a v2 saved-entity search, with
 * the unchanged v1 call as its fallback. Callers keep their v1 options; only
 * the function name changes.
 */

export interface V2SearchEntity {
  /** v1 endpoint, e.g. `ContentChannelItems` */
  v1Endpoint: string;
  /** v2 route name, e.g. `connectionopportunities` */
  model: string;
  /** Saved search key, when it isn't the route name */
  searchKey?: string;
  /** C# entity name, for `{Entity}AttributeValues` */
  entityName: string;
  /** Columns to select: what v1 returned that the site reads */
  fields: string[];
  /** v1 `$expand` → extra select fields, e.g. `Photo` → `Photo.Guid as PhotoGuid` */
  expands?: Record<string, string>;
  /** Enum columns, mapping v1's numeric filter values to enum names */
  enums?: Record<string, Record<string, string>>;
  /** Fixes a row up to v1's shape after the generic mapping */
  mapRow?: (row: Record<string, unknown>) => Record<string, unknown>;
  /** Content items in the response, for the per-item cache index */
  index?: (rows: Record<string, unknown>[], filter?: string) => ItemIndex;
}

const OPERATORS: Record<string, string> = {
  eq: '==',
  ne: '!=',
  lt: '<',
  le: '<=',
  gt: '>',
  ge: '>=',
  and: '&&',
  or: '||',
  not: '!',
};

const TOKEN_RE =
  /\s*(?:(\()|(\))|guid'([0-9a-f-]{36})'|datetime'([^']*)'|'((?:[^']|'')*)'|(-?\d+(?:\.\d+)?)|([A-Za-z][A-Za-z0-9.]*))/iy;

const DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/;

/**
 * Translates the OData `$filter` subset the site uses into a Dynamic LINQ
 * `where`. Throws on anything else, which sends the read to v1.
 */
export const odataFilterToLinq = (
  filter: string,
  enums: V2SearchEntity['enums'] = {},
): string => {
  const out: string[] = [];
  let lastProperty = '';
  TOKEN_RE.lastIndex = 0;

  while (TOKEN_RE.lastIndex < filter.trimEnd().length) {
    const match = TOKEN_RE.exec(filter);
    if (!match) {
      // Positions only: a $filter can hold user input and must not be logged.
      throw new Error(`Unsupported $filter at ${TOKEN_RE.lastIndex}`);
    }
    const [, open, close, guid, datetime, text, num, word] = match;

    if (open || close) out.push(open ?? close);
    else if (guid !== undefined) out.push(`"${guid}"`);
    else if (datetime !== undefined) {
      const parts = DATETIME_RE.exec(datetime);
      if (!parts) throw new Error('Unsupported datetime literal');
      // Rock reads it as organization wall-clock time, like v1's literal.
      out.push(`DateTime(${parts.slice(1).map(Number).join(', ')})`);
    } else if (text !== undefined) {
      const value = text.replace(/''/g, "'");
      out.push(`"${escapeDynamicLinq(enums[lastProperty]?.[value] ?? value)}"`);
    } else if (num !== undefined) {
      out.push(
        enums[lastProperty]?.[num] ? `"${enums[lastProperty][num]}"` : num,
      );
    } else if (OPERATORS[word.toLowerCase()]) {
      out.push(OPERATORS[word.toLowerCase()]);
    } else if (['null', 'true', 'false'].includes(word.toLowerCase())) {
      out.push(word.toLowerCase());
    } else if (/^[A-Z][A-Za-z0-9]*$/.test(word)) {
      lastProperty = word;
      out.push(word);
    } else {
      throw new Error(`Unsupported $filter word at ${match.index}`);
    }
  }

  return out.join(' ').replace(/\( /g, '(').replace(/ \)/g, ')');
};

const ORDER_BY_RE =
  /^[A-Z]\w*(?: (?:asc|desc))?(?:, ?[A-Z]\w*(?: (?:asc|desc))?)*$/;

/** Attribute lookups by these keys find one page, so a miss goes to v1. */
const PAGE_LOOKUP_KEYS = ['url', 'pathname'];

const HAS_OFFSET = /(?:Z|[+-]\d{2}:\d{2})$/;

/**
 * v2 dates carry an offset; v1 sends Rock's wall-clock time without one, which
 * the site's date code expects. Converting (not just cutting the offset) holds
 * whatever offset Rock sends.
 */
export const stripDateOffsets = (
  row: Record<string, unknown>,
): Record<string, unknown> =>
  mapValues(row, (value, key) =>
    key.endsWith('DateTime') &&
    typeof value === 'string' &&
    HAS_OFFSET.test(value)
      ? toRockDateTimeLiteral(new Date(value))
      : value,
  );

/** The Id or Guid a v1 `$filter` asks for, when it asks for exactly one. */
const requestedRecord = (
  filter: string | undefined,
): { field: string; value: string } | undefined => {
  if (!filter || / or /i.test(filter)) return undefined;
  const id = /(?:^|[ (])Id eq (\d+)(?=$|[ )])/.exec(filter)?.[1];
  if (id) return { field: 'Id', value: id };
  const guid = /(?:^|[ (])Guid eq guid'([0-9a-f-]{36})'/i.exec(filter)?.[1];
  return guid ? { field: 'Guid', value: guid } : undefined;
};

/** v2 has no attribute definitions; readers like getImages only use the keys. */
export const withAttributeKeys = (
  row: Record<string, unknown>,
): Record<string, unknown> => ({
  ...row,
  attributes: mapValues((row.attributeValues ?? {}) as object, (_, key) => ({
    key,
  })),
});

/** fetchRockData's shape: one row unwrapped, otherwise an array. */
const asV1Result = (rows: unknown[]) => (rows.length === 1 ? rows[0] : rows);

export const buildV2Search = (
  options: FetchRockDataOptions,
  entity: V2SearchEntity,
) => {
  const { endpoint, customHeaders, ttl, cache } = options;
  const { queryParams: params, filterDateRangeInMemory } =
    resolveRockQuery(options);
  const route = endpoint.replace(/^\/+|\/+$/g, '');
  const isAttributeLookup =
    route === `${entity.v1Endpoint}/GetByAttributeValue`;

  if (route !== entity.v1Endpoint && !isAttributeLookup) {
    throw new Error(`${endpoint} isn't a ${entity.v1Endpoint} read`);
  }
  // Paging names are unconfirmed and custom headers mean a person's own access.
  if (params.$skip || params.$select || params.attributeKeys || customHeaders) {
    throw new Error(`${endpoint} uses a query option v2 can't match yet`);
  }
  if (params.$orderby && !ORDER_BY_RE.test(params.$orderby)) {
    throw new Error(`Unsupported $orderby "${params.$orderby}"`);
  }
  const expand = params.$expand ? entity.expands?.[params.$expand] : '';
  if (expand === undefined)
    throw new Error(`Unsupported $expand "${params.$expand}"`);

  const attributeValues = `${entity.entityName}AttributeValues`;
  const where = [
    ...(params.$filter
      ? [`(${odataFilterToLinq(params.$filter, entity.enums)})`]
      : []),
  ];
  if (isAttributeLookup) {
    if (!params.attributeKey || params.value === undefined) {
      throw new Error('GetByAttributeValue needs attributeKey and value');
    }
    where.push(
      `${attributeValues}.Any(av => av.Key == "${escapeDynamicLinq(params.attributeKey)}" && av.Value == "${escapeDynamicLinq(params.value)}")`,
    );
  } else if (params.attributeKey || params.value) {
    throw new Error(`${endpoint} has GetByAttributeValue options`);
  }

  const limit = params.$top ? Number(params.$top) : undefined;
  const withAttributes = Boolean(params.loadAttributes);
  const select = [
    ...entity.fields,
    ...(expand ? [expand] : []),
    // Read back so a search that ignored its `where` can't pass as a match.
    ...(isAttributeLookup
      ? [
          `${attributeValues}.Where(av => av.Key == "${escapeDynamicLinq(params.attributeKey!)}").Select(av => av.Value).FirstOrDefault() as LookupValue`,
        ]
      : []),
    ...(withAttributes ? [selectAttributeValues(entity.entityName)] : []),
  ];
  const requested = requestedRecord(params.$filter);
  const isPageLookup =
    isAttributeLookup &&
    PAGE_LOOKUP_KEYS.includes(params.attributeKey!.toLowerCase());

  return {
    path: searchPath(entity.model, entity.searchKey),
    method: 'POST' as const,
    body: buildV2SearchBody({
      ...(where.length > 0 && { where: where.join(' && ') }),
      select: `new (${select.join(', ')})`,
      ...(params.$orderby && { sort: params.$orderby }),
      ...(limit !== undefined && { limit }),
    }),
    ttl: ttl ?? (cache === false ? 0 : undefined),
    index: entity.index
      ? (data: unknown) =>
          entity.index!(
            getSearchItems(data).map(
              (row) => normalize(row) as Record<string, unknown>,
            ),
            params.$filter,
          )
      : undefined,
    map: (data: unknown) => {
      const now = new Date();
      let found = getSearchItems(data);
      // Throwing sends the read to v1 rather than show another record.
      if (isAttributeLookup) {
        found = keepMatchingRows(found, 'LookupValue', params.value!);
      }
      if (requested) {
        found = keepMatchingRows(found, requested.field, requested.value);
      }
      const rows = found
        // Rock may not honor the paging field name yet; v1's $top still holds.
        .slice(0, limit)
        .map(({ LookupValue: _a, lookupValue: _b, ...row }) => {
          const shaped = stripDateOffsets(projectedToV1Shape(row));
          return entity.mapRow ? entity.mapRow(shaped) : shaped;
        })
        .map((row) => (withAttributes ? withAttributeKeys(row) : row))
        .filter(
          (row) =>
            !filterDateRangeInMemory ||
            isItemInDateRange(row as ItemWithDateRange, now),
        );

      // A page that exists must not 404 because a search misbehaved.
      if (isPageLookup && rows.length === 0) {
        throw new Error(
          `No ${entity.model} matched ${params.attributeKey} lookup`,
        );
      }
      return asV1Result(rows);
    },
  };
};

/**
 * `fetchRockData(options)`, read through `entity`'s v2 search when v2 is on.
 * Options v2 can't express yet go straight to v1.
 */
export const fetchViaV2Search = async (
  options: FetchRockDataOptions,
  entity: V2SearchEntity,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> => {
  const fallback = () => fetchRockData(options);
  if (!isRockV2Enabled()) return fallback();

  let search: ReturnType<typeof buildV2Search>;
  try {
    search = buildV2Search(options, entity);
  } catch (error) {
    console.warn(
      `⚠️ Rock v2 can't run this ${entity.model} read, using v1:`,
      error,
    );
    return fallback();
  }

  return fetchRockV2({ ...search, fallback });
};
