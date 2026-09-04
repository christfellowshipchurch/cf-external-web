# Rock Cache Live Relationship Invalidation Plan

**Goal:** Make Content Channel Item webhooks invalidate every currently associated descendant, including relationships Redis has never seen or has not refreshed yet.

**Architecture:** Treat Rock as relationship source of truth during invalidation. Keep `cfchildren:*` as cached graph hint, but merge it with an uncached Rock `ContentChannelItemAssociations` lookup for every visited item. Preserve exact reverse-index deletion; do not introduce broad production `SCAN` invalidation.

**Tech stack:** TypeScript, React Router action, Rock REST API, ioredis, Vitest.

---

## Problem statement

Current invalidation walks only relationships already recorded in Redis:

1. Page fetch caches an association response.
2. Cache write records children under `cfchildren:{parentId}`.
3. Webhook later walks that set and each descendant's `cfitem:*` set.

Ordering is unsafe when a parent gains or changes associations before front end fetches new graph. Webhook cannot discover new children from stale or missing `cfchildren:*`. It deletes parent response, reports success, then next page request rebuilds relationship index too late and can reuse stale child response keys.

Observed Staff Resources run proves gap:

- webhook for item `21959` returned `deletedKeys: 1`;
- later Redis state contained four direct children and child response keys;
- current traversal would have attempted many response-key deletions if that graph had existed at webhook time;
- CDN response was a miss with `max-age=0`, so CDN was not stale layer;
- cached Rock responses use one-hour default TTL, explaining eventual self-heal.

## Success criteria

- Parent save discovers current Rock children even when `cfchildren:{parentId}` is missing, incomplete, or stale.
- Traversal follows nested descendants using same live lookup.
- Cached-only children are also invalidated, covering removed relationships and old graph entries.
- Duplicate relationships and cycles terminate safely.
- Rock lookup failure returns non-success response; workflow cannot silently appear successful.
- Response exposes enough non-sensitive diagnostics to distinguish discovery from deletion.
- Existing exact-key invalidation behavior and Redis-unavailable behavior remain defined and tested.
- `pnpm check` passes with no skipped tests.

## Non-goals

- No global cache flush on every content save.
- No Redis key schema migration.
- No CDN or React Router cache changes.
- No Rock workflow configuration change unless endpoint response contract requires it.
- No retry framework or background job.

---

## Files

- Modify: `app/lib/.server/cache-utils.ts`
- Modify: `app/lib/.server/fetch-rock-data.ts` only if shared request types need export
- Modify: `app/routes/api.admin.cache.tsx`
- Modify: `app/lib/.server/__tests__/cache-utils.test.ts`
- Modify: `app/lib/.server/__tests__/fetch-rock-data.test.ts` only if request behavior changes there
- Create or modify: `app/routes/__tests__/api.admin.cache.test.tsx`
- Modify: `docs/architecture/rock-cache-invalidation.md`

## Task 1: Encode missing-relationship failure

- [ ] Add test where Redis contains parent response key but no `cfchildren:10` members.
- [ ] Supply live resolver returning child `20`.
- [ ] Give child `20` a stale `rock:ContentChannelItems:*` member.
- [ ] Assert invalidation deletes parent and child response keys.
- [ ] Verify test fails against current implementation.

Add second test for stale nonempty graph:

- [ ] Redis returns cached child `20`.
- [ ] Live Rock resolver returns children `20` and `30`.
- [ ] Assert keys for both children are deleted.

Intent: live lookup must always merge with cached graph. “Only query Rock when Redis set is empty” does not fix incomplete nonempty sets.

## Task 2: Add injectable live-child resolver

Extend `invalidateItem` with narrow dependency:

```ts
export type ResolveChildItemIds = (
  parentId: string,
) => Promise<readonly string[]>;

export interface InvalidateItemOptions {
  resolveChildItemIds?: ResolveChildItemIds;
}
```

Traversal behavior:

- [ ] Read `cfitem:{id}` and `cfchildren:{id}` as today.
- [ ] Call live resolver for every newly visited item when resolver exists.
- [ ] Union cached and live child IDs before queueing descendants.
- [ ] Deduplicate visited IDs and response keys with existing sets.
- [ ] Finish discovery before deletion pipeline runs. Live lookup failure must not produce partial “success.”
- [ ] Keep resolver optional so isolated callers and existing tests retain current behavior.
- [ ] Return structured result instead of bare number:

```ts
type InvalidationResult = {
  deletedKeys: number;
  visitedItemIds: string[];
  cachedRelationships: number;
  liveRelationships: number;
};
```

Keep arrays/counts deterministic for tests. Do not include cached values, Rock payloads, tokens, or secrets.

## Task 3: Resolve relationships directly from Rock

In `api.admin.cache.tsx`, create small resolver using `fetchRockData`:

```ts
fetchRockData({
  endpoint: 'ContentChannelItemAssociations',
  queryParams: {
    $filter: `ContentChannelItemId eq ${parentId}`,
    $orderby: 'Order',
  },
  ttl: TTL.NONE,
});
```

