import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchRockData } from '~/lib/.server/fetch-rock-data';
import { fetchWistiaDataFromRock } from '~/lib/.server/fetch-wistia-data';
import { getAttributeMatrixItems } from '~/lib/.server/rock-utils';
import {
  mapRockCampusToLocationViewModel,
  type RockCampus,
} from '../location-mapper.server';

vi.mock('~/lib/.server/fetch-rock-data', () => ({ fetchRockData: vi.fn() }));
vi.mock('~/lib/.server/fetch-wistia-data', () => ({
  fetchWistiaDataFromRock: vi.fn(),
}));
vi.mock('~/lib/.server/rock-utils', () => ({
  getAttributeMatrixItems: vi.fn(),
}));

const attr = (value: string, valueFormatted = value) => ({
  value,
  valueFormatted,
});

const physicalCampus: RockCampus = {
  id: 2,
  guid: 'campus-guid',
  leaderPersonAliasId: 731185,
  name: 'Palm Beach Gardens',
  url: 'palm-beach-gardens',
  phoneNumber: '(561) 799-7600',
  serviceTimes: 'Sunday^9AM',
  location: {
    street1: '5343 Northlake Blvd',
    street2: '',
    city: 'Palm Beach Gardens',
    state: 'FL',
    postalCode: '33418',
    latitude: 26.81,
    longitude: -80.13,
  },
  attributeValues: {
    additionalInfo: attr('Kids available|Spanish translation'),
    backgroundVideoDesktop: attr('desktop-guid'),
    backgroundVideoMobile: attr('mobile-guid'),
    campusImage: attr('a4d38520-a73d-48be-aaf2-9ed63c6ff2f3'),
    campusInstagram: attr('https://instagram.example/campus'),
    campusPastor: attr('legacy-pastor-alias-guid'),
    campusPastorEmail: attr('pastor@example.com'),
    digitalTourVideo: attr('tour-guid'),
    map: attr('https://maps.example/embed'),
    mapLink: attr('https://maps.example/directions'),
    setAReminderVideo: attr('reminder-guid'),
    weeklyMinistryServices: attr('matrix-guid'),
  },
};

describe('mapRockCampusToLocationViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLOUDFRONT = 'https://cdn.example';
    vi.mocked(fetchWistiaDataFromRock).mockImplementation(async (guid) => ({
      sourceKey: `${guid}-source`,
    }));
    vi.mocked(fetchRockData).mockResolvedValue({
      person: {
        firstName: 'Cole',
        lastName: 'Robinson',
        email: 'rock@example.com',
        photoId: 42,
      },
    });
    vi.mocked(getAttributeMatrixItems).mockResolvedValue([
      {
        attributeValues: {
          ministryType: attr('type-guid', 'CF Kids'),
          dayOfTheWeek: attr('day-guid', 'Wednesday'),
          serviceTimes: attr('6PM'),
          learnMoreUrl: attr('/kids'),
          planMyVisit: attr('True', 'On'),
        },
      },
    ] as never);
  });

  it('maps every location-detail field from Rock and linked Rock records', async () => {
    const result = await mapRockCampusToLocationViewModel(physicalCampus);

    expect(result).toEqual({
      _geoloc: { latitude: 26.81, longitude: -80.13 },
      additionalInfo: ['Kids available', 'Spanish translation'],
      backgroundVideoDesktop: 'desktop-guid-source',
      backgroundVideoMobile: 'mobile-guid-source',
      campusId: 2,
      campusImage:
        'https://cdn.example/GetImage.ashx?guid=a4d38520-a73d-48be-aaf2-9ed63c6ff2f3',
      campusInstagram: 'https://instagram.example/campus',
      campusUrl: 'palm-beach-gardens',
      campusLocation: {
        street1: '5343 Northlake Blvd',
        street2: '',
        city: 'Palm Beach Gardens',
        state: 'FL',
        postalCode: '33418',
      },
      campusName: 'Palm Beach Gardens',
      campusPastor: {
        firstName: 'Cole',
        lastName: 'Robinson',
        email: 'rock@example.com',
        photo: 'https://cdn.example/GetImage.ashx?id=42',
      },
      digitalTourVideo: 'tour-guid-source',
      mapLink: 'https://maps.example/directions',
      mapUrl: 'https://maps.example/embed',
      objectID: 'campus-guid',
      phoneNumber: '(561) 799-7600',
      serviceTimes: 'Sunday^9AM',
      setReminderVideo: 'reminder-guid-source',
      weeklyMinistryServices: [
        {
          ministryType: 'CF Kids',
          dayOfWeek: 'Wednesday',
          serviceTimes: '6PM',
          learnMoreUrl: '/kids',
          planMyvisit: 'Yes',
        },
      ],
    });

    expect(fetchRockData).toHaveBeenCalledWith({
      endpoint: 'PersonAlias',
      queryParams: {
        $filter: 'Id eq 731185',
        $expand: 'Person',
        $top: '1',
      },
    });
  });

  it('keeps sparse online campuses valid without address or ministry lookups', async () => {
    const result = await mapRockCampusToLocationViewModel({
      ...physicalCampus,
      name: 'Online (CF Everywhere)',
      url: 'cf-everywhere',
      leaderPersonAliasId: null,
      location: null,
      attributeValues: {
        additionalInfo: attr('Live services'),
        campusImage: attr('online-image-guid'),
      },
    });

    expect(result.campusName).toBe('Online (CF Everywhere)');
    expect(result.campusLocation).toBeUndefined();
    expect(result._geoloc).toBeUndefined();
    expect(result.weeklyMinistryServices).toEqual([]);
    expect(getAttributeMatrixItems).not.toHaveBeenCalled();
  });
});
