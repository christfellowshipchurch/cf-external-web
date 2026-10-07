import { useEffect, useMemo, useState } from 'react';
import { useLoaderData, useSearchParams } from 'react-router';
import {
  Configure,
  InstantSearch,
  useHits,
  useInstantSearch,
} from 'react-instantsearch';

import { escapeAlgoliaFilterString } from '~/components/finders/finder-algolia.utils';
import { FinderStickyBar } from '~/components/finders/finder-sticky-bar.component';
import { SearchFilters } from '~/components/finders/search-filters';
import { ActiveFilters } from '~/components/finders/search-filters/active-filter.component';
import { cn } from '~/lib/utils';

import { parseClassSingleUrlState } from '../class-single-url-state';
import {
  filterScheduledClassSessions,
  parseClassSessionStartMs,
} from '../../class-session.utils';
import { UpcomingSessionsCarousel } from '../components/upcoming-sessions-carousel.component';
import { ClassSingleInterestBanner } from '../components/class-single-interest-banner.component';
import { CantFindClassCard } from '../../finder/components/cant-find-class-card.component';
import { ClassSingleFiltersSkeleton } from '../components/filters/class-single-filters-skeleton.component';
import { useClassSingleUpcomingInstantSearch } from '../hooks/use-class-single-upcoming-instant-search';
import type { ClassHitType } from '../../types';
import type { LoaderReturnType } from '../loader';
import OnDemandCard from '../components/on-demand-card.component';
import {
  ClassSingleGroupsSection,
  ClassSingleInitialGroupsSection,
} from './groups.partial';
import { CLASS_SINGLE_UPCOMING_MAX_HITS } from '../components/build-class-single-algolia-search';

const LOCATION_FILTERS_HINT = 'Location filters are applied.';

function parseStartMs(hit: ClassHitType): number {
  return parseClassSessionStartMs(hit);
}

function compareStartDateAsc(a: ClassHitType, b: ClassHitType): number {
  const byDate = parseStartMs(a) - parseStartMs(b);
  if (byDate !== 0) return byDate;
  return a.objectID.localeCompare(b.objectID);
}

