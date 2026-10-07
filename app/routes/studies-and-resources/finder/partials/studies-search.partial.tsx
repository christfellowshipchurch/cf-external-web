import { useLoaderData, useLocation, useSearchParams } from 'react-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { liteClient as algoliasearch } from 'algoliasearch/lite';
import { InstantSearch, SearchBox, useHits } from 'react-instantsearch';

import { buildIndexInitialUiState } from '~/components/finders/finder-algolia.utils';
import { FinderResultsStats } from '~/components/finders/finder-results-stats.component';
import { FinderStickyBar } from '~/components/finders/finder-sticky-bar.component';
import { SearchFilters } from '~/components/finders/search-filters';
import { ActiveFilters } from '~/components/finders/search-filters/active-filter.component';
import { useAlgoliaUrlSync } from '~/hooks/use-algolia-url-sync';
import { useScrollToSearchResultsOnLoad } from '~/hooks/use-scroll-to-search-results-on-load';
import { DEFAULT_ALGOLIA_INDEXES } from '~/lib/algolia-indexes';
import Icon from '~/primitives/icon';
import { ResponsiveConfigure } from '~/routes/group-finder/partials/group-search.partial';

import { AllStudiesFiltersPopup } from '../components/popups/all-filters.component';
import { StudyHitComponent } from '../components/studies-hit-component.component';
import { LoaderReturnType } from '../loader';
import {
  STUDIES_FINDER_DESKTOP_FILTERS,
  STUDIES_FINDER_MORE_POPUP_TITLE,
} from '../studies-search-filters.data';
import { StudyHitType } from '../../types';
import {
  parseStudiesFinderUrlState,
  studiesFinderEmptyState,
  studiesFinderUrlStateToParams,
  type StudiesFinderUrlState,
} from '../../studies-finder-url-state';

const ITEMS_PER_PAGE = 12;

/** See .github/ALGOLIA-URL-STATE-REUSABILITY.md — Pattern A step 2. */
function getInitialStateFromUrl(
  searchParams: URLSearchParams,
  indexName: string,
) {
  const urlState = parseStudiesFinderUrlState(searchParams);
  return {
    initialUiState: buildIndexInitialUiState(indexName, urlState) ?? {},
  };
}

