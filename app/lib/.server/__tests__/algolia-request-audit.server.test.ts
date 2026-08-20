import { describe, expect, it } from 'vitest';

import { classifyAlgoliaSearchRequest } from '../algolia-request-audit.server';

describe('Algolia request audit classification', () => {
  it('counts one HTTP request with every legacy operation in a batch', () => {
    expect(
      classifyAlgoliaSearchRequest(
        'https://example.algolia.net/1/indexes/*/queries',
        JSON.stringify({
          requests: [
            { indexName: 'prod_contentItems', params: 'query=' },
            { indexName: 'prod_locations', params: 'query=' },
          ],
        }),
      ),
    ).toEqual({
      endpoint: '/1/indexes/*/queries',
      indexes: ['prod_contentItems', 'prod_locations'],
      operations: 2,
      batched: true,
    });
  });

  it('counts a single-index query as one request and one operation', () => {
    expect(
      classifyAlgoliaSearchRequest(
        'https://example.algolia.net/1/indexes/prod_locations/query',
        '{}',
      ),
    ).toEqual({
      endpoint: '/1/indexes/:index/query',
      indexes: ['prod_locations'],
      operations: 1,
      batched: false,
    });
  });

  it('ignores malformed batches and non-search endpoints', () => {
    expect(
      classifyAlgoliaSearchRequest(
        'https://example.algolia.net/1/indexes/*/queries',
        'not-json',
      ),
    ).toBeNull();
    expect(
      classifyAlgoliaSearchRequest(
        'https://example.algolia.net/1/indexes/prod_contentItems/settings',
      ),
    ).toBeNull();
  });
});
