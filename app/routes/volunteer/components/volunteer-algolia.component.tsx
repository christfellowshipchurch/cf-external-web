import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  Configure,
  InstantSearch,
  useHits,
  useInstantSearch,
  useRefinementList,
  useStats,
} from 'react-instantsearch';

import { FinderStickyBar } from '~/components/finders/finder-sticky-bar.component';
import { ActiveFilters } from '~/components/finders/search-filters/active-filter.component';
import { SearchFilters } from '~/components/finders/search-filters';
import { HubsTagsRefinementList } from '~/components/hubs-tags-refinement';
import { cn } from '~/lib/utils';
import { createSearchClient } from '~/lib/create-search-client';
import { AlgoliaFinderClearAllButton } from '~/routes/group-finder/components/clear-all-button.component';
import { Button } from '~/primitives/button/button.primitive';
import { Icon } from '~/primitives/icon/icon';
import {
  Carousel,
  CarouselArrows,
  CarouselContent,
  CarouselItem,
} from '~/primitives/shadcn-primitives/carousel';

import { VolunteerCard } from './volunteer-card.component';
import { VolunteerListCard } from './volunteer-list-card.component';
import type { Volunteer } from '../types';
import {
  parseVolunteerAlgoliaUrlState,
  volunteerAlgoliaUrlStateToParams,
  type VolunteerAlgoliaUrlState,
} from './finder/volunteer-algolia-url-state';
import {
  createVolunteerAlgoliaInstantSearchRouter,
  createVolunteerAlgoliaStateMapping,
} from './finder/volunteer-algolia-instantsearch-router';
import { getVolunteerAlgoliaMobileFilters } from './finder/volunteer-algolia-filters.data';
import { COMMUNITY_OPPORTUNITIES_BACK_FALLBACK } from '../community-opportunities/community-opportunities-back-href';

/** Algolia facet attribute names — align with volunteer index settings. */
const FACET_CATEGORY = 'category';
const FACET_CAMPUS = 'campusList';

const volunteerCategoryPillBase =
  'inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors';

const volunteerCategoryUnselected = cn(
  volunteerCategoryPillBase,
  'cursor-pointer border border-transparent bg-white text-neutral-darker hover:bg-ocean/10 hover:text-ocean',
);

const volunteerCategorySelected = cn(
  volunteerCategoryPillBase,
  'cursor-default gap-1 bg-ocean/10 text-ocean hover:bg-ocean/10',
);

const volunteerCategoryRemove = cn(
  'shrink-0 cursor-pointer rounded-full p-0.5 text-ocean transition-colors hover:bg-ocean/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean focus-visible:ring-offset-1',
);

/** Community opportunities page — matches Figma search-row pills. */
const volunteerGridCategoryUnselected = cn(
  'inline-flex max-w-full shrink-0 cursor-pointer items-center justify-center rounded-full bg-gray px-3 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-neutral-200',
);

const volunteerGridCategorySelected = cn(
  'inline-flex max-w-full shrink-0 cursor-default items-center gap-1.5 rounded-full bg-ocean/10 px-3 py-2.5 text-sm font-semibold text-ocean transition-colors hover:bg-ocean/10',
);

const VOLUNTEER_SLIDE_CLASS =
  'flex min-h-0 w-full min-w-0 flex-col pl-0 basis-[82%] sm:basis-[calc((100%-36px)/2)] lg:basis-[calc((100%-64px)/3)] max-w-[405px]';

/**
 * Active InstantSearch filters as a query string (`?category=…&campusList=…`).
 * Prefer this over `location.search` so the View All CTA still works when UI
 * filters are applied but the URL has not caught up yet.
 */
function useVolunteerFilterSearch(): string {
  const { indexUiState } = useInstantSearch();

  return useMemo(() => {
    const query =
      typeof indexUiState.query === 'string' && indexUiState.query.trim()
        ? indexUiState.query
        : undefined;
    const refinementList = indexUiState.refinementList as
      | Record<string, string[]>
      | undefined;

    const params = volunteerAlgoliaUrlStateToParams({
      query,
      refinementList,
    });
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }, [indexUiState.query, indexUiState.refinementList]);
}