export const StudiesSearch = () => {
  const { ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY, algoliaIndexes } =
    useLoaderData<LoaderReturnType>();
  const studiesIndexName = (algoliaIndexes ?? DEFAULT_ALGOLIA_INDEXES)
    .studiesAndResources;
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const { debouncedUpdateUrl, cancelDebounce } = useAlgoliaUrlSync({
    searchParams,
    setSearchParams,
    toParams: studiesFinderUrlStateToParams,
    debounceMs: 400,
  });

  const initial = useMemo(
    () => getInitialStateFromUrl(searchParams, studiesIndexName),
    [studiesIndexName],
  );

  const searchClient = algoliasearch(
    ALGOLIA_APP_ID,
    ALGOLIA_SEARCH_API_KEY,
    {},
  );

  const clearAllFiltersFromUrl = () => {
    cancelDebounce();
    setSearchParams(studiesFinderUrlStateToParams(studiesFinderEmptyState), {
      replace: true,
      preventScrollReset: true,
    });
  };

  const syncUrlFromUiState = (indexUiState: Record<string, unknown>) => {
    const urlState: StudiesFinderUrlState = {
      ...parseStudiesFinderUrlState(searchParams),
      query: (indexUiState.query as string) ?? undefined,
      refinementList:
        (indexUiState.refinementList as Record<string, string[]>) ?? undefined,
    };
    debouncedUpdateUrl(urlState);
  };

  useScrollToSearchResultsOnLoad(searchParams, (params) => {
    const s = parseStudiesFinderUrlState(params);
    return !!(
      (s.query?.trim?.()?.length ?? 0) > 0 ||
      (s.refinementList && Object.keys(s.refinementList).length > 0)
    );
  });

  const fromStudiesFinderUrl =
    location.pathname +
    (searchParams.toString() ? `?${searchParams.toString()}` : '');

  return (
    <div
      className='flex w-full min-w-0 max-w-full flex-col gap-4 pagination-scroll-to'
      id='search'
    >
      <InstantSearch
        indexName={studiesIndexName}
        searchClient={searchClient}
        initialUiState={
          Object.keys(initial.initialUiState).length > 0
            ? initial.initialUiState
            : undefined
        }
        onStateChange={({ uiState, setUiState }) => {
          setUiState(uiState);
          const indexState = uiState[studiesIndexName];
          if (indexState)
            syncUrlFromUiState(indexState as Record<string, unknown>);
        }}
        future={{
          preserveSharedStateOnUnmount: true,
        }}
      >
        <ResponsiveConfigure coordinates={null} hitsPerPageOverride={1000} />
        <div className='flex flex-col bg-white pt-4'>
          <FinderStickyBar>
            <div className='mx-auto flex max-w-screen-content flex-col gap-3 py-4 md:flex-row md:items-center md:gap-4'>
              <div className='flex w-full items-center rounded-lg border border-[#DEE0E3] py-2 focus-within:border-ocean md:w-[240px] lg:w-[250px] xl:w-[266px]'>
                <Icon
                  name='searchAlt'
                  className='ml-3 text-neutral-default'
                  size={16}
                />
                <SearchBox
                  placeholder='Keyword'
                  translations={{
                    submitButtonTitle: 'Search',
                    resetButtonTitle: 'Reset',
                  }}
                  classNames={{
                    root: 'flex-grow',
                    form: 'flex',
                    input:
                      'w-full px-2 py-1 text-base text-neutral-default placeholder:text-neutral-default focus:outline-none md:text-sm',
                    resetIcon: 'hidden',
                    submit: 'hidden',
                    loadingIcon: 'hidden',
                  }}
                />
              </div>

              <div className='min-w-0 flex-1'>
                <SearchFilters
                  onClearAllToUrl={clearAllFiltersFromUrl}
                  desktopFilters={STUDIES_FINDER_DESKTOP_FILTERS}
                  compactInlineFilterCount={2}
                  moreButtonLabel={STUDIES_FINDER_MORE_POPUP_TITLE}
                  renderMorePanel={({
                    onHide,
                    onClearAllToUrl: onClearAll,
                    mobileBottomSheet,
                    morePanelTitle,
                  }) => (
                    <AllStudiesFiltersPopup
                      onHide={onHide}
                      onClearAllToUrl={onClearAll}
                      mobileBottomSheet={mobileBottomSheet}
                      bottomSheetTitle={morePanelTitle}
                    />
                  )}
                />
              </div>
            </div>
            <ActiveFilters onClearAllToUrl={clearAllFiltersFromUrl} />
          </FinderStickyBar>

          <div className='flex w-full flex-col bg-gray py-8 content-padding md:pb-20 md:pt-12'>
            <div className='mx-auto max-w-screen-content md:w-full'>
              <StudyTypeGroupedResults
                fromStudiesFinderUrl={fromStudiesFinderUrl}
              />
            </div>
          </div>
        </div>
      </InstantSearch>
    </div>
  );
};

interface GroupedStudyType {
  coverImage: string;
  content: string;
  title: string;
  url: string;
  summary: string;
  topic: StudyHitType['topic'];
  format: StudyHitType['format'] | 'Multiple Formats';
  duration: StudyHitType['duration'];
  audience: StudyHitType['audience'] | 'Multiple';
  source: StudyHitType['source'] | 'Multiple';
}

/**
 * Default result ordering: Christ Fellowship resources first, then alphabetical (CFDP-4154).
 * Matches the CF-detection convention used in studies-hit-component.component.tsx — the raw
 * Algolia `source` value doesn't reliably match the `StudyHitType['source']` union at runtime.
 */
function isChristFellowshipSource(source: string): boolean {
  return source.toLowerCase().includes('christ fellowship');
}

