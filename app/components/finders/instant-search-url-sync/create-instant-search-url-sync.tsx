import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useInstantSearch } from 'react-instantsearch';

import { buildIndexInitialUiState } from '~/components/finders/finder-algolia.utils';

type SyncUrlState = {
  query?: string;
  refinementList?: Record<string, string[]>;
  page?: number;
};

type ParseUrlState<T extends SyncUrlState> = (params: URLSearchParams) => T;

/**
 * Converts this app's route-level URL state into the `initialUiState` shape
 * expected by React InstantSearch. The URL state is intentionally kept as the
 * public contract (`?q=`, repeated facet params, route-specific page params),
 * while InstantSearch expects the same values grouped under the Algolia index.
 */
export function buildInstantSearchUiState<T extends SyncUrlState>(
  indexName: string,
  urlState: T,
) {
  const indexSlice: Record<string, unknown> = {};
  const base = buildIndexInitialUiState(indexName, {
    query: urlState.query,
    refinementList: urlState.refinementList,
  });
  const baseIndex = base?.[indexName];
  if (baseIndex) {
    Object.assign(indexSlice, baseIndex);
  }
  // Page is omitted from URLs for the first page, but InstantSearch stores it
  // as a 0-based page value in the index slice when it is present.
  if (urlState.page != null && urlState.page > 0) {
    indexSlice.page = urlState.page;
  }

  return Object.keys(indexSlice).length > 0 ? { [indexName]: indexSlice } : {};
}

export function createInstantSearchUrlSync<T extends SyncUrlState>({
  indexName,
  parseUrlState,
}: {
  indexName: string;
  parseUrlState: ParseUrlState<T>;
}) {
  /**
   * Keeps browser navigation/deep links in sync with a mounted InstantSearch
   * tree without remounting the whole tree on every query-string change.
   *
   * Flow:
   * - loader parses URL for SSR first paint
   * - InstantSearch mounts with that URL as initial state
   * - widgets update InstantSearch state
   * - route code writes that state back to the existing URL format
   * - this component handles the reverse direction for back/forward/direct URL changes
   */
  const InstantSearchUrlSync = () => {
    const [searchParams] = useSearchParams();
    const { setUiState } = useInstantSearch();

    useEffect(() => {
      const urlState = parseUrlState(searchParams);
      const nextUiState = buildInstantSearchUiState(indexName, urlState);
      const indexSlice = nextUiState[indexName] ?? {};

      setUiState((prev) => {
        const prevRecord = prev as Record<string, Record<string, unknown>>;
        const prevIndex = prevRecord[indexName] ?? {};

        // Compare the pieces this helper owns before calling `setUiState`.
        // Without this no-op guard, URL writes triggered by InstantSearch can
        // bounce back into InstantSearch and cause unnecessary searches.
        const nextQuery = (indexSlice.query as string) ?? '';
        const prevQuery = (prevIndex.query as string) ?? '';
        const nextRl = JSON.stringify(indexSlice.refinementList ?? {});
        const prevRl = JSON.stringify(prevIndex.refinementList ?? {});
        const nextPage = (indexSlice.page as number) ?? 0;
        const prevPage = (prevIndex.page as number) ?? 0;

        if (
          nextQuery === prevQuery &&
          nextRl === prevRl &&
          nextPage === prevPage
        ) {
          return prev;
        }

        const nextIndex = { ...prevIndex };
        if (nextQuery) {
          nextIndex.query = nextQuery;
        } else {
          delete nextIndex.query;
        }
        if (indexSlice.refinementList) {
          nextIndex.refinementList = indexSlice.refinementList;
        } else {
          delete nextIndex.refinementList;
        }
        if (nextPage > 0) {
          nextIndex.page = nextPage;
        } else {
          delete nextIndex.page;
        }

        return {
          ...prevRecord,
          [indexName]: nextIndex,
        };
      });
    }, [indexName, searchParams, setUiState]);

    return null;
  };

  const buildUiState = (urlState: T) =>
    buildInstantSearchUiState(indexName, urlState);

  return { InstantSearchUrlSync, buildUiState };
}