/** Notifies parent once when InstantSearch reports `idle` (first response settled). */
function VolunteerSearchReadyReporter({ onReady }: { onReady?: () => void }) {
  const { status } = useInstantSearch();
  const onReadyLatest = useRef(onReady);
  onReadyLatest.current = onReady;
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current || status !== 'idle') return;
    fired.current = true;
    onReadyLatest.current?.();
  }, [status]);

  return null;
}

function VolunteerHitsCarousel() {
  const { items: hits } = useHits<Volunteer>();
  const filterSearch = useVolunteerFilterSearch();

  if (hits.length === 0) {
    return (
      <p className='text-neutral-default content-padding py-8 text-center text-lg 2xl:px-0'>
        No volunteer opportunities match your filters right now. Try clearing a
        filter or check back soon.
      </p>
    );
  }

  return (
    <div className='pl-5 md:pl-12 lg:px-18'>
      <Carousel
        opts={{
          align: 'start',
          slidesToScroll: 1,
          containScroll: 'trimSnaps',
        }}
        className='mx-auto mt-3 w-full max-w-screen-content'
      >
        <CarouselContent className='items-stretch gap-8 py-6'>
          {hits.map((hit, index) => (
            <CarouselItem
              key={hit.objectID}
              aria-label={`${index + 1} of ${hits.length}`}
              className={VOLUNTEER_SLIDE_CLASS}
            >
              <VolunteerCard
                volunteer={hit}
                listingSearch={filterSearch}
                className='h-full w-full min-w-0'
              />
            </CarouselItem>
          ))}
        </CarouselContent>

        <div className='mt-4 flex items-center justify-between gap-4 pr-5 md:mt-8 md:pr-0'>
          <div className='flex min-w-0 items-center'>
            <CarouselArrows arrowStyles='text-ocean border-ocean hover:text-navy hover:border-navy' />
          </div>

          <Button
            intent='secondary'
            href={`/volunteer/community-opportunities${filterSearch}`}
            state={{ backHref: COMMUNITY_OPPORTUNITIES_BACK_FALLBACK }}
            size='md'
            className='shrink-0 rounded-full px-6 text-base md:px-8'
          >
            <span className='md:hidden'>View All</span>
            <span className='hidden md:inline'>View all opportunities</span>
          </Button>
        </div>
      </Carousel>
    </div>
  );
}

const VOLUNTEER_GRID_PAGE_SIZE = 9;

function VolunteerHitsGrid({ onShowMore }: { onShowMore: () => void }) {
  const { items: hits } = useHits<Volunteer>();
  const { nbHits } = useStats();
  const filterSearch = useVolunteerFilterSearch();

  if (hits.length === 0) {
    return (
      <div className='border-t border-neutral-lighter bg-gray content-padding py-8'>
        <p className='text-neutral-default text-center text-lg 2xl:px-0'>
          No volunteer opportunities match your filters right now. Try clearing
          a filter or check back soon.
        </p>
      </div>
    );
  }

  const canShowMore = hits.length < nbHits;

  return (
    <div className='border-t border-neutral-lighter bg-gray content-padding py-8 md:pb-16'>
      <ul className='mx-auto grid w-full max-w-screen-content grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8'>
        {hits.map((hit) => (
          <li key={hit.objectID} className='min-w-0'>
            <VolunteerCard
              volunteer={hit}
              listingSearch={filterSearch}
              finderOrigin='community-opportunities'
              className='h-full w-full min-w-0'
            />
          </li>
        ))}
      </ul>

      <div className='mx-auto mt-10 flex max-w-screen-content flex-col items-center gap-3'>
        {canShowMore ? (
          <Button
            intent='secondary'
            size='md'
            className='rounded-full px-8 text-base'
            onClick={onShowMore}
          >
            Show more opportunities
          </Button>
        ) : null}
        <p className='text-sm text-neutral-default'>
          {`Showing ${hits.length} of ${nbHits} opportunities`}
        </p>
      </div>
    </div>
  );
}

function VolunteerHitsList() {
  const { items: hits } = useHits<Volunteer>();
  const location = useLocation();

  if (hits.length === 0) {
    return (
      <p className='text-neutral-default content-padding py-8 text-center text-lg 2xl:px-0'>
        No volunteer opportunities match your filters right now. Try clearing a
        filter or check back soon.
      </p>
    );
  }

  return (
    <div className='content-padding py-6'>
      <ul className='mx-auto flex w-full max-w-screen-content flex-col gap-4'>
        {hits.map((hit) => (
          <VolunteerListCard
            key={hit.objectID}
            volunteer={hit}
            listingSearch={location.search}
          />
        ))}
      </ul>
    </div>
  );
}

