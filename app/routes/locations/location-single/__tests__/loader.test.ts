import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchCampusWithDetails } from '~/lib/.server/rock-campuses';
import { mapRockCampusToLocationViewModel } from '../location-mapper.server';
import { loader } from '../loader';

vi.mock('~/lib/.server/rock-campuses', () => ({
  fetchCampusWithDetails: vi.fn(),
}));
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
    vi.mocked(fetchCampusWithDetails).mockResolvedValue(campus as never);
    vi.mocked(mapRockCampusToLocationViewModel).mockResolvedValue({
      campusName: campus.name,
      campusUrl: campus.url,
    } as never);
  });

  it('loads Spanish campus detail from Rock by its url', async () => {
    const result = (await load(campus.url)) as Record<string, unknown>;

    expect(fetchCampusWithDetails).toHaveBeenCalledTimes(1);
    expect(fetchCampusWithDetails).toHaveBeenCalledWith({ url: campus.url });
    expect(mapRockCampusToLocationViewModel).toHaveBeenCalledWith(campus);
    expect(result.location).toEqual({
      campusName: campus.name,
      campusUrl: campus.url,
    });
    expect(result).not.toHaveProperty('ALGOLIA_APP_ID');
    expect(result).not.toHaveProperty('ALGOLIA_SEARCH_API_KEY');
  });

  it('decides the Christmas banner on the server, off from Christmas Eve 9PM Eastern', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-12-24T20:59:00-05:00'));
      expect(await load(campus.url)).toMatchObject({
        christmasServicesUrl:
          'https://www.christmasatcf.com/espanol?view=service&campus=espanol-palm-beach-gardens',
      });

      vi.setSystemTime(new Date('2026-12-24T21:00:00-05:00'));
      expect(await load(campus.url)).toMatchObject({
        christmasServicesUrl: null,
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns 404 for unsupported campus slugs before querying Rock', async () => {
    await expect(load('not-a-campus')).rejects.toMatchObject({ status: 404 });
    expect(fetchCampusWithDetails).not.toHaveBeenCalled();
  });

  it('returns 404 when supported campus is missing from Rock', async () => {
    vi.mocked(fetchCampusWithDetails).mockResolvedValue(null);

    await expect(load('cf-everywhere')).rejects.toMatchObject({ status: 404 });
    expect(mapRockCampusToLocationViewModel).not.toHaveBeenCalled();
  });
});
