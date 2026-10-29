# CLAUDE.md

<!-- shared:start: edit in christfellowshipchurch/.github, not here -->

## How to work here

- State your assumptions. If a request can be read more than one way, ask before writing code.
- Write the least code that solves the problem: no speculative features, no abstractions used once.
- Change only what the task needs. Don't reformat, rename or refactor neighbouring code.
- Before adding code, read its callers, exports and the shared utilities it should use.
- Match the codebase's conventions. If one looks harmful, say so instead of working around it.
- Tests should fail when the business rule they protect changes.
- Report honestly: never say "done" or "tests pass" if anything was skipped or not run.

## Rules for every app that talks to Rock

- Rock calls, the Rock token and other secrets stay server-side (loaders, actions, `.server.ts`). Never return a secret from a loader or action.
- Never log names, emails, phone numbers, passwords, cookies or OData `$filter` strings. Log ids and timings.
- Validate user input before it goes into a `$filter` string.
- Rock writes and workflow launches are high risk: a redeploy doesn't undo them.

## Risk tiers

- Low: copy, styles, docs, component-only changes.
- Medium: most loader, action and UI feature work.
- High: Rock writes and workflow launches, auth and sessions, cache invalidation, search index config, env files and task definitions, CI workflows.

## Before opening a PR

1. Run this repo's checks (see Commands) and fix what fails.
2. Run /code-review. Fix each finding, or say in the PR why not.
3. Write the PR from the diff against main, using `.github/PULL_REQUEST_TEMPLATE.md`:
   - Risk tier, and which files put it there.
   - Testing: numbered steps for a reviewer who hasn't seen the change, each with its expected result. Say what wasn't tested and why.
   - How to revert.
   - Ticket: search Jira with `assignee = currentUser() AND statusCategory != Done`. If several match or the match is unsure, ask. If none match, write N/A. Never invent a key.
   - A short explainer of the change for the reviewer.
   - The check output.

<!-- shared:end -->

## Commands

pnpm is the package manager (`pnpm-lock.yaml`) on Node 22 (`.nvmrc`). Don't use npm or yarn.

```bash
pnpm install
netlify dev       # runs `pnpm dev` with .env loaded
pnpm typecheck    # react-router typegen && tsc; run after adding or moving routes
pnpm lint
pnpm format       # Prettier, writes files
pnpm test         # vitest; watches in a terminal, runs once in CI
pnpm vitest run app/lib/.server/__tests__/<file>.test.ts -t "<test name>"
pnpm build
pnpm start        # serve build/ with react-router-serve
pnpm analyze      # bundle report at build/client/stats.html
pnpm parity       # old site's URLs vs the new site's, as a redirect map CSV
```

This repo's checks: `pnpm check` (install, lint, typecheck, Prettier check), then `pnpm test`.

There is no `.env.example`. `.env` and `.env.local` are gitignored, so a new git worktree has none: copy them from your main checkout. Nothing in the app loads them into `process.env`, which is why `getRockApiBaseUrl` tells you to start with `netlify dev`. Point `ROCK_API` at a non-production Rock.

## What this is

Christ Fellowship's public website: articles, messages, events, locations, group and class finders, volunteer and ministry pages, and the forms that send people into Rock (connect card, prayer request, sign-ups). React Router v8 in framework mode with SSR and flat file routes (`app/routes.ts` is `flatRoutes()`), Tailwind v4, Redis, Rock REST v1, Algolia for search and finders, Twilio for SMS login, Wistia for video. Sister app to my-church-platform.

It deploys to both Vercel and Netlify from the same build. `react-router.config.ts` adds the Vercel preset when `VERCEL` is set; `vite.config.ts` adds the Netlify plugin when `NETLIFY` is set. Design notes are in `docs/architecture/`.

## Architecture

