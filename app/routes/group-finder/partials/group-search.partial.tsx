import { useLoaderData, useLocation, useSearchParams } from 'react-router-dom';
import { liteClient as algoliasearch } from 'algoliasearch/lite';
import {
  Configure,
  InstantSearch,
  useHits,
  useInstantSearch,
  usePagination,
  useStats,
} from 'react-instantsearch';

import { FinderResultsStats } from '~/components/finders/finder-results-stats.component';
import { FinderStickyBar } from '~/components/finders/finder-sticky-bar.component';
import { GroupFinderNotifyModal } from '~/components/modals';
import { useResponsive } from '~/hooks/use-responsive';
import { cn } from '~/lib/utils';
import { Icon } from '~/primitives/icon/icon';
import { GroupFinderFiltersSkeleton } from '../components/filters/group-finder-filters-skeleton.component';
import {
  buildGroupFinderInstantSearchUiState,
  GroupFinderInstantSearchSync,
} from '../components/group-finder-instant-search-sync.component';
import { GroupFinderQueryInput } from '../components/group-finder-query-input.component';
import type { LoaderReturnType } from '../loader';
import { GroupHit } from '../components/group-hit.component';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { GroupFinderOverflowFiltersPanel } from '../components/group-finder-overflow-filters.component';
import {
  parseGroupFinderUrlState,
  groupFinderUrlStateToParams,
  groupFinderEmptyState,
  hasGroupFinderNonInstantSearchFilters,
  type GroupFinderUrlState,
} from '../group-finder-url-state';
import { useAlgoliaUrlSync } from '~/hooks/use-algolia-url-sync';
import {
  SearchFilters,
  type SearchFilterDesktopItem,
} from '~/components/finders/search-filters';
import { useScrollToSearchResultsOnLoad } from '~/hooks/use-scroll-to-search-results-on-load';
import { ActiveFilters } from '~/components/finders/search-filters/active-filter.component';
import {
  getGroupSearchDesktopFilters,
  GROUP_FINDER_MORE_POPUP_TITLE,
} from '../group-search-filters.data';
import {
  buildMinMaxAgeFilter,
  GROUP_FINDER_LOADER_HITS_PER_PAGE,
} from '../components/build-group-finder-algolia-search';

/**
 * Group finder data flow (SSR-friendly):
 *
 * 1. Route loader fetches initial Algolia hits so first paint has real group cards.
 * 2. After hydration, InstantSearch mounts with the real client Algolia search key.
 * 3. Same-route query param changes do not re-run this loader (`route.tsx`); filters/search fetch client-side.
 * 4. `filtersMounted` defers InstantSearch until after hydration so the initial grid is not blocked.
 *
 * See also `.github/ALGOLIA-URL-STATE-REUSABILITY.md` (Pattern A).
 */

function coordinatesFromUrlState(
  urlState: ReturnType<typeof parseGroupFinderUrlState>,
) {
  // Zip/GPS searches are represented outside Algolia's refinementList because
  // InstantSearch stores geo as Configure props. Keep lat/lng in our URL state
  // so full page loads and browser navigation can recreate the same search.
  if (
    urlState.lat != null &&
    urlState.lng != null &&
    Number.isFinite(urlState.lat) &&
    Number.isFinite(urlState.lng)
  ) {
    return { lat: urlState.lat, lng: urlState.lng };
  }
  return null;
}

/**
 * Whether the "Virtual" meeting-type filter is currently active. Virtual groups
 * are faceted under `meetingType` as either "Virtual" or "Online" in Algolia, so
 * treat either value as active. When active, group cards show "Online" in their
 * footer bar instead of a physical meeting location.
 */
function isVirtualMeetingTypeActive(
  urlState: ReturnType<typeof parseGroupFinderUrlState>,
): boolean {
  const values = urlState.refinementList?.meetingType ?? [];
  return values.some((v) => {
    const t = v.trim().toLowerCase();
    return t === 'virtual' || t === 'online';
  });
}

/** Snapshot for InstantSearch `initialUiState` and local age/geo state on first client render. */
function getInitialStateFromUrl(
  searchParams: URLSearchParams,
  indexName: string,
) {
  const urlState = parseGroupFinderUrlState(searchParams);
  const ageInput = urlState.age ?? '';

  return {
    coordinates: coordinatesFromUrlState(urlState),
    ageInput,
    initialUiState: buildGroupFinderInstantSearchUiState(urlState, indexName),
  };
}