function geoDistanceMeters(hit: ClassHitType): number {
  const d = hit._rankingInfo?.geoDistance;
  if (d == null || typeof d !== 'number' || Number.isNaN(d) || d <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  return d;
}

/**
 * Without geo: soonest `startDate` first. With geo: in-person by distance then date; Virtual last.
 * Sorting stays client-side; loader supplies hits (with `_rankingInfo` when lat/lng are in the URL).
 */
function sortUpcomingSessionHitsForDisplay(
  items: ClassHitType[],
  geoActive: boolean,
): ClassHitType[] {
  if (!geoActive) {
    return [...items].sort(compareStartDateAsc);
  }

  const inPerson: ClassHitType[] = [];
  const virtual: ClassHitType[] = [];
  for (const hit of items) {
    if (hit.format === 'Virtual') virtual.push(hit);
    else inPerson.push(hit);
  }

  virtual.sort(compareStartDateAsc);

  inPerson.sort((a, b) => {
    const distDiff = geoDistanceMeters(a) - geoDistanceMeters(b);
    if (distDiff !== 0) return distDiff;
    return compareStartDateAsc(a, b);
  });

  return [...inPerson, ...virtual];
}

/**
 * Class-single upcoming sessions:
 * - Loader prefetches carousel hits for first paint.
 * - After hydration, real client InstantSearch handles filters/search/geo.
 * - Same-page URL changes do not re-run the loader (see `class-finder_.$path.tsx`).
 */
export function ClassSingleUpcomingSearch({
  classHeroCoverImageUri,
  classType,
  onDemandUrl,
}: {
  classHeroCoverImageUri: string;
  classType: string;
  onDemandUrl: string;
}) {
  const { upcomingHits, groupHits, isInterestEnabled, classDefinedValueGuid } =
    useLoaderData<LoaderReturnType>();
  const upcoming = useClassSingleUpcomingInstantSearch();
  const scheduledUpcomingHits = useMemo(
    () => filterScheduledClassSessions(upcomingHits),
    [upcomingHits],
  );

  /** SSR/hydration: skeleton filters until react-instantsearch mounts. */
  const [filtersMounted, setFiltersMounted] = useState(false);
  useEffect(() => {
    setFiltersMounted(true);
  }, []);

  // Interest-only classes have no schedulable Algolia sessions regardless of filters.
  // Skip Filter Sessions + Join a Class entirely and go full-bleed.
  if (scheduledUpcomingHits.length === 0 && isInterestEnabled) {
    return <ClassSingleInterestBanner classValueGuid={classDefinedValueGuid} />;
  }

  return (
    <div className='flex w-full flex-col pagination-scroll-to' id='search'>
      <div className='flex min-w-0 w-full flex-col max-md:pt-6'>
        {filtersMounted ? (
          <InstantSearch
            indexName={upcoming.indexName}
            searchClient={upcoming.searchClient}
            initialUiState={upcoming.initialUiState}
            onStateChange={upcoming.onStateChange}
            future={{
              preserveSharedStateOnUnmount: true,
            }}
          >
            <ClassSingleUpcomingConfigure
              classesIndexClassType={classType}
              classUrl={upcoming.classUrl}
              coordinates={upcoming.coordinates}
            />

            <FinderStickyBar className='max-md:shadow-none'>
              <h2 className='w-full pb-2 text-[28px] font-extrabold md:hidden'>
                Filter Sessions
              </h2>
              <div className='mx-auto flex w-full min-w-0 max-w-screen-content flex-col gap-3 py-3 md:py-4 md:pt-8 lg:min-h-20 lg:flex-row lg:items-center lg:gap-4'>
                <div className='hidden w-fit shrink-0 items-center gap-4 md:flex'>
                  <h2 className='w-fit min-w-[260px] text-[28px] font-extrabold'>
                    Filter Sessions
                  </h2>
                  <div className='hidden h-full w-px bg-text-secondary lg:block' />
                </div>
                <div className='min-w-0 flex-1'>
                  <SearchFilters
                    onClearAllToUrl={upcoming.clearAllFiltersFromUrl}
                    desktopFilters={upcoming.desktopFilters}
                    compactInlineFilterCount={2}
                    isFilterPillSupplementallyActive={
                      upcoming.isFilterPillSupplementallyActive
                    }
                  />
                </div>
              </div>
              <ActiveFilters
                onClearAllToUrl={upcoming.clearAllFiltersFromUrl}
                additionalFiltersActive={upcoming.geoFiltersActive}
                additionalFiltersHint={LOCATION_FILTERS_HINT}
              />
            </FinderStickyBar>

            <ClassSingleUpcomingBody
              classHeroCoverImageUri={classHeroCoverImageUri}
              classType={classType}
              onDemandUrl={onDemandUrl}
              initialUpcomingHits={scheduledUpcomingHits}
              initialGroupHits={groupHits}
              classUrl={upcoming.classUrl}
              geoActive={upcoming.geoFiltersActive}
              coordinates={upcoming.coordinates}
            />
          </InstantSearch>
        ) : (
          <>
            {/* First paint uses the loader's upcoming/group hits. Filters are
                skeletonized until InstantSearch mounts so the carousel content
                stays visible during hydration. */}
            <FinderStickyBar className='max-md:shadow-none'>
              <div className='mx-auto flex w-full min-w-0 max-w-screen-content flex-col gap-3 py-3 md:py-4 md:pt-8 lg:min-h-20 lg:flex-row lg:items-center lg:gap-4'>
                <h2 className='w-full pb-2 text-[28px] font-extrabold md:hidden'>
                  Filter Sessions
                </h2>
                <div className='hidden w-fit shrink-0 items-center gap-4 md:flex'>
                  <h2 className='w-fit min-w-[260px] text-[28px] font-extrabold'>
                    Filter Sessions
                  </h2>
                  <div className='hidden h-full w-px bg-text-secondary lg:block' />
                </div>
                <ClassSingleFiltersSkeleton />
              </div>
            </FinderStickyBar>

            <ClassSingleUpcomingBody
              classHeroCoverImageUri={classHeroCoverImageUri}
              classType={classType}
              onDemandUrl={onDemandUrl}
              initialUpcomingHits={scheduledUpcomingHits}
              initialGroupHits={groupHits}
              classUrl={upcoming.classUrl}
              geoActive={upcoming.geoFiltersActive}
              coordinates={upcoming.coordinates}
              useInitialHitsOnly
            />
          </>
        )}
      </div>
    </div>
  );
}

function ClassSingleUpcomingConfigure({
  classesIndexClassType,
  classUrl,
  coordinates,
}: {
  /** `classType` on classes index records (not necessarily the URL slug). */
  classesIndexClassType: string;
  classUrl: string;
  coordinates: {
    lat: number | null;
    lng: number | null;
  } | null;
}) {
  const trimmed = classesIndexClassType?.trim() ?? '';
  const classTypeFilter = trimmed
    ? `classType:"${escapeAlgoliaFilterString(trimmed)}"`
    : undefined;

  return (
    <Configure
      // Force Configure to re-register when the class page, class type, or geo
      // target changes. These values influence Algolia search parameters but
      // are not all represented in InstantSearch uiState.
      key={`${classUrl}-${trimmed}-${coordinates?.lat ?? ''}-${coordinates?.lng ?? ''}`}
      hitsPerPage={CLASS_SINGLE_UPCOMING_MAX_HITS}
      filters={classTypeFilter}
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
}

function ClassSingleUpcomingBody({
  classHeroCoverImageUri,
  classType,
  onDemandUrl,
  initialUpcomingHits,
  initialGroupHits,
  classUrl,
  geoActive,
  coordinates,
  useInitialHitsOnly = false,
}: {
  classHeroCoverImageUri: string;
  classType: string;
  onDemandUrl: string;
  initialUpcomingHits: ClassHitType[];
  initialGroupHits: LoaderReturnType['groupHits'];
  classUrl: string;
  geoActive: boolean;
  coordinates: { lat: number | null; lng: number | null } | null;
  useInitialHitsOnly?: boolean;
}) {
  return (
    <div className='flex w-full flex-col bg-gray py-8 pl-5 md:pl-12 lg:pl-18 lg:pr-18 md:pt-12 md:pb-20'>
      <div className='mx-auto w-full max-w-screen-content'>
        {useInitialHitsOnly ? (
          <>
            {/* Pre-hydration branch: avoid reading InstantSearch hooks before the
                provider is mounted. The loader data is already sorted for first paint. */}
            <ClassSingleUpcomingResults
              hits={initialUpcomingHits}
              geoActive={geoActive}
              isLoading={false}
            />
          </>
        ) : (
          <ClassSingleUpcomingInstantSearchResults
            initialHits={initialUpcomingHits}
            geoActive={geoActive}
          />
        )}
      </div>

      <div className='mx-auto mt-8 flex w-full max-w-screen-content flex-col items-center gap-4'>
        {onDemandUrl && (
          <div className='mr-auto flex w-full max-w-[1296px] flex-col gap-4 border-t border-neutral-lighter py-16'>
            <h2 className='w-full text-2xl leading-[1.4] font-extrabold'>
              Take It Anytime
            </h2>
            <OnDemandCard
              title={classType}
              image={classHeroCoverImageUri}
              link={onDemandUrl}
            />
          </div>
        )}

        {useInitialHitsOnly ? (
          <ClassSingleInitialGroupsSection
            groupHits={initialGroupHits}
            classUrl={classUrl}
          />
        ) : (
          <ClassSingleGroupsSection
            initialGroupHits={initialGroupHits}
            classUrl={classUrl}
            classesIndexClassType={classType}
            coordinates={coordinates}
          />
        )}
      </div>
    </div>
  );
}

function ClassSingleUpcomingInstantSearchResults({
  initialHits,
  geoActive,
}: {
  initialHits: ClassHitType[];
  geoActive: boolean;
}) {
  const { items } = useHits<ClassHitType>();
  const { status } = useInstantSearch();
  const isLoading = status === 'loading' || status === 'stalled';

  // Keep loader sessions visible until the first client-side Algolia response
  // arrives, then switch to hydrated results for filter/search changes.
  const hits = isLoading && items.length === 0 ? initialHits : items;

  return (
    <ClassSingleUpcomingResults
      hits={hits}
      geoActive={geoActive}
      isLoading={isLoading}
    />
  );
}

function ClassSingleUpcomingResults({
  hits,
  geoActive,
  isLoading,
}: {
  hits: ClassHitType[];
  geoActive: boolean;
  isLoading: boolean;
}) {
  const { isInterestEnabled, classDefinedValueGuid } =
    useLoaderData<LoaderReturnType>();
  const [searchParams] = useSearchParams();

  const filtersActive = useMemo(() => {
    const s = parseClassSingleUrlState(searchParams);
    const hasQuery = (s.query?.trim?.()?.length ?? 0) > 0;
    const hasRefinement = Object.values(s.refinementList ?? {}).some(
      (vals) => vals.length > 0,
    );
    const hasGeo = s.lat != null && s.lng != null;
    return hasQuery || hasRefinement || hasGeo;
  }, [searchParams]);

  const ordered = useMemo(
    () =>
      sortUpcomingSessionHitsForDisplay(
        filterScheduledClassSessions(hits),
        geoActive,
      ),
    [hits, geoActive],
  );

  const carouselResetKey = ordered.map((h) => h.objectID).join('|');

  // Filters active + no results → show CantFindClassCard as the sole content
  if (ordered.length === 0 && isInterestEnabled && filtersActive) {
    return (
      <div
        data-upcoming-sessions-results
        className='scroll-mt-[100px] w-full max-w-[1296px]'
      >
        <h3 className='pt-2 text-2xl font-extrabold mb-6 md:pt-4'>
          Join a Class
        </h3>
        <CantFindClassCard
          variant='empty'
          classValueGuid={classDefinedValueGuid}
        />
      </div>
    );
  }

  return (
    <div
      data-upcoming-sessions-results
      className={cn(
        'scroll-mt-[100px] w-full max-w-[1296px] transition-opacity',
        { 'opacity-50 pointer-events-none': isLoading },
      )}
    >
      <h3 className='pt-2 text-2xl font-extrabold mb-6 md:pt-4'>
        Join a Class
      </h3>
      {ordered.length === 0 ? (
        <p className='text-text-secondary pb-4'>
          {filtersActive
            ? 'No upcoming sessions match your filters. Try adjusting location or format.'
            : 'There are no upcoming sessions for this class right now. Check back soon!'}
        </p>
      ) : (
        <div className='flex w-full justify-center md:justify-start'>
          <UpcomingSessionsCarousel
            hits={ordered}
            resetKey={carouselResetKey}
            extraCard={
              isInterestEnabled && !filtersActive ? (
                <CantFindClassCard
                  variant='gridCell'
                  classValueGuid={classDefinedValueGuid}
                />
              ) : undefined
            }
          />
        </div>
      )}
    </div>
  );
}
