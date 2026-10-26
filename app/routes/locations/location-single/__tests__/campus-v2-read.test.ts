import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestRockV2 } from '~/lib/.server/fetch-rock-v2';
import { campusV2Read } from '../loader';

vi.mock('~/lib/.server/redis-config', () => ({ default: null }));
vi.mock('~/lib/.server/fetch-rock-v2', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  requestRockV2: vi.fn(),
}));

const CAMPUS_GUID = 'campus-guid';
const LOCATION_GUID = 'location-guid';

/**
 * The v2 read must hand the location mapper the same shape v1's
 * `$expand=Location&loadAttributes=simple` does, or the page renders blanks.
 */
describe('campusV2Read', () => {
  beforeEach(() => {
    vi.mocked(requestRockV2).mockImplementation(async ({ path }) =>
      path === `campuses/${CAMPUS_GUID}/attributevalues`
        ? { MapLink: { value: 'https://maps.example', textValue: 'Map' } }
        : { Street1: '5343 Northlake Blvd', Latitude: 26.8, Longitude: -80.1 },
    );
  });

  it('combines the search hit, attribute values and Location into the v1 shape', async () => {
    const campus = await campusV2Read('jupiter').map({
      count: 1,
      items: [
        {
          Id: 7,
          Guid: CAMPUS_GUID,
          Name: 'Jupiter',
          Url: 'jupiter',
          LocationGuid: LOCATION_GUID,
        },
      ],
    });

    expect(requestRockV2).toHaveBeenCalledWith({
      path: `locations/${LOCATION_GUID}`,
    });
    expect(campus).toMatchObject({
      id: 7,
      guid: CAMPUS_GUID,
      name: 'Jupiter',
      url: 'jupiter',
      location: { street1: '5343 Northlake Blvd', latitude: 26.8 },
      attributeValues: {
        mapLink: { value: 'https://maps.example', valueFormatted: 'Map' },
      },
    });
  });

  // fetchRockV2 turns the throw into a v1 read, so a misconfigured search
  // can't 404 a campus that exists.
  it('throws on a miss instead of returning no campus', async () => {
    await expect(
      campusV2Read('jupiter').map({ count: 0, items: [] }),
    ).rejects.toThrow(/not found in Rock v2/);
  });

  it('looks campuses up by a quoted, escaped Url', () => {
    expect(campusV2Read('a"b').body.where).toBe('Url == "a\\"b"');
  });
});
