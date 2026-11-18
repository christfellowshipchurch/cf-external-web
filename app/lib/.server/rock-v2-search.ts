import camelCase from 'lodash/camelCase';
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
  requestRockV2,
  type RockV2AttributeValue,
  keepMatchingRows,
  projectedToV1Shape,
  searchPath,
  selectAttributeValues,
  toV1Shape,
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
  /**
   * v1 `$expand` → extra select fields. Name them `Nav__Field` (e.g.
   * `Photo.Guid as Photo__Guid`) to get v1's nested `photo.guid`.
   */
  expands?: Record<string, string>;
  /** Always ANDed into the `where`, for filters v1 applies on its own */
  baseWhere?: string;
  /**
   * Read attribute values with `GET {model}/{guid}/attributevalues` per row,
   * for entities whose search can't select them (Person answers 500).
   */
  attributeValuesFromRecord?: boolean;
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

const FIELD_RE = /^[A-Za-z]\w*$/;

/**
 * Turns `Photo__Guid: x` into v1's `Photo: { Guid: x }`. A navigation that
 * came back all null (no photo) becomes null, as v1 sends it.
 */
const nestExpandedFields = (
  row: Record<string, unknown>,
): Record<string, unknown> => {
  const nested: Record<string, Record<string, unknown>> = {};
  const flat: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const at = key.indexOf('__');
    if (at < 0) flat[key] = value;
    else (nested[key.slice(0, at)] ??= {})[key.slice(at + 2)] = value;
  }
  for (const [key, fields] of Object.entries(nested)) {
    const inner = nestExpandedFields(fields);
    flat[key] = Object.values(inner).every((value) => value == null)
      ? null
      : inner;
  }
  return flat;
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

const EQUALS_RE =
  /^\(?([A-Z]\w*) eq (?:guid'([0-9a-f-]{36})'|'((?:[^']|'')*)'|(-?\d+|true|false))\)?$/i;

/**
 * Every `Field eq value` a v1 `$filter` ANDs together (e.g. a name and an
 * email, or a group and a person). Each row is checked against them, so a
 * search that ignored its `where` can't pass off another record. Enum columns
 * are left out: v2 returns their names, not v1's numbers.
 */
export const requestedValues = (
  filter: string | undefined,
  enums: V2SearchEntity['enums'] = {},
): { field: string; value: string }[] => {
  if (!filter || /\bor\b|\bnot\b/i.test(filter)) return [];
  return filter.split(/\s+and\s+/i).flatMap((part) => {
    const match = EQUALS_RE.exec(part.trim());
    if (!match || enums[match[1]]) return [];
    const [, field, guid, text, literal] = match;
    return [{ field, value: guid ?? text?.replace(/''/g, "'") ?? literal }];
  });
};

/**
 * A v2 enum column that v1 sends as a number: `enums` for the filter and a
 * `mapRow` that turns the name v2 returns back into v1's number.
 */
export const numericEnum = (
  column: string,
  names: Record<string, string>,
): Required<Pick<V2SearchEntity, 'enums' | 'mapRow'>> => {
  const numbers = Object.fromEntries(
    Object.entries(names).map(([number, name]) => [name, Number(number)]),
  );
  const key = camelCase(column);
  return {
    enums: { [column]: names },
    mapRow: (row) =>
      key in row
        ? { ...row, [key]: numbers[String(row[key])] ?? row[key] }
        : row,
  };
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

/** A row's attribute values from `GET {model}/{guid}/attributevalues`, in v1's shape. */
const withRecordAttributes = async (
  row: Record<string, unknown>,
  model: string,
  keys: string[] | undefined,
  ttl: number | undefined,
): Promise<Record<string, unknown>> => {
  const values = (await requestRockV2({
    path: `${model}/${row.guid}/attributevalues`,
    ttl,
  })) as Record<string, RockV2AttributeValue>;
  const wanted = keys?.map((key) => key.toLowerCase());
  const kept = Object.fromEntries(
    Object.entries(values ?? {}).filter(
      ([key]) => !wanted || wanted.includes(key.toLowerCase()),
    ),
  );
  const { attributeValues } = toV1Shape({}, kept);
  return { ...row, attributeValues };
};

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
  if (params.$skip || customHeaders) {
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
    ...(entity.baseWhere ? [entity.baseWhere] : []),
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
  const attributeKeys = params.attributeKeys
    ?.split(',')
    .map((key) => key.trim());
  const fromRecord = withAttributes && entity.attributeValuesFromRecord;
  const requested = requestedValues(params.$filter, entity.enums);
  const searchTtl = ttl ?? (cache === false ? 0 : undefined);
  const fields = params.$select
    ? params.$select.split(',').map((field) => field.trim())
    : entity.fields;
  if (!fields.every((field) => FIELD_RE.test(field))) {
    throw new Error('Unsupported $select');
  }
  // The guards, per-record attribute reads and cache index need these even
  // when $select leaves them out.
  const needed = [
    ...requested.map(({ field }) => field),
    ...(fromRecord ? ['Guid'] : []),
    ...(entity.index ? ['Id'] : []),
  ];
  const select = [
    ...fields,
    ...[...new Set(needed)].filter((field) => !fields.includes(field)),
    ...(expand ? [expand] : []),
    // Read back so a search that ignored its `where` can't pass as a match.
    ...(isAttributeLookup
      ? [
          `${attributeValues}.Where(av => av.Key == "${escapeDynamicLinq(params.attributeKey!)}").Select(av => av.Value).FirstOrDefault() as LookupValue`,
        ]
      : []),
    ...(withAttributes && !fromRecord
      ? [selectAttributeValues(entity.entityName, attributeKeys)]
      : []),
  ];
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
    ttl: searchTtl,
    index: entity.index
      ? (data: unknown) =>
          entity.index!(
            getSearchItems(data).map(
              (row) => normalize(row) as Record<string, unknown>,
            ),
            params.$filter,
          )
      : undefined,
    map: async (data: unknown) => {
      const now = new Date();
      let found = getSearchItems(data);
      // Throwing sends the read to v1 rather than show another record.
      if (isAttributeLookup) {
        found = keepMatchingRows(found, 'LookupValue', params.value!);
      }
      for (const { field, value } of requested) {
        found = keepMatchingRows(found, field, value);
      }
      const rows = found
        // Rock may not honor the paging field name yet; v1's $top still holds.
        .slice(0, limit)
        .map(({ LookupValue: _a, lookupValue: _b, ...row }) => {
          const shaped = stripDateOffsets(
            projectedToV1Shape(nestExpandedFields(row)),
          );
          return entity.mapRow ? entity.mapRow(shaped) : shaped;
        })
        .filter(
          (row) =>
            !filterDateRangeInMemory ||
            isItemInDateRange(row as ItemWithDateRange, now),
        );

      const withValues = await Promise.all(
        rows.map(async (row) =>
          withAttributes
            ? withAttributeKeys(
                fromRecord
                  ? await withRecordAttributes(
                      row,
                      entity.model,
                      attributeKeys,
                      searchTtl,
                    )
                  : row,
              )
            : row,
        ),
      );

      // A page that exists must not 404 because a search misbehaved.
      if (isPageLookup && withValues.length === 0) {
        throw new Error(
          `No ${entity.model} matched ${params.attributeKey} lookup`,
        );
      }
      return asV1Result(withValues);
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
