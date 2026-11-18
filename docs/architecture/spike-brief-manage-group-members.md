# Spike Brief — Manage Group Members (My Groups on Rock REST + Redis + RR7)

> **Outdated:** the login code this describes was removed in CFDP-4542 (it was not migrated to Rock v2). File references below no longer exist.

**Type:** Time-boxed spike (5 days, floor not target). **Output:** a decision, not a shippable feature.
**Owner:** _unassigned_ · **Prepared:** 2026-07-24 · **Repo for spike work:** `remix-web-app`

> This brief is self-contained and pasteable into a ticket. It tells you exactly
> what to read, what to build, what to measure, and what "done" looks like for
> each question. Where something can't be settled from the code as it stands
> today, it is called out as a **Day 1 question** rather than assumed.

---

## Day 0 — Gate: confirm Rock dev write-access before anything else

**Do not start Day 1 reading until these three checks pass.** The entire spike
is a write-path validation; if the Rock dev instance can't accept authenticated
writes or lacks realistic config, Days 2–5 cannot run regardless of how sound
the plan is. (The instance has been confirmed usable — this is fast
confirmation, not open investigation, but the executing developer must verify
their own access before building.)

1. **Authenticate as a test leader.** Confirm credentials for a test person who
   is an active leader of at least one test group, and that you can resolve them
   via `GET /api/People/GetCurrentPerson`.
2. **Round-trip a GroupMember write.** Confirm you can `POST /api/GroupMembers`
   to add a throwaway member and `DELETE /api/GroupMembers/{id}` (or PATCH to
   Inactive) to remove them, against a test group you don't mind mutating.
3. **See a workflow config to test against.** Confirm at least one
   GroupMember-related workflow exists and is inspectable in Rock admin, so Q2
   has something real to verify.

If any of the three fail, **stop and fix environment access first** — the spike
is blocked, and that is itself the Day-0 finding to report.

---

## 1. Why this spike exists

We are planning a new **My Groups** app to replace `legacy-my-groups`. The new
app follows `remix-web-app`'s architecture: **React Router v7**, **direct Rock
RMS REST calls**, **Redis caching via Vercel** — no Apollos/GraphQL, no
`services` backend.

Most of My Groups is _authenticated reads_ (a user's groups, group details,
member lists, profile). We expect those to work cleanly against Rock's REST API.
The one feature we are genuinely uncertain about is **Manage Group Members** —
the leader-only flow for adding, removing, and updating members of a group. It
is the primary **write** path, it needs **per-group authorization**, and it
likely triggers **Rock workflows**. This spike prototypes that one flow end to
end to decide **go / no-go** on the whole architecture.

### The finding that reframes everything

From the auth review (read it — see §2): **there is currently no authorization
layer.** All four write helpers (`postRockData` / `putRockData` /
`patchRockData` / `deleteRockData`) hard-code the app service account
`ROCK_TOKEN` and accept no user credential
(`app/lib/.server/fetch-rock-data.ts:314-424`). Consequently:

- Writes arrive at Rock as the **trusted service account**, which has broad
  rights. **Rock will not reject an unauthorized write** — it can't tell that the
  requesting human isn't a leader of the group.
- `legacy-my-groups` never had this problem: Apollos resolved the user from the
  token and enforced group-leader permission **server-side** before touching
  Rock (auth review §6).

**Therefore: every authorization test in this spike must validate _app-side_
authorization, not Rock's.** That is the defining difference from legacy, and
the core of Q1.

---

## 2. Required Day 1 reading (do this before writing any code)

These two documents replace re-deriving the auth model and the endpoint surface.
Read them in full first.

1. **`docs/architecture/auth-review.md`** (committed at `6fc33ed`) — how auth
   works today and its gaps. The **"Proposed helper APIs"** section is the
   contract for everything you build in §4; use those exact signatures.
2. **`docs/architecture/rock-rest-api-survey.md`** (committed at `a117b0f`) — the
   Rock REST endpoint surface, the v1-vs-v2 split, and a numbered **Open
   questions** list this brief folds into Q1/Q2/Q6.

Both are committed in `remix-web-app` under `docs/architecture/`. (Location
confirmed — the survey was originally produced as `rock-rest-api-survey.md` and
is now at `docs/architecture/rock-rest-api-survey.md`.)

---

## 3. Rock REST v1 vs v2 — framing (read this, don't skip)

Two parallel REST surfaces are **both live** on our instance:

