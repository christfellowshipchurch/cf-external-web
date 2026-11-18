import type { LoaderFunctionArgs } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { postRockData } from '~/lib/.server/fetch-rock-data';
import { fetchCampuses } from '~/lib/.server/rock-campuses';
import { fetchPhoneNumbers } from '~/lib/.server/rock-people-groups';
import { loader } from '../api.connect-card-prefill';

vi.mock('~/lib/.server/fetch-rock-data', () => ({
  postRockData: vi.fn(),
  TTL: { NONE: 0 },
}));

vi.mock('~/lib/.server/rock-people-groups', () => ({
  fetchPhoneNumbers: vi.fn(),
}));

vi.mock('~/lib/.server/rock-campuses', () => ({
  fetchCampuses: vi.fn(),
}));

const mockFetchPhoneNumbers = vi.mocked(fetchPhoneNumbers);
const mockFetchCampuses = vi.mocked(fetchCampuses);
const mockPostRockData = vi.mocked(postRockData);

const createArgs = (search = '') =>
  ({
    request: new Request(`http://localhost/api/connect-card-prefill${search}`),
    params: {},
    context: {},
  }) as LoaderFunctionArgs;

const readData = (response: unknown) => (response as { data: unknown }).data;

const readStatus = (response: unknown) =>
  (response as { init?: { status?: number } }).init?.status;

describe('connect card prefill API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns invalid-id for missing or malformed token values', async () => {
    const missing = await loader(createArgs());
    const invalid = await loader(createArgs('?rckpid=%7B%7Bbad%7D%7D'));

    expect(readData(missing)).toEqual({ status: 'invalid-id' });
    expect(readData(invalid)).toEqual({ status: 'invalid-id' });
    expect(mockFetchPhoneNumbers).not.toHaveBeenCalled();
    expect(mockFetchCampuses).not.toHaveBeenCalled();
    expect(mockPostRockData).not.toHaveBeenCalled();
  });

  it('returns not-found when Lava does not return a person', async () => {
    mockPostRockData.mockResolvedValueOnce(null);

    const response = await loader(createArgs('?rckpid=token-123'));

    expect(readData(response)).toEqual({ status: 'not-found' });
    expect(mockPostRockData).toHaveBeenCalledWith({
      endpoint: '/Lava/RenderTemplate',
      body: '{% assign person = "token-123" | PersonTokenRead %}{{ person | ToJSON }}',
      contentType: 'text/plain',
    });
    expect(mockFetchPhoneNumbers).not.toHaveBeenCalled();
    expect(mockFetchCampuses).not.toHaveBeenCalled();
  });

  it('parses a JSON string returned by Lava RenderTemplate', async () => {
    mockPostRockData.mockResolvedValueOnce(
      JSON.stringify({
        id: 123,
        firstName: 'Jane',
        primaryCampusId: 10,
      }),
    );
    mockFetchPhoneNumbers.mockResolvedValueOnce({
      numberFormatted: '555-123-4567',
    });
    mockFetchCampuses.mockResolvedValueOnce([{ id: 10, guid: 'campus-guid' }]);

    const response = await loader(createArgs('?rckpid=token-123'));

    expect(readData(response)).toEqual({
      status: 'success',
      prefill: {
        firstName: 'Jane',
        phone: '555-123-4567',
        campus: 'campus-guid',
      },
    });
  });

  it('accepts the mobile app rckpid alias', async () => {
    mockPostRockData.mockResolvedValueOnce({
      id: 123,
      firstName: 'Jane',
      primaryCampusId: 10,
    });
    mockFetchPhoneNumbers.mockResolvedValueOnce({
      numberFormatted: '555-123-4567',
    });
    mockFetchCampuses.mockResolvedValueOnce([{ id: 10, guid: 'campus-guid' }]);

    const response = await loader(createArgs('?rckpid=token-123'));

    expect(readData(response)).toEqual({
      status: 'success',
      prefill: {
        firstName: 'Jane',
        phone: '555-123-4567',
        campus: 'campus-guid',
      },
    });
    expect(mockPostRockData).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        endpoint: '/Lava/RenderTemplate',
      }),
    );
  });

  it('maps Rock person, phone, and campus data to a minimal prefill response', async () => {
    mockPostRockData.mockResolvedValueOnce({
      id: 123,
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      primaryCampusId: 10,
      recordStatusValueId: 3,
    });
    mockFetchPhoneNumbers.mockResolvedValueOnce([
      {
        number: '5551234567',
        numberFormatted: '555-123-4567',
        extension: '999',
      },
    ]);
    mockFetchCampuses.mockResolvedValueOnce([
      {
        id: 10,
        name: 'Palm Beach Gardens',
        guid: 'campus-guid',
        extra: 'not returned',
      },
    ]);

    const response = await loader(createArgs('?rckipid=token-123'));

    expect(readData(response)).toEqual({
      status: 'success',
      prefill: {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        phone: '555-123-4567',
        campus: 'campus-guid',
      },
    });
    expect(mockFetchPhoneNumbers).toHaveBeenCalledWith({
      endpoint: 'PhoneNumbers',
      queryParams: {
        $filter: 'PersonId eq 123',
        $select: 'Number,NumberFormatted',
      },
      ttl: 0,
    });
    expect(mockFetchCampuses).toHaveBeenCalledWith(
      { active: true },
      ['Id', 'Name', 'Guid'],
      0,
    );
  });

  it('uses a person campus guid when Rock returns one directly', async () => {
    mockPostRockData.mockResolvedValueOnce({
      id: 123,
      firstName: 'Jane',
      primaryCampus: { guid: 'direct-campus-guid' },
    });
    mockFetchPhoneNumbers.mockResolvedValueOnce([]);
    mockFetchCampuses.mockResolvedValueOnce([]);

    const response = await loader(createArgs('?rckipid=token-123'));

    expect(readData(response)).toEqual({
      status: 'success',
      prefill: {
        firstName: 'Jane',
        campus: 'direct-campus-guid',
      },
    });
  });

  it('returns error when a Rock request fails', async () => {
    mockPostRockData.mockRejectedValueOnce(new Error('Rock unavailable'));

    const response = await loader(createArgs('?rckipid=token-123'));

    expect(readStatus(response)).toBe(500);
    expect(readData(response)).toEqual({
      status: 'error',
      message: 'Unable to load prefill data',
    });
  });
});
