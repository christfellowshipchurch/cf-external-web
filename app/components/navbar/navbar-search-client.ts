import type { SearchClient } from 'algoliasearch';

export type NavbarSearchFacets = {
  contentType?: Record<string, number>;
};

type NavbarSearchRequest = {
  indexName: string;
  query?: string;
  filters?: string;
  facetFilters?: unknown[];
  numericFilters?: unknown[];
  tagFilters?: string | string[];
  params?: Omit<NavbarSearchRequest, 'indexName' | 'params'>;
};

function isBlankUnrefinedRequest(request: NavbarSearchRequest): boolean {
  const params = request.params ?? request;

  return (
    !params.query?.trim() &&
    !params.filters?.trim() &&
    !params.facetFilters?.length &&
    !params.numericFilters?.length &&
    !(Array.isArray(params.tagFilters)
      ? params.tagFilters.length
      : params.tagFilters?.trim())
  );
}

/** Prevent InstantSearch's empty initial state from reaching Algolia. */
export function suppressBlankNavbarSearches(
  searchClient: SearchClient,
  facets: NavbarSearchFacets = {},
): SearchClient {
  const wrappedClient = Object.create(searchClient) as SearchClient;

  wrappedClient.search = ((searchParams: NavbarSearchRequest[]) => {
    if (searchParams.every(isBlankUnrefinedRequest)) {
      return Promise.resolve({
        results: searchParams.map((request) => ({
          hits: [],
          nbHits: 0,
          page: 0,
          nbPages: 0,
          hitsPerPage: 0,
          exhaustiveNbHits: true,
          exhaustiveTypo: true,
          exhaustiveFacetsCount: true,
          query: '',
          params: '',
          processingTimeMS: 0,
          index: request.indexName,
          // InstantSearch's refinement widgets read facet counts from this
          // stub so filter chips still render without a blank Algolia roundtrip.
          facets,
        })),
      });
    }

    return (
      searchClient.search as unknown as (
        requests: NavbarSearchRequest[],
      ) => ReturnType<SearchClient['search']>
    )(searchParams);
  }) as SearchClient['search'];

  return wrappedClient;
}
