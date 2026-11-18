# BugBot Rules

> Rules are derived from actual patterns in this codebase. All references to files, functions,
> and conventions reflect what exists in `app/`. Do not flag issues outside these patterns.

---

## Critical Bugs

---

**Rule:** Secret server environment variables must never appear in loader or action return values.
**Detection:** Flag any loader or action that returns an object containing `process.env.ROCK_TOKEN`, `process.env.CACHE_INVALIDATION_SECRET`, or `process.env.WISTIA_API_KEY`. Only `ALGOLIA_APP_ID` and `ALGOLIA_SEARCH_API_KEY` are intentionally client-exposed.
**Why:** These values are returned as JSON to the browser. Any new secret added to a loader return value is immediately exposed in the network response.

---

**Rule:** `fetchRockData` results must be guarded with `Array.isArray()` before calling `.map()`, `.filter()`, or `.reduce()`.
**Detection:** Flag any expression of the form `someRockResult.map(...)` or `someRockResult.filter(...)` where `someRockResult` is the direct return value of `fetchRockData()` without a preceding `Array.isArray()` check or `.flat()` normalization.
**Why:** The Rock API returns a single object when only one result matches a filter. Calling `.map()` on a plain object throws at runtime and breaks the route for that user.

---

**Rule:** Loader and action return values must be JSON-serializable.
**Detection:** Flag return values that include `Date` instances, `Map`, `Set`, `undefined` properties, class instances, or circular references. Loaders must return plain objects, arrays of plain objects, or `Response.json(...)`. Functions and class instances are not serializable across the server/client boundary.
**Why:** React Router serializes loader data to send it to the client. Non-serializable values silently become `null` or throw a hydration error.

---

**Rule:** After a `postRockData`, `patchRockData`, or `deleteRockData` call, any immediate `fetchRockData` for the same endpoint must set `ttl: TTL.NONE`.
**Detection:** Flag any action that calls a write function (`postRockData`, `patchRockData`, `deleteRockData`) followed by a `fetchRockData` call on the same endpoint without `ttl: TTL.NONE`.  
**Why:** The Redis cache TTL is one hour. Reading with `cache: true` after a write returns the pre-mutation state and causes stale data to be shown to the user.

---

**Rule:** Actions must not access `formData` fields without verifying they are non-empty strings.
**Detection:** Flag action code that does `formData.someField` or destructures from `Object.fromEntries(await request.formData())` and passes those values directly to `postRockData`, `patchRockData`, or a workflow launch without a truthiness or length check.
**Why:** Missing form fields produce `undefined`, which is serialized as the string `"undefined"` in Rock API bodies. This corrupts person and workflow records silently.

---

## Security

---

**Rule:** User-supplied values must not be interpolated directly into Rock OData `$filter` strings.
**Detection:** Flag any `fetchRockData` or `postRockData` call where a `queryParams.$filter` string uses template literal interpolation with a value derived from `request.formData()` or `request.url` (e.g., `` `Name eq '${formData.groupName}'` ``).
**Why:** Unsanitized OData filter injection can expose or match unintended records. At minimum, values should be trimmed and validated as expected types before interpolation.

---

## Testing Requirements

---

**Rule:** Every new loader and action file must have at least one test covering the error path.
**Detection:** Flag new `loader.ts` or `action.ts` files that have no corresponding `__tests__/` file, or where the test file exists but contains no test case that mocks `global.fetch` returning `{ ok: false }` or that asserts on a thrown `Response` or returned error object.
**Why:** The existing test suite (e.g., `fetch-rock-data.test.ts`, `connect-card/action.test.ts`) always covers the failure branch. Untested error paths are the most common source of undetected production breakage.

---

**Rule:** Test files must call `vi.clearAllMocks()` in `beforeEach` and must not share `process.env` mutations across test cases without resetting them.
**Detection:** Flag test files that set `process.env.*` inside `it()` or `describe()` blocks without restoring the original value, or that do not include a `vi.clearAllMocks()` call in a `beforeEach`.
**Why:** Shared mock state between tests causes false positives and false negatives. All existing test files in this repo follow this pattern.

---