function StudyTypeGroupedResults({
  fromStudiesFinderUrl,
}: {
  fromStudiesFinderUrl?: string;
}) {
  const { items } = useHits<StudyHitType>();
  const [currentPage, setCurrentPage] = useState(1);

  const groupedStudyTypes: GroupedStudyType[] = useMemo(() => {
    const groups = items.reduce((acc, hit) => {
      const studyType = hit.studyType;
      const existingGroup = acc.find((group) => group.title === studyType);

      if (existingGroup) {
        existingGroup.format = 'Multiple Formats';
        existingGroup.audience = 'Multiple';
        existingGroup.source = 'Multiple';
      } else {
        acc.push({
          coverImage: hit.coverImage?.sources?.[0]?.uri ?? '',
          title: hit.title,
          url: hit.url,
          content: hit.content ?? '',
          summary:
            (hit.summary ?? '').trim() || (hit.description ?? '').trim() || '',
          topic: hit.topic ?? 'Spiritual Growth',
          format: hit.format ?? 'Video',
          duration: hit.duration ?? 'Short',
          audience: hit.audience ?? 'Everyone',
          source: hit.source ?? 'Christ Fellowship',
        });
      }

      return acc;
    }, [] as GroupedStudyType[]);

    return groups.sort((a, b) => {
      const aIsCf = isChristFellowshipSource(a.source) ? 0 : 1;
      const bIsCf = isChristFellowshipSource(b.source) ? 0 : 1;
      return aIsCf !== bIsCf ? aIsCf - bIsCf : a.title.localeCompare(b.title);
    });
  }, [items]);

  const mappedStudyTypes: StudyHitType[] = useMemo(() => {
    return groupedStudyTypes.map((group, index) => ({
      objectID: `grouped-${index}`,
      id: `grouped-${index}`,
      title: group.title,
      studyType: group.title as StudyHitType['studyType'],
      subtitle: '',
      url: group.url as StudyHitType['url'],
      content: group.content,
      summary: group.summary,
      description: group.summary,
      coverImage: {
        sources: [{ uri: group.coverImage }],
      },
      duration: group.duration,
      topic: group.topic,
      format: group.format === 'Multiple Formats' ? 'Video' : group.format,
      audience: group.audience === 'Multiple' ? 'Everyone' : group.audience,
      source: group.source === 'Multiple' ? 'Christ Fellowship' : group.source,
      _highlightResult: {
        title: { value: group.title, matchLevel: 'none', matchedWords: [] },
        summary: {
          value: group.summary,
          matchLevel: 'none',
          matchedWords: [],
        },
        author: {
          firstName: { value: '', matchLevel: 'none', matchedWords: [] },
          lastName: { value: '', matchLevel: 'none', matchedWords: [] },
        },
        routing: {
          pathname: { value: '', matchLevel: 'none', matchedWords: [] },
        },
        htmlContent: [],
      },
      __position: index,
    }));
  }, [groupedStudyTypes]);

  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageHits = mappedStudyTypes.slice(start, start + ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [mappedStudyTypes.length]);

  return (
    <>
      <div className='min-h-[320px]'>
        <FinderResultsStats hitCount={mappedStudyTypes.length} />

        <div className='flex w-full items-center justify-center md:items-start md:justify-start'>
          <div className='grid w-full max-w-[900px] grid-cols-1 items-stretch gap-y-6 sm:grid-cols-2 sm:gap-x-8 md:grid-cols-3 md:gap-y-8 lg:max-w-[1296px] lg:grid-cols-4 lg:gap-x-4 lg:gap-y-16 xl:gap-x-8!'>
            {pageHits.map((hit) => (
              <StudyHitComponent
                key={hit.objectID}
                hit={hit}
                fromStudiesFinderUrl={fromStudiesFinderUrl}
              />
            ))}
          </div>
        </div>
      </div>

      <StudySearchPagination
        totalItems={mappedStudyTypes.length}
        itemsPerPage={ITEMS_PER_PAGE}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
    </>
  );
}

function StudySearchPagination({
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
