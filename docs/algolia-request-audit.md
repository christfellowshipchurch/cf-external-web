# Algolia request audit

Use this audit only on local or Vercel Preview deployments. It does not change
queries or responses.

## Server requests

Set `ALGOLIA_REQUEST_AUDIT=1`, then start or redeploy application. Each outbound
server search attempt writes one structured runtime log prefixed with
`[algolia-audit]`.

Each record contains:

- `httpRequests`: physical Algolia HTTP attempts, always `1` per record
- `operations`: queries in request payload
- `batched`: whether one HTTP request contains multiple-query payload
- `source`: root or route loader that issued request
- `indexes`: queried indexes

API keys, headers, query text, filters, coordinates, and full payloads are not
logged. Retries produce additional records because they are additional HTTP
requests.

## Browser requests

Use fresh browser context with cache disabled. Filter network traffic to
Algolia hosts, preserve log, and capture request payloads. Count each network
row as one HTTP request. For `/1/indexes/*/queries`, count entries in payload
`requests` array as operations; single-index `/query` calls count as one.

For cold loads, navigate directly and wait for network idle plus one second.
For interactions, clear network log after cold load, perform one action, then
wait for network idle plus one second. Record desktop viewport separately from
mobile when behavior differs.

Disable audit after measurement by removing variable or setting it to `0`, then
redeploy. Environment-variable changes do not affect existing Vercel deployments.
