# Setting up Rock REST v2 reads

How to move a page's Rock read from REST v1 to v2: the code, everything that
has to be set up in Rock, and how to find a missing permission when v2 answers 401. The location single page (Campus) and message single page
(Content Channel Item) are worked examples. They needed different permissions.

## One-time setup (already done)

These were needed once to get v2 working at all. Don't repeat them for each new
read.

**In Rock**

- Rock is on **18.7**. v2 already existed on 18.5; the upgrade wasn't what made
  it work.
- The site's REST user is **apollos**. Its key is the site's `ROCK_TOKEN`, and
  it's Active.
- The v2 controllers are locked down for everyone by default. That is Rock's
  design, not a server setting to change, and it's why every new controller
  needs its own grant (checklist step 4).

**Grants already in place for apollos.** A new read that uses only these needs
nothing new:

| Where                                           | Permission                |
| ----------------------------------------------- | ------------------------- |
| v2 Campuses controller                          | Execute Read              |
| v2 Locations controller                         | Execute Read              |
| v2 ContentChannelItems controller               | Execute Read              |
| v2 Campuses action `GET …/{id}/attributevalues` | Execute Unrestricted Read |
| Entity Search `cf-web-campus-by-url`            | Execute                   |
| Entity Search `cf-web-message-by-url`           | Execute                   |

**In the code**

- `fetchRockV2`, `requestRockV2`, `toV1Shape`, `buildV2SearchBody`,
  `getSearchItems` and `escapeDynamicLinq` in `app/lib/.server/fetch-rock-v2.ts`.
  New reads reuse them.
- The `ROCK_V2_ENABLED` environment variable, the v1 fallback and the dev-only
  `🔍 Rock v2 vs v1` comparison are built in. Like My Groups, v2 is **on unless
  `ROCK_V2_ENABLED=false`**: unset or `true` means on. Set it to `false` in an
  environment to run every read on its v1 fallback, no deploy needed.
- Tests run on v1 (`vitest.config.ts` sets `ROCK_V2_ENABLED=false`). A v2 test
  turns it on with `vi.stubEnv`.

## How the code works

- `fetchRockV2` (`app/lib/.server/fetch-rock-v2.ts`) runs a v2 read, with the
  existing v1 call as its `fallback`.
- When `ROCK_V2_ENABLED` is `false`, only the fallback runs. Pages behave
  exactly as on v1.
- When v2 is on and **any** v2 call in the read fails, the whole read falls back
  to v1. A missing permission can't take a page down; it only logs
  `⚠️ Rock v2 request failed, using v1 fallback`.
- A read can span several calls: a search, then `/attributevalues`, then a
  related record. Follow-up calls go through `requestRockV2` inside the `map`
  function, so a failure there also falls back to v1 for the whole read.
- `toV1Shape` converts a v2 entity and its attribute values to the shape loaders
  already read: camelCase keys and `attributeValues.{key}.value` /
  `.valueFormatted`.
- In development, every successful v2 read also runs v1 and logs the fields that
  differ:

  ```
  🔍 Rock v2 vs v1 (campuses/search/cf-web-campus-by-url): 26 differences
  attributeValues.campusImage.valueFormatted: v1="<img …" v2="jupiter.jpg"
  Only in v1: isActive, timeZoneId, …
  ```

  It only compares fields v2 returns. Fields only v1 has are listed on the last
  line.

### Rules for v2 paths

- **Use a Guid or IdKey, never a number ID.** `fetchRockV2` throws outside
  production on a number ID in the path. Rock refuses number IDs in more places
  when Disable Predictable IDs is on.
- **v2 has no list or filter endpoints like v1's `$filter`.** To look a record
  up by anything other than its ID (a Url, a slug, an attribute value), create a
  saved Entity Search in Rock and call `{entity}/search/{searchKey}`.
- **`IdKey` and some properties are computed, not database columns**
  (`Location.Latitude`, for example), so a search `select` can't include them.
  Select the Guid and fetch the full record with a follow-up GET.
