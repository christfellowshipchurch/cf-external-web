import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchRockData } from '~/lib/.server/fetch-rock-data';
import { mapRockCampusToLocationViewModel } from '../location-mapper.server';
import { loader } from '../loader';

vi.mock('~/lib/.server/fetch-rock-data', () => ({ fetchRockData: vi.fn() }));
vi.mock('../location-mapper.server', () => ({
  mapRockCampusToLocationViewModel: vi.fn(),
}));

const campus = {
  id: 7,
  guid: 'spanish-guid',
  name: 'Christ Fellowship Español Palm Beach Gardens',
  url: 'iglesia-palm-beach-gardens',
  attributeValues: {},
};

async function load(location: string) {
  return loader({
    params: { location },
    request: new Request(`http://localhost/locations/${location}`),
    context: {},
  } as never);
}

describe('location-single loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchRockData).mockResolvedValue(campus);
    vi.mocked(mapRockCampusToLocationViewModel).mockResolvedValue({
      campusName: campus.name,
      campusUrl: campus.url,
    } as never);
  });

  it('loads Spanish campus detail directly from Rock with Location expanded', async () => {
    const result = (await load(campus.url)) as Record<string, unknown>;

    expect(fetchRockData).toHaveBeenCalledTimes(1);
    expect(fetchRockData).toHaveBeenCalledWith({
      endpoint: 'Campuses',
      queryParams: {
        $filter: `Url eq '${campus.url}'`,
        $expand: 'Location',
        loadAttributes: 'simple',
        $top: '1',
      },
    });
    expect(mapRockCampusToLocationViewModel).toHaveBeenCalledWith(campus);
    expect(result.location).toEqual({
      campusName: campus.name,
      campusUrl: campus.url,
    });
    expect(result).not.toHaveProperty('ALGOLIA_APP_ID');
    expect(result).not.toHaveProperty('ALGOLIA_SEARCH_API_KEY');
  });

  it('returns 404 for unsupported campus slugs before querying Rock', async () => {
    await expect(load('not-a-campus')).rejects.toMatchObject({ status: 404 });
    expect(fetchRockData).not.toHaveBeenCalled();
  });

  it('returns 404 when supported campus is missing from Rock', async () => {
    vi.mocked(fetchRockData).mockResolvedValue([]);

    await expect(load('cf-everywhere')).rejects.toMatchObject({ status: 404 });
    expect(mapRockCampusToLocationViewModel).not.toHaveBeenCalled();
  });
});
