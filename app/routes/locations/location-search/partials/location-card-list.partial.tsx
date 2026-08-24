import { Link } from 'react-router-dom';
import kebabCase from 'lodash/kebabCase';
import { useHits, useInstantSearch } from 'react-instantsearch';

import LocationCard from '../components/locations-search-card.component';
import { LocationsLoader } from '../components/locations-search-skeleton.component';

export type CampusHit = {
  campusUrl: string;
  campusName: string;
  /** Algolia custom ranking field; lower values appear first on /locations. */
  order?: number | string;
  geoloc: {
    latitude: number;
    longitude: number;
  };
  campusLocation: {
    street1: string;
    street2: string;
    city: string;
    state: string;
    zip: string;
  };
  serviceTimes: string;
  objectID?: string;
  _rankingInfo?: {
    geoDistance?: number;
    distance?: number;
  };
};

export type LocationCardListProps = {
  loading: boolean;
  sortByGeo?: boolean;
};

/** Static card art: `public/assets/images/locations/location-card-images/{campusUrl}.webp` */
const LOCATION_CARD_IMAGES_BASE =
  '/assets/images/locations/location-card-images';

function locationSearchCardImage(hitUrl: string) {
  const slug = hitUrl.trim();
  return slug ? `${LOCATION_CARD_IMAGES_BASE}/${slug}.webp` : '';
}

export const LocationCardList = ({
  loading,
  sortByGeo = false,
}: LocationCardListProps) => {
  const { items } = useHits<CampusHit>();
  const { status } = useInstantSearch();
  const isSearchLoading = status === 'loading' || status === 'stalled';

  return (
    <LocationCardGrid
      items={items}
      loading={loading || (isSearchLoading && items.length === 0)}
      sortByGeo={sortByGeo}
    />
  );
};

function isOnlineCampus(item: CampusHit) {
  return (
    item.campusUrl === 'cf-everywhere' || item.campusName?.includes('Online')
  );
}

function getLocationCardLink(hit: CampusHit) {
  if (isOnlineCampus(hit)) {
    return '/cf-everywhere';
  }

  if (hit?.campusName?.includes('Español')) {
    const url = hit.campusName.substring(25, hit.campusName.length);
    return `/iglesia-${kebabCase(url)}`;
  }

  return `/${kebabCase(hit?.campusName)}`;
}

function getDistanceFromLocation(hit: CampusHit) {
  const geoDistance = hit?._rankingInfo?.geoDistance;
  return typeof geoDistance === 'number' ? geoDistance / 1609.34 : undefined;
}

function getCampusOrder(hit: CampusHit) {
  const order = hit.order;
  if (typeof order === 'number' && Number.isFinite(order)) {
    return order;
  }
  if (typeof order === 'string') {
    const parsed = Number.parseInt(order, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return Number.MAX_SAFE_INTEGER;
}

function sortPhysicalCampusesByOrder(items: CampusHit[]) {
  return [...items].sort(
    (left, right) => getCampusOrder(left) - getCampusOrder(right),
  );
}

const METERS_PER_MILE = 1609.344;
const ONLINE_FIRST_DISTANCE_THRESHOLD_MILES = 80;
const onlineFirstDistanceThresholdMeters =
  ONLINE_FIRST_DISTANCE_THRESHOLD_MILES * METERS_PER_MILE;

function getClosestPhysicalDistanceMeters(items: CampusHit[]) {
  return items.reduce<number | null>((closestDistance, item) => {
    const distance = item._rankingInfo?.geoDistance;
    if (typeof distance !== 'number' || !Number.isFinite(distance)) {
      return closestDistance;
    }

    return closestDistance === null
      ? distance
      : Math.min(closestDistance, distance);
  }, null);
}

/**
 * /location (Location Search page) lists physical campuses by Algolia `order`
 * (default) or by distance when coordinates are set, with the Online campus
 * last — unless the closest physical campus is over
 * ONLINE_FIRST_DISTANCE_THRESHOLD_MILES away, in which case Online is first.
 * Mirrors the home hero's `sortCampusHitsForDistanceSearch`.
 */
export function getLocationCardDisplayItems(
  items: CampusHit[],
  { sortByGeo = false }: { sortByGeo?: boolean } = {},
) {
  const onlineItems = items.filter((item) => isOnlineCampus(item));
  const physicalItems = items.filter((item) => !isOnlineCampus(item));
  const sortedPhysicalItems = sortByGeo
    ? physicalItems
    : sortPhysicalCampusesByOrder(physicalItems);

  const closestPhysicalDistanceMeters =
    getClosestPhysicalDistanceMeters(physicalItems);

  if (
    closestPhysicalDistanceMeters != null &&
    closestPhysicalDistanceMeters > onlineFirstDistanceThresholdMeters
  ) {
    return [...onlineItems, ...sortedPhysicalItems];
  }

  return [...sortedPhysicalItems, ...onlineItems];
}

export function LocationCardGrid({
  items,
  loading,
  sortByGeo = false,
}: {
  items: CampusHit[];
  loading: boolean;
  sortByGeo?: boolean;
}) {
  const displayItems = getLocationCardDisplayItems(items, { sortByGeo });

  if (loading) {
    return (
      <div
        className='flex w-full flex-col items-center justify-center py-12 md:px-5 lg:px-2'
        id='campuses'
      >
        <LocationsLoader />
      </div>
    );
  }

  return (
    <div
      className='flex w-full flex-col items-center justify-center py-12 md:px-5 lg:px-2'
      id='campuses'
    >
      {/* Hits */}
      <div className='grid max-w-[1100px] grid-cols-12 gap-5 md:gap-y-10'>
        {displayItems.map((hit, index) => {
          return (
            <LocationCard
              name={hit?.campusName}
              image={locationSearchCardImage(hit.campusUrl)}
              distanceFromLocation={getDistanceFromLocation(hit)}
              key={hit.objectID || index}
              link={getLocationCardLink(hit)}
            />
          );
        })}
      </div>

      {/* Prison Location */}
      <div className='mt-24'>
        <Link to='/ministries/prison' prefetch='intent'>
          <div className="relative h-[150px] w-[90vw] overflow-hidden rounded-md transition-transform duration-300 md:h-[250px] md:w-[600px] lg:hover:-translate-y-3 bg-cover bg-center bg-no-repeat bg-[url('https://cloudfront.christfellowship.church/Content/Digital%20Platform/Location/prison-location.jpeg')]">
            <div
              className='absolute size-full opacity-80'
              style={{
                background:
                  'linear-gradient(to bottom, rgba(0, 0, 0, 0), #353535)',
              }}
            />
            <h3 className='absolute bottom-0 left-0 pb-6 pl-6 text-2xl font-bold text-white'>
              Prison Locations
            </h3>
          </div>
        </Link>
      </div>
    </div>
  );
}