export const GroupSearch = () => {
  const loaderData = useLoaderData<LoaderReturnType>();
  const {
    ALGOLIA_APP_ID,
    ALGOLIA_SEARCH_API_KEY,
    groupHits,
    groupNbHits,
    groupNbPages,
    groupPage,
    minMaxAgeValues,
    algoliaIndexes,
    campusCityByName,
    showGroupsLaunchNotify,
  } = loaderData;
  const groupIndexName = algoliaIndexes.groups;
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const urlState = useMemo(
    () => parseGroupFinderUrlState(searchParams),
    [searchParams],
  );

  const isVirtualFilterActive = useMemo(
    () => isVirtualMeetingTypeActive(urlState),
    [urlState],
  );

  // Loader seeds first paint; hydrated interactions use the real client search key.
  const searchClient = useMemo(
    () => algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY, {}),
    [ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY],
  );

  const { cancelDebounce, updateUrlIfChanged } = useAlgoliaUrlSync({
    searchParams,
    setSearchParams,
    toParams: groupFinderUrlStateToParams,
    debounceMs: 400,
  });

  // Captured once when this route mounts; InstantSearch mounts one frame later (see `filtersMounted`).
  const initial = useMemo(
    () => getInitialStateFromUrl(searchParams, groupIndexName),
    [groupIndexName],
  );

  const [coordinates, setCoordinatesState] = useState<{
    lat: number | null;
    lng: number | null;
  } | null>(initial.coordinates);
  const [locationSource, setLocationSource] = useState<'zip' | 'gps' | null>(
    null,
  );
  const [ageInput, setAgeInputState] = useState<string>(initial.ageInput);

  // `setCoordinates` must keep a STABLE identity. It is passed down into
  // `FinderLocationSearch`, whose effects list it as a dependency; if it changed
  // on every `searchParams` update, those effects would re-run and re-apply the
  // last geocoded coordinates (with `page: 0`), wiping pagination and looping.
  // Read the latest searchParams/age from refs so the callback stays stable.
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;
  const ageInputRef = useRef(ageInput);
  ageInputRef.current = ageInput;

  // Back/forward and loader navigation: rehydrate age/geo/campus from URL (not in refinementList alone).
  useEffect(() => {
    const urlState = parseGroupFinderUrlState(searchParams);
    setAgeInputState(urlState.age ?? '');
    // Keep the previous object identity when lat/lng are unchanged.
    // `coordinatesFromUrlState` mints a fresh object on every call, so writing
    // it unconditionally gave `coordinates` a new identity on *every* URL change
    // (e.g. pagination), which re-ran `mergeUrlState`/`desktopFilters` and
    // re-evaluated the geo `<Configure>`. With no geo this is a no-op (null ===
    // null), which is why the bugs were geo-only; this makes the geo path match.
    setCoordinatesState((prev) => {
      const next = coordinatesFromUrlState(urlState);
      if (
        (prev?.lat ?? null) === (next?.lat ?? null) &&
        (prev?.lng ?? null) === (next?.lng ?? null)
      ) {
        return prev;
      }
      return next;
    });
  }, [searchParams]);

  const clearAllFiltersFromUrl = () => {
    // Clear both InstantSearch-owned refinements and custom URL-only state
    // (age + geo). Canceling the debounce prevents an in-flight URL write from
    // re-applying stale filters after the user has cleared everything.
    cancelDebounce();
    setCoordinatesState(null);
    setLocationSource(null);
    setAgeInputState('');
    setSearchParams(groupFinderUrlStateToParams(groupFinderEmptyState), {
      replace: true,
      preventScrollReset: true,
    });
  };

  const setCoordinates = useCallback(
    (next: typeof coordinates) => {
      setCoordinatesState(next);
      const noCoords =
        next == null ||
        next.lat == null ||
        next.lng == null ||
        Number.isNaN(next.lat) ||
        Number.isNaN(next.lng);
      if (noCoords) {
        setLocationSource(null);
      }

      const merged: GroupFinderUrlState = {
        ...parseGroupFinderUrlState(searchParamsRef.current),
        age: ageInputRef.current || undefined,
        page: 0,
      };
      if (noCoords) {
        delete merged.lat;
        delete merged.lng;
      } else {
        // Coordinates are later translated into Algolia geo Configure props by
        // ResponsiveConfigure. They stay in the URL so share links preserve the
        // user's zip/GPS location context.
        merged.lat = next.lat ?? undefined;
        merged.lng = next.lng ?? undefined;
      }
      updateUrlIfChanged(merged);
    },
    [updateUrlIfChanged],
  );

  const setAgeInput = (next: string) => {
    setAgeInputState(next);
    // Do not treat one-off keystrokes as a real age filter. This matches the
    // filter UI threshold and avoids URL churn while the user starts typing.
    const ageValue = next.trim().length >= 2 ? next.trim() : undefined;
    const merged: GroupFinderUrlState = {
      ...parseGroupFinderUrlState(searchParams),
      age: ageValue,
      page: 0,
    };
    updateUrlIfChanged(merged);
  };

  useScrollToSearchResultsOnLoad(searchParams, (params) => {
    const s = parseGroupFinderUrlState(params);
    return !!(
      (s.query?.trim?.()?.length ?? 0) > 0 ||
      (s.refinementList && Object.keys(s.refinementList ?? {}).length > 0) ||
      (s.age?.trim?.()?.length ?? 0) > 0
    );
  });

  const fromGroupFinderUrl =
    location.pathname +
    (searchParams.toString() ? `?${searchParams.toString()}` : '');

  const additionalClearAllFiltersActive = hasGroupFinderNonInstantSearchFilters(
    parseGroupFinderUrlState(searchParams),
    coordinates,
  );

  const desktopFilters = useMemo(
    () =>
      getGroupSearchDesktopFilters({
        coordinates,
        setCoordinates,
        locationSource,
        onLocationKind: setLocationSource,
      }),
    [coordinates, setCoordinates, locationSource],
  );

  const isFilterPillSupplementallyActive = useCallback(
    (item: SearchFilterDesktopItem) => {
      if (item.id === 'people') return ageInput.trim().length >= 2;
      if (item.id === 'location')
        return (
          coordinates?.lat != null &&
          coordinates?.lng != null &&
          !Number.isNaN(coordinates.lat) &&
          !Number.isNaN(coordinates.lng)
        );
      return false;
    },
    [ageInput, coordinates],
  );

  // Merges InstantSearch refinements with age + lat/lng that live in URL but outside uiState.
  const mergeUrlState = useCallback(
    (partial: Partial<GroupFinderUrlState>) => {
      const merged: GroupFinderUrlState = {
        ...parseGroupFinderUrlState(searchParams),
        age: ageInput || undefined,
        lat: coordinates?.lat ?? undefined,
        lng: coordinates?.lng ?? undefined,
        ...partial,
      };
      return merged;
    },
    [ageInput, searchParams, coordinates],
  );

  const commitQuery = useCallback(
    (nextQuery: string) => {
      const q = nextQuery.trim();
      updateUrlIfChanged(
        mergeUrlState({
          query: q || undefined,
          page: 0,
        }),
      );
    },
    [mergeUrlState, updateUrlIfChanged],
  );

  const goToPage = useCallback(
    (nextPage: number) => {
      updateUrlIfChanged(
        mergeUrlState({
          page: Math.max(0, nextPage),
        }),
      );
      const scrollTarget = document.querySelector('.pagination-scroll-to');
      scrollTarget?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [mergeUrlState, updateUrlIfChanged],
  );

  // Refinement/pagination -> URL. Same-path URL changes are blocked from
  // revalidating by route.tsx, so this write updates share/back-forward state
  // while the actual search happens client-side in InstantSearch.
  const syncUrlFromUiState = (indexUiState: Record<string, unknown>) => {
    // `indexUiState.page` is 1-based (InstantSearch), but `GroupFinderUrlState.page`
    // is 0-based (the parser/serializer add/remove the +1 for the URL). Convert
    // down by one so a round-trip preserves the page instead of inflating it.
    const rawPage = indexUiState.page;
    const pageZeroBased =
      typeof rawPage === 'number' && Number.isFinite(rawPage) && rawPage > 1
        ? Math.floor(rawPage) - 1
        : undefined;
    updateUrlIfChanged(
      mergeUrlState({
        refinementList:
          (indexUiState.refinementList as Record<string, string[]>) ??
          undefined,
        page: pageZeroBased,
      }),
    );
  };

  const isFirstPage = groupPage <= 0;
  const isLastPage = groupNbPages <= 0 || groupPage >= groupNbPages - 1;

  /**
   * SSR/hydration: first paint uses loader HTML for the grid + skeleton for filters.
   * `useEffect` flips true after hydration so react-instantsearch does not block the results tree.
   * Server and first client render both use `filtersMounted === false` (no mismatch).
   */
  const [filtersMounted, setFiltersMounted] = useState(false);
  useEffect(() => {
    setFiltersMounted(true);
  }, []);

  return (
    <div
      className='flex w-full min-w-0 max-w-full flex-col gap-4 pagination-scroll-to'
      id='search'
    >
      <div className='flex flex-col'>
        {filtersMounted ? (
          <InstantSearch
            indexName={groupIndexName}
            searchClient={searchClient}
            initialUiState={
              Object.keys(initial.initialUiState).length > 0
                ? initial.initialUiState
                : undefined
            }
            onStateChange={({ uiState, setUiState }) => {
              setUiState(uiState);
              const indexState = uiState[groupIndexName];
              if (indexState)
                syncUrlFromUiState(indexState as Record<string, unknown>);
            }}
            future={{
              preserveSharedStateOnUnmount: true,
            }}
          >
            <GroupFinderInstantSearchSync indexName={groupIndexName} />
            <ResponsiveConfigure
              ageInput={ageInput}
              coordinates={coordinates}
              minMaxAgeValues={minMaxAgeValues}
              hitsPerPageOverride={GROUP_FINDER_LOADER_HITS_PER_PAGE}
              query={urlState.query}
            />

            <FinderStickyBar>
              <div className='mx-auto flex max-w-screen-content flex-col gap-3 py-4 md:flex-row md:items-center md:gap-4'>
                <GroupFinderQueryInput
                  query={urlState.query}
                  onQueryCommit={commitQuery}
                />
                {/* Separates keyword search from the location/filter pills so
                    users don't type zip codes into the keyword field. */}
                <div
                  aria-hidden
                  className='hidden h-8 w-px shrink-0 bg-[#DEE0E3] md:block'
                />
                <SearchFilters
                  onClearAllToUrl={clearAllFiltersFromUrl}
                  desktopFilters={desktopFilters}
                  compactInlineFilterCount={2}
                  filterPopupAgeInput={ageInput}
                  setFilterPopupAgeInput={setAgeInput}
                  isFilterPillSupplementallyActive={
                    isFilterPillSupplementallyActive
                  }
                  renderMorePanel={({
                    onHide,
                    onClearAllToUrl,
                    mobileBottomSheet,
                  }) => (
                    <GroupFinderOverflowFiltersPanel
                      onHide={onHide}
                      ageInput={ageInput}
                      setAgeInput={setAgeInput}
                      coordinates={coordinates}
                      setCoordinates={setCoordinates}
                      locationSource={locationSource}
                      onLocationKind={setLocationSource}
                      onClearAllToUrl={onClearAllToUrl}
                      mobileBottomSheet={mobileBottomSheet}
                      bottomSheetTitle={GROUP_FINDER_MORE_POPUP_TITLE}
                    />
                  )}
                />
              </div>
              <ActiveFilters
                onClearAllToUrl={clearAllFiltersFromUrl}
                additionalFiltersActive={additionalClearAllFiltersActive}
              />
            </FinderStickyBar>

            <GroupFinderInstantSearchResults
              initialHits={groupHits}
              initialNbHits={groupNbHits}
              fromGroupFinderUrl={fromGroupFinderUrl}
              isGeoSearch={coordinates?.lat != null && coordinates?.lng != null}
              isVirtualFilterActive={isVirtualFilterActive}
              campusCityByName={campusCityByName}
              showGroupsLaunchNotify={showGroupsLaunchNotify}
            />
          </InstantSearch>
        ) : (
          <>
            {/* Before hydration, keep the loader-rendered results visible and
                reserve filter space with a skeleton. This avoids a blank grid
                while the client-only Algolia widgets boot. */}
            <FinderStickyBar>
              <div className='mx-auto flex max-w-screen-content flex-col gap-3 py-4 md:flex-row md:items-center md:gap-4'>
                <GroupFinderQueryInput
                  query={urlState.query}
                  onQueryCommit={commitQuery}
                />
                <div
                  aria-hidden
                  className='hidden h-8 w-px shrink-0 bg-[#DEE0E3] md:block'
                />
                <GroupFinderFiltersSkeleton />
              </div>
            </FinderStickyBar>

            <GroupFinderInitialResults
              groupHits={groupHits}
              groupNbHits={groupNbHits}
              groupNbPages={groupNbPages}
              groupPage={groupPage}
              isFirstPage={isFirstPage}
              isLastPage={isLastPage}
              fromGroupFinderUrl={fromGroupFinderUrl}
              onPageChange={goToPage}
              isGeoSearch={coordinates?.lat != null && coordinates?.lng != null}
              isVirtualFilterActive={isVirtualFilterActive}
              campusCityByName={campusCityByName}
              showGroupsLaunchNotify={showGroupsLaunchNotify}
            />
          </>
        )}
      </div>
    </div>
  );
};

