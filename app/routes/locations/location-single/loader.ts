import type { LoaderFunction } from 'react-router';
import { mapPageBuilderChildItems } from '~/routes/page-builder/loader';
import { PageBuilderSection } from '~/routes/page-builder/types';
import { fetchRockData } from '~/lib/.server/fetch-rock-data';
import type { LocationViewModel } from './types';
import {
  mapRockCampusToLocationViewModel,
  type RockCampus,
} from './location-mapper.server';

export type CampusAmenity = {
  title: string;
  titleEs: string;
  icon: string;
};

export type LoaderReturnType = {
  campusUrl: string;
  campusName: string;
  campusImage: string;
  location: LocationViewModel;
  campusAmenities: CampusAmenity[];
  upcomingEvents: PageBuilderSection & { type: 'EVENT_COLLECTION' };
};

// TODO: We might want to find a better way to handle this and remove this, but for now we will keep it
const allCampuses = [
  'palm-beach-gardens',
  'iglesia-palm-beach-gardens',
  'iglesia-royal-palm-beach',
  'royal-palm-beach',
  'cf-everywhere',
  'vero-beach',
  'boynton-beach',
  'jupiter',
  'port-st-lucie',
  'stuart',
  'okeechobee',
  'belle-glade',
  'boca-raton',
  'westlake',
  'trinity',
];

export const loader: LoaderFunction = async ({ params }) => {
  const campusUrl = params.location;

  if (!campusUrl) {
    throw new Response('Campus not found', {
      status: 404,
    });
  }

  // Check if the current campus URL is in the list of valid campuses
  if (!allCampuses.includes(campusUrl)) {
    throw new Response('Campus not found', {
      status: 404,
    });
  }

  const campus = (await fetchRockData({
    endpoint: 'Campuses',
    queryParams: {
      $filter: `Url eq '${campusUrl}'`,
      $expand: 'Location',
      loadAttributes: 'simple',
      $top: '1',
    },
  })) as RockCampus | null;

  if (!campus || Array.isArray(campus)) {
    throw new Response('Campus not found', { status: 404 });
  }

  const location = await mapRockCampusToLocationViewModel(campus);

  const upcomingEventsCollectionGuid = String(
    campus?.attributeValues?.upcomingEventsCollection?.value ?? '',
  ).trim();

  let upcomingEvents: PageBuilderSection & { type: 'EVENT_COLLECTION' } = {
    id: '',
    type: 'EVENT_COLLECTION',
    name: '',
    content: '',
    collection: [],
  };

  if (upcomingEventsCollectionGuid) {
    try {
      const upcomingEventsCollection = await fetchRockData({
        endpoint: 'ContentChannelItems',
        queryParams: {
          $filter: `Guid eq guid'${upcomingEventsCollectionGuid}'`,
          loadAttributes: 'simple',
        },
      });

      const collectionItem = Array.isArray(upcomingEventsCollection)
        ? upcomingEventsCollection[0]
        : upcomingEventsCollection;

      if (collectionItem) {
        const mappedCollections = await mapPageBuilderChildItems([
          collectionItem,
        ]);

        const mappedSection = mappedCollections.find(
          (section) => section.type === 'EVENT_COLLECTION',
        );
        if (mappedSection) {
          upcomingEvents = mappedSection as LoaderReturnType['upcomingEvents'];
        }
      }
    } catch (error) {
      console.warn('Failed to load upcoming events from Rock:', error);
    }
  }

  const campusAmenityGuids = String(
    campus?.attributeValues?.campusAmenities?.value ?? '',
  )
    .split(',')
    .map((guid) => guid.trim())
    .filter(Boolean);

  const campusAmenities: CampusAmenity[] = [];

  for (const guid of campusAmenityGuids) {
    try {
      const definedValue = await fetchRockData({
        endpoint: 'DefinedValues',
        queryParams: {
          $filter: `Guid eq guid'${guid}'`,
          loadAttributes: 'simple',
        },
      });

      const amenity = Array.isArray(definedValue)
        ? definedValue[0]
        : definedValue;

      if (amenity?.value) {
        campusAmenities.push({
          title: amenity.value,
          titleEs: amenity.attributeValues?.spanishName?.value ?? '',
          icon: amenity.attributeValues?.icon?.value ?? '',
        });
      }
    } catch (error) {
      console.warn('Failed to load campus amenity from Rock:', error);
    }
  }

  const pageData: LoaderReturnType = {
    campusUrl: location.campusUrl ?? campusUrl,
    campusName: location.campusName,
    campusImage: location.campusImage,
    location,
    campusAmenities,
    upcomingEvents,
  };

  return pageData;
};
