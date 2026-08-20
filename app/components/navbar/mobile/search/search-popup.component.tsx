import { useEffect, useMemo, useState } from 'react';
import {
  useCurrentRefinements,
  useHits,
  useInstantSearch,
  useSearchBox,
} from 'react-instantsearch';

import type { ContentItemHit } from '~/routes/search/types';
import { useRouteLoaderData } from 'react-router-dom';
import type { RootLoaderData } from '~/routes/navbar/loader';

import {
  filterLocationHitsByQuery,
  toMobileLocationContentHit,
} from '../../search-locations';
import {
  isPagesRefinementSelected,
  shouldIncludeLocationResultsInGlobalSearch,
} from '../../search-page-refinements';
import { useGlobalSearchLocationMatches } from '../../global-search-location-context';
import {
  MobileContentHit,
  MobileContentHitType,
} from './mobile-content-hit.component';
import { PopularSearches } from './popular-searches.component';

function hasNonBlankUrl(hit: { url?: unknown }): boolean {
  return typeof hit.url === 'string' && hit.url.trim().length > 0;
}

const ContentItemsHitsCollector = ({
  onHitsChange,
}: {
  onHitsChange: (hits: MobileContentHitType[]) => void;
}) => {
  const { items } = useHits<ContentItemHit>();

  useEffect(() => {
    const contentHits: MobileContentHitType[] = items
      .filter(hasNonBlankUrl)
      .map((hit) => ({
        routing: {
          pathname:
            (hit.routing as { pathname?: string })?.pathname ||
            (hit.url as string),
        },
        url: hit.url as string,
        coverImage:
          (hit.coverImage as MobileContentHitType['coverImage']) || null,
        title: (hit.title as string) || '',
        contentType: (hit.contentType as string) || '',
        summary: (hit.summary as string) || '',
      }));

    onHitsChange(contentHits);
  }, [items, onHitsChange]);

  return null;
};

export const SearchPopup = ({
  setIsSearchOpen,
}: {
  setIsSearchOpen: (isSearchOpen: boolean) => void;
}) => {
  const { query } = useSearchBox();
  const { items } = useCurrentRefinements();
  const { indexUiState } = useInstantSearch();
  const { setHasMatchingLocations } = useGlobalSearchLocationMatches();
  const [contentHits, setContentHits] = useState<MobileContentHitType[]>([]);
  const rootData = useRouteLoaderData('root') as RootLoaderData | undefined;

  const selectedContentTypes =
    (indexUiState?.refinementList?.contentType as string[]) || [];
  const isPagesSelected = isPagesRefinementSelected(selectedContentTypes);

  const trimmedQuery = query.trim();
  const isSearching =
    trimmedQuery.length > 0 || items.length > 0 || isPagesSelected;
  const shouldShowLocations =
    trimmedQuery.length > 0 &&
    shouldIncludeLocationResultsInGlobalSearch(selectedContentTypes);

  const locationHits = useMemo(
    () =>
      shouldShowLocations
        ? filterLocationHitsByQuery(
            rootData?.locationSearchHits ?? [],
            trimmedQuery,
          ).map(toMobileLocationContentHit)
        : [],
    [rootData?.locationSearchHits, shouldShowLocations, trimmedQuery],
  );

  useEffect(() => {
    setHasMatchingLocations(shouldShowLocations && locationHits.length > 0);
  }, [locationHits.length, setHasMatchingLocations, shouldShowLocations]);

  const combinedHits = shouldShowLocations
    ? [...contentHits, ...locationHits]
    : contentHits;

  return (
    <div className='size-full p-4 pt-0! md:p-6 md:pt-6!'>
      <ContentItemsHitsCollector onHitsChange={setContentHits} />

      <div className='border-t border-[#E0E0E0] pt-6 space-y-4'>
        {isSearching ? (
          <div className='grid md:grid-cols-1 gap-4'>
            {combinedHits.map((hit, index) => (
              <div
                key={`${hit.routing.pathname}-${index}`}
                className='flex'
                onClick={() => setIsSearchOpen(false)}
              >
                <MobileContentHit hit={hit} />
              </div>
            ))}
          </div>
        ) : (
          <PopularSearches onNavigate={() => setIsSearchOpen(false)} />
        )}
      </div>
    </div>
  );
};