- **v2 returns no attribute definitions.** Code that needs them (for example
  `getImages`, which only reads their keys) has to build them from the attribute
  values.

## Setup checklist for a new v2 read

### 1. Write down every v2 call the read makes

Each call needs its own permission in Rock, so list them all, follow-ups
included. For example, the campus read:

| Call                                        | Controller (v2) |
| ------------------------------------------- | --------------- |
| `POST campuses/search/cf-web-campus-by-url` | Campuses        |
| `GET campuses/{guid}/attributevalues`       | Campuses        |
| `GET locations/{guid}`                      | Locations       |

### 2. The REST user

Our site's REST user is **apollos**. Every grant below goes to it, through
**Add User** in each security dialog.

### 3. Create the Entity Search (only if the read looks records up by a non-ID field)

**Admin Tools › Settings › Entity Search › Add**

| Field                                   | Value                                                                                                                   |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Name / Key                              | The key the code calls, e.g. `cf-web-campus-by-url`: lowercase, no spaces                                               |
| Active                                  | ✅                                                                                                                      |
| Description                             | Which page uses it and for what                                                                                         |
| Entity Type                             | The entity the controller returns, e.g. Campus                                                                          |
| Enable Entity Security                  | ☐ Off. With it on, Rock also checks View on every returned record.                                                      |
| Include Paths                           | Empty                                                                                                                   |
| Maximum Results Per Query               | A small cap, e.g. `1` for a lookup by a unique Url                                                                      |
| Allow Query Refinement                  | ✅ **Required.** The code sends `where` (and sometimes `select`) with each request, and Rock rejects them without this. |
| Where                                   | Off, or a fixed limit the code shouldn't be able to widen, e.g. `ContentChannelId == 63`                                |
| Grouping, Select, Select Many, Ordering | Off                                                                                                                     |

Then use the **lock icon › Execute › Add User** to give the REST user **Allow**.
Searches only allow View by default.

### 4. Give the REST user access to each v2 controller

**Admin Tools › Security › REST Controllers.** Use the **v2** controller: its
route starts with `api/v2/models/`.

- v2 controllers are **locked down for everyone by default, admins included**.
  A 401 for an admin in the browser doesn't mean v2 is broken; nobody has been
  given access yet.
- For each controller from step 1, use the **lock icon › Execute Read › Add
  User**, then the REST user › **Allow**.
- Don't grant Execute Write, Execute Unrestricted Write or Administrate. Only
  grant Execute Unrestricted Read where an action offers nothing else (see
  layer 3 below).

### 5. Clear Rock's cache

**Admin Tools › System Settings › System Information › Clear Cache.** Rock
caches permissions, so new grants may not apply until you do.

### 6. Test locally

With `ROCK_V2_ENABLED` unset (or `true`), start the dev server as usual, load the page and read the terminal:

- `🔍 Rock v2 vs v1 … N differences`: v2 works. Check every difference against
  what the page actually reads (see "Expected differences" below).
- `⚠️ Rock v2 request failed … 401`: a permission is missing. The URL in the
  error tells you which call; work through the layers below.
- `400` or `500`: the request itself is wrong, usually the search `where` or
  `select` syntax. The error body says why.

## When v2 still answers 401: check each layer

Rock checks permissions at several levels, and any of them can produce a 401
with an empty body. Check the call named in the error, in this order, and clear
the cache after each change.

1. **The REST user.** Did the grants go to **apollos**?
2. **The controller.** Does the v2 controller for this call give the REST user
   **Execute Read › Allow**? Check that no **Deny** rule sits above it; rules
   apply top to bottom.
3. **The action.** Open the controller and find the action from the error, e.g.
   `GET api/v2/models/campuses/{id}/attributevalues`. Actions can have their own
   rules, and **some actions only offer Execute Unrestricted Read**. If the
   action's security dialog has no Execute Read tab, grant **Execute
   Unrestricted Read** on that **one action**, never on the whole controller.
   This is what Campuses needed (see below).
4. **The Entity Search.** For a `…/search/{key}` call: Active, exact Key, Allow
   Query Refinement, and **Execute › Allow** for the REST user.
