import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { requestRockV2 } from '../fetch-rock-v2';
import {
  campusDetailsV2Read,
  fetchCampuses,
  fetchCampusesWithDetails,
  fetchCampusWithDetails,
} from '../rock-campuses';

vi.mock('../redis-config', () => ({ default: null }));
vi.mock('../fetch-rock-v2', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  requestRockV2: vi.fn(),
}));

const CAMPUS_GUID = '1b5c2e3d-4f5a-6b7c-8d9e-0f1a2b3c4d5e';
const LOCATION_GUID = 'location-guid';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('ROCK_API', 'https://rock.example.com/api/');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

/** fetchRockV2 calls its own requestRockV2, so these tests stub fetch itself. */
const stubRockV2Fetch = (fetchMock: ReturnType<typeof vi.fn>) =>
  vi.stubGlobal('fetch', fetchMock);

const sentBody = () =>
  JSON.parse(String(vi.mocked(global.fetch).mock.calls[0][1]?.body));

/**
 * The v2 read must hand loaders the same shape v1's
 * `$expand=Location&loadAttributes=simple` does, or pages render blanks.
 */
describe('campusDetailsV2Read', () => {
  beforeEach(() => {
    vi.mocked(requestRockV2).mockResolvedValue({
      Street1: '5343 Northlake Blvd',
      Latitude: 26.8,
      Longitude: -80.1,
    });
  });

  it('combines the search hit, its projected attribute values and Location into the v1 shape', async () => {
    const [campus] = await campusDetailsV2Read({ url: 'jupiter' }).map({
      count: 1,
      // Rock v2 returns camelCase keys.
      items: [
        {
          id: 7,
          guid: CAMPUS_GUID,
          name: 'Jupiter',
          url: 'jupiter',
          locationGuid: LOCATION_GUID,
          attributeValues: [
            {
              key: 'MapLink',
              value: 'https://maps.example',
              textValue: 'Map',
            },
          ],
        },
      ],
    });

    // Attribute values ride in the search; Location is the only follow-up.
    expect(requestRockV2).toHaveBeenCalledTimes(1);
    expect(requestRockV2).toHaveBeenCalledWith({
      path: `locations/${LOCATION_GUID}`,
    });
    expect(campus).not.toHaveProperty('locationGuid');
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

  it('returns an empty list when a single-campus lookup misses', async () => {
    await expect(
      campusDetailsV2Read({ url: 'jupiter' }).map({ count: 0, items: [] }),
    ).resolves.toEqual([]);
    expect(requestRockV2).not.toHaveBeenCalled();
  });

  // A search that ignored its `where` must not render another campus's page.
  it('rejects when a single-campus lookup returns another campus', async () => {
    await expect(
      campusDetailsV2Read({ url: 'jupiter' }).map({
        count: 1,
        items: [{ id: 1, url: 'boynton' }],
      }),
    ).rejects.toThrow(/Url doesn't match/);
  });

  it('returns an empty list when no campus is active', async () => {
    await expect(
      campusDetailsV2Read({ active: true }).map({ count: 0, items: [] }),
    ).resolves.toEqual([]);
  });

  it('quotes and escapes looked-up values', () => {
    expect(campusDetailsV2Read({ url: 'a"b' }).body.where).toBe(
      'Url == "a\\"b"',
    );
    expect(campusDetailsV2Read({ name: 'a"b' }).body.where).toBe(
      'Name == "a\\"b"',
    );
  });

  it('projects Campus attribute values into the search select', () => {
    expect(campusDetailsV2Read({ url: 'jupiter' }).body.select).toContain(
      'CampusAttributeValues.Select(',
    );
  });

  // Rock sorts after the select, so sorting on a field it didn't select is a 500.
  it('sorts active campuses by Rock Order, selecting Order', () => {
    const { body } = campusDetailsV2Read({ active: true });
    expect(body).toMatchObject({ where: 'IsActive == true', sort: 'Order' });
    expect(body.select).toMatch(/\bOrder\b/);
  });
});

describe('fetchCampuses', () => {
  // A search that ignored its `where` must not hand an action another
  // campus's Id (it would sign people up to, or move a family to, the wrong campus).
  it('rejects when the search returns a different campus', async () => {
    stubRockV2Fetch(
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          count: 2,
          items: [
            { id: 1, guid: '99999999-9999-4999-8999-999999999999' },
            { id: 7, guid: CAMPUS_GUID },
          ],
        }),
      }),
    );

    await expect(fetchCampuses({ guid: CAMPUS_GUID }, ['Id'])).rejects.toThrow(
      /Guid doesn't match/,
    );
    // The looked-up Guid is selected so the guard can check it.
    expect(sentBody().select).toBe('new (Id, Guid)');
  });

  // Form input reaches the Guid filter, so a malformed value never goes to Rock.
  it('skips Rock for a malformed Guid', async () => {
    stubRockV2Fetch(vi.fn());

    await expect(
      fetchCampuses({ guid: "x' or 1 eq 1" }, ['Id']),
    ).resolves.toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // Order is selected only so Rock can sort; callers get the fields they asked for, as on v1.
  it('maps search items to the v1 shape', async () => {
    stubRockV2Fetch(
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          count: 1,
          items: [{ name: 'Jupiter', guid: CAMPUS_GUID, order: 4 }],
        }),
      }),
    );

    await expect(
      fetchCampuses({ active: true }, ['Name', 'Guid']),
    ).resolves.toEqual([{ name: 'Jupiter', guid: CAMPUS_GUID }]);
    expect(vi.mocked(global.fetch).mock.calls[0][0]).toBe(
      'https://rock.example.com/api/v2/models/campuses/search/campuses',
    );
    // Rock sorts after the select, so sorting on a field it didn't select is a 500.
    expect(sentBody()).toEqual({
      where: 'IsActive == true',
      select: 'new (Name, Guid, Order)',
      sort: 'Order',
    });
  });

  // Rock v2 returns camelCase keys; a matching row must not trip the
  // wrong-record guard.
  it('returns a one-campus Guid lookup as an array when Rock returns camelCase keys', async () => {
    stubRockV2Fetch(
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ count: 1, items: [{ id: 7, guid: CAMPUS_GUID }] }),
      }),
    );

    await expect(fetchCampuses({ guid: CAMPUS_GUID }, ['Id'])).resolves.toEqual(
      [{ id: 7 }],
    );
  });
});

describe('fetchCampusesWithDetails', () => {
  it('rejects when a v2 call fails', async () => {
    stubRockV2Fetch(
      vi
        .fn()
        .mockResolvedValue({ ok: false, status: 401, text: async () => '' }),
    );

    await expect(fetchCampusesWithDetails({ url: 'jupiter' })).rejects.toThrow(
      /failed: 401/,
    );
  });

  // A campus page answers 404 for an unknown url.
  it('returns null for one campus when the lookup finds nothing', async () => {
    stubRockV2Fetch(
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ count: 0, items: [] }),
      }),
    );

    await expect(
      fetchCampusWithDetails({ url: 'nowhere' }),
    ).resolves.toBeNull();
    expect(sentBody().where).toBe('Url == "nowhere"');
  });
});
