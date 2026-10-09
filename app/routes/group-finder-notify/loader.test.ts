import type { LoaderFunctionArgs } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchRockData } from '~/lib/.server/fetch-rock-data';
import { loader } from './loader';

vi.mock('~/lib/.server/fetch-rock-data', () => ({
  fetchRockData: vi.fn(),
}));

const mockFetchRockData = vi.mocked(fetchRockData);

describe('group finder notify loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns active campuses for the notify form', async () => {
    const campuses = [
      {
        id: 10,
        guid: 'campus-guid-10',
        name: 'Palm Beach Gardens',
      },
    ];
    mockFetchRockData.mockResolvedValue(campuses);

    const result = await loader({} as LoaderFunctionArgs);

    expect(mockFetchRockData).toHaveBeenCalledWith({
      endpoint: 'Campuses',
      queryParams: {
        $filter: 'IsActive eq true',
        $orderby: 'Order',
        $select: 'Id, Name, Guid',
      },
    });
    expect(result).toEqual({ campuses });
  });
});
