import type { LoaderFunction } from 'react-router';
import { mapPageBuilderChildItems } from '~/routes/page-builder/loader';
import { PageBuilderSection } from '~/routes/page-builder/types';
import { fetchRockData } from '~/lib/.server/fetch-rock-data';
import {
  buildV2SearchBody,
  escapeDynamicLinq,
  fetchRockV2,
  getSearchItems,
  requestRockV2,
  toV1Shape,
  type RockV2AttributeValue,
} from '~/lib/.server/fetch-rock-v2';
import { normalize } from '~/lib/utils';
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
  /** Optional per-campus SEO overrides, edited by marketing on the Rock campus. */
  seoTitle: string;
  seoDescription: string;
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

export const fetchCampusV1 = async (campusUrl: string) =>
  (await fetchRockData({
    endpoint: 'Campuses',
    queryParams: {
      $filter: `Url eq '${campusUrl}'`,
      $expand: 'Location',
      loadAttributes: 'simple',
      $top: '1',
    },
  })) as RockCampus | null;

/** Rock Entity Search (Campus, refinement allowed, Execute for the REST key). */
const CAMPUS_SEARCH_KEY = 'cf-web-campus-by-url';

/**
 * v2 read of the same campus: search by Url, then its attribute values and
 * Location. IdKey and Location.Latitude are computed, not columns, so the
 * search selects Guids and the follow-up GETs return the full records.
 */
export const campusV2Read = (campusUrl: string) => ({
  path: `campuses/search/${CAMPUS_SEARCH_KEY}`,
  method: 'POST' as const,
  body: buildV2SearchBody({
    where: `Url == "${escapeDynamicLinq(campusUrl)}"`,
    select:
      'new (Id, Guid, Name, Url, PhoneNumber, ServiceTimes, LeaderPersonAliasId, Location.Guid as LocationGuid)',
    limit: 1,
  }),
  map: async (data: unknown): Promise<RockCampus> => {
    const [found] = getSearchItems(data);
    // Throwing (not returning null) sends a miss to v1, so a bad search can't 404 a real campus.
    if (!found) throw new Error(`Campus "${campusUrl}" not found in Rock v2`);

    const { guid, locationGuid } = normalize(found) as {
      guid: string;
      locationGuid?: string;
    };
    const [attributeValues, location] = await Promise.all([
      requestRockV2({ path: `campuses/${guid}/attributevalues` }),
      locationGuid
        ? requestRockV2({ path: `locations/${locationGuid}` })
        : Promise.resolve(null),
    ]);

    return {
      ...toV1Shape(
        found,
        attributeValues as Record<string, RockV2AttributeValue>,
      ),
      location: location ? normalize(location) : null,
    } as RockCampus;
  },
});

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

  const campus = await fetchRockV2({
    ...campusV2Read(campusUrl),
    fallback: () => fetchCampusV1(campusUrl),
  });

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
    seoTitle: String(campus.attributeValues?.seoTitle?.value ?? '').trim(),
    seoDescription: String(
      campus.attributeValues?.seoDescription?.value ?? '',
    ).trim(),
    location,
    campusAmenities,
    upcomingEvents,
  };

  return pageData;
};
