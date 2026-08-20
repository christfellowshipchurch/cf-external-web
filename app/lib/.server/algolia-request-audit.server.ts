import { algoliasearch } from 'algoliasearch';

type AuditClassification = {
  endpoint: string;
  indexes: string[];
  operations: number;
  batched: boolean;
};

function indexFromEndpoint(endpoint: string): string | null {
  const match = endpoint.match(/^\/1\/indexes\/([^/]+)\/query$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function classifyAlgoliaSearchRequest(
  rawUrl: string,
  rawBody?: string,
): AuditClassification | null {
  const endpoint = new URL(rawUrl).pathname;

  if (endpoint === '/1/indexes/*/queries') {
    try {
      const requests = JSON.parse(rawBody ?? '{}').requests;
      if (!Array.isArray(requests)) return null;

      return {
        endpoint,
        indexes: requests
          .map((request) => request?.indexName)
          .filter((indexName): indexName is string =>
            Boolean(indexName && typeof indexName === 'string'),
          ),
        operations: requests.length,
        batched: true,
      };
    } catch {
      return null;
    }
  }

  const indexName = indexFromEndpoint(endpoint);
  if (!indexName) return null;

  return {
    endpoint: '/1/indexes/:index/query',
    indexes: [indexName],
    operations: 1,
    batched: false,
  };
}

export function createAuditedServerAlgoliaClient(
  appId: string,
  apiKey: string,
  source: string,
) {
  const client = algoliasearch(appId, apiKey, {});
  if (process.env.ALGOLIA_REQUEST_AUDIT !== '1') return client;

  const requester = client.transporter.requester;
  const send = requester.send.bind(requester);

  requester.send = async (request) => {
    const classification = classifyAlgoliaSearchRequest(
      request.url,
      request.data,
    );

    if (classification) {
      // Opt-in structured output is purpose of this development audit helper.
      // eslint-disable-next-line no-console
      console.info(
        '[algolia-audit]',
        JSON.stringify({
          source,
          side: 'server',
          httpRequests: 1,
          ...classification,
        }),
      );
    }

    return send(request);
  };

  return client;
}
