import type { LoaderFunctionArgs } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchCampuses } from '~/lib/.server/rock-campuses';
import { loader } from './loader';

vi.mock('~/lib/.server/rock-campuses', () => ({
  fetchCampuses: vi.fn(),
}));

const mockFetchCampuses = vi.mocked(fetchCampuses);

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
    mockFetchCampuses.mockResolvedValue(campuses);

    const result = await loader({} as LoaderFunctionArgs);

    expect(mockFetchCampuses).toHaveBeenCalledWith({ active: true }, [
      'Id',
      'Name',
      'Guid',
    ]);
    expect(result).toEqual({ campuses });
  });
});
