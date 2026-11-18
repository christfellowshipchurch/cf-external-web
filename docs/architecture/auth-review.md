# Authentication Architecture Review — `remix-web-app`

> **Outdated:** the login code this describes was removed in CFDP-4542 (it was not migrated to Rock v2). File references below no longer exist.

**Purpose:** Document how authentication currently works in `remix-web-app` and
evaluate its fitness as the foundation for the new **My Groups** app (React
Router v7 + direct Rock REST + Redis, fully authenticated, with write
operations).

**Scope:** Research only — no code was changed. Every significant claim cites a
file path. Where the code does not answer a question, that is stated explicitly
rather than guessed.

**TL;DR:** A working email + SMS login flow exists and stores a Rock session
cookie inside an encrypted, signed JWT in an HttpOnly cookie. It is sound for
_read-as-current-user_ scenarios but has three gaps that block My Groups as-is:
(1) **all write helpers execute as the app service account (`ROCK_TOKEN`), not
as the logged-in user, and there is no application-level authorization layer** —
so nothing stops one logged-in user from writing another group's data;
(2) the **Redis cache key does not include the user**, which is safe today only
because per-user reads bypass the cache, but is a cross-user-leak trap the
moment My Groups caches "my groups"; (3) the **token lifetime is contradictory**
(24h JWT inside a 400-day cookie) with no refresh, so users are silently logged
out daily. Details and recommendations below.

---

## 1. Login flow end-to-end

### Route entry point

All auth form submissions funnel through a single action:
`app/routes/auth/route.tsx`. It reads `formType` from the posted `FormData` and
dispatches (`app/routes/auth/route.tsx:20-78`):

| `formType`        | Handler                                                              |
| ----------------- | -------------------------------------------------------------------- |
| `authenticate`    | `authenticate()` — `app/routes/auth/authenticate.tsx`                |
| `requestSmsPin`   | `requestSmsPinLogin()` — `app/routes/auth/request-sms-pin-login.tsx` |
| `loginWithSms`    | `authenticateSms()` — `app/routes/auth/authenticate-sms.tsx`         |
| `currentUser`     | `currentUser()` — `app/routes/auth/current-user.tsx`                 |
| `logout`          | inline in `route.tsx:53-62`                                          |
| `checkUserExists` | `userExists()` — `app/routes/auth/userExists.tsx`                    |
| `registerPerson`  | `registerPerson()` — `app/routes/auth/register-person.tsx`           |

The client side of these calls lives in the `AuthProvider`
(`app/providers/auth-provider/index.tsx`), which `fetch`es `/auth` with the
matching `formType`.

### Email/password login — Rock endpoints & payload

`authenticate()` → `authenticateUser()`
(`app/lib/.server/authentication/authenticate-user.ts:14`) runs three steps:

1. **`fetchUserCookie(identity, password)`**
   (`app/lib/.server/authentication/rock-authentication.ts:17-68`)
   `POST ${ROCK_API}/Auth/Login` with body:

   ```json
   { "Username": "...", "Password": "...", "Persisted": true }
   ```

   Rock does **not** return a token in the body. It returns a **`set-cookie`
   header** (Rock's `.ROCK` forms-auth cookie), which is read verbatim from
   `response.headers.get('set-cookie')` (`rock-authentication.ts:51`). That
   cookie string _is_ the credential.

2. **`createRockSession(cookie)`**
   (`rock-authentication.ts:120-171`) first calls
   `getCurrentPerson(cookie)` (`People/GetCurrentPerson`, uncached) to obtain
   `primaryAliasId`, then `POST ${ROCK_API}InteractionSessions` with
   `{ PersonAliasId }` — **authenticated with the app-level `ROCK_TOKEN`, not the
   user cookie** (`rock-authentication.ts:134-143`). Returns a session object
   with a numeric `id`.

3. **`generateToken({ cookie, sessionId })`**
   (`app/lib/.server/token.ts:43-60`) signs a JWT (HS256, `SECRET`, issuer/
   audience `cfc-web`, `expiresIn: '24h'`) whose payload holds the raw Rock
   cookie and the session id. That JWT is then AES-256-CBC encrypted via
   `encrypt()` (`app/lib/.server/encrypt.tsx`) and returned as `encryptedToken`.

So the credential that ends up in the browser is:
`AES-CBC( JWT{ cookie: <Rock .ROCK cookie>, sessionId } )`.

### What Rock returns on success

- `/Auth/Login`: **no body token** — a forms-auth **cookie** in the `set-cookie`
  header. Expiry is governed by Rock's forms-auth config (not surfaced here);
  `Persisted: true` requests a persistent cookie.
- `InteractionSessions`: a JSON object typed as `RockSessionResponse`
  (`rock-authentication.ts:113-118`) with `id`, `personAliasId`, optional
  `sessionData`. Only `id` is used.
- `People/GetCurrentPerson`: a person object; only
  `id, guid, firstName, lastName, email, primaryAliasId` are typed/consumed
  (`rock-authentication.ts:70-77`).

### SMS (passwordless) login

Two-step, in `app/lib/.server/authentication/sms-authentication.ts` and
`.../authenticate-or-register-with-sms.ts`:

1. **Request PIN** — `requestSmsLogin(phoneNumber)`
   (`sms-authentication.ts:138-228`): rate-limited via Redis (5/hour per number,
   `sms-authentication.ts:150-160`); generates a 6-digit PIN with
   `crypto.randomInt` (`sms-authentication.ts:60-69`); the PIN's
   **HMAC-SHA256(pin, SECRET)** becomes a Rock `UserLogin` password
   (`hashPassword`, `sms-authentication.ts:48-58`); any existing login for the
   number is deleted and recreated (`sms-authentication.ts:169-197`); PIN is sent
   via Twilio (`sms-authentication.ts:207-222`).
2. **Verify PIN** — `authenticateOrRegisterWithSms({ pin, phoneNumber, ... })`
   (`authenticate-or-register-with-sms.ts:16-76`): rate-limited (10/hour per
   number); re-derives the HMAC as the "password" and calls the same
   `authenticateUser(phoneNumber, hashedPin)` path as email login. Returns
   `{ encryptedToken, personId }`.

The design comment (`sms-authentication.ts:53-56`) explains bcrypt/argon2 can't
be used because Rock's `/Auth/Login` does an internal equality check, so a keyed
HMAC + rate limiting is the chosen mitigation.

### Registration / account creation

`registerPerson()` (`app/routes/auth/register-person.tsx`) validates input with
Zod (`register-person.tsx:7-18`) and branches:

- **`email`** → `registerPersonWithEmail()`
  (`rock-authentication.ts:238-285`): guards against existing user
  (`checkUserExists`), creates a `People` record with `RecordStatusValueId: 5`
  ("pending", to trigger Rock's dedupe — `rock-authentication.ts:181-188`),
  optionally creates a `PhoneNumbers` record, creates a `UserLogins` record
  (`EntityTypeId: 27`, `PlainTextPassword`), then logs the user in.
- **`sms`** → `authenticateOrRegisterWithSms()` (same path as SMS login;
  creates the person/login on the fly if needed).

### Password reset / "forgot password"

**None exists in `remix-web-app`.** No route, handler, or Rock call for
forgot-password or password reset was found. (This is a gap vs. `legacy-my-groups`
— see §6.)

### Error handling

- `fetchUserCookie`: `401` → `AuthenticationError('Invalid credentials')`; other
  non-OK → `RockAPIError(status)`; missing cookie → `RockAPIError(500)`
  (`rock-authentication.ts:40-67`).
- `authenticate.tsx:40-55` maps `AuthenticationError`→401,
  `RockAPIError`→its status, `EncryptionError`→400, unknown→500.
- `requestSmsPinLogin` additionally maps `RateLimitError`→429
  (`request-sms-pin-login.tsx:23-25`).
- **Inconsistency:** `authenticate-sms.tsx:20-26` `throw`s a `new Error(JSON.stringify(...))`
  for the missing-field case instead of returning `data(...)` like every other
  handler. Minor, but it means the missing-field branch is shaped differently
  from the rest.

---

## 2. Session / token storage

### Where the token lives

An **HttpOnly cookie named `auth-token`** (`AUTH_TOKEN_KEY`,
`app/providers/auth-provider/index.tsx:16`). It is set via a `Set-Cookie`
response header on every successful login/register response, e.g.
`authenticate.tsx:32-38`:

```
Set-Cookie: auth-token=<encryptedToken>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=34560000
```

(`Secure` is appended only when `NODE_ENV === 'production'`.) There is **no
server-side session store** — the encrypted JWT is self-contained and carries
the Rock cookie inside it.

### Cookie attributes

| Attribute  | Value                                      |
| ---------- | ------------------------------------------ |
| `HttpOnly` | ✅ always                                  |
| `Secure`   | ✅ prod only (`NODE_ENV === 'production'`) |
| `SameSite` | `Strict`                                   |
| `Path`     | `/`                                        |
| `Max-Age`  | `34560000` (**400 days**)                  |

Set identically in `authenticate.tsx:37`, `authenticate-sms.tsx:40`,
`register-person.tsx:61` and `:91`.

### ⚠️ Token-lifetime contradiction

The **cookie** lives 400 days, but the **JWT inside it expires in 24h**
(`token.ts:54-58`, `expiresIn: '24h'`; the code comment at `token.ts:50-53`
confirms this was deliberately reduced from 400d). After 24h:

- `parseToken` throws `TokenExpiredError`;
- `registerToken` catches it and returns `{}` (`token.ts:30-32`);
- `currentUser` then throws `AuthenticationError('rockCookie is undefined')`
  (`current-user.tsx:25-29`).

So the browser keeps sending a cookie that has been dead for up to 399 days,
and the user is effectively logged out after 24h with **no refresh mechanism**.

### Refresh

**None.** `token.ts:51-53` explicitly flags this as a TODO ("consider adding a
refresh token flow"). Expiry = full re-login.

### Logout

Client `logout()` (`auth-provider/index.tsx:173-179`) POSTs `formType=logout`;
the server (`route.tsx:53-62`) returns a `Set-Cookie` that clears `auth-token`
(`Max-Age=0`). This is a **client-cookie clear only** — there is **no
server-side revocation**: the Rock `.ROCK` persisted cookie embedded in the JWT
and the `InteractionSession` remain valid on Rock's side until they expire
naturally. If the encrypted token had leaked, it would remain usable until the
24h JWT expiry.

---

## 3. Authenticated request pattern

### Retrieving the current user's token in a loader

`getUserFromRequest(request)`
(`app/lib/.server/authentication/get-user-from-request.ts`) is the only helper.
It regex-extracts `auth-token` from the `Cookie` header
(`get-user-from-request.ts:9-11`) and calls `currentUser(token)`.

### Resolving "current user"

`currentUser(token)` (`app/routes/auth/current-user.tsx`):

1. `decrypt(token)` → JWT string;
2. `registerToken(decrypted)` → `{ rockCookie, sessionId }` (`token.ts:20-41`);
3. `getCurrentPerson(rockCookie)` → `People/GetCurrentPerson` **using the user's
   cookie** (`current-user.tsx:31`, `rock-authentication.ts:79-111`);
4. **two more uncached calls** — `PhoneNumbers` by `PersonId`
   (`current-user.tsx:35-44`) and `People?$expand=Photo`
   (`current-user.tsx:47-57`) — to assemble a `User`
   (`current-user.tsx:71-80`). Note `guid`, `birthDate`, `gender` are returned
   empty (`current-user.tsx:76-79`; TODO at `:68-70`).

So "current user" is resolved **live from Rock on every call** via the cookie —
not cached, not stored in a session table.

### The authenticated-call helper

**There is no dedicated authenticated-Rock-call wrapper.** The generic
`fetchRockData(...)` (`app/lib/.server/fetch-rock-data.ts:181`) accepts a
`customHeaders` option, and authenticated reads pass `{ Cookie: rockCookie }`
plus `ttl: TTL.NONE` by hand (see `current-user.tsx:38-43, 52-56` and
`getCurrentPerson` at `rock-authentication.ts:85-92`, which additionally sends
`'Authorization-Token': ''` to suppress the default app token).

Signature (`fetch-rock-data.ts:73-86`):

```ts
fetchRockData({ endpoint, queryParams?, customHeaders?, cache?, ttl?,
                filterByDateRange?, filterByStatusApproved? })
```

Default headers are `Content-Type` + `Authorization-Token: ROCK_TOKEN`
(`fetch-rock-data.ts:20-23`); `customHeaders` are spread _after_, so a caller can
override/add the `Cookie`.

### 🚩 Write helpers ignore the user entirely

`postRockData`, `putRockData`, `patchRockData`, `deleteRockData`
(`fetch-rock-data.ts:314-424`) **hard-code `Authorization-Token: ROCK_TOKEN` and
accept no `customHeaders`**. There is no way to make a write execute as the
logged-in user. Every write today runs as the **application service account**.
This is the single most important fact for My Groups (see Fitness §1 and
Concerns C1).

### Missing/expired token in a loader — redirect pattern

Two consumers, handled ad hoc:

- **`app/routes/profile.tsx:16-36`**: `if (!userData) return redirect('/')`.
- **`app/routes/navbar/loader.tsx:233-259`**: shape-checks the result and
  degrades to `parsedUserData = null`.
- **`app/routes/set-a-reminder/loader.ts:24`**: `(await getUserFromRequest(request)) || null`.

`getUserFromRequest` has a **confusing return contract**: `null` (no token,
redirect expected), `{ message: 'Token not found!' }` (when `?redirect=false`),
or the `currentUser` result — which is itself either a **`Response`** (success)
or a **`data()` error object** (failure). Callers must distinguish all of these.

🚩 **Bug:** on an **expired** token, `currentUser` returns
`data({ error }, { status: 401 })` — not a `Response` instance. In
`profile.tsx`, `userData` is then truthy and `!(userData instanceof Response)`,
so it falls through to `return { user: userData }` (`profile.tsx:32-35`) and the
page renders with `user` = the error object (empty name/email) instead of
redirecting to log in. See Concerns C6.

---

## 4. Authorization

**There is no application-level authorization.** The codebase enforces only
"is there a resolvable user" and does so inconsistently (each loader decides).
No role checks, no ownership checks, no group-leader checks exist anywhere in
`app/`. (`grep` for `role`, `requireUser`, `requireAuth`, ownership guards
returns nothing relevant.)

Authorization is **partly delegated to Rock, but only for reads**:

- **Reads** that pass the user `Cookie` (e.g. `getCurrentPerson`) are evaluated
  by Rock under that user's permissions.
- **Writes** do **not** pass the user cookie — they use `ROCK_TOKEN`
  (§3) — so Rock authorizes them as the **service account**, which typically has
  broad/admin rights. Rock therefore does **not** constrain a write to what the
  logged-in user is allowed to do.

Net: for writes, neither the app nor Rock enforces per-user authorization today.

---

## 5. Redis interaction with auth

### What is cached

Redis (`app/lib/.server/redis-config.ts`) backs:

- **Content reads** via `fetchRockData` (default `ttl: TTL.DEFAULT` = 3600s)
  (`fetch-rock-data.ts:223-298`).
- **SMS rate-limit counters**: `sms:pin_request:<number>` and
  `sms:login_attempt:<number>` (`sms-authentication.ts:151`,
  `authenticate-or-register-with-sms.ts:25`).

**Per-user profile data is deliberately _not_ cached today** — every
authenticated read passes `ttl: TTL.NONE` (`current-user.tsx:43, 56`;
`getCurrentPerson` at `rock-authentication.ts:92`).

### 🚩 Cache key does not include the user

`buildCacheKey(endpoint, queryParams)` (`app/lib/.server/cache-utils.ts:56-77`)
hashes **only the endpoint + query params**. `customHeaders` (i.e. the user
`Cookie`) are **not part of the key** (`fetch-rock-data.ts:217-220`).

Consequences:

- Per-user data keyed by an explicit user-scoped param (e.g.
  `GroupMembers?$filter=PersonId eq 123`) is _incidentally_ safe — the differing
  `$filter` yields a different key.
- Per-user data behind a **user-agnostic URL** is **not** safe. The clearest
  example is `People/GetCurrentPerson`: the URL/params are identical for every
  user, so if it were ever cached with `ttl > 0`, the first user's record would
  be served to everyone. It is safe _only_ because it currently uses
  `TTL.NONE`. This is a latent cross-user-leak trap, not a present leak.

### Invalidation

`cache-utils.ts` provides `invalidateItem` (reverse-index by content-item id,
`cache-utils.ts:120-135`) and `deleteByPrefix` (SCAN-based, `:147-173`). Both are
oriented around **content items**, not users. There is **no user-scoped
invalidation and no cache flush on logout or token change** — again a non-issue
today only because per-user data isn't cached.

---

## 6. Comparison with `legacy-my-groups`

`legacy-my-groups` is a Next.js 13 app (`package.json` name `web-app-v2`) that
talks to the **Apollos GraphQL** API (`NEXT_PUBLIC_APOLLOS_API`), not Rock
directly.

- **Token storage:** plain **`localStorage`** under the same key name
  `auth-token` (`config/keys.js`, `providers/AuthProvider.js:47-52`) — **not**
  HttpOnly, readable by JS. Sent as an `authorization` header on every GraphQL
  request via Apollo's `authLink` (`lib/apolloClient/authLink.js`).
- **Login:** GraphQL mutations against Apollos, e.g.
  `authenticate(identity, password){ token }`
  (`hooks/useAuthenticateCredentials.js`). Also supports **`rckipid` deep-link
  auth** — a Rock impersonation Person ID in the URL is exchanged for a token via
  `authenticateRockPersonId` (`providers/AuthProvider.js:76-100`). This powers
  magic-link entry from Rock emails.
- **Forgot / reset password:** **exists** — `pages/login/forgot/index.js` and
  `pages/login/reset-password/index.js`.
- **Authorization:** entirely **server-side in Apollos** (the `services`
  monorepo). The client issues `groupMembers(groupId)` queries and group
  mutations (`hooks/useGroupMembers.js`, `components/Modals/AddGroupMemberModal`,
  `GroupMemberDetailsModal`, `GroupEmailComposer`, etc.); the Apollos resolvers
  resolve the current user from the token and enforce group-leader permissions
  before touching Rock. The browser never holds Rock credentials and never calls
  Rock directly.

### Gap list — what legacy does that remix's REST auth does _not_ yet handle

1. **Per-user server-side authorization.** Apollos authorized every read/write as
   the token's user. In remix, writes run as the service account and nothing
   enforces leader/ownership (§4). **This is the defining gap.**
2. **Group-member management operations** (add/remove/update member, member
   statuses, group email) — these exist end-to-end in legacy through authorized
   resolvers; in remix there is no authorized write path for them.
3. **Forgot / reset password.** Present in legacy, absent in remix (§1).
4. **`rckipid` magic-link auth** from Rock emails. Present in legacy, absent in
   remix. (Flag for product: My Groups onboarding may rely on it.)

(remix does add things legacy lacks: HttpOnly cookie storage, SMS PIN login,
server-side encryption of the token, and Redis-based rate limiting.)

---

## Fitness evaluation for My Groups

### 1. Does the pattern extend cleanly to authenticated writes? — **No, needs extension.**

My Groups needs group leaders to `POST/PATCH/DELETE` `/api/GroupMembers` etc. as
themselves. Today's write helpers can't do that: they send `ROCK_TOKEN` and
accept no user cookie (§3). Two things are missing:

- a way to make writes carry the user's Rock cookie (or otherwise run under the
  user), **or** a deliberate decision to keep writes on `ROCK_TOKEN` _plus_ an
  app-level authorization layer; and
- that **authorization layer** itself (verify the caller actually leads the group
  before writing), which does not exist at all (§4).

Without both, any authenticated user could drive a write against any group.

### 2. Does the pattern support per-user data caching safely? — **Not by default; caches must be user-scoped explicitly.**

The cache key ignores the user (§5). "My group list" and "members of group X"
will be cached heavily in My Groups. Safe caching requires that **every
per-user/per-group cache entry encodes the discriminator in the key** (PersonId,
GroupId). Relying on Rock-cookie-scoped responses while the key ignores the
cookie is exactly the `GetCurrentPerson` trap. There is also no logout/token-
change invalidation, so stale personal data can persist after logout.

### 3. Gaps / weaknesses to address before building on this — direct list

- **C1 (critical):** writes run as the service account; no per-user authorization
  (§3, §4).
- **C2 (critical):** cache key omits the user → cross-user leakage risk once
  per-user data is cached (§5).
- **C3 (moderate):** 24h JWT vs 400-day cookie, no refresh → daily silent logout
  (§2). Unacceptable UX for an app people live in.
- **C4 (moderate):** logout doesn't revoke the Rock session/cookie (§2).
- **C5 (moderate):** no forgot/reset-password or `rckipid` flow (§1, §6).
- **C6 (moderate):** `getUserFromRequest` return contract is ambiguous and the
  expired-token path renders a broken authed page instead of redirecting (§3).
- **C7 (perf):** 3 sequential uncached Rock calls per user resolution, on every
  authenticated request (§3) — costly when every page is authenticated.

### 4. Recommendations (proportional — extend, don't rewrite)

- **C1:** Decide the write-authorization model explicitly. Simplest extension:
  (a) add a `requireGroupLeader(user, groupId)` guard (one Rock read of
  `GroupMembers` filtered to the user + leader role) that every group mutation
  action calls first; and (b) either add an optional `customHeaders`/`asUser`
  parameter to the write helpers so writes carry the user cookie, or consciously
  keep `ROCK_TOKEN` for writes _and_ treat the app guard as the sole
  authorization boundary. Document whichever you pick — do not leave it implicit.
- **C2:** Introduce a small user-scoped cache convention: namespace per-user keys
  (e.g. `user:{personId}:...`) or require a `PersonId`/`GroupId` in the cache
  key, and add a `deleteByPrefix('...user:{personId}')` call on logout. Keep
  `GetCurrentPerson`-style user-agnostic endpoints at `TTL.NONE`.
- **C3:** Add a refresh flow (short access JWT + longer refresh token in an
  HttpOnly cookie, per the TODO at `token.ts:51-53`), or at minimum align the
  cookie `Max-Age` with the JWT lifetime so the two agree.
- **C4:** On logout, best-effort revoke the Rock session/cookie server-side in
  addition to clearing `auth-token`.
- **C5:** Port forgot/reset-password; confirm with product whether `rckipid`
  magic-link entry is required for My Groups onboarding.
- **C6:** Add a single `requireUser(request)` helper that returns a typed `User`
  or throws a `redirect('/login')`, and have loaders use it. Fix the
  expired-token branch so it redirects rather than rendering.
- **C7:** Cache the assembled `User` for a short TTL under a user-scoped key
  (ties into C2), and/or collapse the 3 calls into fewer Rock requests.

---

## Concerns (bugs / security)

- **C1 — Writes bypass per-user authorization (high).** All write helpers use
  `ROCK_TOKEN` and there is no app-level authz. Any logged-in user could perform
  writes Rock would otherwise deny for them. `fetch-rock-data.ts:345-424`, §4.
- **C2 — Cache key omits the authenticated user (high, latent).** `buildCacheKey`
  hashes endpoint+params only. Safe today only because per-user reads use
  `TTL.NONE`; any future cached user-agnostic-URL read (e.g. `GetCurrentPerson`)
  leaks across users. `cache-utils.ts:56-77`, `fetch-rock-data.ts:217-220`.
- **C3 — Token lifetime contradiction (medium).** 24h JWT inside a 400-day
  cookie; no refresh → silent daily logout, and a long-lived stale cookie.
  `token.ts:54-58` vs `authenticate.tsx:37`.
- **C4 — Logout does not revoke server-side (medium).** Only the browser cookie
  is cleared; the Rock persisted cookie/session inside the JWT stays valid.
  `route.tsx:53-62`.
- **C6 — Expired-token loader path renders broken authed page (medium).**
  `currentUser` returns a `data()` error object (not a `Response`) on expiry;
  `profile.tsx` treats it as a user. `current-user.tsx:88-96`, `profile.tsx:24-35`.
- **Minor — AES-256-CBC without an authentication tag.** Integrity relies on the
  inner HS256 JWT signature; AES-GCM would be self-authenticating.
  `encrypt.tsx`/`decrypt.tsx`. Also `CRYPTO_SECRET` must be exactly 32 chars
  because it is used as `Buffer.from(CRYPTO_SECRET)` (utf8) for a 256-bit key —
  fragile, undocumented invariant.
- **Minor — inconsistent endpoint slash handling.** `patchRockData`/
  `deleteRockData` insert a `/` before the endpoint while `postRockData`/
  `putRockData`/`fetchRockData` do not (`fetch-rock-data.ts:316, 350, 381, 408`),
  and `createRockSession` relies on `ROCK_API` ending in `/`
  (`rock-authentication.ts:134`). Easy to get wrong when adding My Groups calls.
- **Minor — rate limiting silently disabled when Redis is down.** SMS PIN
  request/verify limits no-op (with a warning) if `redis` is null
  (`sms-authentication.ts:161-165`, `authenticate-or-register-with-sms.ts:35-39`).
  Acceptable, but note it before relying on it as the brute-force mitigation.
- **Note (not verified here):** `Auth/Login` is sent
  `Content-Type: Application/Json` and the persisted Rock cookie is stored inside
  the JWT payload in cleartext (then encrypted at rest in the cookie). The Rock
  forms-auth cookie's own expiry/attributes are set by Rock and were not
  inspectable from this repo.

---

## Proposed helper APIs (for the My Groups spike)

These are the concrete signatures the recommendations above imply, written to
match existing conventions (option-object params like `fetchRockData`, the
`AuthenticationError`/`RockAPIError` hierarchy in `error-types.ts`, the `rock:`
cache namespace in `cache-utils.ts`, and the `generateToken`/`registerToken`
split in `token.ts`). They are proposals to _exercise_ in the spike, not merged
code. Each entry says which Concern it closes.

### A. `requireUser` / `getAuthContext` — closes C6, enables C1 & C7

New file: `app/lib/.server/authentication/require-user.ts`. Replaces the
ambiguous `getUserFromRequest` return contract with one server-side context that
also carries the Rock cookie (so writes can act _as_ the user) and the ids the
group guards need.

```ts
export interface AuthContext {
  /** Rock PersonId (from People/GetCurrentPerson). */
  personId: number;
  /** Rock PersonAliasId — required in many write payloads (e.g. GroupMembers). */
  primaryAliasId: number;
  /** Identity fields GetCurrentPerson already returns; no extra Rock calls. */
  firstName?: string;
  lastName?: string;
  email?: string;
  /**
   * SERVER-ONLY. The decrypted Rock forms-auth cookie. Pass as
   * `customHeaders: { Cookie: rockCookie }` to fetchRockData / the write helpers
   * to have Rock authorize the call as this user. Never serialize to the client.
   */
  rockCookie: string;
  /** Rock InteractionSession id captured at login. */
  sessionId: string;
}

/**
 * Resolve the auth context from the request cookie, or null when the request is
 * unauthenticated OR the token is expired/invalid. Never throws for auth failure
 * (contrast with today's mixed null | {message} | Response | data() returns).
 * One Rock call (People/GetCurrentPerson), uncached.
 */
export const getAuthContext = (request: Request): Promise<AuthContext | null>;

/**
 * Require an authenticated user. Returns the context, or THROWS a
 * redirect(...) Response for the loader/action to propagate (fixes C6: expired
 * tokens redirect to login instead of rendering a broken authed page).
 *   - loginPath: where to send anonymous users (default '/').
 *   - returnTo:  when true, append ?returnTo=<current path+search> to loginPath.
 */
export const requireUser: (
  request: Request,
  options?: { loginPath?: string; returnTo?: boolean },
) => Promise<AuthContext>;
```

Companion (C7): once `AuthContext` exists, the client-facing `currentUser`
(`app/routes/auth/current-user.tsx`) should be refactored to build on
`getAuthContext` and the assembled `User` cached briefly under a user-scoped key
(see C below), collapsing the 3-calls-per-request cost.

### B. `requireGroupLeader` — closes C1

New file: `app/lib/.server/authentication/require-group-leader.ts`. The
application-level authorization boundary that does not exist today. Takes an
already-resolved `AuthContext` so it composes explicitly after `requireUser`.

```ts
export interface GroupLeadership {
  /** The caller's GroupMember row id for this group. */
  groupMemberId: number;
  groupRoleId: number;
  isLeader: true;
}

/**
 * Assert the current user is an ACTIVE LEADER of `groupId`. Returns the
 * leadership record on success; THROWS AuthorizationError (mapped to 403 by the
 * route handler, mirroring how AuthenticationError -> 401 is handled today) when
 * the user is not an active leader.
 *
 * Implementation: one Rock read, authorized as the user, uncached —
 *   GroupMembers?$filter=GroupId eq {groupId} and PersonId eq {auth.personId}
 *     and GroupMemberStatus eq 1&$expand=GroupRole
 * then require some member with groupRole.isLeader === true.
 * (GroupMemberStatus 1 = Active; verify the enum value against this Rock instance
 *  during the spike.)
 */
export const requireGroupLeader: (
  auth: AuthContext,
  groupId: number,
) => Promise<GroupLeadership>;
```

New error class in `app/lib/.server/error-types.ts` (matches the existing shape):

```ts
export class AuthorizationError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'AuthorizationError';
  }
}
```

**Companion change C1 needs (write-as-user):** the write helpers in
`app/lib/.server/fetch-rock-data.ts` currently take no headers. Add an optional
`customHeaders` so a guarded action can forward the user cookie:

```ts
export const postRockData: (params: {
  endpoint: string;
  body: Record<string, unknown> | string;
  contentType?: string;
  customHeaders?: Record<string, string>; // NEW — e.g. { Cookie: auth.rockCookie }
}) => Promise<unknown>;
// same optional customHeaders added to putRockData / patchRockData, and a headers
// arg to deleteRockData(endpoint, customHeaders?).
```

Decide in the spike whether writes run as the user (forward `rockCookie`) or stay
on `ROCK_TOKEN` with `requireGroupLeader` as the sole boundary — and document it.

### C. User-scoped cache keys — closes C2

Additions to `app/lib/.server/cache-utils.ts` (keeps the existing `rock:`
namespace; adds a per-user sub-namespace so "my groups" can never collide across
users):

```ts
/**
 * Per-user cache key. Format: `rock:u{personId}:{endpoint}:{hash12}`.
 * Same hashing/sorting as buildCacheKey, just under a user sub-namespace.
 */
export function buildUserCacheKey(
  personId: string | number,
  endpoint: string,
  queryParams: Record<string, string | undefined>,
): string;

/**
 * Delete every cache entry for a user (call on logout and on token change).
 * SCAN over `rock:u{personId}:*` (no KEYS), like deleteByPrefix. Returns count.
 */
export function invalidateUser(
  redis: Redis | null,
  personId: string | number,
): Promise<number>;
```

And one option on `fetchRockData` (`FetchRockDataOptions`) to opt a read into the
per-user namespace:

```ts
interface FetchRockDataOptions {
  // ...existing fields...
  /**
   * When set, cache under buildUserCacheKey(cacheUserId, ...) instead of the
   * shared buildCacheKey. Use for any per-viewer data ("my group list"). Purely
   * per-GROUP data ("members of group X") can stay in the shared namespace since
   * GroupId in queryParams already discriminates the key.
   */
  cacheUserId?: string | number;
}
```

Wire-up: `fetch-rock-data.ts:217` chooses `cacheUserId != null ?
buildUserCacheKey(cacheUserId, endpoint, mergedQueryParams) : buildCacheKey(...)`.
The `logout` handler (`app/routes/auth/route.tsx:53`) must resolve the context
(via `getAuthContext`) _before_ clearing the cookie so it can call
`invalidateUser(redis, personId)`.

### D. Token refresh flow — closes C3

Minimal change in `app/lib/.server/token.ts`: parametrize expiry so the same
signer mints both token kinds (default stays short).

```ts
export function generateToken(
  params: Record<string, unknown>,
  options?: { expiresIn?: string | number }, // default '1h' (access)
): string;
```

Two HttpOnly cookies instead of one. Add the refresh key next to `AUTH_TOKEN_KEY`
in `app/providers/auth-provider/index.tsx`:

```ts
export const AUTH_TOKEN_KEY = 'auth-token'; // access; Max-Age aligned to 1h
export const AUTH_REFRESH_KEY = 'auth-refresh'; // refresh; Max-Age aligned to 30d
```

New handler `app/routes/auth/refresh.tsx`, dispatched by a new
`case 'refresh':` in `route.tsx`:

```ts
/**
 * Re-mint the access token from a valid refresh cookie (the refresh token wraps
 * the same encrypted { cookie, sessionId }). Returns 200 with fresh Set-Cookie
 * for BOTH cookies; returns 401 and clears both when the refresh token is
 * missing/expired/invalid.
 */
export const refresh: (request: Request) => Promise<Response>;
```

Client: `AuthProvider` calls `formType=refresh` once on a 401 from `currentUser`
and retries. To DRY the four near-identical `Set-Cookie` builders across the auth
handlers, add:

```ts
/** Build a hardened auth Set-Cookie value (HttpOnly, Secure in prod, SameSite=Strict, Path=/). */
export function buildAuthCookie(
  name: string,
  value: string,
  maxAgeSeconds: number,
): string;
```

**Smaller alternative (if two cookies is too much for the spike):** keep one
cookie but make it a _sliding session_ — align `auth-token` `Max-Age` with the
JWT expiry and have `getAuthContext` re-issue the cookie when the token is within
N minutes of expiry, returning the refreshed value for the caller to `Set-Cookie`.
This closes the 24h/400-day contradiction with no second token, at the cost of
loaders needing to forward a refreshed cookie header.

### How they compose (a guarded write action)

```ts
export const action = async ({ request, params }: ActionFunctionArgs) => {
  const auth = await requireUser(request); // A — 401 -> redirect
  await requireGroupLeader(auth, Number(params.groupId)); // B — not leader -> 403
  return postRockData({
    // B companion — as the user
    endpoint: 'GroupMembers',
    body: {
      GroupId: params.groupId,
      PersonId: newMemberId,
      GroupRoleId,
      GroupMemberStatus: 1,
    },
    customHeaders: { Cookie: auth.rockCookie },
  });
  // then: invalidateUser(redis, auth.personId) or a group-scoped invalidation (C)
};
```

---

_Prepared as a read-only review of `remix-web-app` at branch
`claude/my-groups-auth-review-cur0gi`. `legacy-my-groups` was consulted for §6;
the `services` monorepo was not needed because the current `remix-web-app` auth
flow talks to Rock directly and never touches Apollos._