function CampusFilterSelect({
  variant = 'default',
}: {
  variant?: 'default' | 'grid';
}) {
  const { items, refine } = useRefinementList({
    attribute: FACET_CAMPUS,
    limit: 50,
  });

  const value = items.find((i) => i.isRefined)?.value ?? '';
  const hasCampusSelected = Boolean(value);
  const isGrid = variant === 'grid';

  return (
    <div className='relative w-fit shrink-0'>
      <Icon
        name='map'
        className={cn(
          'pointer-events-none absolute top-1/2 z-1 -translate-y-1/2 transition-colors',
          isGrid ? 'left-4' : 'left-3 bottom-2',
          hasCampusSelected
            ? 'text-ocean'
            : isGrid
              ? 'text-text-primary'
              : 'text-neutral-default',
        )}
        size={isGrid ? 24 : 16}
      />
      <select
        aria-label='Filter by location'
        className={cn(
          'w-fit appearance-none border focus:outline-none focus:ring-0 cursor-pointer transition-all duration-300',
          isGrid
            ? cn(
                'rounded-xl border-neutral-lighter py-2.5 pl-12 pr-12 text-sm font-bold',
                hasCampusSelected
                  ? 'border-ocean bg-ocean/5 text-ocean hover:border-ocean'
                  : 'bg-white text-text-primary hover:border-neutral-default',
              )
            : cn(
                'rounded-[8px] py-2.5 pl-9 pr-10 text-sm font-semibold',
                hasCampusSelected
                  ? 'border-ocean bg-ocean/5 text-ocean hover:border-ocean'
                  : 'border-[#DEE0E3] bg-white text-neutral-default hover:border-neutral-default',
              ),
        )}
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          items.filter((i) => i.isRefined).forEach((i) => refine(i.value));
          if (next) refine(next);
        }}
      >
        <option value=''>Filter By Location</option>
        {items.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <Icon
        name='chevronDown'
        className={cn(
          'pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 transition-colors',
          hasCampusSelected
            ? 'text-ocean'
            : isGrid
              ? 'text-text-primary'
              : 'text-neutral-default',
        )}
        size={isGrid ? 24 : 20}
      />
    </div>
  );
}

