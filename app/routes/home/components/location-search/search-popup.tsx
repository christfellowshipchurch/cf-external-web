import { Link } from 'react-router';
import { useHits } from 'react-instantsearch';

import { Icon } from '~/primitives/icon/icon';
import { isValidZip } from '~/lib/utils';
import { CampusHit } from './location-hit';
import {
  filterCampusHitsByQuery,
  sortCampusHitsForDistanceSearch,
} from './location-search-results';
import type { CampusHitType } from './location-hit';
import type { CampusSearchHit } from './location-search-results';

export const SearchPopup = ({
  query,
  isDistanceSearch,
  onRequestPreciseLocation,
}: {
  query: string;
  isDistanceSearch: boolean;
  /** Must run geolocation only from this click — not from useEffect (iOS Safari). */
  onRequestPreciseLocation: () => void;
}) => {
  const { items } = useHits<CampusSearchHit>();
  const isZipQuery = query.length === 5 && isValidZip(query);
  // ZIP / GPS: keep Algolia's geo-ranked list (don't filter ZIP digits as keywords —
  // the index isn't keyword-searchable and ZIPs aren't in hit text).
  // Keyword: filter locally because non-empty Algolia queries return 0 hits.
  const hits = isDistanceSearch
    ? sortCampusHitsForDistanceSearch(items)
    : isZipQuery
      ? items
      : filterCampusHitsByQuery(items, query);

  return (
    <div className='w-full overflow-hidden min-h-[332px]'>
      {/* Search Results */}
      <div className='space-y-4'>
        <div className='flex flex-col overflow-y-auto max-h-[300px]'>
          <ul className='flex flex-col gap-3'>
            {hits.map((hit, index) => {
              if (hit?.campusUrl) {
                const campusData: CampusHitType = {
                  campusUrl: hit.campusUrl,
                  campusName: hit.campusName,
                  geoloc: hit.geoloc,
                  campusLocation: hit.campusLocation,
                  serviceTimes: hit.serviceTimes,
                };
                return (
                  <li
                    key={hit.objectID ?? `${hit.campusUrl}-${index}`}
                    className='flex w-full rounded-xl border-[2.37px] border-[#E8E8E8] transition-colors duration-300 first:border-neutral-default hover:border-neutral-default'
                  >
                    <CampusHit hit={campusData} />
                  </li>
                );
              }
              return null;
            })}
          </ul>
        </div>
      </div>

      {/* Buttons */}
      <div className='flex justify-between gap-2 pt-4'>
        <button
          type='button'
          className='flex gap-1 cursor-pointer text-ocean hover:text-navy transition-colors duration-300 bg-transparent border-0 p-0'
          // preventDefault on pointerdown so mobile doesn't spend the tap dismissing
          // the keyboard (which would skip click / break the geolocation user-gesture).
          onPointerDown={(event) => {
            event.preventDefault();
          }}
          onClick={() => {
            onRequestPreciseLocation();
          }}
        >
          <Icon name='currentLocation' size={21} />
          <p className='text-sm font-semibold'>Use my precise location</p>
        </button>

        <Link to='/locations' prefetch='intent'>
          <p className='text-sm font-medium hover:underline transition-all duration-300'>
            View All Locations
          </p>
        </Link>
      </div>
    </div>
  );
};
