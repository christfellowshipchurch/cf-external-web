import { extractContentItemIds } from './cache-utils';
import {
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
  numericEnum,
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
const STATUS = numericEnum('Status', STATUS_NAMES);
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
export const CONTENT_ITEMS_V2: V2SearchEntity = {
  v1Endpoint: 'ContentChannelItems',
  model: 'contentchannelitems',
  entityName: 'ContentChannelItem',
  fields: CONTENT_ITEM_FIELDS,
  ...STATUS,
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
 * `fetchRockData`'s options and result, run on v2.
 */
export const fetchContentItems = (options: FetchRockDataOptions) =>
  fetchViaV2Search(options, CONTENT_ITEMS_V2);

type ContentItem = Record<string, unknown> & { id: string; status?: number };

/**
 * A parent item's children in association order, Approved only (any status in
 * preview), in one search through `ParentItems`.
 */
export const fetchChildContentItems = async (
  parentId: string,
): Promise<ContentItem[]> => {
  // The id goes into the `where` unquoted.
  if (!/^\d+$/.test(parentId)) return [];

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
            STATUS.mapRow(stripDateOffsets(projectedToV1Shape(row))),
          ),
        )
        .sort((a, b) => Number(a.associationOrder) - Number(b.associationOrder))
        .map(({ associationOrder: _order, ...item }) => item as ContentItem)
        .filter((item) => isPreviewMode() || item.status === APPROVED),
  });
};
