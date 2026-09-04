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
| `cfchildren:{parentId}`    | Set of child item ids | Cached relationship hint and audit evidence |

When an association response is cached, its `rock:*` key is added to parent
`cfitem` set and each child id is added to parent `cfchildren` set. All indexes
expire after `TTL.LONG`; response keys retain requested TTL.

## Invalidation behavior

`POST /api/admin/cache?id={contentChannelItemId}` authenticates with
`x-cache-secret`. For every visited item, it reads both cached descendants from
`cfchildren` and current descendants directly from Rock's
`ContentChannelItemAssociations` endpoint with caching disabled. It unions both
graphs before collecting each item's `cfitem` members, then deletes unique
response keys and visited indexes. Cached-only descendants cover removed
relationships; Rock covers new relationships missing from a stale or empty
index. Cycles cannot loop because visited ids are deduplicated.

Successful responses include `deletedKeys`, `visitedItems`,
`cachedRelationships`, and `liveRelationships`. `deletedKeys` is Redis-confirmed
number of unique `rock:*` response keys deleted; index keys and stale index
references are excluded. Zero can mean no live indexed cache entry, so discovery
counts and rendered content—not deletion count alone—prove intent.

Rock relationship lookup failure returns `502 relationship_discovery_failed`
before any deletion. Redis unavailable returns `503 cache_unavailable`. These
non-2xx responses prevent Rock workflow from reporting a partial no-op as
successful.

Prefix scanning remains reserved for operational endpoint-wide flushes. Parent
saves use relationship indexes to avoid evicting unrelated Rock content.

Relationship indexes seen after a page reload do not prove they existed when
webhook ran: reload can repopulate them after incomplete invalidation. Live Rock
discovery removes that ordering dependency. No one-time cache flush is required.

## Preview/staging verification

1. Load page containing child section and nested collection so keys/indexes exist.
2. Save parent `ContentChannelItem` in Rock.
3. Confirm webhook returns HTTP 200 with expected relationship and visited-item
   diagnostics. Do not require `deletedKeys` greater than zero; expired or shared
   cache keys can make Redis-confirmed count lower than candidates.
4. Reload page and confirm association, child section, and nested collection data
   reflect Rock values.
5. Repeat child-only save; confirm child data refreshes without unrelated content
   eviction.

Automated tests cover association indexing, descendant traversal, nested children,
duplicate cache-key counting, and empty indexes. Live webhook delivery and Rock UI
save behavior require preview/staging access.