- [ ] Parse response with `extractContentItemRelationships` instead of duplicating shape logic.
- [ ] Filter returned relationships to requested parent ID.
- [ ] Convert single-object and array responses safely.
- [ ] Pass resolver into `invalidateItem`.
- [ ] Confirm `TTL.NONE` prevents reading and writing shared Redis cache.
- [ ] Keep numeric webhook ID validation before interpolation into Rock filter.

Avoid importing `fetchRockData` into `cache-utils.ts`; that creates wrong dependency direction because fetch layer already imports cache utilities.

## Task 4: Fail loud and return diagnostics

- [ ] Keep `401`, `405`, and `400` behavior unchanged.
- [ ] On Rock relationship lookup failure, return `502` with stable error code such as `relationship_discovery_failed`.
- [ ] Log item ID and error class/message server-side. Never log authorization header or cache secret.
- [ ] On success, return:

```json
{
  "success": true,
  "id": "21959",
  "deletedKeys": 10,
  "visitedItems": 12,
  "cachedRelationships": 8,
  "liveRelationships": 11
}
```

Rock workflow currently marks any successful HTTP response complete. Non-2xx response must remain visible as failed action rather than `{ success: true }` with incomplete invalidation.

## Task 5: Cover traversal and endpoint contract

Add or update tests for:

- [ ] missing cached graph plus live child;
- [ ] stale cached graph plus newly associated live child;
- [ ] removed child present only in cached graph;
- [ ] nested live descendants;
- [ ] cached/live duplicate child IDs;
- [ ] relationship cycle;
- [ ] duplicate response keys counted once;
- [ ] Redis-confirmed delete count lower than candidate count;
- [ ] live resolver rejection;
- [ ] endpoint uses `ContentChannelItemAssociations`, exact parent filter, and `TTL.NONE`;
- [ ] endpoint returns diagnostics on success;
- [ ] endpoint returns `502` on discovery failure;
- [ ] unauthorized request performs neither Rock lookup nor Redis mutation;
- [ ] Redis unavailable behavior remains explicit. Preferred result: successful no-op with diagnostics only if current production contract requires graceful degradation; otherwise fail loud with `503`. Pick one behavior and document it—do not blur both.

## Task 6: Update architecture documentation

Update `docs/architecture/rock-cache-invalidation.md`:

- [ ] Mark Rock live associations authoritative during webhook processing.
- [ ] Describe cached/live graph union and removed-child coverage.
- [ ] Document failure status and response diagnostics.
- [ ] Remove claim that invalidation relies only on “known descendants.”
- [ ] Keep `cfchildren:*` purpose documented as relationship hint and operational evidence.
- [ ] Add race explanation: indexes observed after reload do not prove presence during webhook.

## Task 7: Verify locally

Run focused tests first:

```bash
pnpm vitest run app/lib/.server/__tests__/cache-utils.test.ts app/lib/.server/__tests__/fetch-rock-data.test.ts app/routes/__tests__/api.admin.cache.test.tsx
```

Then full project check:

```bash
pnpm check
```

- [ ] Record exact pass/fail counts.
- [ ] Report skipped tests explicitly.
- [ ] Inspect final diff for unrelated formatting or refactors.

## Task 8: Preview verification

Use disposable/test Content Channel Items, not Staff Resources first.

- [ ] Warm parent and child caches by loading test page.
- [ ] Add new child association in Rock.
- [ ] Ensure child has independently cached content response.
- [ ] Save parent.
- [ ] Confirm workflow gets HTTP 200 and diagnostics include new child ID in visited count/path evidence.
- [ ] Reload page and confirm updated child content appears immediately.
- [ ] Remove association, save parent, and confirm removed child's cached-only relationship is still invalidated.
- [ ] Repeat with nested collection.
- [ ] Force/mock Rock association failure and confirm endpoint returns non-2xx.

Do not judge success from `deletedKeys > 0` alone. Count varies with TTL and shared keys. Relationship discovery diagnostics plus rendered content prove intent.

## Task 9: Production rollout

- [ ] Deploy during low-edit window.
- [ ] Confirm deployed commit is current `www.christfellowship.church` production alias.
- [ ] Save one low-risk test item through normal Rock workflow.
- [ ] Check Vercel request log for one `POST /api/admin/cache` with expected status.
- [ ] Check Rock workflow response diagnostics.
- [ ] Reload public page with normal request; confirm fresh result.
- [ ] Run controlled Staff Resources edit only after test item passes.
- [ ] Monitor invalidation latency and Rock request errors for first day.

## Rollback

- Revert endpoint and resolver changes.
- No Redis migration required; existing `cfitem:*` and `cfchildren:*` keys remain compatible.
- Cached content self-heals at response TTL, currently one hour by default.
- If production discovery failures spike, revert code and investigate Rock availability before retrying rollout.

## Rejected alternatives

**Query Rock only when `cfchildren:*` is empty:** insufficient. Nonempty stale graph can omit newly associated children.

**Delete all `rock:ContentChannelItems:*` and association keys on every save:** reliable but excessive. Unrelated pages lose cache and Rock traffic spikes.

**Trust `deletedKeys` alone:** insufficient. It counts Redis-confirmed response deletions, not discovered relationships or index cleanup.

**Change CDN headers:** unrelated. Dynamic page response already bypasses persistent CDN caching.
