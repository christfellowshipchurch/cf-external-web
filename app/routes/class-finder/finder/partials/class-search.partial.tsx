import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLoaderData, useLocation, useSearchParams } from 'react-router-dom';
import { liteClient as algoliasearch } from 'algoliasearch/lite';
import {
  Configure,
  InstantSearch,
  SearchBox,
  useHits,
  useInstantSearch,
} from 'react-instantsearch';

import Icon from '~/primitives/icon';

import { LoaderReturnType } from '../loader';
import { ClassHitComponent } from '../components/class-hit-component.component';
import { AllClassFiltersPopup } from '../components/all-filters.component';
import { createInstantSearchUrlSync } from '~/components/finders/instant-search-url-sync/create-instant-search-url-sync';
import { FinderResultsStats } from '~/components/finders/finder-results-stats.component';
import { FinderStickyBar } from '~/components/finders/finder-sticky-bar.component';
import {
  SearchFilterDesktopItem,
  SearchFilters,
} from '~/components/finders/search-filters';
import { ActiveFilters } from '~/components/finders/search-filters/active-filter.component';
import { ClassHitType } from '../../types';
import { cn } from '~/lib/utils';

import {
  groupClassTypeHits,
  syntheticHitsFromGrouped,
} from '../components/group-class-type-hits';
import {
  JOURNEY_CARD_OBJECT_ID,
  JOURNEY_CARD_URL,
  withJourneyCardFirst,
} from '../components/journey-pinned-card';
import { useAlgoliaUrlSync } from '~/hooks/use-algolia-url-sync';
import { useScrollToSearchResultsOnLoad } from '~/hooks/use-scroll-to-search-results-on-load';
import { HubsTagsRefinementList } from '~/components/hubs-tags-refinement';
import { Button } from '~/primitives/button/button.primitive';
import {
  classFinderEmptyState,
  ClassFinderUrlState,
  classFinderUrlStateToParams,
  parseClassFinderUrlState,
} from '../components/class-finder-url-state';
import { CLASS_FINDER_LOADER_HITS_PER_PAGE } from '../components/build-class-finder-algolia-search';
import { ClassFinderFiltersSkeleton } from '../components/filters/class-finder-filters-skeleton.component';

/**
 * Class finder data flow:
 * 1. Loader fetches initial hits so first paint has real class cards.
 * 2. After hydration, InstantSearch mounts with the real client Algolia search key.
 * 3. Same-route query param changes do not re-run this loader (`route.tsx`); filters/search fetch client-side.
 * 4. Grouping + 12-per-page pagination stay client-side (same as before).
 */

const CLASS_SEARCH_DESKTOP_FILTERS = [
  {
    id: 'topic',
    label: 'Topic',
    popupTitle: 'Topic',
    icon: 'bookOpen',
    data: {
      showFooter: true,
      content: [
        {
          title: 'LEARN ABOUT',
          attribute: 'topic',
        },
      ],
    },
  },
] satisfies SearchFilterDesktopItem[];

function getInitialStateFromUrl(
  searchParams: URLSearchParams,
  buildClassFinderInstantSearchUiState: (urlState: ClassFinderUrlState) => {
    [indexName: string]: Record<string, unknown>;
  },
) {
  const urlState = parseClassFinderUrlState(searchParams);
  return {
    // Snapshot the URL only for the first InstantSearch mount. Later filter
    // changes are synchronized through `onStateChange` instead of remounting
    // the whole search tree.
    initialUiState: buildClassFinderInstantSearchUiState(urlState),
  };
}

