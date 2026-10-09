import { useLoaderData, useSearchParams } from 'react-router';
import {
  type ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { InstantSearch } from 'react-instantsearch';
import { liteClient as algoliasearch } from 'algoliasearch/lite';

import {
  buildIndexInitialUiState,
  hasActiveFinderGeoCoordinates,
  isLocationPillSupplementallyActiveFromGeo,
  type FinderGeoCoordinates,
} from '~/components/finders/finder-algolia.utils';
import type { SearchFilterDesktopItem } from '~/components/finders/search-filters';
import { useAlgoliaUrlSync } from '~/hooks/use-algolia-url-sync';
import { useScrollToSearchResultsOnLoad } from '~/hooks/use-scroll-to-search-results-on-load';
import { getClassSingleUpcomingDesktopFilters } from '../class-single-upcoming-filters.data';
import {
  classSingleEmptyState,
  classSingleUrlStateToParams,
  coordinatesFromClassSingleUrlState,
  parseClassSingleUrlState,
  type ClassSingleUrlState,
} from '../class-single-url-state';
import type { LoaderReturnType } from '../loader';

function coordinatesFromUrl(
  searchParams: URLSearchParams,
): FinderGeoCoordinates {
  return coordinatesFromClassSingleUrlState(
    parseClassSingleUrlState(searchParams),
  );
}

/**
 * Filter Sessions UI state for the hydrated page.
 * The URL still mirrors filters/share state, but same-page URL changes do not
 * re-run the loader; InstantSearch uses the client Algolia key after first paint.
 */
export function useClassSingleUpcomingInstantSearch() {
  const loaderData = useLoaderData<LoaderReturnType>();
  const classIndexName = loaderData.algoliaIndexes.classes;
  const [searchParams, setSearchParams] = useSearchParams();

  const { debouncedUpdateUrl, cancelDebounce, updateUrlIfChanged } =
    useAlgoliaUrlSync({
      searchParams,
      setSearchParams,
      toParams: classSingleUrlStateToParams,
      debounceMs: 400,
    });

  const initialSearchParamsRef = useRef(searchParams);

  // Capture URL state once for InstantSearch's initial mount. Subsequent URL
  // changes are reconciled through onStateChange/search param effects, which
  // keeps the client search tree mounted after hydration.
  const initialUiState = useMemo(
    () =>
      buildIndexInitialUiState(
        classIndexName,
        parseClassSingleUrlState(initialSearchParamsRef.current),
      ),
    [classIndexName],
  );

  const [coordinates, setCoordinatesState] = useState<FinderGeoCoordinates>(
    () => coordinatesFromUrl(initialSearchParamsRef.current),
  );

  // Geo coordinates are not stored in InstantSearch uiState; they become
  // Configure props. The ref lets URL sync callbacks read the freshest geo
  // value without waiting for React state closures to update.
  const coordinatesRef = useRef<FinderGeoCoordinates>(
    coordinatesFromUrl(initialSearchParamsRef.current),
  );
  const [locationSource, setLocationKind] = useState<'zip' | 'gps' | null>(
    null,
  );

  useEffect(() => {
    // Back/forward navigation can change lat/lng in the URL without touching an
    // Algolia refinement. Mirror those params into local state so Configure and
    // location pill highlighting stay aligned with the URL.
    const next = coordinatesFromUrl(searchParams);
    coordinatesRef.current = next;
    setCoordinatesState(next);
  }, [searchParams]);

  const searchClient = useMemo(
    () =>
      algoliasearch(
        loaderData.ALGOLIA_APP_ID,
        loaderData.ALGOLIA_SEARCH_API_KEY,
        {},
      ),
    [loaderData.ALGOLIA_APP_ID, loaderData.ALGOLIA_SEARCH_API_KEY],
  );

  const setCoordinates = useCallback(
    (next: FinderGeoCoordinates) => {
      coordinatesRef.current = next;
      setCoordinatesState(next);
      const noCoords =
        next == null ||
        next.lat == null ||
        next.lng == null ||
        Number.isNaN(next.lat) ||
        Number.isNaN(next.lng);
      if (noCoords) {
        setLocationKind(null);
      }

      const merged: ClassSingleUrlState = {
        ...parseClassSingleUrlState(searchParams),
      };
      if (noCoords) {
        delete merged.lat;
        delete merged.lng;
      } else {
        // Keep geo in the route URL rather than InstantSearch uiState so shared
        // links reload into the same zip/GPS search and the loader can prefetch
        // geo-ranked hits on a full page request.
        merged.lat = next.lat ?? undefined;
        merged.lng = next.lng ?? undefined;
      }
      updateUrlIfChanged(merged);
    },
    [searchParams, updateUrlIfChanged],
  );

  const clearAllFiltersFromUrl = useCallback(() => {
    // Cancel pending query/refinement writes before clearing. Without this, a
    // delayed debounce could restore stale filters after Clear All.
    cancelDebounce();
    coordinatesRef.current = null;
    setCoordinatesState(null);
    setLocationKind(null);
    setSearchParams(classSingleUrlStateToParams(classSingleEmptyState), {
      replace: true,
      preventScrollReset: true,
    });
  }, [cancelDebounce, setSearchParams]);

  const syncUrlFromUiState = useCallback(
    (indexUiState: Record<string, unknown>) => {
      // Merge InstantSearch-owned query/refinements with URL-only geo state.
      // That keeps one shareable URL representing both regular filters and the
      // Configure-driven aroundLatLng search.
      const urlState: ClassSingleUrlState = {
        ...parseClassSingleUrlState(searchParams),
        query: (indexUiState.query as string) ?? undefined,
        refinementList:
          (indexUiState.refinementList as Record<string, string[]>) ??
          undefined,
      };
      const coords = coordinatesRef.current;
      if (
        coords?.lat != null &&
        coords.lng != null &&
        !Number.isNaN(coords.lat) &&
        !Number.isNaN(coords.lng)
      ) {
        urlState.lat = coords.lat;
        urlState.lng = coords.lng;
      } else {
        delete urlState.lat;
        delete urlState.lng;
      }
      debouncedUpdateUrl(urlState);
    },
    [debouncedUpdateUrl, searchParams],
  );

  useScrollToSearchResultsOnLoad(searchParams, (params) => {
    const s = parseClassSingleUrlState(params);
    return !!(
      (s.query?.trim?.()?.length ?? 0) > 0 ||
      (s.refinementList && Object.keys(s.refinementList).length > 0) ||
      (s.lat != null && s.lng != null)
    );
  });

  const desktopFilters = useMemo(
    () =>
      getClassSingleUpcomingDesktopFilters({
        coordinates,
        setCoordinates,
        locationSource,
        onLocationKind: setLocationKind,
      }),
    [coordinates, setCoordinates, locationSource],
  );

  const isFilterPillSupplementallyActive = useCallback(
    (item: SearchFilterDesktopItem) =>
      isLocationPillSupplementallyActiveFromGeo(item, coordinates),
    [coordinates],
  );

  const geoFiltersActive = hasActiveFinderGeoCoordinates(coordinates);

  const onStateChange = useCallback<
    NonNullable<ComponentProps<typeof InstantSearch>['onStateChange']>
  >(
    ({ uiState, setUiState }) => {
      setUiState(uiState);
      const indexState = uiState[classIndexName];
      if (indexState) syncUrlFromUiState(indexState as Record<string, unknown>);
    },
    [classIndexName, syncUrlFromUiState],
  );

  return {
    classUrl: loaderData.classUrl,
    indexName: classIndexName,
    searchClient,
    initialUiState,
    onStateChange,
    coordinates,
    clearAllFiltersFromUrl,
    desktopFilters,
    isFilterPillSupplementallyActive,
    geoFiltersActive,
  };
}
