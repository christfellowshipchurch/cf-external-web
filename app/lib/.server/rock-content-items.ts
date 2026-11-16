import { extractContentItemIds } from './cache-utils';
import {
  fetchRockData,
  getRequestedContentItemId,
  isPreviewMode,
  type FetchRockDataOptions,
} from './fetch-rock-data';
import {
  buildV2SearchBody,
  fetchRockV2,
  getSearchItems,
  projectedToV1Shape,
  searchPath,
  selectAttributeValues,
} from './fetch-rock-v2';
import {
  fetchViaV2Search,
  stripDateOffsets,
  withAttributeKeys,
  type V2SearchEntity,
} from './rock-v2-search';

/** Rock's ContentChannelItemStatus enum, by v1's numeric value. */
const STATUS_NAMES: Record<string, string> = {
  '1': 'PendingApproval',
  '2': 'Approved',
  '3': 'Denied',
};
const STATUS_NUMBERS = Object.fromEntries(
  Object.entries(STATUS_NAMES).map(([number, name]) => [name, Number(number)]),
);
const APPROVED = 2;

const CONTENT_ITEM_FIELDS = [
  'Id',
  'Guid',
  'ContentChannelId',
  'Title',
  'Content',
  'Status',
  'Priority',
  'Order',
  'StartDateTime',
  'ExpireDateTime',
  'CreatedDateTime',
  'ModifiedDateTime',
];

/** v1 sends Status as a number; v2 may send the enum name. */
const withNumericStatus = (row: Record<string, unknown>) => ({
  ...row,
  status: STATUS_NUMBERS[String(row.status)] ?? row.status,
});

export const CONTENT_ITEMS_V2: V2SearchEntity = {
  v1Endpoint: 'ContentChannelItems',
  model: 'contentchannelitems',
  entityName: 'ContentChannelItem',
  fields: CONTENT_ITEM_FIELDS,
  enums: { Status: STATUS_NAMES },
  mapRow: withNumericStatus,
  // Same reverse index as v1, so the admin single-item clear finds v2 keys too.
  index: (rows, filter) => {
    const requestedId = getRequestedContentItemId(
      'ContentChannelItems',
      filter,
    );
    return {
      itemIds: [
        ...extractContentItemIds(rows),
        ...(requestedId ? [requestedId] : []),
      ],
    };
  },
};

/**
 * A `ContentChannelItems` or `ContentChannelItems/GetByAttributeValue` read:
 * `fetchRockData`'s options and result, run on v2 when it's on.
 */
export const fetchContentItems = (options: FetchRockDataOptions) =>
  fetchViaV2Search(options, CONTENT_ITEMS_V2);

type ContentItem = Record<string, unknown> & { id: string; status?: number };

const toArray = <T>(value: T | T[] | null | undefined): T[] =>
  !value ? [] : Array.isArray(value) ? value : [value];

const fetchChildContentItemsV1 = async (
  parentId: string,
): Promise<ContentItem[]> => {
  const childReferences = toArray<{ childContentChannelItemId: string }>(
    await fetchRockData({
      endpoint: 'ContentChannelItemAssociations',
      queryParams: {
        loadAttributes: 'simple',
        $filter: `ContentChannelItemId eq ${parentId}`,
        $orderby: 'Order',
      },
    }),
  );

  const children = await Promise.all(
    childReferences.map(({ childContentChannelItemId }) =>
      fetchRockData({
        endpoint: 'ContentChannelItems',
        queryParams: {
          $filter: `Id eq ${childContentChannelItemId}`,
          loadAttributes: 'simple',
        },
        filterByStatusApproved: true,
      }),
    ),
  );

  return children.flatMap((child) => toArray<ContentItem>(child));
};

/**
 * A parent item's children in association order, Approved only (any status in
 * preview). v2 reads them in one search through `ParentItems` instead of the
 * association list plus one read per child.
 */
export const fetchChildContentItems = (
  parentId: string,
): Promise<ContentItem[]> => {
  const fallback = () => fetchChildContentItemsV1(parentId);
  if (!/^\d+$/.test(parentId)) return fallback();

  const association = `ParentItems.Where(a => a.ContentChannelItemId == ${parentId})`;
  return fetchRockV2<ContentItem[]>({
    path: searchPath(CONTENT_ITEMS_V2.model),
    method: 'POST',
    // Every status is read, so each child is in the reverse index even while Pending.
    body: buildV2SearchBody({
      where: `ParentItems.Any(a => a.ContentChannelItemId == ${parentId})`,
      select: `new (${CONTENT_ITEM_FIELDS.join(', ')}, ${association}.Min(a => a.Order) as AssociationOrder, ${selectAttributeValues('ContentChannelItem')})`,
    }),
    index: (data) => {
      const childIds = extractContentItemIds(
        getSearchItems(data).map((row) => projectedToV1Shape(row)),
      );
      return {
        itemIds: [parentId, ...childIds],
        relationships: childIds.map((childId) => ({ parentId, childId })),
      };
    },
    map: (data) =>
      getSearchItems(data)
        .map((row) =>
          withAttributeKeys(
            withNumericStatus(stripDateOffsets(projectedToV1Shape(row))),
          ),
        )
        .sort((a, b) => Number(a.associationOrder) - Number(b.associationOrder))
        .map(({ associationOrder: _order, ...item }) => item as ContentItem)
        .filter((item) => isPreviewMode() || item.status === APPROVED),
    fallback,
  });
};
