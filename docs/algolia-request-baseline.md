# Algolia request baseline

Measured 2026-08-20 against Vercel Preview commit `98e79dc3`. Cold loads used
fresh tabs, direct navigation, and a 2.2-second settle window. Browser records
came from opt-in `[algolia-audit]` console output. Server counts match tagged
loader requester records and call topology.

“Requests” means physical Algolia HTTP attempts. “Operations” means individual
queries, matching legacy-plan search-operation accounting. No retries occurred
in observed browser runs.

## Cold loads

| Scenario                                                          | Server requests | Server operations | Browser requests | Browser operations | Total requests | Total operations |
| ----------------------------------------------------------------- | --------------: | ----------------: | ---------------: | -----------------: | -------------: | ---------------: |
| Generic content `/about`                                          |               1 |                 4 |                2 |                  2 |              3 |                6 |
| `/articles`                                                       |               2 |                 5 |                3 |                  3 |              5 |                8 |
| `/events`                                                         |               3 |                 6 |                3 |                  3 |              6 |                9 |
| `/messages`                                                       |               3 |                 6 |                3 |                  3 |              6 |                9 |
| `/group-finder`                                                   |               4 |                 7 |                3 |                  3 |              7 |               10 |
| `/class-finder`                                                   |               2 |                 5 |                3 |                  3 |              5 |                8 |
| `/locations`                                                      |               2 |                 5 |                4 |                  4 |              6 |                9 |
| `/studies-and-resources`                                          |               1 |                 4 |                5 |                  5 |              6 |                9 |
| Article detail `/articles/making-the-most-of-your-days`           |               1 |                 4 |                3 |                  3 |              4 |                7 |
| Message detail `/messages/why-you-cant-build-the-full-life-alone` |               1 |                 4 |                4 |                  4 |              5 |                8 |
| Event detail `/events/journey`                                    |               1 |                 4 |                3 |                  3 |              4 |                7 |
| Location detail `/locations/palm-beach-gardens`                   |               2 |                 5 |                2 |                  2 |              4 |                7 |

## Navbar interaction

Opening desktop navbar search and typing `leadership` sequentially produced 11
additional browser requests and 11 operations. All used `/1/indexes/*/queries`
with one operation per payload. No server request occurred.

## Batched versus separate

- Root navbar loader: one server `/queries` request containing four operations
  on every cold load.
- Browser navbar mounts: two separate `/queries` requests, each containing one
  operation, on every cold load.
- Route loader queries are separate physical server requests. `/events` and
  `/messages` each add two; `/group-finder` adds three; `/articles`,
  `/class-finder`, and `/locations` each add one.
- `/studies-and-resources` adds no server result query but emits three finder
  browser requests after hydration, in addition to two browser navbar requests.
- `/locations` emits one direct single-index browser bootstrap query plus one
  InstantSearch request, in addition to two browser navbar requests.
- Article and event detail pages add one browser InstantSearch request. Selected
  message detail adds two. Selected location detail adds one server query.

## Cost drivers

1. Navbar ten-character query: 11 incremental requests and operations.
2. Global cold-load navbar: 3 requests and 6 operations on every measured page.
3. `/group-finder`: 7 requests and 10 operations, highest cold-load total.
4. `/studies-and-resources`: 5 browser requests; highest browser-only cold-load
   count despite no server result query.
5. `/events`, `/messages`, and `/locations`: 6 requests and 9 operations each.

## Repeat

Follow [Algolia request audit](./algolia-request-audit.md). Use same paths and
fixtures, fresh tabs, direct navigation, and settle window. Sum one
`[algolia-audit]` record per HTTP request and its `operations` value for legacy
operation count. Record server and browser logs separately. Remove or disable
`ALGOLIA_REQUEST_AUDIT` after measurement and redeploy.
