# Rock content cache invalidation

## Gap fixed after CFDP-4086

CFDP-4086 indexed only top-level `ContentChannelItem` responses under
`cfitem:{id}`. Page-builder relationships come from
`ContentChannelItemAssociations`, which are not content items and were not
indexed. Saving a parent therefore removed its own item/list caches but left:

- its cached `ContentChannelItemAssociations` query;
- child section `ContentChannelItems` caches;
- nested collection-item caches below child sections.

## Key model

| Key                        | Value                 | Purpose                                     |
| -------------------------- | --------------------- | ------------------------------------------- |
| `rock:{endpoint}:{hash12}` | JSON string           | Cached Rock response                        |
| `cfitem:{itemId}`          | Set of `rock:*` keys  | Reverse index for responses containing item |
| `cfchildren:{parentId}`    | Set of child item ids | Parent-child relationship index             |

When an association response is cached, its `rock:*` key is added to parent
`cfitem` set and each child id is added to parent `cfchildren` set. All indexes
expire after `TTL.LONG`; response keys retain requested TTL.

## Invalidation behavior

`POST /api/admin/cache?id={contentChannelItemId}` authenticates with
`x-cache-secret`. `invalidateItem` walks known descendants through
`cfchildren`, collects each item's `cfitem` members, deletes unique response
keys, then deletes visited `cfitem` and `cfchildren` indexes. Cycles cannot loop
because visited ids are deduplicated.

Response field `deletedKeys` is Redis-confirmed number of unique `rock:*` response
keys deleted. Index keys and stale index references are excluded. Zero means Redis
unavailable or no live indexed cache entry; it does not indicate request failure.

Prefix scanning remains reserved for operational endpoint-wide flushes. Parent
saves use relationship indexes to avoid evicting unrelated Rock content.

After first deployment, pre-existing association cache entries have no
`cfchildren` index. Flush `ContentChannelItemAssociations` once or wait for its
cache TTL before preview verification.

## Preview/staging verification

1. Load page containing child section and nested collection so keys/indexes exist.
2. Save parent `ContentChannelItem` in Rock.
3. Confirm webhook returns HTTP 200 with numeric `deletedKeys` greater than zero.
4. Reload page and confirm association, child section, and nested collection data
   reflect Rock values.
5. Repeat child-only save; confirm child data refreshes without unrelated content
   eviction.

Automated tests cover association indexing, descendant traversal, nested children,
duplicate cache-key counting, and empty indexes. Live webhook delivery and Rock UI
save behavior require preview/staging access.
