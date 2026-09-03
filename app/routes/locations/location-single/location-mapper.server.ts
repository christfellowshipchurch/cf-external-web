import { fetchRockData } from '~/lib/.server/fetch-rock-data';
import { fetchWistiaDataFromRock } from '~/lib/.server/fetch-wistia-data';
import { getAttributeMatrixItems } from '~/lib/.server/rock-utils';
import { createImageUrlFromGuid } from '~/lib/utils';
import type { AttributeMatrixItem } from '~/lib/types/rock-types';
import type { LocationViewModel } from './types';

type RockAttribute = {
  value?: string | null;
  valueFormatted?: string | null;
};

export type RockCampus = {
  id: number;
  guid: string;
  leaderPersonAliasId?: number | null;
  name: string;
  url: string;
  phoneNumber?: string | null;
  serviceTimes?: string | null;
  location?: {
    street1?: string | null;
    street2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  attributeValues?: Record<string, RockAttribute | undefined>;
};

const value = (campus: RockCampus, key: string): string =>
  String(campus.attributeValues?.[key]?.value ?? '').trim();

async function resolveMediaGuid(guid: string): Promise<string> {
  if (!guid) return '';

  try {
    const media = await fetchWistiaDataFromRock(guid);
    return String(media?.sourceKey ?? '').trim();
  } catch (error) {
    console.warn(`Failed to resolve Rock media element ${guid}:`, error);
    return '';
  }
}

async function mapCampusLeader(campus: RockCampus) {
  const leaderPersonAliasId = campus.leaderPersonAliasId;
  const emptyPastor = { email: '', firstName: '', lastName: '', photo: '' };
  if (leaderPersonAliasId == null) return emptyPastor;

  try {
    const result = await fetchRockData({
      endpoint: 'PersonAlias',
      queryParams: {
        $filter: `Id eq ${leaderPersonAliasId}`,
        $expand: 'Person',
        $top: '1',
      },
    });
    const alias = Array.isArray(result) ? result[0] : result;
    const person = alias?.person;
    if (!person) return emptyPastor;

    const photoId = person.photoId;
    return {
      email: person.email || '',
      firstName: person.nickName || person.firstName || '',
      lastName: person.lastName || '',
      photo: photoId
        ? `${process.env.CLOUDFRONT}/GetImage.ashx?id=${photoId}`
        : '',
    };
  } catch (error) {
    console.warn(`Failed to load leader for Rock campus ${campus.url}:`, error);
    return emptyPastor;
  }
}

async function mapWeeklyMinistries(campus: RockCampus) {
  const matrixGuid = value(campus, 'weeklyMinistryServices');
  if (!matrixGuid) return [];

  const items = await getAttributeMatrixItems({
    attributeMatrixGuid: matrixGuid,
  });

  return items.map((item: AttributeMatrixItem) => {
    const attrs = item.attributeValues;
    const planValue =
      attrs?.planMyVisit?.valueFormatted ?? attrs?.planMyVisit?.value ?? '';

    return {
      ministryType:
        attrs?.ministryType?.valueFormatted ?? attrs?.ministryType?.value ?? '',
      dayOfWeek:
        attrs?.dayOfTheWeek?.valueFormatted ?? attrs?.dayOfTheWeek?.value ?? '',
      serviceTimes: attrs?.serviceTimes?.value ?? '',
      learnMoreUrl: attrs?.learnMoreUrl?.value ?? '',
      planMyvisit: /^(on|true|yes)$/i.test(planValue) ? 'Yes' : 'No',
    };
  });
}

/** Maps one Rock campus and its linked Rock records to location-detail data. */
export async function mapRockCampusToLocationViewModel(
  campus: RockCampus,
): Promise<LocationViewModel> {
  const [
    backgroundVideoDesktop,
    backgroundVideoMobile,
    digitalTourVideo,
    setReminderVideo,
    campusPastor,
    weeklyMinistryServices,
  ] = await Promise.all([
    resolveMediaGuid(value(campus, 'backgroundVideoDesktop')),
    resolveMediaGuid(value(campus, 'backgroundVideoMobile')),
    resolveMediaGuid(value(campus, 'digitalTourVideo')),
    resolveMediaGuid(value(campus, 'setAReminderVideo')),
    mapCampusLeader(campus),
    mapWeeklyMinistries(campus),
  ]);

  const location = campus.location;
  const hasAddress = Boolean(
    location?.street1 ||
    location?.city ||
    location?.state ||
    location?.postalCode,
  );
  const hasGeolocation =
    typeof location?.latitude === 'number' &&
    typeof location?.longitude === 'number';

  return {
    _geoloc: hasGeolocation
      ? { latitude: location.latitude!, longitude: location.longitude! }
      : undefined,
    additionalInfo: value(campus, 'additionalInfo')
      .split('|')
      .map((item) => item.trim())
      .filter(Boolean),
    backgroundVideoDesktop,
    backgroundVideoMobile,
    campusId: campus.id,
    campusImage: createImageUrlFromGuid(value(campus, 'campusImage')),
    campusInstagram: value(campus, 'campusInstagram'),
    campusUrl: campus.url,
    campusLocation: hasAddress
      ? {
          city: location?.city ?? '',
          postalCode: location?.postalCode ?? '',
          state: location?.state ?? '',
          street1: location?.street1 ?? '',
          street2: location?.street2 ?? '',
        }
      : undefined,
    campusName: campus.name,
    campusPastor,
    digitalTourVideo,
    mapLink: value(campus, 'mapLink'),
    mapUrl: value(campus, 'map'),
    objectID: campus.guid || String(campus.id),
    phoneNumber: campus.phoneNumber ?? '',
    serviceTimes: campus.serviceTimes ?? '',
    setReminderVideo,
    weeklyMinistryServices,
  };
}
