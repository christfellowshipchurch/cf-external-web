import { algoliasearch } from 'algoliasearch';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Configure, InstantSearch } from 'react-instantsearch';
import { useFetcher, useLoaderData } from 'react-router';
import { getCurrentPositionFromUserGesture } from '~/lib/browser-geolocation';
import { SearchPopup } from './search-popup';
import { cn, isValidZip } from '~/lib/utils';
import { emptySearchClient } from '~/routes/search/route';
import { globalSearchClient } from '~/routes/search/route';
import { SearchBar } from './search-bar';
import type { HomeLoaderData } from '~/routes/home/loader';

type GeocodeFetcherData = {
  requestId?: string;
  results?: {
    geometry?: {
      location?: {
        lat?: number;
        lng?: number;
      };
    };
  }[];
};

export function LocationSearchInner({
  isSearching: controlledIsSearching,
  setIsSearching: controlledSetIsSearching,
}: {
  isSearching?: boolean;
  setIsSearching?: (isSearching: boolean) => void;
} = {}) {
  const { ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY, algoliaIndexes } =
    useLoaderData<HomeLoaderData>();
  const locationIndexName = algoliaIndexes.locations;
  const geocodeFetcher = useFetcher();
  const geocodeFetcherRef = useRef(geocodeFetcher);
  geocodeFetcherRef.current = geocodeFetcher;
  const submittedZipRef = useRef<string | null>(null);
  const geocodeRequestIdRef = useRef(0);
  const submittedGeocodeRequestIdRef = useRef<string | null>(null);
  const hasPendingGeocodeResponseRef = useRef(false);

  const locationSearchBarRef = useRef<HTMLDivElement>(null);
  const [internalIsSearching, setInternalIsSearching] = useState(false);
  const [isPopupMounted, setIsPopupMounted] = useState(false);
  const [isPopupVisible, setIsPopupVisible] = useState(false);

  const isSearching = controlledIsSearching ?? internalIsSearching;
  const setIsSearching = controlledSetIsSearching ?? setInternalIsSearching;
  const [coordinates, setCoordinates] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [isDistanceSearch, setIsDistanceSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputClearRequestId, setInputClearRequestId] = useState(0);

  useEffect(() => {
    if (ALGOLIA_APP_ID && ALGOLIA_SEARCH_API_KEY && !globalSearchClient) {
      // Reserved for future global client wiring
    }
  }, [ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY]);

  const searchClient =
    globalSearchClient ||
    (ALGOLIA_APP_ID && ALGOLIA_SEARCH_API_KEY
      ? algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY, {})
      : emptySearchClient);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        locationSearchBarRef.current &&
        !locationSearchBarRef.current.contains(event.target as Node)
      ) {
        setIsSearching(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [setIsSearching]);

  useEffect(() => {
    if (isSearching) {
      setIsPopupMounted(true);
      setIsPopupVisible(false);
      const frame = requestAnimationFrame(() => {
        setIsPopupVisible(true);
      });
      return () => cancelAnimationFrame(frame);
    }

    setIsPopupVisible(false);
    const timer = window.setTimeout(() => {
      setIsPopupMounted(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [isSearching]);

  const handleSearch = useCallback((query: string | null) => {
    if (!query || query.length !== 5 || !isValidZip(query)) {
      submittedZipRef.current = null;
      submittedGeocodeRequestIdRef.current = null;
      hasPendingGeocodeResponseRef.current = false;
      // Drop geo bias when the query is no longer a ZIP so keyword search
      // is not mixed with stale aroundLatLng from a previous ZIP/GPS search.
      setCoordinates(null);
      setIsDistanceSearch(false);
      return;
    }
    const requestId = `home-location-${geocodeRequestIdRef.current + 1}`;
    geocodeRequestIdRef.current += 1;
    submittedZipRef.current = query;
    submittedGeocodeRequestIdRef.current = requestId;
    hasPendingGeocodeResponseRef.current = false;
    const formData = new FormData();
    formData.append('address', query);
    formData.append('requestId', requestId);
    geocodeFetcherRef.current.submit(formData, {
      method: 'post',
      action: '/google-geocode',
    });
  }, []);

  const handlePreciseLocationRequest = useCallback(() => {
    submittedZipRef.current = null;
    submittedGeocodeRequestIdRef.current = null;
    hasPendingGeocodeResponseRef.current = false;
    // Clear typed city/ZIP so distance results aren't mixed with leftover text,
    // and keep the popup open for the ranked list.
    setSearchQuery('');
    setInputClearRequestId((id) => id + 1);
    setIsSearching(true);
    getCurrentPositionFromUserGesture(
      (position) => {
        setCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsDistanceSearch(true);
      },
      (error) => {
        console.error('Geolocation error:', error);
      },
    );
  }, [setIsSearching]);

  useEffect(() => {
    if (geocodeFetcher.state !== 'idle') {
      hasPendingGeocodeResponseRef.current = true;
      return;
    }

    if (
      !submittedZipRef.current ||
      !hasPendingGeocodeResponseRef.current ||
      !geocodeFetcher.data
    ) {
      return;
    }

    const geocodeData = geocodeFetcher.data as GeocodeFetcherData;
    if (geocodeData.requestId !== submittedGeocodeRequestIdRef.current) {
      return;
    }

    hasPendingGeocodeResponseRef.current = false;

    const location = geocodeData.results?.[0]?.geometry?.location;
    if (
      !location ||
      typeof location.lat !== 'number' ||
      typeof location.lng !== 'number'
    ) {
      setCoordinates(null);
      return;
    }

    setCoordinates({
      lat: location.lat,
      lng: location.lng,
    });
    setIsDistanceSearch(true);
  }, [geocodeFetcher.data, geocodeFetcher.state]);

  return (
    <div>
      <InstantSearch
        indexName={locationIndexName}
        searchClient={searchClient}
        future={{
          preserveSharedStateOnUnmount: true,
        }}
        initialUiState={{
          [locationIndexName]: {
            query: '',
          },
        }}
        insights={false}
      >
        {coordinates?.lat && coordinates?.lng ? (
          <Configure
            hitsPerPage={20}
            aroundLatLng={`${coordinates.lat}, ${coordinates.lng}`}
            aroundRadius='all'
            aroundLatLngViaIP={false}
            getRankingInfo={true}
          />
        ) : (
          <Configure hitsPerPage={20} />
        )}

        <div
          ref={locationSearchBarRef}
          className='relative z-50 w-full rounded-2xl sm:w-[450px] md:w-[620px] lg:w-[400px]'
        >
          {isPopupMounted && (
            <div
              className={cn(
                'absolute left-0 right-0 top-0 z-10 rounded-2xl bg-white p-4 shadow-md transition-opacity duration-200 ease-out',
                isPopupVisible ? 'opacity-100' : 'opacity-0',
                !isPopupVisible && 'pointer-events-none',
              )}
            >
              <div className='h-14 shrink-0' aria-hidden='true' />
              <SearchPopup
                query={searchQuery}
                isDistanceSearch={isDistanceSearch}
                onRequestPreciseLocation={handlePreciseLocationRequest}
              />
            </div>
          )}
          <div
            className={cn(
              'relative z-20 transition-[padding] duration-200 ease-out',
              isPopupVisible ? 'p-4 pb-0' : 'p-0',
            )}
          >
            <SearchBar
              onSearchStateChange={setIsSearching}
              onQueryChange={setSearchQuery}
              onSearchSubmit={handleSearch}
              clearRequestId={inputClearRequestId}
              data-gtm='hero-cta'
            />
          </div>
        </div>
      </InstantSearch>
    </div>
  );
}
