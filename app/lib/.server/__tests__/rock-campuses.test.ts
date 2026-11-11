import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchRockData } from '../fetch-rock-data';
import { requestRockV2 } from '../fetch-rock-v2';
import {
  campusDetailsV2Read,
  fetchCampuses,
  fetchCampusesWithDetails,
} from '../rock-campuses';

vi.mock('../redis-config', () => ({ default: null }));
vi.mock('../fetch-rock-data', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchRockData: vi.fn(),
}));
vi.mock('../fetch-rock-v2', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  requestRockV2: vi.fn(),
}));

const CAMPUS_GUID = '1b5c2e3d-4f5a-6b7c-8d9e-0f1a2b3c4d5e';
const LOCATION_GUID = 'location-guid';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('ROCK_V2_ENABLED', 'false');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

/** fetchRockV2 calls its own requestRockV2, so v2-on tests stub fetch itself. */
const stubRockV2Fetch = (fetchMock: ReturnType<typeof vi.fn>) => {
  vi.stubEnv('ROCK_V2_ENABLED', 'true');
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('ROCK_API', 'https://rock.example.com/api/');
  vi.stubGlobal('fetch', fetchMock);
};

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

  // fetchRockV2 turns the throw into a v1 read, so a misconfigured search
  // can't 404 a campus that exists.
  it('throws when a single-campus lookup misses', async () => {
    await expect(
      campusDetailsV2Read({ url: 'jupiter' }).map({ count: 0, items: [] }),
    ).rejects.toThrow(/No campus matched/);
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
  it('falls back to v1 when the v2 search returns a different campus', async () => {
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
    vi.mocked(fetchRockData).mockResolvedValue({ id: 7 });

    await expect(fetchCampuses({ guid: CAMPUS_GUID }, ['Id'])).resolves.toEqual(
      [{ id: 7 }],
    );
    expect(fetchRockData).toHaveBeenCalled();
    const body = JSON.parse(
      String(vi.mocked(global.fetch).mock.calls[0][1]?.body),
    );
    expect(body.select).toBe('new (Id, Guid)');
  });

  it('returns an array even when v1 unwraps a single match', async () => {
    vi.mocked(fetchRockData).mockResolvedValue({ id: 7 });

    await expect(fetchCampuses({ guid: CAMPUS_GUID }, ['Id'])).resolves.toEqual(
      [{ id: 7 }],
    );
  });

  it('sends v1 the same filter, select and order the loaders used', async () => {
    vi.mocked(fetchRockData).mockResolvedValue([]);

    await fetchCampuses({ active: true }, ['Name', 'Guid']);

    expect(fetchRockData).toHaveBeenCalledWith({
      endpoint: 'Campuses',
      queryParams: {
        $filter: 'IsActive eq true',
        $select: 'Name, Guid',
        $orderby: 'Order',
      },
      ttl: undefined,
    });
  });

  // Form input reaches the Guid filter, so a malformed value never goes to Rock.
  it('skips Rock for a malformed Guid', async () => {
    await expect(
      fetchCampuses({ guid: "x' or 1 eq 1" }, ['Id']),
    ).resolves.toEqual([]);
    expect(fetchRockData).not.toHaveBeenCalled();
  });

  // Order is selected only so Rock can sort; callers get the fields they asked for, as on v1.
  it('maps v2 search items to the v1 shape when v2 is on', async () => {
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
    const [url, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(url).toBe(
      'https://rock.example.com/api/v2/models/campuses/search/campuses',
    );
    // Rock sorts after the select, so sorting on a field it didn't select is a 500.
    expect(JSON.parse(String(init?.body))).toEqual({
      where: 'IsActive == true',
      select: 'new (Name, Guid, Order)',
      sort: 'Order',
    });
    expect(fetchRockData).not.toHaveBeenCalled();
  });

  // Rock v2 returns camelCase keys; a matching row must not trip the
  // wrong-record guard and send every lookup to v1.
  it('uses the v2 row for a Guid lookup when Rock returns camelCase keys', async () => {
    stubRockV2Fetch(
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ count: 1, items: [{ id: 7, guid: CAMPUS_GUID }] }),
      }),
    );

    await expect(fetchCampuses({ guid: CAMPUS_GUID }, ['Id'])).resolves.toEqual(
      [{ id: 7 }],
    );
    expect(fetchRockData).not.toHaveBeenCalled();
  });
});

describe('fetchCampusesWithDetails', () => {
  it('falls back to v1 when a v2 call fails', async () => {
    stubRockV2Fetch(
      vi
        .fn()
        .mockResolvedValue({ ok: false, status: 401, text: async () => '' }),
    );
    vi.mocked(fetchRockData).mockResolvedValue({ id: 7, name: 'Jupiter' });

    await expect(fetchCampusesWithDetails({ url: 'jupiter' })).resolves.toEqual(
      [{ id: 7, name: 'Jupiter' }],
    );
    expect(fetchRockData).toHaveBeenCalledWith(
      expect.objectContaining({
        queryParams: {
          $filter: "Url eq 'jupiter'",
          $expand: 'Location',
          loadAttributes: 'simple',
        },
      }),
    );
  });
});