export const ClassSearch = () => {
  const loaderData = useLoaderData<LoaderReturnType>();
  const {
    ALGOLIA_APP_ID,
    ALGOLIA_SEARCH_API_KEY,
    classHits,
    rockCoverImagesByPath,
    algoliaIndexes,
  } = loaderData;
  const classIndexName = algoliaIndexes.classes;
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const {
    InstantSearchUrlSync: ClassFinderInstantSearchSync,
    buildUiState: buildClassFinderInstantSearchUiState,
  } = useMemo(
    () =>
      createInstantSearchUrlSync<ClassFinderUrlState>({
        indexName: classIndexName,
        parseUrlState: parseClassFinderUrlState,
      }),
    [classIndexName],
  );

  const { debouncedUpdateUrl, cancelDebounce } = useAlgoliaUrlSync({
    searchParams,
    setSearchParams,
    toParams: classFinderUrlStateToParams,
    debounceMs: 400,
  });

  const initial = useMemo(
    () =>
      getInitialStateFromUrl(
        searchParams,
        buildClassFinderInstantSearchUiState,
      ),
    [buildClassFinderInstantSearchUiState],
  );

  const searchClient = useMemo(
    () => algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY, {}),
    [ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY],
  );

  const clearAllFiltersFromUrl = () => {
    // Clear pending query debounce before resetting params; otherwise a delayed
    // SearchBox write can restore the old query after Clear All.
    cancelDebounce();
    setSearchParams(classFinderUrlStateToParams(classFinderEmptyState), {
      replace: true,
      preventScrollReset: true,
    });
  };

  const syncUrlFromUiState = (indexUiState: Record<string, unknown>) => {
    // Keep the route's existing URL schema as the share/deep-link contract while
    // letting InstantSearch own interactive query/refinement state after mount.
    const urlState: ClassFinderUrlState = {
      ...parseClassFinderUrlState(searchParams),
      query: (indexUiState.query as string) ?? undefined,
      refinementList:
        (indexUiState.refinementList as Record<string, string[]>) ?? undefined,
    };
    debouncedUpdateUrl(urlState);
  };

  useScrollToSearchResultsOnLoad(searchParams, (params) => {
    const s = parseClassFinderUrlState(params);
    return !!(
      (s.query?.trim?.()?.length ?? 0) > 0 ||
      (s.refinementList && Object.keys(s.refinementList).length > 0)
    );
  });

  const fromClassFinderUrl =
    location.pathname +
    (searchParams.toString() ? `?${searchParams.toString()}` : '');

  // Interest-only classes are indexed in Algolia as catalog rows (no session dates).
  const finderFiltersActive = useMemo(() => {
    const s = parseClassFinderUrlState(searchParams);
    return (
      (s.query?.trim?.()?.length ?? 0) > 0 ||
      !!(s.refinementList && Object.keys(s.refinementList).length > 0)
    );
  }, [searchParams]);

  /** SSR/hydration: skeleton filters until react-instantsearch mounts (same pattern as group finder). */
  const [filtersMounted, setFiltersMounted] = useState(false);
  useEffect(() => {
    setFiltersMounted(true);
  }, []);

  return (
    <div
      className='flex w-full min-w-0 max-w-full flex-col gap-4 pagination-scroll-to'
      id='search'
    >
      <div className='flex flex-col bg-white pt-4'>
        {filtersMounted ? (
          <InstantSearch
            indexName={classIndexName}
            searchClient={searchClient}
            initialUiState={
              Object.keys(initial.initialUiState).length > 0
                ? initial.initialUiState
                : undefined
            }
            onStateChange={({ uiState, setUiState }) => {
              setUiState(uiState);
              const indexState = uiState[classIndexName];
              if (indexState) {
                syncUrlFromUiState(indexState as Record<string, unknown>);
              }
            }}
            future={{
              preserveSharedStateOnUnmount: true,
            }}
          >
            <ClassFinderInstantSearchSync />
            <Configure hitsPerPage={CLASS_FINDER_LOADER_HITS_PER_PAGE} />
            <FinderStickyBar>
              <div className='mx-auto flex max-w-screen-content flex-col gap-3 py-4 md:flex-row md:items-center md:gap-4'>
                <div className='w-full md:w-[240px] lg:w-[250px] xl:w-[266px] flex items-center rounded-lg border border-[#DEE0E3] focus-within:border-ocean py-2'>
                  <Icon
                    name='searchAlt'
                    className='text-neutral-default ml-3'
                    size={16}
                  />
                  <SearchBox
                    placeholder='Search'
                    translations={{
                      submitButtonTitle: 'Search',
                      resetButtonTitle: 'Reset',
                    }}
                    classNames={{
                      root: 'flex-grow',
                      form: 'flex',
                      input:
                        'w-full text-base text-neutral-default placeholder:text-neutral-default px-2 py-1 focus:outline-none md:text-sm',
                      resetIcon: 'hidden',
                      submit: 'hidden',
                      loadingIcon: 'hidden',
                    }}
                  />
                </div>

                <div className='lg:hidden w-full'>
                  <SearchFilters
                    onClearAllToUrl={clearAllFiltersFromUrl}
                    desktopFilters={CLASS_SEARCH_DESKTOP_FILTERS}
                    compactInlineFilterCount={2}
                    groupedFooterCount
                    renderMorePanel={({
                      onHide,
                      onClearAllToUrl,
                      mobileBottomSheet,
                      morePanelTitle,
                    }) => (
                      <AllClassFiltersPopup
                        hideTopic
                        hideLanguage
                        showFormat
                        onHide={onHide}
                        onClearAllToUrl={onClearAllToUrl}
                        mobileBottomSheet={mobileBottomSheet}
                        bottomSheetTitle={morePanelTitle}
                      />
                    )}
                  />
                </div>

                <div className='hidden min-w-0 flex-1 lg:block'>
                  <HubsTagsRefinementList
                    attribute='topic'
                    wrapperClass='flex min-w-0 flex-nowrap gap-2 overflow-x-auto py-1 scrollbar-hide md:gap-3'
                  />
                </div>
              </div>
              <ActiveFilters onClearAllToUrl={clearAllFiltersFromUrl} />
            </FinderStickyBar>

            <div className='flex flex-col bg-gray py-8 md:pt-12 md:pb-20 w-full content-padding'>
              <div className='max-w-screen-content mx-auto md:w-full'>
                <ClassTypeGroupedInstantSearchResults
                  initialHits={classHits}
                  rockCoverImagesByPath={rockCoverImagesByPath}
                  filtersActive={finderFiltersActive}
                  fromClassFinderUrl={fromClassFinderUrl}
                  onClearFilters={clearAllFiltersFromUrl}
                />
              </div>
            </div>
          </InstantSearch>
        ) : (
          <>
            {/* SSR fallback: the loader already produced grouped class cards.
                Hold those on screen and show filter skeletons until client-side
                InstantSearch is ready to take over. */}
            <FinderStickyBar>
              <div className='mx-auto flex max-w-screen-content flex-col gap-3 py-4 md:flex-row md:items-center md:gap-4'>
                <div
                  className='h-[42px] w-full animate-pulse rounded-lg bg-neutral-200 md:w-[240px] lg:w-[250px] xl:w-[266px]'
                  aria-hidden
                />
                <ClassFinderFiltersSkeleton />
              </div>
            </FinderStickyBar>

            <div className='flex flex-col bg-gray py-8 md:pt-12 md:pb-20 w-full content-padding'>
              <div className='max-w-screen-content mx-auto md:w-full'>
                <ClassTypeGroupedResults
                  hits={classHits}
                  isLoading={false}
                  rockCoverImagesByPath={rockCoverImagesByPath}
                  filtersActive={finderFiltersActive}
                  fromClassFinderUrl={fromClassFinderUrl}
                  onClearFilters={clearAllFiltersFromUrl}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const ITEMS_PER_PAGE = 12;

function ClassTypeGroupedInstantSearchResults({
  initialHits,
  rockCoverImagesByPath,
  filtersActive,
  fromClassFinderUrl,
  onClearFilters,
}: {
  initialHits: ClassHitType[];
  rockCoverImagesByPath: Record<string, string>;
  filtersActive: boolean;
  fromClassFinderUrl?: string;
  onClearFilters: () => void;
}) {
  const { items } = useHits<ClassHitType>();
  const { status } = useInstantSearch();
  const isLoading = status === 'loading' || status === 'stalled';

  // Keep loader hits visible while the first hydrated InstantSearch request is
  // pending. This preserves the SSR first paint and avoids a flash before
  // client-side Algolia returns equivalent results.
  const hits = isLoading && items.length === 0 ? initialHits : items;

  return (
    <ClassTypeGroupedResults
      hits={hits}
      isLoading={isLoading}
      rockCoverImagesByPath={rockCoverImagesByPath}
      filtersActive={filtersActive}
      fromClassFinderUrl={fromClassFinderUrl}
      onClearFilters={onClearFilters}
    />
  );
}

function ClassTypeGroupedResults({
  hits,
  isLoading,
  rockCoverImagesByPath,
  filtersActive,
  fromClassFinderUrl,
  onClearFilters,
}: {
  hits: ClassHitType[];
  isLoading: boolean;
  rockCoverImagesByPath: Record<string, string>;
  filtersActive: boolean;
  fromClassFinderUrl?: string;
  onClearFilters: () => void;
}) {
  const [currentPage, setCurrentPage] = useState(1);

  const grouped = useMemo(
    () => groupClassTypeHits(hits, rockCoverImagesByPath),
    [hits, rockCoverImagesByPath],
  );

  // The class finder presents one card per class type group, not one raw
  // Algolia record per session. Build synthetic cards from grouped hits before
  // local pagination so the UI stays consistent with the pre-SSR behavior.
  const algoliaHits = useMemo(
    () => syntheticHitsFromGrouped(grouped),
    [grouped],
  );

  // Journey is not in the classes index. Pin it after grouping so it is not
  // rewritten or dropped by isCompleteClassFinderHit / syntheticHitsFromGrouped.
  const mappedHits = useMemo(
    () => withJourneyCardFirst(algoliaHits),
    [algoliaHits],
  );

  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageHits = mappedHits.slice(start, start + ITEMS_PER_PAGE);

  useEffect(() => {
    // Filter/search changes can shrink the synthetic group list. Resetting to
    // page one prevents landing on an empty local page after the result set changes.
    setCurrentPage(1);
  }, [mappedHits.length]);

  const noResults = filtersActive && !isLoading && mappedHits.length === 0;

  return (
    <>
      <div
        className={cn('min-h-[320px] transition-opacity', {
          'opacity-50 pointer-events-none': isLoading,
        })}
      >
        <FinderResultsStats hitCount={mappedHits.length} />

        {noResults ? (
          <div className='flex flex-col items-center gap-4 py-8 text-center'>
            <p className='text-text-secondary'>
              No classes match your search. Try adjusting your filters, or
              browse all classes.
            </p>
            <Button intent='secondary' size='md' onClick={onClearFilters}>
              Clear All Filters
            </Button>
          </div>
        ) : (
          <div className='flex w-full items-center justify-center md:items-start md:justify-start'>
            <div className='grid w-full max-w-[900px] items-stretch lg:max-w-[1296px] gap-y-6 sm:gap-x-8 md:gap-y-8 lg:gap-x-4 lg:gap-y-16 xl:gap-x-8! grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'>
              {pageHits.map((hit) => (
                <ClassHitComponent
                  key={hit.objectID}
                  hit={hit}
                  fromClassFinderUrl={fromClassFinderUrl}
                  to={
                    hit.objectID === JOURNEY_CARD_OBJECT_ID
                      ? JOURNEY_CARD_URL
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {!noResults && (
        <ClassSearchPagination
          totalItems={mappedHits.length}
          itemsPerPage={ITEMS_PER_PAGE}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      )}
    </>
  );
}

function ClassSearchPagination({
  totalItems,
  itemsPerPage,
  currentPage,
  onPageChange,
}: {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  const goToPage = (newPage: number) => {
    onPageChange(newPage);
    document
      .querySelector('.pagination-scroll-to')
      ?.scrollIntoView({ behavior: 'smooth' });
  };

  if (totalPages <= 1) return null;

  return (
    <div className='mt-6 flex justify-center md:justify-start'>
      <div className='flex items-center justify-center gap-2'>
        <PaginationControl
          disabled={isFirstPage}
          onClick={() => goToPage(currentPage - 1)}
        >
          <Icon
            name='chevronLeft'
            size={32}
            color={isFirstPage ? '#CECECE' : '#0092BC'}
          />
        </PaginationControl>
        <p>
          {currentPage} of {totalPages}
        </p>
        <PaginationControl
          disabled={isLastPage}
          onClick={() => goToPage(currentPage + 1)}
        >
          <Icon
            name='chevronRight'
            size={32}
            color={isLastPage ? '#CECECE' : '#0092BC'}
          />
        </PaginationControl>
      </div>
    </div>
  );
}

function PaginationControl({
  disabled,
  onClick,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  if (disabled) {
    return (
      <div>
        <span>{children}</span>
      </div>
    );
  }

  return (
    <div>
      <button type='button' onClick={onClick} className='cursor-pointer'>
        {children}
      </button>
    </div>
  );
}