- Server code lives in `app/lib/.server/` and route `*.server.ts` files. Vite keeps `.server` modules out of the client bundle and fails the build if client code imports one, so only loaders, actions and other `.server` files may import them.
- Routes are folders: `app/routes/<name>/route.tsx` plus optional `loader.ts`, `action.ts`, `meta.ts`, `types.ts`, `components/*.component.tsx` and `partials/*.partial.tsx`. Resource routes are a folder with `route.ts`. File names are kebab-case. Loaders and actions return plain objects, `data()` or `Response.json()`; never `json()` or `@remix-run/*` imports.
- `fetch-rock-data.ts` is how to call Rock: `fetchRockData` (Redis-cached), `postRockData`, `putRockData`, `patchRockData` and `deleteRockData`, all with the service-account `ROCK_TOKEN`. Build URLs with `buildRockUrl`. `fetchRockData` unwraps a one-item array into a plain object, so callers must handle both shapes.
- Caching: `ttl` takes the `TTL` presets in `cache-utils.ts` (`NONE`, `SHORT` 5 min, `DEFAULT` 1 h, `LONG` 24 h); the default is 1 hour. Keys are `rock:{endpoint}:{hash}`, with `cfitem:{id}` and `cfchildren:{id}` reverse indexes so one content item can be invalidated (`docs/architecture/rock-cache-invalidation.md`). `POST /api/admin/cache` (`api.admin.cache.tsx`, `x-cache-secret` header) invalidates an item; it is meant for a Rock webhook on content save. Development and preview skip Redis entirely. If Redis is down, reads fall through to Rock.
- Preview mode (`SHOW_UNAPPROVED_CONTENT=true`, `isPreviewMode()`) shows Pending content, skips the shared cache and sends `X-Robots-Tag: noindex`. Never set it on production.
- Rock ids: content channels, content items and campuses are in `app/lib/rock-config.ts`. Use `toPublicRockUrl` for links to Rock: `rock.gocf.org` is internal-only.
- Forms launch Rock workflows through `Workflows/LaunchWorkflow/0`, mostly via `postRockWorkflowLaunchWithApiInitiator` (`rock-workflow.ts`), which then sets the initiator to `API_ALIAS_PERSON_ID` in the background. Public forms use the honeypot in `bot-protection.ts` (`HoneypotFields`, `getBotBlockReason`).
- Auth: email or SMS login (`app/routes/auth/route.tsx` dispatches on `formType`). The `auth-token` cookie is an encrypted JWT wrapping the person's Rock `.ROCK` cookie; `getUserFromRequest` reads it. SMS PINs are HMAC'd with `SECRET` (`hashPassword`) and rate limited (`RateLimitError`). Phone numbers go through `parsePhoneNumberUtil` and must be `valid` before Twilio is called.
- Errors: `AuthenticationError`, `RockAPIError`, `EncryptionError` and `RateLimitError` live in `error-types.ts`.
- Rock CMS HTML is sanitised with `sanitizeCmsHtml` (`app/lib/sanitize.ts`, DOMPurify) before render. `pnpm-workspace.yaml` pins `jsdom` to 26.1.0 because newer jsdom crashes on Vercel.
- `/rock-proxy` serves allow-listed Rock pages (`validate-rock-url.ts`: HTTPS, `rock.christfellowship.church` only) inside an iframe.
- Algolia index names come from `getAlgoliaIndexes` (`app/lib/algolia-indexes.ts`): `{env}_webv3_{name}`, env from `ALGOLIA_INDEX_ENV`. `ALGOLIA_APP_ID` and `ALGOLIA_SEARCH_API_KEY` are the only env values meant for the browser.
- Tests: Vitest with jsdom for everything (`vitest.setup.ts`), next to the code or in `__tests__/`. Render router components with `renderWithRouter` from `app/test-utils/render.tsx`.

## Don't

- Return a secret from a loader or action: `ROCK_TOKEN`, `SECRET`, `CRYPTO_SECRET`, `CACHE_INVALIDATION_SECRET`, Twilio or Wistia keys.
- Call `fetch()` on Rock directly. Use the `fetch-rock-data.ts` helpers so caching, headers and logging apply.
- Use `process.env` in components, hooks, providers or primitives. It is undefined in the browser; pass the value from a loader.
- Touch `window`, `document` or `localStorage` at module scope or during render. The site is SSR; use `useEffect`, a handler or a `typeof window` guard.
- Write a numeric content channel or campus id inline. Add it to `rock-config.ts`.
- Define new error classes outside `error-types.ts`; duplicates break `instanceof`.
- Send a form value to Rock unchecked. A missing field becomes the string `"undefined"` in the record.
- Add a redirect to only one host. Redirects live in both `vercel.json` and `netlify.toml` (they have already drifted). Security headers are only in `netlify.toml`.
- Use `console.log`. Lint warns on it (only `warn` and `error` are allowed).

## Review rules

Flag:

- `.map`, `.filter` or `.reduce` on a `fetchRockData` result without `Array.isArray()` or similar normalising.
- A Rock write followed by a read of the same endpoint without `ttl: TTL.NONE`.
- A `$filter` built from form or URL input that isn't trimmed and validated first.
- Loader data with `Date`, `Map`, `Set`, class instances or functions in it.
- Two or more levels into `attributeValues` without `?.` at each level and a `??` fallback.
- An import from `~/lib/.server/` in a file that isn't a loader, action or `.server` module.
- A Twilio call with a phone number that hasn't passed `parsePhoneNumberUtil` and a `valid` check.
- CMS HTML rendered with `dangerouslySetInnerHTML` without `sanitizeCmsHtml`.
- A new loader or action without a test of its failure path. Tests reset mocks in `beforeEach` (`vi.clearAllMocks()`) and restore any `process.env` they change.

## High-risk paths

- `app/lib/.server/authentication/`, `app/routes/auth/`, `token.ts`, `encrypt.tsx`, `decrypt.tsx`
- `fetch-rock-data.ts`, `fetch-rock-v2.ts`, `cache-utils.ts`, `redis-config.ts`, `app/routes/api.admin.cache.tsx`
- `rock-workflow.ts`, `rock-signup.ts`, `rock-person.ts` and every route `action.ts` that writes to Rock or launches a workflow
- `app/routes/rock-proxy/`, `validate-rock-url.ts`, `app/lib/sanitize.ts`
- `algolia-indexes.ts`, `algolia-indexes.server.ts`
- `vercel.json`, `netlify.toml`, `react-router.config.ts`, `vite.config.ts`, `pnpm-workspace.yaml`
