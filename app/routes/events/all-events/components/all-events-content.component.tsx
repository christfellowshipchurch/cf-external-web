import { useLoaderData } from 'react-router-dom';
import { useMemo } from 'react';
import { liteClient as algoliasearch } from 'algoliasearch/lite';
import {
  Configure,
  InstantSearch,
  InstantSearchSSRProvider,
} from 'react-instantsearch';

import { createInstantSearchUrlSync } from '~/components/finders/instant-search-url-sync/create-instant-search-url-sync';
import { SectionTitle } from '~/components';
import { useScrollToSearchResultsOnLoad } from '~/hooks/use-scroll-to-search-results-on-load';

import type { AllEventsLoaderData } from '../loader';
import { useEventsAlgoliaRouting } from '../hooks/use-events-algolia-routing.hook';
import {
  FeaturedEventsFromHits,
  FeaturedEventsSectionLayout,
} from '../partials/featured-events.partial';
import { parseEventsFinderUrlState } from '../../events-url-state';
import type { EventsFinderUrlState } from '../../events-url-state';
import {
  MAIN_EVENTS_GRID_HITS_PER_PAGE,
  MAIN_EVENTS_TYPE_FILTER,
} from '../all-events.constants';

import { AllEventsInstantFilters } from './all-events-instant-filters.component';
import { AllEventsInstantResults } from './all-events-results.component';

export function AllEventsContent() {
  const {
    ALGOLIA_APP_ID,
    ALGOLIA_SEARCH_API_KEY,
    featuredHits,
    serverState,
    algoliaIndexes,
  } = useLoaderData<AllEventsLoaderData>();
  const eventsIndexName = algoliaIndexes.contentItems;
  const {
    InstantSearchUrlSync: AllEventsInstantSearchSync,
    buildUiState: buildAllEventsInstantSearchUiState,
  } = useMemo(
    () =>
      createInstantSearchUrlSync<EventsFinderUrlState>({
        indexName: eventsIndexName,
        parseUrlState: parseEventsFinderUrlState,
      }),
    [eventsIndexName],
  );

  const {
    urlState,
    applyUrlState,
    searchParams,
    fromEventsUrl,
    eventsMobilePinEndRef,
  } = useEventsAlgoliaRouting();

  const searchClient = useMemo(
    () => algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY, {}),
    [ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY],
  );

  // Events can be deep-linked with category/location/page params. The loader
  // uses those params for SSR first paint; this passes the same state into
  // InstantSearch when the client widgets mount.
  const initialUiState = useMemo(() => {
    const state = buildAllEventsInstantSearchUiState(urlState);
    return Object.keys(state).length > 0
      ? (state as Record<string, Record<string, unknown>>)
      : undefined;
  }, [buildAllEventsInstantSearchUiState, urlState]);

  useScrollToSearchResultsOnLoad(searchParams, (params) => {
    const s = parseEventsFinderUrlState(params);
    return !!(
      (s.query?.trim?.()?.length ?? 0) > 0 ||
      (s.refinementList && Object.keys(s.refinementList).length > 0)
    );
  });

  return (
    <>
      <FeaturedEventsSectionLayout>
        <FeaturedEventsFromHits hits={featuredHits} />
      </FeaturedEventsSectionLayout>

      <div className='flex w-full min-w-0 max-w-full flex-col pagination-scroll-to pt-8 pb-24 md:pt-16 md:pb-28'>
        <div className='content-padding'>
          <div className='mx-auto w-full max-w-screen-content'>
            <div className='hidden md:block'>
              <SectionTitle
                title='Discover Events For You'
                sectionTitle='all events'
              />
            </div>

            <div className='md:hidden'>
              <SectionTitle title='Search All Events' />
            </div>
          </div>
        </div>

        <InstantSearchSSRProvider {...serverState}>
          <InstantSearch
            indexName={eventsIndexName}
            searchClient={searchClient}
            initialUiState={initialUiState}
            onStateChange={({ uiState, setUiState }) => {
              setUiState(uiState);
              const indexState = uiState[eventsIndexName];
              if (!indexState) return;
              const index = indexState as Record<string, unknown>;

              // Keep the existing events URL contract (`q`, `p`,
              // `eventCategories`, `eventLocations`) rather than exposing
              // InstantSearch's default routing shape.
              applyUrlState({
                query:
                  typeof index.query === 'string' &&
                  index.query.trim().length > 0
                    ? index.query
                    : undefined,
                refinementList:
                  (index.refinementList as Record<string, string[]>) ??
                  undefined,
                page:
                  typeof index.page === 'number' && index.page > 0
                    ? index.page
                    : undefined,
              });
            }}
            future={{ preserveSharedStateOnUnmount: true }}
          >
            <AllEventsInstantSearchSync />
            <Configure
              filters={MAIN_EVENTS_TYPE_FILTER}
              hitsPerPage={MAIN_EVENTS_GRID_HITS_PER_PAGE}
            />
            <AllEventsInstantFilters
              eventsMobilePinEndRef={eventsMobilePinEndRef}
              buildAllEventsInstantSearchUiState={
                buildAllEventsInstantSearchUiState
              }
            />
            <AllEventsInstantResults fromEventsUrl={fromEventsUrl} />
          </InstantSearch>
        </InstantSearchSSRProvider>
      </div>
    </>
  );
}
