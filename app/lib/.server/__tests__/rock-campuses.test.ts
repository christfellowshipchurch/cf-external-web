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
    vi.mocked(requestRockV2).mockImplementation(async ({ path }) =>
      path === `campuses/${CAMPUS_GUID}/attributevalues`
        ? { MapLink: { value: 'https://maps.example', textValue: 'Map' } }
        : { Street1: '5343 Northlake Blvd', Latitude: 26.8, Longitude: -80.1 },
    );
  });

  it('combines the search hit, attribute values and Location into the v1 shape', async () => {
    const [campus] = await campusDetailsV2Read({ url: 'jupiter' }).map({
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

  it('sorts active campuses by Rock Order', () => {
    expect(campusDetailsV2Read({ active: true }).body).toMatchObject({
      where: 'IsActive == true',
      sort: 'Order',
    });
  });
});

describe('fetchCampuses', () => {
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

  it('maps v2 search items to the v1 shape when v2 is on', async () => {
    stubRockV2Fetch(
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          count: 1,
          items: [{ Name: 'Jupiter', Guid: CAMPUS_GUID }],
        }),
      }),
    );

    await expect(
      fetchCampuses({ active: true }, ['Name', 'Guid']),
    ).resolves.toEqual([{ name: 'Jupiter', guid: CAMPUS_GUID }]);
    const [url, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(url).toBe(
      'https://rock.example.com/api/v2/models/campuses/search/cf-web-campuses',
    );
    expect(JSON.parse(String(init?.body))).toEqual({
      where: 'IsActive == true',
      select: 'new (Name, Guid)',
      sort: 'Order',
    });
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