function GroupFinderInstantSearchResults({
  initialHits,
  initialNbHits,
  fromGroupFinderUrl,
  isGeoSearch,
  isVirtualFilterActive,
  campusCityByName,
  showGroupsLaunchNotify,
}: {
  initialHits: LoaderReturnType['groupHits'];
  initialNbHits: number;
  fromGroupFinderUrl: string;
  isGeoSearch: boolean;
  isVirtualFilterActive: boolean;
  campusCityByName: LoaderReturnType['campusCityByName'];
  showGroupsLaunchNotify: boolean;
}) {
  const { items } = useHits<LoaderReturnType['groupHits'][number]>();
  const { nbHits } = useStats();
  const { status } = useInstantSearch();
  const { currentRefinement, nbPages, isFirstPage, isLastPage, refine } =
    usePagination();
  const isLoading = status === 'loading' || status === 'stalled';

  // Show the SSR loader hits until the first client search returns results.
  // Latch on `items.length > 0` (not merely `!isLoading`): InstantSearch reports
  // status 'idle' on its very first render *before* issuing a search, so latching
  // on `!isLoading` alone would drop the loader hits and blank the grid during the
  // SSR->client handoff. Once resolved, `items` already retains the previous
  // results while a new search is in flight, so we render those — this avoids
  // flashing the loader groups when clearing filters from a 0-results state.
  const hasResolvedRef = useRef(false);
  if (!isLoading && items.length > 0) hasResolvedRef.current = true;
  const useInitialFallback = !hasResolvedRef.current && items.length === 0;

  const hits = useInitialFallback ? initialHits : items;
  const hitCount = useInitialFallback ? initialNbHits : nbHits;

  // Don't dim during the initial handoff: we're showing the loader hits, so a
  // loading flash would just be noise. Only show the loading state for searches
  // the user triggers after the first client results have resolved.
  const showLoading = isLoading && hasResolvedRef.current;

  const goToPage = (nextPage: number) => {
    refine(Math.max(0, nextPage));
    window.requestAnimationFrame(() => {
      const scrollTarget = document.querySelector('.pagination-scroll-to');
      scrollTarget?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <GroupFinderResultsLayout
      groupHits={hits}
      groupNbHits={hitCount}
      groupNbPages={nbPages}
      groupPage={currentRefinement}
      isFirstPage={isFirstPage}
      isLastPage={isLastPage}
      isLoading={showLoading}
      fromGroupFinderUrl={fromGroupFinderUrl}
      onPageChange={goToPage}
      isGeoSearch={isGeoSearch}
      isVirtualFilterActive={isVirtualFilterActive}
      campusCityByName={campusCityByName}
      showGroupsLaunchNotify={showGroupsLaunchNotify}
    />
  );
}

function GroupFinderInitialResults({
  groupHits,
  groupNbHits,
  groupNbPages,
  groupPage,
  isFirstPage,
  isLastPage,
  fromGroupFinderUrl,
  onPageChange,
  isGeoSearch,
  isVirtualFilterActive,
  campusCityByName,
  showGroupsLaunchNotify,
}: {
  groupHits: LoaderReturnType['groupHits'];
  groupNbHits: number;
  groupNbPages: number;
  groupPage: number;
  isFirstPage: boolean;
  isLastPage: boolean;
  fromGroupFinderUrl: string;
  onPageChange: (nextPage: number) => void;
  isGeoSearch: boolean;
  isVirtualFilterActive: boolean;
  campusCityByName: LoaderReturnType['campusCityByName'];
  showGroupsLaunchNotify: boolean;
}) {
  return (
    <GroupFinderResultsLayout
      groupHits={groupHits}
      groupNbHits={groupNbHits}
      groupNbPages={groupNbPages}
      groupPage={groupPage}
      isFirstPage={isFirstPage}
      isLastPage={isLastPage}
      isLoading={false}
      fromGroupFinderUrl={fromGroupFinderUrl}
      onPageChange={onPageChange}
      isGeoSearch={isGeoSearch}
      isVirtualFilterActive={isVirtualFilterActive}
      campusCityByName={campusCityByName}
      showGroupsLaunchNotify={showGroupsLaunchNotify}
    />
  );
}

function GroupFinderResultsLayout({
  groupHits,
  groupNbHits,
  groupNbPages,
  groupPage,
  isFirstPage,
  isLastPage,
  isLoading,
  fromGroupFinderUrl,
  onPageChange,
  isGeoSearch,
  isVirtualFilterActive,
  campusCityByName,
  showGroupsLaunchNotify,
}: {
  groupHits: LoaderReturnType['groupHits'];
  groupNbHits: number;
  groupNbPages: number;
  groupPage: number;
  isFirstPage: boolean;
  isLastPage: boolean;
  isLoading: boolean;
  fromGroupFinderUrl: string;
  onPageChange: (nextPage: number) => void;
  isGeoSearch: boolean;
  isVirtualFilterActive: boolean;
  campusCityByName: LoaderReturnType['campusCityByName'];
  showGroupsLaunchNotify: boolean;
}) {
  return (
    <div className='flex flex-col bg-gray pt-4 pb-8 md:pt-12 md:pb-20 w-full content-padding'>
      <div className='max-w-screen-content mx-auto md:w-full'>
        <GroupFinderResultsHeader
          hitCount={groupNbHits}
          showGroupsLaunchNotify={showGroupsLaunchNotify}
        />
        <div className='min-h-[320px]'>
          {groupHits.length === 0 && !isLoading ? (
            <p className='text-text-secondary text-center py-8'>
              No groups found. Try adjusting your filters or search.
            </p>
          ) : (
            <div
              className={cn(
                'grid w-full max-w-[900px] items-stretch lg:max-w-[1296px] gap-y-6 sm:gap-x-6 md:gap-x-6 md:gap-y-8 lg:gap-x-4 lg:gap-y-12 xl:gap-x-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mx-auto md:mx-0',
                isLoading && 'opacity-60 pointer-events-none',
              )}
            >
              {groupHits.map((hit) => (
                <GroupHit
                  key={hit.objectID}
                  hit={hit}
                  backUrl={fromGroupFinderUrl}
                  isGeoSearch={isGeoSearch}
                  isVirtualFilterActive={isVirtualFilterActive}
                  campusCityByName={campusCityByName}
                />
              ))}
            </div>
          )}
        </div>
        {groupNbPages > 1 && (
          <div className='mt-6 flex items-center justify-center gap-2 md:justify-start'>
            <GroupFinderPaginationButton
              isDisabled={isFirstPage}
              onClick={() => onPageChange(groupPage - 1)}
            >
              <Icon
                name='chevronLeft'
                size={32}
                color={isFirstPage ? '#CECECE' : '#0092BC'}
              />
            </GroupFinderPaginationButton>
            <p>
              {groupPage + 1} of {groupNbPages}
            </p>
            <GroupFinderPaginationButton
              isDisabled={isLastPage}
              onClick={() => onPageChange(groupPage + 1)}
            >
              <Icon
                name='chevronRight'
                size={32}
                color={isLastPage ? '#CECECE' : '#0092BC'}
              />
            </GroupFinderPaginationButton>
          </div>
        )}
      </div>
    </div>
  );
}

function GroupFinderResultsHeader({
  hitCount,
  showGroupsLaunchNotify,
}: {
  hitCount: number;
  showGroupsLaunchNotify: boolean;
}) {
  const formattedHitCount = hitCount.toLocaleString();

  return (
    <div className='mb-4 md:mb-6 max-w-[1296px] lg:mr-auto'>
      <div className='hidden md:flex md:items-center md:justify-between md:gap-6'>
        <FinderResultsStats hitCount={hitCount} />
        {showGroupsLaunchNotify && (
          <div className='flex items-center gap-6 text-base text-text-primary'>
            <p>More groups available at our next launch.</p>
            <GroupFinderNotifyTrigger variant='desktop' />
          </div>
        )}
      </div>
      <div className='flex flex-col items-start gap-1 md:hidden'>
        {showGroupsLaunchNotify ? (
          <>
            <p className='text-sm leading-5 text-text-primary'>
              {formattedHitCount} Results - More available at our next groups
              launch.
            </p>
            <GroupFinderNotifyTrigger variant='mobile' />
          </>
        ) : (
          <p className='text-sm leading-5 text-text-primary'>
            {formattedHitCount} Results
          </p>
        )}
      </div>
    </div>
  );
}

function GroupFinderNotifyTrigger({
  variant,
}: {
  variant: 'desktop' | 'mobile';
}) {
  if (variant === 'mobile') {
    return (
      <GroupFinderNotifyModal>
        <button
          type='button'
          className='inline-flex items-center gap-2 text-sm leading-none text-ocean'
        >
          <Icon name='bell' size={18} color='currentColor' />
          <span>Get Notified</span>
        </button>
      </GroupFinderNotifyModal>
    );
  }

  return (
    <GroupFinderNotifyModal>
      <button
        type='button'
        className='inline-flex min-h-10 items-center gap-2 rounded-[8px] bg-[#DAEAF1] px-4 text-base font-semibold text-ocean transition-colors hover:bg-[#CDE7F1]'
      >
        <Icon name='bell' size={18} color='currentColor' />
        <span>Get Notified</span>
      </button>
    </GroupFinderNotifyModal>
  );
}

function GroupFinderPaginationButton({
  children,
  isDisabled = false,
  onClick,
}: {
  children: ReactNode;
  isDisabled?: boolean;
  onClick: () => void;
}) {
  if (isDisabled) {
    return (
      <span className='inline-flex cursor-not-allowed items-center justify-center opacity-50'>
        {children}
      </span>
    );
  }

  return (
    <button
      type='button'
      onClick={onClick}
      className='inline-flex cursor-pointer items-center justify-center'
    >
      {children}
    </button>
  );
}

export const ResponsiveConfigure = ({
  ageInput,
  coordinates,
  minMaxAgeValues = [],
  /** When set, skips responsive 5–12 caps (e.g. class finder groups many hits by `classType` client-side). */
  hitsPerPageOverride,
  query,
}: {
  ageInput?: string;
  coordinates: {
    lat: number | null;
    lng: number | null;
  } | null;
  minMaxAgeValues?: string[];
  hitsPerPageOverride?: number;
  query?: string;
}) => {
  const { isSmall, isMedium, isLarge, isXLarge } = useResponsive();

  const hitsPerPage =
    hitsPerPageOverride ??
    (() => {
      switch (true) {
        case isXLarge || isLarge:
          return 12;
        case isMedium:
          return 9;
        case isSmall:
          return 5;
        default:
          return 5;
      }
    })();

  const ageFilter = buildMinMaxAgeFilter(ageInput, minMaxAgeValues);

  // No `key` here: a key tied to coordinates/age remounts Configure whenever the
  // geo filter changes. Under `preserveSharedStateOnUnmount`, that remount strands
  // the previous `query`/geo params in InstantSearch, so clearing a geo search left
  // the old query active and stuck on 0 results until a page refresh. Keeping
  // Configure mounted lets it reactively apply (and remove) params as props change.
  // `query ?? ''` ensures the query param is always explicitly set, never stranded.
  return (
    <Configure
      hitsPerPage={hitsPerPage}
      filters={ageFilter}
      query={query ?? ''}
      aroundLatLng={
        coordinates?.lat != null && coordinates?.lng != null
          ? `${coordinates.lat}, ${coordinates.lng}`
          : undefined
      }
      aroundRadius='all'
      aroundLatLngViaIP={false}
      getRankingInfo={true}
    />
  );
};
