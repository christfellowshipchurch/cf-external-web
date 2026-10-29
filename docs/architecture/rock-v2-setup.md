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
- The `ROCK_V2_ENABLED` flag, the v1 fallback and the dev-only `🔍 Rock v2 vs v1`
  comparison are built in. Turning v2 on is only an environment variable.

## How the code works

- `fetchRockV2` (`app/lib/.server/fetch-rock-v2.ts`) runs a v2 read, with the
  existing v1 call as its `fallback`.
- When `ROCK_V2_ENABLED` is not `true`, only the fallback runs. Pages behave
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

```bash
ROCK_V2_ENABLED=true pnpm dev
```

Load the page and read the terminal:

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

**Calls:** search, then attribute values (2 v2 calls vs 1 on v1). This
replaces v1's `ContentChannelItems/GetByAttributeValue`, which has no v2
equivalent.

- `POST contentchannelitems/search/cf-web-message-by-url`, body `where`:
  `ContentChannelId == 63 && Status == "Approved" && ContentChannelItemAttributeValues.Any(av => av.Key == "Url" && av.Value == "{path}")`
  - In preview mode the `Status` clause is left out, as on v1.
  - The scheduled/expired date check runs in code, as v1 does for
    `GetByAttributeValue`.
- `GET contentchannelitems/{guid}/attributevalues`

**Rock setup:**

| Where                                                                                                               | Permission for the REST user |
| ------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Entity Search `cf-web-message-by-url` (Content Channel Item, refinement on, max 10, Where `ContentChannelId == 63`) | Execute › Allow              |
| v2 ContentChannelItems controller                                                                                   | Execute Read › Allow         |

No action-level grant was needed. The attribute-values action offers Execute
Read and inherits the controller's grant.

**Filtering on an attribute in an Entity Search:** use
`{Entity}AttributeValues.Any(av => av.Key == "…" && av.Value == "…")`, e.g.
`ContentChannelItemAttributeValues` or `PersonAttributeValues`. Check the
collection's exact name in **Admin Tools › Settings › Model Map**.

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

## Still to confirm

- **Paging field names:** Rock's docs use `skip`/`take`; the code sends
  `offset`/`limit` (`V2_PAGING_FIELDS` in `fetch-rock-v2.ts`). The first read
  that returns more than one page will show which one Rock honors.
- **Number IDs with Disable Predictable IDs on:** not tested, since the code only
  uses Guids.