5. **The records themselves.** With Execute Read (not Unrestricted), Rock only
   returns records the REST user can **View**. Check the entity's security under
   **Admin Tools › Security › Entity Administration** (or the content channel's
   own security). Usually **All Users** can already view public entities like
   Campus, so this is rarely the cause.

A search that succeeds followed by a 401 on the next call means the search
layers (1, 2 and 4) are fine. Look at layer 3 for the failing call first.

## Worked examples

### Location single page: Campus by Url

**Calls:** search, then attribute values and Location in parallel (3 v2 calls
vs 1 on v1).

- `POST campuses/search/cf-web-campus-by-url`, body:
  - `where`: `Url == "jupiter"`
  - `select`: `new (Id, Guid, Name, Url, PhoneNumber, ServiceTimes, LeaderPersonAliasId, Location.Guid as LocationGuid)`
  - `limit`: `1`
- `GET campuses/{guid}/attributevalues`
- `GET locations/{locationGuid}`

**Rock setup:**

| Where                                                                                 | Permission for the REST user                                    |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Entity Search `cf-web-campus-by-url` (Campus, refinement on, max 1, all sections off) | Execute › Allow                                                 |
| v2 Campuses controller                                                                | Execute Read › Allow                                            |
| v2 Locations controller                                                               | Execute Read › Allow                                            |
| v2 Campuses action `GET …/{id}/attributevalues`                                       | **Execute Unrestricted Read › Allow** (the only option offered) |

The search and Location worked with the controller grants. Campus attribute
values kept returning 401 until the action-level Unrestricted Read was added.

### Message single page: Content Channel Item by Url attribute

The message page first used its own search (`cf-web-message-by-url`) plus a
`GET contentchannelitems/{guid}/attributevalues` call. Since steps 2 and 3 it
reads through the shared `contentchannelitems` search like every other content
read, in one call. `cf-web-message-by-url` is no longer called.

**Filtering on an attribute in an Entity Search:** use
`{Entity}AttributeValues.Any(av => av.Key == "…" && av.Value == "…")`, e.g.
`ContentChannelItemAttributeValues` or `PersonAttributeValues`. Check the
collection's exact name in **Admin Tools › Settings › Model Map**.

## Step 1 (CFDP-4478): simple cached reads

Every Campus, Defined Value, Content Channel, Media Element and Attribute
Matrix read on the site now goes through one shared helper with its v1 call
as the fallback.

It follows My Groups' setup (`my-church-platform`,
`docs/architecture/rock-v2-setup.md`), which uses the same REST user on the same
Rock:

- **One saved Entity Search per entity, keyed by its v2 route name**
  (`searchPath('campuses')` → `campuses/search/campuses`), refinement on, so the
  code owns the `where`. Both apps share them.
- **Attribute values are projected in the search** with
  `selectAttributeValues('Campus')`, i.e.
  `CampusAttributeValues.Select(av => new (av.Key, av.Value, av.PersistedTextValue as TextValue))`,
  and mapped by `projectedToV1Shape`. One call returns records and values, with
  no per-record `/attributevalues` call and no Execute Unrestricted Read grant.

| Helper                                      | File                     | v2 calls                                                                        |
| ------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------- |
| `fetchCampuses` (dropdowns, Guid/Name → Id) | `rock-campuses.ts`       | search `campuses`                                                               |
| `fetchCampusesWithDetails` / `…WithDetails` | `rock-campuses.ts`       | search `campuses` with attribute values, then `GET locations/{guid}` per campus |
| `fetchDefinedValues` / `…ByGuid`            | `rock-defined-values.ts` | search `definedvalues`, attribute values when asked for                         |
| `fetchRockEntityByGuid` with `select`       | `fetch-rock-v2.ts`       | search `contentchannels`                                                        |
| `fetchRockEntityByGuid` without `select`    | `fetch-rock-v2.ts`       | `GET mediaelements/{guid}`                                                      |
| `getAttributeMatrixItems`                   | `rock-utils.ts`          | search `attributematricesitem` with attribute values                            |