- **Classic** `/api/{Controller}` — OData-based (`$filter` / `$select` /
  `$expand` / `$top` / `$skip`), older, more mature and more documented.
- **v2 models** `/api/v2/models/{entity}` — newer, more uniform, with a
  dedicated `attributevalues` sub-resource and a query-object `search` endpoint
  (`EntitySearchQueryBag`) instead of raw OData strings.

**Do not prescribe a version.** Pick per-endpoint during the spike, and
**document the choice and the reasoning** each time — we have no write-path
evidence yet, and this spike is exactly where that evidence should be generated.

**Two clarifications to keep straight (stated verbatim so they aren't misread):**

- The **"Rock Rest API v1"** label shown in Swagger is the **REST contract
  version** — it is **not** the classic-v1-vs-model-v2 axis, and it does **not**
  mean classic is deprecated. Both surfaces are live; they are different
  architectural generations of Rock's REST tooling.
- **Coverage gap:** `GroupTypeRoles` and `AttributeValues` have **no v2 route**
  (survey §"Tier 1"/§"Notes"). Any role-lookup or attribute work may force you
  onto classic v1 regardless of any lean toward v2. Note this wherever it bites.

**Day 1 question (from survey open-question #5):** the Rock CMS build/version
number is **not shown in Swagger**. Determine it on Day 1 (Rock admin → _Power
Tools / Settings → Rock Update_ or the footer of the internal admin UI), because
version-specific behavior matters when you check Rock's official docs/changelog
for the CRUD, cascade, and workflow-trigger questions below.

---

## 4. Prerequisites the spike must build first

You **cannot** test a realistic Manage flow without a minimal auth + authorization
layer, because the write helpers physically cannot forward a user credential
today. **Build only enough to gate this one flow — this is a spike, not the auth
project.** Every signature below comes from the auth review's **"Proposed helper
APIs"** section; do **not** invent new shapes.

### 4.1 `requireUser` / `getAuthContext` — closes C6

New file: **`app/lib/.server/authentication/require-user.ts`**.

```ts
export interface AuthContext {
  personId: number;         // from People/GetCurrentPerson
  primaryAliasId: number;   // required in many write payloads (GroupMembers)
  firstName?: string;
  lastName?: string;
  email?: string;
  rockCookie: string;       // SERVER-ONLY: the decrypted Rock forms-auth cookie
  sessionId: string;        // Rock InteractionSession id captured at login
}

// Resolve context or null; NEVER throws for auth failure. One Rock call
// (People/GetCurrentPerson), uncached.
export const getAuthContext = (request: Request): Promise<AuthContext | null>;

// Require an authenticated user; returns context or THROWS redirect(...).
export const requireUser: (
  request: Request,
  options?: { loginPath?: string; returnTo?: boolean },
) => Promise<AuthContext>;
```

- This **replaces the ambiguous return contract** of the existing
  `getUserFromRequest` (`app/lib/.server/authentication/get-user-from-request.ts:5-21`),
  which returns `null | { message } | Response | data()-error-object` — callers
  must currently distinguish all four.
- **The C6 fix is in-scope.** Today, on an _expired_ token, `currentUser` returns
  a `data({ error }, { status: 401 })` object — **not** a `Response` — so
  `profile.tsx` treats it as a truthy user and renders a broken authed page
  instead of redirecting (auth review §3, C6). The spike depends on correct auth
  resolution, so fix this as part of building `requireUser`.
- `getAuthContext` builds on the existing live-resolution path: `currentUser` →
  `decrypt` → `registerToken` → `getCurrentPerson(rockCookie)`
  (`app/routes/auth/current-user.tsx`, `app/lib/.server/token.ts`,
  `app/lib/.server/authentication/rock-authentication.ts`).

### 4.2 `requireGroupLeader` — closes C1 (the authorization boundary)

New file: **`app/lib/.server/authentication/require-group-leader.ts`**.

```ts
export interface GroupLeadership {
  groupMemberId: number;
  groupRoleId: number;
  isLeader: true;
}

// Assert the current user is an ACTIVE LEADER of groupId.
// Returns leadership on success; THROWS AuthorizationError (-> 403) otherwise.
export const requireGroupLeader: (
  auth: AuthContext,
  groupId: number,
) => Promise<GroupLeadership>;
```

- **Deliberate design choice:** it takes an already-resolved `AuthContext`, **not**
  a `Request`, so callers must run `requireUser` first. This keeps the
  401-vs-403 ordering explicit and avoids a hidden second auth resolution. Do not
  "simplify" it to take a `Request`.
- Reference implementation (auth review): one Rock read, authorized as the user,
  uncached —
  `GroupMembers?$filter=GroupId eq {groupId} and PersonId eq {auth.personId} and GroupMemberStatus eq 1&$expand=GroupRole`,
  then require some member with `groupRole.isLeader === true`.
- **New error class** in `app/lib/.server/error-types.ts`, matching the existing
  shape (`AuthenticationError`, `RockAPIError` already live there):

  ```ts
  export class AuthorizationError extends Error {
    constructor(message: string, options?: { cause?: unknown }) {
      super(message, options);
      this.name = 'AuthorizationError';
    }
  }
  ```

  Map it to **403** in the route handler, mirroring how `authenticate.tsx` maps
  `AuthenticationError → 401` and `RockAPIError → its status` today.

> **Day 1 semantics check (do not skip).** Grep the `services` repo for the
> Apollos "is this user a leader of this group" resolver and **match
> `requireGroupLeader`'s semantics to it** — specifically:
>
> - **co-leaders** (multiple leader roles / more than one leader per group),
> - **deactivated / archived leaders** (`GroupMemberStatus`, `IsArchived`),
> - **group-hierarchy / parent-group** edge cases (does leading a parent group
>   confer leadership of a child?).
>
> The auth review assumed **`GroupMemberStatus eq 1` (Active)** as the standard
> Rock enum value but **could not verify it** against our instance. Treat that as
> an **inline spike check**, not a settled fact — confirm the enum value empirically
> (survey §"GroupMembers": the model exposes `GroupMemberStatus` as
> `Inactive/Active/Pending`; confirm the integer 1 maps to Active on our build).

### 4.3 `customHeaders?` on the four write helpers — enables write model (b)

The write helpers in `app/lib/.server/fetch-rock-data.ts` accept **no headers**
today (`RockDataRequest` = `{ endpoint, body, contentType? }`, lines 13-17). Add
an optional `customHeaders` so a guarded action can forward the user's cookie:

```ts
export const postRockData: (params: {
  endpoint: string;
  body: Record<string, unknown> | string;
  contentType?: string;
  customHeaders?: Record<string, string>; // NEW — e.g. { Cookie: auth.rockCookie }
}) => Promise<unknown>;
// same optional customHeaders on putRockData / patchRockData;
// deleteRockData currently takes a bare (endpoint: string) — extend to
// deleteRockData(endpoint, customHeaders?).
```

Note: `fetchRockData` **already** has `customHeaders`
(`FetchRockDataOptions.customHeaders`, `fetch-rock-data.ts:77`) and authenticated
reads already use it to pass `{ Cookie: rockCookie }`. The four write helpers are
the only ones missing it. Also note the pre-existing slash-handling inconsistency
(auth review "Minor"): `patchRockData`/`deleteRockData` prepend `/` to the
endpoint, `postRockData`/`putRockData` do not — get this right when adding calls.

### 4.4 User-scoped cache keys — closes C2 (needed for Q4)

Additions to **`app/lib/.server/cache-utils.ts`** (keep the existing `rock:`
namespace):

```ts
// Format: `rock:u{personId}:{endpoint}:{hash12}`. Same hashing/sorting as
// buildCacheKey (cache-utils.ts:56-77), under a per-user sub-namespace.
export function buildUserCacheKey(
  personId: string | number,
  endpoint: string,
  queryParams: Record<string, string | undefined>,
): string;

// Delete every cache entry for a user (logout, token change). SCAN over
// `rock:u{personId}:*` — no KEYS — mirroring deleteByPrefix (cache-utils.ts:147-173).
export function invalidateUser(
  redis: Redis | null,
  personId: string | number,
): Promise<number>;
```

Plus one option on `FetchRockDataOptions` to opt a read into the per-user
namespace:

```ts
interface FetchRockDataOptions {
  // ...existing fields (fetch-rock-data.ts:74-86)...
  cacheUserId?: string | number; // cache under buildUserCacheKey(cacheUserId, ...)
}
```

Wire-up at `fetch-rock-data.ts:217`:
`cacheUserId != null ? buildUserCacheKey(cacheUserId, endpoint, mergedQueryParams) : buildCacheKey(...)`.
`redis` is nullable and the app already degrades to direct API calls when Redis
is down (`app/lib/.server/redis-config.ts:50-64`) — preserve that.

### 4.5 The target call sequence (build toward this)

The auth review's **"How they compose"** snippet is the exact shape a guarded
write should take. Build toward it:

```ts
export const action = async ({ request, params }: ActionFunctionArgs) => {
  const auth = await requireUser(request); // 4.1 — 401 -> redirect
  await requireGroupLeader(auth, Number(params.groupId)); // 4.2 — not leader -> 403
  const result = await postRockData({
    // 4.3 — as the user
    endpoint: 'GroupMembers',
    body: {
      GroupId: params.groupId,
      PersonId: newMemberId,
      GroupRoleId,
      GroupMemberStatus: 1,
    },
    customHeaders: { Cookie: auth.rockCookie },
  });
  await invalidateUser(redis, auth.personId); // 4.4 (or group-scoped)
  return result;
};
```

### 4.6 Explicitly OUT of scope for the spike

The **token refresh flow** (auth review item D — two-cookie design primary,
single-cookie sliding-session alternative). The 24h-JWT-inside-a-400-day-cookie
problem (C3) is real — no refresh means users are silently logged out daily — but
it is **not required to prototype Manage Group Members.** Do **not** build it.
Its consequence is flagged under **Q5** (an auth expiry mid-flow must be
recognized as an auth expiry, not misdiagnosed as a write failure).

---

## 5. Prototype scope

- **Where:** a **single throwaway branch in `remix-web-app`**, as a temporary
  route (e.g. `app/routes/spike-manage-members/`). **Recommended over a new
  sandbox repo** because the whole point is to exercise the _real_ helpers, cache,
  and loader/action conventions in situ — a sandbox would force you to
  re-stub `fetchRockData`, Redis, token decryption, and the auth flow, which is
  most of what you're trying to evaluate. Keep the branch clearly disposable.
- **Minimum viable flow:** an authenticated **leader** (1) views a group's
  members, (2) adds a member by email or person-id lookup, (3) removes a member.
- **UI can be intentionally ugly.** No styling, no real UX.
- **Explicitly out of scope:** styling, real UX, resource management, non-member
  entity handling, and the token refresh flow (§4.6). Keep it narrow.

---

## 6. Research questions

Each question has explicit success criteria. Answer all six with evidence in the
final write-up (§9).

### Q1 — Does app-side authorization gate GroupMember writes, and does Rock honor a user credential at all?

This is the reframed core question. Because writes currently go out as the
service account, **Rock will not reject an unauthorized write** — so test the
**app-side gate**, and separately test whether a **per-user credential** is even
viable.

- **Write model (a) — service-account + app gate.** Verify `requireGroupLeader`
  (§4.2) **allows a leader and blocks a non-leader** _before_ the Rock call is
  made. Confirm the error response shape (**403** / `AuthorizationError`).
- **Write model (b) — user-cookie forwarded.** Using `customHeaders?` (§4.3) to
  forward `AuthContext.rockCookie`, test whether Rock's REST API **accepts it**
  and **enforces its own group security** on the write. This depends on **survey
  open-question #14** (is Rock auth cookie / OAuth / API-key in practice?). An
  app-issued JWT is **not** automatically a Rock-accepted credential — note the
  `remix-web-app` credential is `AES-CBC( JWT{ cookie: <Rock .ROCK cookie>, sessionId } )`;
  what you forward is the inner `.ROCK` forms-auth cookie. This may fail; document
  the **actual** behavior either way.
- **DELETE cascade (survey open-question #4).** Does `DELETE /api/GroupMembers/{id}`
  **cascade to Attendance/History**, or leave orphaned data? This bears directly
  on the "remove a member" step. Also evaluate the survey's alternative: a
  **soft remove** via `PATCH GroupMemberStatus: Inactive` or `IsArchived: true`
  instead of a hard `DELETE` — and note which legacy used (Q6/Day-1 reading).

**Success criteria:** documented behavior for **leader and non-leader in both
write models**, with example requests/responses; a clear statement of **which
model we can actually rely on**; and **documented DELETE cascade behavior** (plus
a recommendation on hard-delete vs. soft-remove).

**Effort split (recommended prior):** lead with **model (a)** — service-account
write + app-side `requireGroupLeader` gate — as the primary path to validate
fully. Treat **model (b)** (forwarding the user's `.ROCK` cookie via
`customHeaders?`) as a **time-boxed probe** (~half a day): does Rock accept the
forwarded cookie and enforce its own group security — yes or no? Because (b)'s
viability hinges on the unresolved survey open-question #14 (real Rock credential
type), don't sink equal effort into it, but do get a definitive yes/no — a
working (b) buys defense-in-depth worth having later.

### Q2 — Do Rock workflows fire correctly on REST-driven member changes?

- Investigate (via `legacy-my-groups` and `services` — §8) **which workflows fire
  today** when a member is added/removed via GraphQL. Verify the same fire
  through REST.
- **Survey open-question #12:** distinguish **"fires automatically on GroupMember
  create/delete"** (Rock `GroupMemberWorkflowTriggers`, configured server-side)
  from **"we must call `LaunchWorkflow` ourselves"** (explicit
  `POST /api/{Controller}/LaunchWorkflow/{id}` or
  `POST /api/Workflows/WorkflowEntry/{workflowTypeId}`). The existing
  connect-card action shows the explicit pattern already in use:
  `postRockData({ endpoint: 'Workflows/LaunchWorkflow/0?workflowTypeId=902...' })`
  (`app/routes/connect-card/action.ts:40-43`); see also
  `app/lib/.server/rock-workflow.ts`.
- To confirm auto-triggers, a human must check **Rock admin → group type →
  Member Workflow Triggers** for the GroupMember entity type.

**Success criteria:** a list of workflows **verified firing** — and **by which
mechanism** (automatic vs. explicit) — or a documented gap.

### Q3 — What's the payload and latency for realistic member lists?

- Confirm realistic group sizes: **small group ~10, class ~50, larger ministry
  ~200+**.
- Fetch member lists at each size; measure **payload size** and **load time**,
  **with and without field selection**.
- **v1/v2 axis (§3):** v1 uses OData `$select` / `$top` / `$skip`; v2 uses the
  query-object `search` endpoint (`EntitySearchQueryBag`). Test whichever you
  choose per-endpoint and **record which performed better** for this read.

**Success criteria:** a small **table of size vs. payload vs. latency**, and a
recommendation on **default page size** and **field-selection approach**.

### Q4 — What's the cache invalidation strategy for writes?

- On a member removal, **at least two cached entities are stale**: the group's
  member list, and the removed member's "my groups" list.
- **Cache-key caution (auth review C2):** keys currently omit the user
  (`buildCacheKey` hashes endpoint+params only, `cache-utils.ts:56-77`). Any
  per-user caching **must** go through `buildUserCacheKey` (§4.4) or it risks a
  cross-user leak (the `GetCurrentPerson` trap). Purely per-_group_ data ("members
  of group X") can stay in the shared namespace since `GroupId` in the query
  already discriminates the key.
- Propose and validate **one** invalidation strategy: TTL-only,
  `invalidateUser` (SCAN-based, §4.4), tag-based (cf. the content-item reverse
  index `invalidateItem`/`itemTagKey`, `cache-utils.ts:120-135`), or manual
  key invalidation via `deleteByPrefix` (`cache-utils.ts:147-173`).

**Success criteria:** a **working invalidation approach with rationale**, plus an
**honest assessment** of whether it feels sustainable or is already getting
complex (per Rule 12 — surface it, don't paper over it).

### Q5 — What are the failure modes?

- What happens if **Rock is slow / unavailable mid-write**? If a **workflow
  succeeds but the response times out**? Any risk of the UI showing **"success"
  on a partial failure**?
- **Token-lifetime trap (auth review C3), called out separately:** the
  24h-JWT-in-a-400-day-cookie issue means a session can **silently expire
  mid-flow**. The spike must **recognize an auth expiry as an auth expiry**, not
  misdiagnose it as a REST/write failure. (Refresh is out of scope §4.6 — but the
  _diagnosis_ is in scope here.)
- Note the operational reality: **Redis down ≠ hard failure** — the app falls
  back to direct API calls (`redis-config.ts:50-64`); and SMS rate-limiting
  silently no-ops when Redis is null (auth review "Minor"). Factor these into the
  failure-mode map.

**Success criteria:** a documented **list of failure modes and the app's handling
for each**, with the **auth-expiry case called out separately**.

### Q6 — What Rock REST gaps, if any, block the full flow?

- `legacy-my-groups` may do things stock REST doesn't expose cleanly: **group
  member attributes, role changes, notifications, group email.**
- **Attribute persistence (survey open-questions #6 / #10):** does setting
  `AttributeValues` in the **body** of a `POST`/`PUT` to `/api/GroupMembers` or
  `/api/People` actually **persist**, or is a **separate** attribute-value write
  always required (`POST /api/{Controller}/AttributeValue/{id}` v1, or
  `PATCH /api/v2/models/{entity}/{id}/attributevalues` v2)? **Verify empirically**
  — this determines whether "add a member with attributes" is **one call or two**.
  The survey's strong prior: attribute values are a **second-class, separate
  write** — expect two calls, but confirm.
- **v1/v2 coverage gap (§3):** `GroupTypeRoles` and `AttributeValues` have **no
  v2 route** — role lookups and attribute writes may force **v1** regardless of
  any v2 lean.
- **Role changes** use `PATCH`/`PUT /api/GroupMembers/{id}` setting `GroupRoleId`,
  with role ids from `GET /api/GroupTypeRoles?$filter=GroupTypeId eq {id}` (v1
  only).
- If `legacy-my-groups` does something this brief didn't anticipate, **add it
  here.**

**Success criteria:** an explicit **gap list** with a **proposed approach for
each** (extra REST call, custom Rock plugin endpoint, small utility service,
etc.).

---

## 7. Relevant Rock REST endpoints

Per the survey — note v1/v2 availability. Pick per-endpoint and document (§3).

| Need                         | Endpoint                                                                                                          | v2 available?                               |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Members of a group           | `GET /api/GroupMembers?$filter=GroupId eq {id}` (+`$top`/`$skip`)                                                 | ✅ `/api/v2/models/groupmembers` (`search`) |
| A user's groups              | `GET /api/GroupMembers?$filter=PersonId eq {id}&$expand=Group,GroupRole`                                          | ✅                                          |
| Add member                   | `POST /api/GroupMembers` — min body `GroupId`, `PersonId`, `GroupRoleId`                                          | ✅                                          |
| Remove member                | `DELETE /api/GroupMembers/{id}` (hard) **or** `PATCH` → `GroupMemberStatus: Inactive` / `IsArchived: true` (soft) | ✅                                          |
| Change role                  | `PATCH`/`PUT /api/GroupMembers/{id}` set `GroupRoleId`                                                            | ✅                                          |
| Role ids (e.g. "Leader")     | `GET /api/GroupTypeRoles?$filter=GroupTypeId eq {id}`                                                             | ❌ **v1 only**                              |
| Member/person attributes     | v1 `POST /api/{Controller}/AttributeValue/{id}` · v2 `PATCH /api/v2/models/{entity}/{id}/attributevalues`         | mixed                                       |
| Person lookup (add-by-email) | `GET /api/People/GetByEmail/{email}`, `GetByPersonAliasId/{id}`                                                   | ✅ (People)                                 |
| Current person               | `GET /api/People/GetCurrentPerson`                                                                                | —                                           |
| Trigger workflow (explicit)  | `POST /api/{Controller}/LaunchWorkflow/{id}` · `POST /api/Workflows/WorkflowEntry/{workflowTypeId}`               | ❌ no v2 on `Workflows`                     |

No dedicated "groups by person" endpoint exists (survey Key Finding #1); no
nested `GET /api/People/{id}/Groups` — relational reads go through `$filter` on
the child controller.

---

## 8. `legacy-my-groups` Manage implementation — read first

> **Note / Day 1 confirm:** `legacy-my-groups` and the `services` monorepo are
> **not in this spike branch's repo scope.** The paths below are carried from the
> auth review (§6), which consulted `legacy-my-groups` directly. **Confirm each
> path exists** when you open the legacy repo on Day 1; if a path has moved,
> record the correct one. Read these to understand what the flow must cover and
> to answer Q2 (workflows) and Q6 (attributes/roles/gaps).

`legacy-my-groups` is a Next.js 13 app (`package.json` name `web-app-v2`) talking
to **Apollos GraphQL**, not Rock directly. Authorization lived **server-side in
Apollos** (`services`), not in the client.

- **Group-member management (the flow to replicate):**
  - `hooks/useGroupMembers.js` — the `groupMembers(groupId)` query and the
    add/remove/update mutations.
  - `components/Modals/AddGroupMemberModal` — the add-member UI/flow.
  - `components/Modals/GroupMemberDetailsModal` — member detail / role / status /
    remove.
  - `components/.../GroupEmailComposer` — leader → members email (a Q6 candidate:
    Rock `Communications` surface, survey Tier 3).
- **Auth plumbing (for contrast, already covered by the auth review):**
  - `providers/AuthProvider.js`, `config/keys.js`, `lib/apolloClient/authLink.js`,
    `hooks/useAuthenticateCredentials.js`.
  - `rckipid` magic-link auth: `providers/AuthProvider.js` (`authenticateRockPersonId`).
  - Forgot/reset password: `pages/login/forgot/index.js`,
    `pages/login/reset-password/index.js` (absent in remix — not needed for this
    spike, but note for the broader My Groups plan).
- **The leader-authorization resolver (Q1 / §4.2 semantics check):** in the
  **`services`** monorepo. Grep for the group-leader permission check the Apollos
  group-member mutations run before touching Rock — that resolver's rules (active
  status, co-leaders, hierarchy) are the spec `requireGroupLeader` must match.

---

## 9. Existing `remix-web-app` patterns to reuse

- **Auth helpers being built (§4):** `app/lib/.server/authentication/` — new
  `require-user.ts`, `require-group-leader.ts`; existing
  `get-user-from-request.ts`, `current-user.tsx` (`app/routes/auth/`),
  `rock-authentication.ts`, `token.ts`, `error-types.ts`.
- **Rock calls:** `app/lib/.server/fetch-rock-data.ts` — `fetchRockData`
  (reads, already has `customHeaders`, line 77), and the write helpers
  `postRockData:345`, `putRockData:380`, `patchRockData:407`,
  `deleteRockData:314` (add `customHeaders` per §4.3).
- **Redis + cache:** `app/lib/.server/redis-config.ts` (nullable client, degrades
  gracefully) and `app/lib/.server/cache-utils.ts` (`TTL`, `buildCacheKey`,
  `deleteByPrefix`, `invalidateItem` — mirror these for the user-scoped additions
  in §4.4).
- **Loader/action conventions:**
  - Authed **loader** example: `app/routes/set-a-reminder/loader.ts:20-57`
    (resolves the user via `getUserFromRequest`, then `fetchRockData`). Your
    view-members loader replaces `getUserFromRequest` with `requireUser`.
  - Write **action** example: `app/routes/connect-card/action.ts:5-57`
    (`formData` → `postRockData` for a workflow launch → returns
    `Response`/`data({ error }, { status })` in a `try/catch`). Your add/remove
    actions follow this shape, gated by `requireUser` + `requireGroupLeader`
    first (§4.5). Other actions to skim: `app/routes/group-finder/action.tsx`,
    `app/routes/contact-us/action.ts`, `app/routes/baptism-sign-up/action.ts`.

---

## 10. Timeline & deliverables

The go/no-go hinges primarily on **Q1** (can we authorize and write at all) and
**Q2** (do workflows fire). Q3 (performance), Q4 (cache), and Q6 (gaps) inform
_how_ to build, not _whether_ — so if time compresses, protect Q1/Q2 depth and
take honest first-pass answers on the rest.

- **Day 0 — gate.** The three Rock-dev write-access checks above. Blocked here =
  stop and report.
- **Day 1 — orient.** Read both docs (§2). Determine the Rock CMS version (§3).
  Grep `services` for the leader resolver and reconcile `requireGroupLeader`
  semantics (§4.2). Verify the `GroupMemberStatus eq 1` assumption. Read the
  `legacy-my-groups` Manage implementation (§8).
- **Day 2–3 — build.** The minimal auth prerequisites (§4.1–4.4) and the
  prototype flow: view → add → remove (§5), composed per §4.5.
- **Day 4 — exercise, in priority order.** First **Q1 and Q2** (go/no-go
  critical) — authorization gate, both write models, DELETE cascade, workflow
  firing. Then **Q3/Q4/Q6** as lighter first passes. Track **Q5** failure modes
  throughout rather than as a separate step.
- **Day 5 — write up.** Answer Q1–Q6 with evidence; end with go/no-go.

**Realistic duration:** 5 days is a floor, not a target. If Q1 model (b),
attribute persistence, or DELETE cascade throw surprises, expect Day 4 to spill
into Day 5 and the write-up to compress — that's fine, protect the Q1/Q2
evidence over polish.

**Final deliverable:** a markdown doc at
**`docs/architecture/spike-manage-group-members.md`** — in the new My Groups repo
if it exists by then, otherwise in `remix-web-app`. It must answer **Q1–Q6 with
evidence** (example requests/responses, the size/payload/latency table, the
failure-mode map, the gap list) and end with a **go/no-go recommendation** for
building My Groups on **REST + Redis + React Router v7**.

---

## 11. Open Day 1 questions (surfaced, not papered over)

1. **Rock CMS version** — not in Swagger; determine it Day 1 (§3, survey #5).
2. **`GroupMemberStatus` enum** — is `1` = Active on our build? Verify (§4.2).
3. **Leader semantics** — co-leaders, deactivated/archived leaders,
   parent/child-group inheritance: match the `services` Apollos resolver (§4.2, §8).
4. **Rock credential type** — does Rock REST accept the forwarded `.ROCK` cookie
   for writes, or is it OAuth/API-key in practice? (Q1 write model (b), survey #14.)
5. **DELETE cascade** — Attendance/History orphaning on hard delete (Q1, survey #4).
6. **Attribute persistence** — inline on create, or a mandatory second call? (Q6,
   survey #6/#10.)
7. **Auto-fired workflows** — any `GroupMemberWorkflowTriggers` configured for the
   GroupMember entity type? (Q2, survey #12.)
8. **`legacy-my-groups` path confirmation** — the §8 paths are carried from the
   auth review; confirm them against the legacy repo when it's in scope.

---

## Day 0 findings

**Day 0 — gate result: PASS.** All three Rock dev write-access checks passed on
`dev-rock.christfellowship.church`. Findings below go beyond pass/fail and
correct several assumptions in the brief and auth-review.

### Environment / identity

- **Auth:** Option A, `Authorization-Token: $ROCK_TOKEN` (service account).
  `GET /api/People/GetCurrentPerson` returned `personId` 389650,
  `primaryAliasId` 389595, name `"apollos"`. This is the service account, not a
  test leader — correct identity for write model (a), but app-side leader
  authorization (`requireGroupLeader`, Day 2–3) is still untested.

### OData / query findings (affect `requireGroupLeader`, §4.2)

- `GroupMemberStatus eq 1` in an OData `$filter` returns **HTTP 400**
  (`Edm.String` vs `Edm.Int32`). Must use `GroupMemberStatus eq 'Active'` or
  `'Inactive'`. The brief's and auth-review's `GroupMemberStatus eq 1` reference
  filter is **wrong for this Rock instance**.
- **Nuance:** `$filter` requires the string enum, but entity JSON returns
  numeric (`0`/`1`), and write payloads accept numeric (`GroupMemberStatus: 1`
  worked on `POST`). Same field, different representation depending on context.
- `$expand=Group` on `GroupMembers` errors — `Group` is not a navigation
  property on `Rock.Model.GroupMember`. Fetch the group separately via
  `GET /api/Groups/{id}`. `$expand=GroupRole` works (needed for the `isLeader`
  check).
- **Corrected `requireGroupLeader` filter:**
  `GroupMembers?$filter=GroupId eq {groupId} and PersonId eq {personId} and GroupMemberStatus eq 'Active'&$expand=GroupRole`

### Write-path shape (affects Q1 and the §4.5 action)

- `POST /api/GroupMembers` returns a **bare integer id** (e.g. `8862280`), not
  entity JSON, and no `Location` header. To confirm or return member state, the
  action must `GET`-by-id after `POST`. This makes an add **2 round-trips**
  (`POST` + `GET`) — relevant to Q3.
- `PATCH /api/GroupMembers/{id}` returns **204** with an empty body. Confirm
  state via a follow-up `GET`.
- Gate reversal used `PATCH` → Inactive (soft remove), not `DELETE`. `DELETE`
  cascade behavior remains unverified (Q1, survey #4).

### Workflows (Q2 — preliminary, per-group-type)

- Group type **31** (a primary group type) has **4** active GroupMember workflow
  triggers:
  - **"Web and App Cache Flush"** (Group Member Cache Clear) on Member
    Added/Active and Member Removed
  - **"Activity Indicators for Data Automation"** (Write Interaction) on
    Added/Active and Added/Pending
- **Open question (top Q2 priority for Day 4):** after a confirmed REST `POST`,
  no visible workflow run entry was found for the Activity Indicator workflow.
  Undetermined whether REST writes don't trip the triggers the way UI writes do,
  or whether these are no-persist workflows that leave no run log. Resolve Day 4.
- **Q4 input:** two triggers already flush some web/app cache on member change.
  Determine Day 4 whether that flush touches our Redis-via-Vercel or only legacy
  cache.
- These findings are **per-group-type**; triggers vary by type and are not
  global.
