import { useEffect, useMemo, useState } from 'react';
import { useHits, useInstantSearch, useSearchBox } from 'react-instantsearch';
import { useRouteLoaderData } from 'react-router-dom';

import type { RootLoaderData } from '~/routes/navbar/loader';
import type { ContentItemHit } from '~/routes/search/types';

import {
  filterLocationHitsByQuery,
  toDesktopLocationContentHit,
} from '../../search-locations';
import { shouldIncludeLocationResultsInGlobalSearch } from '../../search-page-refinements';
import { useGlobalSearchLocationMatches } from '../../global-search-location-context';
import { ContentHit } from './content-hit.component';
import { SearchCustomRefinementList } from './custom-refinements.component';

function hasNonBlankUrl(hit: { url?: unknown }): boolean {
  return typeof hit.url === 'string' && hit.url.trim().length > 0;
}

const ContentItemsHitsCollector = ({
  onHitsChange,
}: {
  onHitsChange: (hits: ContentItemHit[]) => void;
}) => {
  const { items } = useHits<ContentItemHit>();

  useEffect(() => {
    onHitsChange(items.filter(hasNonBlankUrl));
  }, [items, onHitsChange]);

  return null;
};

export const SearchPopup = ({
  setIsSearchOpen,
}: {
  setIsSearchOpen: (isSearchOpen: boolean) => void;
}) => {
  const { query } = useSearchBox();
  const { indexUiState } = useInstantSearch();
  const { setHasMatchingLocations } = useGlobalSearchLocationMatches();
  const rootData = useRouteLoaderData('root') as RootLoaderData | undefined;
  const [contentHits, setContentHits] = useState<ContentItemHit[]>([]);

  const selectedContentTypes =
    (indexUiState?.refinementList?.contentType as string[]) || [];
  const trimmedQuery = query.trim();
  const isSearching =
    trimmedQuery.length > 0 || selectedContentTypes.length > 0;
  const shouldShowLocations =
    trimmedQuery.length > 0 &&
    shouldIncludeLocationResultsInGlobalSearch(selectedContentTypes);

  const locationHits = useMemo(
    () =>
      shouldShowLocations
        ? filterLocationHitsByQuery(
            rootData?.locationSearchHits ?? [],
            trimmedQuery,
          ).map(toDesktopLocationContentHit)
        : [],
    [rootData?.locationSearchHits, shouldShowLocations, trimmedQuery],
  );

  useEffect(() => {
    setHasMatchingLocations(shouldShowLocations && locationHits.length > 0);
  }, [locationHits.length, setHasMatchingLocations, shouldShowLocations]);

  const combinedHits = shouldShowLocations
    ? [...contentHits, ...locationHits]
    : contentHits;

  // Before a query is typed, show the curated latest-content list instead of the
  // index's default ranking.
  const displayedHits = isSearching
    ? combinedHits
    : (rootData?.defaultSearchHits ?? []);

  return (
    <div className='absolute left-0 top-[52px] w-full bg-gray rounded-b-lg shadow-lg px-12 pt-4 z-4 popup-search-container max-h-[700px] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300'>
      <div className='flex items-center gap-2 pb-4'>
        <div className='flex flex-col gap-2'>
          <h2 className='text-xs text-[#2F2F2F] opacity-50 font-semibold'>
            I'M LOOKING FOR
          </h2>
          <SearchCustomRefinementList attribute='contentType' />
        </div>
      </div>

      <ContentItemsHitsCollector onHitsChange={setContentHits} />

      <div className='mt-2 space-y-4'>
        <div className='flex flex-col overflow-y-scroll max-h-[300px] scrollbar-thin [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-neutral-default/60 [&::-webkit-scrollbar-track]:bg-gray'>
          {displayedHits.map((hit) => (
            <div
              key={hit.objectID}
              onClick={() => setIsSearchOpen(false)}
              className='flex w-full'
            >
              <ContentHit hit={hit} query={query || null} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