export function VolunteerAlgolia({
  appId,
  apiKey,
  indexName,
  onVolunteerUiReady,
  resultsLayout = 'carousel',
  hitsPerPage: hitsPerPageProp,
}: {
  appId: string;
  apiKey: string;
  indexName: string;
  /** Called once when credentials are missing, or when the first Algolia search reaches `idle`. */
  onVolunteerUiReady?: () => void;
  resultsLayout?: 'carousel' | 'list' | 'grid';
  /** Override Algolia page size. Grid layout grows this via “Show more”. */
  hitsPerPage?: number;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const defaultHitsPerPage =
    hitsPerPageProp ??
    (resultsLayout === 'grid' ? VOLUNTEER_GRID_PAGE_SIZE : 24);
  const [gridHitsPerPage, setGridHitsPerPage] = useState(defaultHitsPerPage);

  const searchParamsRef = useRef(searchParams);
  const setSearchParamsRef = useRef(setSearchParams);
  const pathnameRef = useRef(location.pathname);
  const onUpdateCallbackRef = useRef<
    ((route: VolunteerAlgoliaUrlState) => void) | null
  >(null);

  searchParamsRef.current = searchParams;
  setSearchParamsRef.current = setSearchParams;
  pathnameRef.current = location.pathname;

  useEffect(() => {
    if (resultsLayout !== 'grid') return;
    setGridHitsPerPage(defaultHitsPerPage);
  }, [defaultHitsPerPage, resultsLayout, searchParams]);

  const router = useMemo(
    () =>
      createVolunteerAlgoliaInstantSearchRouter({
        searchParamsRef,
        setSearchParamsRef,
        pathnameRef,
        onUpdateCallbackRef,
      }),
    [],
  );

  const stateMapping = useMemo(
    () => createVolunteerAlgoliaStateMapping(indexName),
    [indexName],
  );

  useEffect(() => {
    const cb = onUpdateCallbackRef.current;
    if (cb) cb(parseVolunteerAlgoliaUrlState(searchParams));
  }, [searchParams]);

  const routing = useMemo(
    () => ({
      router,
      stateMapping,
    }),
    [router, stateMapping],
  );

  const searchClient = useMemo(
    () => createSearchClient(appId, apiKey),
    [appId, apiKey],
  );

  const canSearch = Boolean(appId && apiKey);
  const desktopFilters = useMemo(() => getVolunteerAlgoliaMobileFilters(), []);
  const onReadyRef = useRef(onVolunteerUiReady);
  onReadyRef.current = onVolunteerUiReady;

  useEffect(() => {
    if (canSearch) return;
    onReadyRef.current?.();
  }, [canSearch]);

  if (!canSearch) {
    return (
      <p className='text-neutral-default content-padding text-center 2xl:px-0'>
        Volunteer search is unavailable. Algolia credentials are not configured
        for this environment.
      </p>
    );
  }

  return (
    <InstantSearch
      searchClient={searchClient}
      indexName={indexName}
      routing={routing}
      future={{ preserveSharedStateOnUnmount: true }}
    >
      <VolunteerSearchReadyReporter onReady={onVolunteerUiReady} />
      <Configure
        hitsPerPage={
          resultsLayout === 'grid' ? gridHitsPerPage : defaultHitsPerPage
        }
      />

      {/*
        Mobile sticky filters must be a direct InstantSearch sibling of the
        results (same as group/class finder). A short `md:hidden` wrapper around
        only the bar makes `position: sticky` leave with that short box.
      */}
      <FinderStickyBar className='md:hidden max-w-[100vw]'>
        <div className='mx-auto flex w-full max-w-screen-content flex-col gap-3 py-4'>
          <SearchFilters
            onClearAllToUrl={() => {}}
            desktopFilters={desktopFilters}
            compactInlineFilterCount={2}
          />
        </div>
        <ActiveFilters />
      </FinderStickyBar>

      {/* Desktop: inline category pills + clear + campus */}
      <div
        className={cn(
          'hidden content-padding md:block',
          resultsLayout === 'grid' && 'md:pb-6 lg:pb-8',
        )}
      >
        {resultsLayout === 'grid' ? (
          <div className='mx-auto flex max-w-screen-content items-center gap-4'>
            <CampusFilterSelect variant='grid' />
            <div className='flex min-w-0 flex-1 items-center gap-5'>
              <HubsTagsRefinementList
                attribute={FACET_CATEGORY}
                wrapperClass='flex min-w-0 flex-1 flex-wrap gap-2'
                unselectedClassName={volunteerGridCategoryUnselected}
                selectedClassName={volunteerGridCategorySelected}
                removeButtonClassName={volunteerCategoryRemove}
              />
              <AlgoliaFinderClearAllButton className='text-sm' />
            </div>
          </div>
        ) : (
          <div className='mx-auto flex max-w-screen-content flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between'>
            <div className='flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center'>
              <HubsTagsRefinementList
                attribute={FACET_CATEGORY}
                wrapperClass='flex min-w-0 flex-1 flex-wrap gap-2 md:gap-4 px-1 pb-4 md:pb-0 overflow-x-auto scrollbar-hide'
                unselectedClassName={volunteerCategoryUnselected}
                selectedClassName={volunteerCategorySelected}
                removeButtonClassName={volunteerCategoryRemove}
              />
            </div>
            <div className='flex shrink-0 flex-wrap items-center justify-end gap-3 md:ml-auto'>
              <AlgoliaFinderClearAllButton />
              <CampusFilterSelect />
            </div>
          </div>
        )}
      </div>

      {resultsLayout === 'list' ? (
        <VolunteerHitsList />
      ) : resultsLayout === 'grid' ? (
        <VolunteerHitsGrid
          onShowMore={() =>
            setGridHitsPerPage((current) => current + VOLUNTEER_GRID_PAGE_SIZE)
          }
        />
      ) : (
        <VolunteerHitsCarousel />
      )}
    </InstantSearch>
  );
}