**Rule:** Component tests that use `Link`, `useNavigate`, `useLoaderData`, or other router hooks must wrap the render in `MemoryRouter` or a router-aware test helper.
**Detection:** Flag test files that render a component using any react-router hook or `<Link>` without a `MemoryRouter`, `createMemoryRouter`, or the project's `renderWithRouter` test utility wrapping the component.
**Why:** Rendering router-dependent components without a router context throws and masks the real test failure.

---

## Code Quality

---

**Rule:** All Rock RMS API calls must use the centralized fetchers: `fetchRockData`, `postRockData`, `patchRockData`, or `deleteRockData` from `app/lib/.server/fetch-rock-data.ts`. Raw `fetch()` to the Rock API is not allowed.
**Detection:** Flag any `fetch(...)` call in a loader, action, or `.server.ts` file where the URL contains `process.env.ROCK_API` or matches `rock.christfellowship.church`.
**Why:** The centralized fetchers apply Redis caching, authentication headers, error normalization, and logging. Bypassing them creates uncached, unauthenticated, and unmonitored API calls.

---

**Rule:** Client-side environment variables must use `import.meta.env.VITE_*`. Using `process.env.*` in components, hooks, or providers is not allowed.
**Detection:** Flag any reference to `process.env` in files outside of `app/lib/.server/`, loaders, or actions — specifically in `app/components/`, `app/hooks/`, `app/providers/`, `app/primitives/`, and `app/routes/*/route.tsx`.
**Why:** `process.env` is undefined in the browser bundle. Variables accessed this way are silently `undefined` in production client-side code.

---

**Rule:** `window`, `document`, and `localStorage` must not be accessed at module scope. All browser API access must be inside `useEffect`, event handlers, or guarded by `typeof window !== "undefined"`.
**Detection:** Flag any file that references `window.`, `document.`, or `localStorage.` outside of a function body — i.e., at the top level of a module or directly inside a component function body without a conditional guard or `useEffect` wrapper.
**Why:** This app runs with SSR enabled. Module-level browser API access throws on the server during rendering and breaks the entire route.

---

**Rule:** Deep access into Rock API `attributeValues` must use optional chaining with a defined fallback value.
**Detection:** Flag any expression that accesses two or more levels into `attributeValues` (e.g., `item.attributeValues.heroImage.value`) without `?.` at each level and a `?? fallback` at the end.
**Why:** `attributeValues` and its nested fields are absent on Rock objects that have no custom attributes set. Without optional chaining, these access patterns throw and crash the loader or component.

---

## Architecture Constraints

---

**Rule:** Imports from `app/lib/.server/` are only permitted in loaders, actions, and files with a `.server.ts` or `.server.tsx` suffix.
**Detection:** Flag any import of a path matching `~/lib/.server/*` or `app/lib/.server/*` in files that are not named `loader.ts`, `action.ts`, `*.server.ts`, or `*.server.tsx`.
**Why:** Vite enforces the `.server` boundary to prevent server-only code (credentials, Node APIs, Redis) from being bundled into the client. Importing outside these contexts silently includes secrets in the browser bundle.

---

**Rule:** Rock content channel IDs and campus configurations must be defined in `app/lib/rock-config.ts`, not as inline numeric literals in loaders or actions.
**Detection:** Flag any `fetchRockData` call in a loader or action that contains a bare numeric ID in a `$filter` string (e.g., `ContentChannelId eq 171`) where that ID does not reference a named constant from `rock-config.ts`.
**Why:** Magic IDs spread across 64+ route files are untraceable when Rock channel IDs change. `rock-config.ts` is the single source of truth for all Rock content and campus identifiers.

---

**Rule:** Custom error classes must not be redefined inline in route files. Use `AuthenticationError` and `RockAPIError` from `app/lib/.server/error-types.ts`.
**Detection:** Flag any `class SomeError extends Error` declaration in a file that is not `app/lib/.server/error-types.ts`, or any `throw new Error(...)` in an authentication or Rock API context that should instead throw a typed error class from that module.
**Why:** Duplicate error classes break `instanceof` checks in catch blocks across the authentication and API layers, causing errors to fall through to the wrong handler.