`attributematricesitem` is Rock's v2 route name for AttributeMatrixItem. The
matrix read also selects `AttributeMatrix.Guid` and falls back to v1 if any
row belongs to another matrix, in case Rock ignored the `where`.

Malformed Guids now return nothing without calling Rock, on v1 and v2.

**Already in place** (from My Groups and the prototype): the `campuses`,
`contentchannels` and `attributematricesitem` searches with Execute for apollos;
`POST search/{searchKey}` Execute Read on those three controllers;
`GET {id}` on MediaElements and Locations.

**Rock setup still to do:**

| Where                                                                           | Permission for apollos |
| ------------------------------------------------------------------------------- | ---------------------- |
| Entity Search `definedvalues` (Defined Value, Active, refinement on, max blank) | Execute › Allow        |
| v2 DefinedValues controller, `POST search/{searchKey}` action                   | Execute Read › Allow   |

Until it's done, Defined Value reads fall back to v1.

`cf-web-campus-by-url` is no longer called, and the campus read no longer uses
`GET campuses/{id}/attributevalues`, so its Execute Unrestricted Read grant can
go too. Remove both once this ships.

**To confirm on the first run:**

- `CampusAttributeValues` and `DefinedValueAttributeValues` exist (Model Map).
  `AttributeMatrixItemAttributeValues` already works in My Groups.
- `limit` (hero actions ask for 2) and `sort: "Order desc"`. This is the first
  read that pages, so it settles `V2_PAGING_FIELDS`.
- Calls per page: a campus details read is 1 + 1 per campus (the Location),
  about 15 for the active list. Every other read is one call.

The admin `target=attribute-matrices` flush also clears the
`attributematricesitem` search's cache entries.

## Steps 2 and 3 (CFDP-4537, CFDP-4538): content items and attribute lookups

Every `ContentChannelItems`, `ContentChannelItemAssociations` and
`…/GetByAttributeValue` read now tries v2 first, except the sitemap (below).

**How:** `fetchViaV2Search` (`rock-v2-search.ts`) takes the **same options a
`fetchRockData` call already had** and runs them as a saved-search request.
Call sites only swap the function name; the v1 call is unchanged and is the
fallback.

- `$filter` becomes the `where` through `odataFilterToLinq`. It accepts only
  the subset the site uses (`eq ne lt le gt ge and or not`, parentheses,
  numbers, strings, `guid'…'`, `datetime'…'`, `null`). Anything else goes
  straight to v1 with a warning.
- `filterByStatusApproved`, `filterByDateRange` and preview mode are resolved
  by the same code as v1 (`resolveRockQuery`), so both versions ask Rock the
  same question.
- `attributeKey` / `value` become
  `{Entity}AttributeValues.Any(av => av.Key == "…" && av.Value == "…")`.
  As on v1, the date range for an attribute lookup is checked in code after
  `$top`.
- `$top` becomes `limit`, and the result is also cut to `$top` in code.
- `$skip`, `$select` and `attributeKeys` aren't translated. A read that uses
  one stays on v1.
- Rows come back in v1's shape: one row unwrapped, `Status` as a number, dates
  without the `-04:00` offset (so `new Date(value)` formats as on v1), and
  `attributes` built from the attribute value keys.
- **Wrong-record guard**, as in step 1: an attribute lookup also selects the
  looked-up value (`LookupValue`), and an `Id eq` / `Guid eq` read checks each
  row's Id or Guid. A row that doesn't match sends the read to v1.
- A lookup by `Url` or `Pathname` that finds nothing throws, so v1 answers and
  a misbehaving search can't 404 a real page. Other empty results are
  returned as empty.

| Helper                                 | File                     | v2 call                          |
| -------------------------------------- | ------------------------ | -------------------------------- |
| `fetchContentItems`                    | `rock-content-items.ts`  | search `contentchannelitems`     |
| `fetchChildContentItems`               | `rock-content-items.ts`  | search `contentchannelitems`     |
| `fetchDefinedValuesByAttribute`        | `rock-defined-values.ts` | search `definedvalues`           |
| `fetchChurchRolesByPreferenceAreaGuid` | `church-roles.server.ts` | search `connectionOpportunities` |

