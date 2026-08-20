import type { SearchClient } from 'algoliasearch';

type NavbarSearchRequest = {
  indexName: string;
  query?: string;
  filters?: string;
  facetFilters?: unknown[];
  numericFilters?: unknown[];
  tagFilters?: string | string[];
};

function isBlankUnrefinedRequest(request: NavbarSearchRequest): boolean {
  return (
    !request.query?.trim() &&
    !request.filters?.trim() &&
    !request.facetFilters?.length &&
    !request.numericFilters?.length &&
    !(Array.isArray(request.tagFilters)
      ? request.tagFilters.length
      : request.tagFilters?.trim())
  );
}

/** Prevent InstantSearch's empty initial state from reaching Algolia. */
export function suppressBlankNavbarSearches(
  searchClient: SearchClient,
): SearchClient {
  const wrappedClient = Object.create(searchClient) as SearchClient;

  wrappedClient.search = ((searchParams: {
    requests: NavbarSearchRequest[];
  }) => {
    if (searchParams.requests.every(isBlankUnrefinedRequest)) {
      return Promise.resolve({
        results: searchParams.requests.map((request) => ({
          hits: [],
          nbHits: 0,
          page: 0,
          nbPages: 0,
          hitsPerPage: 0,
          exhaustiveNbHits: true,
          exhaustiveTypo: true,
          query: '',
          params: '',
          processingTimeMS: 0,
          index: request.indexName,
        })),
      });
    }

    return searchClient.search(searchParams);
  }) as SearchClient['search'];

  return wrappedClient;
}
