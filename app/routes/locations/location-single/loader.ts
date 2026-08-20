import type { LoaderFunction } from 'react-router';
import { mapPageBuilderChildItems } from '~/routes/page-builder/loader';
import { createAuditedServerAlgoliaClient } from '~/lib/.server/algolia-request-audit.server';
import { PageBuilderSection } from '~/routes/page-builder/types';
import { fetchRockData } from '~/lib/.server/fetch-rock-data';
import { getServerAlgoliaIndexes } from '~/lib/.server/algolia-indexes.server';
import { createImageUrlFromGuid } from '~/lib/utils';
import type { LocationHitType } from './types';

export type CampusAmenity = {
  title: string;
  titleEs: string;
  icon: string;
};

export type LoaderReturnType = {
  ALGOLIA_APP_ID: string;
  ALGOLIA_SEARCH_API_KEY: string;
  campusUrl: string;
  campusName: string;
  campusImage: string;
  campusHit: LocationHitType | null;
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

  const campusName = decodeURIComponent(campusUrl || '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());

  if (!campusUrl) {
    throw new Response('Campus not found', {
      status: 404,
    });
  }

  const appId = process.env.ALGOLIA_APP_ID;
  const searchApiKey = process.env.ALGOLIA_SEARCH_API_KEY;
  const algoliaIndexes = getServerAlgoliaIndexes();

  if (!appId || !searchApiKey) {
    throw new Response('Keys not found', {
      status: 404,
    });
  }

  let campusHit: LocationHitType | null = null;
  const client = createAuditedServerAlgoliaClient(
    appId,
    searchApiKey,
    'location-detail.loader',
  );

  try {
    const res = await client.searchSingleIndex({
      indexName: algoliaIndexes.locations,
      searchParams: {
        filters: `campusUrl:"${campusUrl}"`,
        hitsPerPage: 1,
      },
    });

    campusHit =
      (res.hits?.[0] as unknown as LocationHitType | undefined) ?? null;
  } catch (error) {
    console.warn('Failed to load campus from Algolia:', error);
  }

  type CampusRock = {
    attributeValues?: {
      upcomingEventsCollection?: { value?: string };
      campusImage?: { value?: string };
      campusAmenities?: { value?: string };
    };
  };

  let campus: CampusRock | null = null;

  try {
    campus = (await fetchRockData({
      endpoint: 'Campuses',
      queryParams: {
        $filter: `Url eq '${campusUrl}'`,
        loadAttributes: 'simple',
        $top: '1',
      },
    })) as CampusRock;
  } catch (error) {
    console.warn(
      'Rock Campuses unavailable; continuing with fallbacks:',
      error,
    );
  }

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

  const campusImage = createImageUrlFromGuid(
    campus?.attributeValues?.campusImage?.value || '',
  );

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
    ALGOLIA_APP_ID: appId,
    ALGOLIA_SEARCH_API_KEY: searchApiKey,
    campusUrl: decodeURIComponent(campusUrl),
    campusName: campusName,
    campusImage,
    campusHit,
    campusAmenities,
    upcomingEvents,
  };

  return pageData;
};