**Page-builder children** used to be the association list plus one read per
child. v2 reads them in one search,
`where: ParentItems.Any(a => a.ContentChannelItemId == {parentId})`, selecting
each child's association `Order` to sort by. It reads every status and drops
non-Approved children in code (not in preview), so a Pending child is still in
the cache index.

**Cache invalidation.** v2 responses go into the same `cfitem:{id}` /
`cfchildren:{id}` reverse index as v1 (`storeIndexedResponse` in
`cache-utils.ts`), so the admin single-item clear also clears v2 keys:

- content item reads index every row, plus the requested id for an
  `Id eq N` read that came back empty;
- the children read indexes the parent, each child, and the parent → child
  relationships.

"Now" in a `where` (`DateTime(…)`) is replaced with a placeholder before the
cache key is hashed, as v1 does for its date-range clause. Without it every
request would get its own key.

This was the gate for turning `ROCK_V2_ENABLED` on in production.

**Stays on v1:** the sitemap. It pages with `$skip`, and Rock's paging field
names aren't confirmed yet (see "Still to confirm").

**Rock setup.** `contentchannelitems` and `definedvalues` searches already
exist with Execute for apollos. Still to do:

| Where                                                                                                           | Permission for apollos    |
| --------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Entity Search `connectionOpportunities` (Connection Opportunity, Active, refinement on, max blank): **created** | Execute › Allow (confirm) |
| v2 ConnectionOpportunities controller, `POST search/{searchKey}` action                                         | Execute Read › Allow      |

The search exists; until the controller grant is in place, church roles fall back to v1. Once this ships, delete the
`cf-web-message-by-url` search.

**To confirm on the first run:**

- `DateTime(2026, 11, 10, 16, 5, 9)` in a `where` (date-range reads: navbar,
  podcasts, daily devo, volunteer trips, group finder notify).
- `ParentItems` and `.Min(a => a.Order)` in the children search (page builder,
  link tree, ministry builder, podcast show).
- `ContentChannelItemAttributeValues`, `PersonAttributeValues` and
  `ConnectionOpportunityAttributeValues` (Model Map).
- `Status == "Approved"` compares against the enum, and `Status` comes back as
  a name or a number (both are handled).

Each of these falls back to v1 if Rock rejects it, logging
`⚠️ Rock v2 request failed`.

## Expected differences between v1 and v2

These showed up on both pages. None affected what the pages display.

| Difference                                                                                                                     | Notes                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dates carry a time-zone offset: v2 `2026-10-25T13:40:00-04:00`, v1 `2026-10-25T13:40:00`                                       | `parseRockDateTime` handles both. Code that formats with `new Date(value)` can show a different day for late-evening Eastern times on a UTC server. Check date display before switching a page. |
| `valueFormatted` is plain text in v2 (file name, title or Guid) but rendered HTML in v1 for images, links, videos and matrices | `toV1Shape` maps v2's `textValue`. Raw `value` matches. A page that needs v1's HTML would need v2's `htmlValue` instead.                                                                        |
| Empty attributes are `""` in v2, `null` in v1                                                                                  | Harmless where code already falls back with `?? ''`.                                                                                                                                            |
| Navigation properties (e.g. `contentChannel`) and `attributes` are only in v1                                                  | v2 doesn't expand related records. Fetch them separately if a page needs them.                                                                                                                  |
| Fields left out of a search `select` are only in v1                                                                            | Expected. Only select what the page reads.                                                                                                                                                      |
| Some attributes show different `valueFormatted` text with the same `value`                                                     | Seen on two campus attributes. Possibly older cached text in v2. Check if a page displays that attribute.                                                                                       |

## Saved Entity Search keys

Every search apollos can execute on our Rock, shared with My Groups. The path
is `{v2 route name}/search/{key}`; `searchPath(model, searchKey)` in
`fetch-rock-v2.ts` builds it, and an entity's `searchKey` is only set when
the key isn't the route name.

