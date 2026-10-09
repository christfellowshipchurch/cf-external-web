import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { useInstantSearch } from 'react-instantsearch';
import {
  GroupFinderUrlState,
  parseGroupFinderUrlState,
} from '../group-finder-url-state';

import { buildIndexInitialUiState } from '~/components/finders/finder-algolia.utils';

/**
 * Builds the InstantSearch index slice from URL state.
 * Shared by `initialUiState` on mount and by {@link GroupFinderInstantSearchSync} after navigation.
 */
export function buildGroupFinderInstantSearchUiState(
  urlState: GroupFinderUrlState,
  indexName: string,
): Record<string, Record<string, unknown>> {
  const indexSlice: Record<string, unknown> = {};
  const base = buildIndexInitialUiState(indexName, {
    query: urlState.query,
    refinementList: urlState.refinementList,
  });
  const baseIndex = base?.[indexName];
  if (baseIndex) {
    Object.assign(indexSlice, baseIndex);
  }
  // `urlState.page` is a 0-based index (parser stores URL `page` minus 1), but
  // InstantSearch `uiState.page` is 1-based. Convert here so the page survives
  // the URL<->uiState round-trip at the right value. Without the +1 the page
  // read back from the URL is one less than what InstantSearch holds, which made
  // the sync reconciliation overwrite the real page and snap pagination back.
  if (urlState.page != null && urlState.page > 0) {
    indexSlice.page = urlState.page + 1;
  }

  return Object.keys(indexSlice).length > 0 ? { [indexName]: indexSlice } : {};
}

/**
 * Reconciles InstantSearch uiState when the URL changes without remounting InstantSearch.
 *
 * Filter changes flow: widget → `onStateChange` → URL → loader → new `searchParams`.
 * That path does not always round-trip through InstantSearch, so this effect copies
 * URL → uiState (back/forward, Clear All, direct link with query string).
 * Skips `setUiState` when values are unchanged to avoid extra search cycles.
 */
export function GroupFinderInstantSearchSync({
  indexName,
}: {
  indexName: string;
}) {
  const [searchParams] = useSearchParams();
  const { setUiState, uiState } = useInstantSearch();

  // Always read the latest uiState without making the effect depend on it.
  // The effect must react only to URL changes; reacting to uiState changes too
  // would re-introduce the feedback loop this guard exists to prevent.
  const uiStateRef = useRef(uiState);
  uiStateRef.current = uiState;

  useEffect(() => {
    const urlState = parseGroupFinderUrlState(searchParams);
    const nextUiState = buildGroupFinderInstantSearchUiState(
      urlState,
      indexName,
    );
    const indexSlice = nextUiState[indexName] ?? {};

    const prevRecord = uiStateRef.current as Record<
      string,
      Record<string, unknown>
    >;
    const prevIndex = prevRecord[indexName] ?? {};
    const nextQuery = (indexSlice.query as string) ?? '';
    const prevQuery = (prevIndex.query as string) ?? '';
    const nextRl = JSON.stringify(indexSlice.refinementList ?? {});
    const prevRl = JSON.stringify(prevIndex.refinementList ?? {});
    const nextPage = (indexSlice.page as number) ?? 0;
    const prevPage = (prevIndex.page as number) ?? 0;

    // Only InstantSearch-owned state (query/refinementList/page) belongs in
    // uiState. Age and geo live in the URL but outside uiState, so when only
    // those change there is nothing to reconcile here. Crucially we must NOT
    // call `setUiState` in that case: core `setUiState` fires `onStateChange`
    // unconditionally (even when the value is unchanged), and our
    // `onStateChange` writes the URL from `mergeUrlState`. Calling it as a
    // no-op therefore rewrites the URL from React state that can lag the URL by
    // a render, producing an infinite URL<->state oscillation (clearing geo
    // with age active) and stomping the page during geo pagination.
    if (nextQuery === prevQuery && nextRl === prevRl && nextPage === prevPage) {
      return;
    }

    setUiState((prev) => {
      const prevRec = prev as Record<string, Record<string, unknown>>;
      const prevIdx = prevRec[indexName] ?? {};
      const nextIndex = { ...prevIdx };
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
        ...prevRec,
        [indexName]: nextIndex,
      };
    });
  }, [indexName, searchParams, setUiState]);

  return null;
}
