import { LoaderFunctionArgs } from 'react-router';
import { Trip, VolunteerAtChurchResource } from './types';
import { fetchRockData } from '~/lib/.server/fetch-rock-data';
import { createImageUrlFromGuid } from '~/lib/utils';
import { getCoordinatesForCountry } from './country-coordinates';
import { ContentChannelIds } from '~/lib/rock-config';
import { fetchDreamTeamBuckets } from './dream-team-buckets.server';
import { getServerAlgoliaIndexes } from '~/lib/.server/algolia-indexes.server';
import type { AlgoliaIndexMap } from '~/lib/algolia-indexes';

const MISSION_TRIPS_CONTENT_CHANNEL_ID = ContentChannelIds.missionTrips;

const fetchVolunteerTrips = async () => {
  const rawTrips = await fetchRockData({
    endpoint: 'ContentChannelItems',
    filterByDateRange: true,
    queryParams: {
      $filter: `ContentChannelId eq ${MISSION_TRIPS_CONTENT_CHANNEL_ID}`,
      loadAttributes: 'simple',
    },
  });

  const trips = Array.isArray(rawTrips) ? rawTrips : [rawTrips];

  return trips;
};

export type LoaderReturnType = {
  volunteerTrips: Record<string, Trip[]>;
  dreamTeamBuckets: VolunteerAtChurchResource[];
  ALGOLIA_APP_ID: string;
  ALGOLIA_SEARCH_API_KEY: string;
  algoliaIndexes: AlgoliaIndexMap;
};

export async function loader({ request: _request }: LoaderFunctionArgs) {
  const [fetchedTrips, dreamTeamBuckets] = await Promise.all([
    fetchVolunteerTrips(),
    fetchDreamTeamBuckets(),
  ]);

  const volunteerTripsList: Trip[] = fetchedTrips.map(
    (item: {
      id: string;
      title: string;
      content: string;
      attributeValues?: {
        image?: { value: string };
        tripDate?: { value: string };
        missionsUrl?: { value: string };
        country?: { value: string };
      };
    }) => {
      const country = item.attributeValues?.country?.value || '';
      const resolvedCoordinates = getCoordinatesForCountry(country);
      return {
        id: Number(item.id) || 0,
        title: item.title,
        description: item.content,
        image: item.attributeValues?.image?.value
          ? createImageUrlFromGuid(item.attributeValues.image.value)
          : '',
        country,
        tripDate: item.attributeValues?.tripDate?.value || '',
        missionsUrl: item.attributeValues?.missionsUrl?.value || '',
        coordinates: resolvedCoordinates ?? undefined,
      };
    },
  );

  const groupedTrips = volunteerTripsList.reduce(
    (acc: Record<string, Trip[]>, trip: Trip) => {
      const country = trip.country;
      if (!acc[country]) {
        acc[country] = [];
      }
      acc[country].push(trip);
      return acc;
    },
    {} as Record<string, Trip[]>,
  );

  return Response.json({
    volunteerTrips: groupedTrips,
    dreamTeamBuckets,
    ALGOLIA_APP_ID: process.env.ALGOLIA_APP_ID ?? '',
    ALGOLIA_SEARCH_API_KEY: process.env.ALGOLIA_SEARCH_API_KEY ?? '',
    algoliaIndexes: getServerAlgoliaIndexes(),
  } satisfies LoaderReturnType);
}