The older keys are all lowercase (the v2 route name). Newer ones are
camelCase, starting with `connectionOpportunities`. **Eventually every key
should be camelCase.** The renames are part of the cleanup ticket,
CFDP-4546. Rename one search at a time, together with the code change, since
My Groups calls the same searches.

Casing below is as recorded from My Groups' setup; check the key in Rock
(**Admin Tools › Settings › Entity Search**) before relying on it.

| Key now                   | Target key                          | Used by this site              |
| ------------------------- | ----------------------------------- | ------------------------------ |
| `campuses`                | `campuses`                          | Yes (step 1)                   |
| `contentchannels`         | `contentChannels`                   | Yes (step 1)                   |
| `attributematricesitem`   | `attributeMatricesItem`             | Yes (step 1)                   |
| `definedvalues`           | `definedValues`                     | Yes (steps 1, 3)               |
| `contentchannelitems`     | `contentChannelItems`               | Yes (steps 2, 3)               |
| `people`                  | `people`                            | No (author lookup stays on v1) |
| `connectionOpportunities` | `connectionOpportunities` (already) | Yes (step 3, church roles)     |
| `locations`               | `locations`                         | No (My Groups)                 |
| `groups`                  | `groups`                            | No (My Groups)                 |
| `groupmembers`            | `groupMembers`                      | No (My Groups)                 |
| `grouplocations`          | `groupLocations`                    | No (My Groups)                 |
| `phonenumbers`            | `phoneNumbers`                      | No (My Groups)                 |
| `relatedentities`         | `relatedEntities`                   | No (My Groups)                 |
| `binaryfiles`             | `binaryFiles`                       | No (My Groups)                 |
| `binaryfiletypes`         | `binaryFileTypes`                   | No (My Groups)                 |
| `entitytypes`             | `entityTypes`                       | No (My Groups)                 |
| `attributes`              | `attributes`                        | No (My Groups)                 |

## Staying on v1

Reads that steps 1–3 deliberately leave on v1, and why. Steps 4–6 (people and
groups, workflow launches, writes) haven't started, so their calls aren't
listed here.

| Read                                                                                            | Why                                                                                                                                                                                                                           | Moves when                                                                                            |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Sitemap (`sitemap[.]xml.ts`, `ContentChannelItems`)                                             | It pages with `$top` / `$skip`. Rock's v2 paging field names aren't confirmed, and if Rock ignored the offset every page would repeat the first one.                                                                          | A paged v2 read confirms `V2_PAGING_FIELDS`; then switch to `fetchContentItems`.                      |
| Author by Pathname (`fetchAuthorByPathname` in `author-utils.ts`, `People/GetByAttributeValue`) | The `people` search answers 500 with no detail whenever it also selects `PersonAttributeValues`, unless `limit` is large: no limit, 1 and 10 fail, 1000 works (tested 2026-11-11). The lookup without attribute values works. | Step 4 (CFDP-4539), with Person reads: find out why Rock fails, or read attribute values another way. |

## Cleanup after v2 is confirmed (CFDP-4546)

Once a read is confirmed working on v2 in production:

- remove its v1 fallback and the v1 helpers only it uses;
- remove the extra logging: the dev-only `🔍 Rock v2 vs v1` comparison and
  fallback warnings that no longer apply;
- remove `ROCK_V2_ENABLED` once nothing reads it;
- rename the search keys to camelCase (table above);
- delete unused Rock searches and grants (`cf-web-campus-by-url`,
  `cf-web-message-by-url`, the Campuses `attributevalues` Unrestricted Read
  grant) and settled "Still to confirm" items.

Reads listed under "Staying on v1" keep their v1 call.

## Still to confirm

- **Paging field names:** Rock's docs use `skip`/`take`; the code sends
  `offset`/`limit` (`V2_PAGING_FIELDS` in `fetch-rock-v2.ts`). The first read
  that returns more than one page will show which one Rock honors.
- **Number IDs with Disable Predictable IDs on:** not tested, since the code only
  uses Guids.
