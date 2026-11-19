import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('~/lib/.server/fetch-rock-data', () => ({
  TTL: { DEFAULT: 3600, SHORT: 600, LONG: 86400, NONE: 0 },
}));

vi.mock('~/lib/.server/rock-v2-search', () => ({
  fetchViaV2Search: vi.fn(),
}));

import { fetchViaV2Search } from '~/lib/.server/rock-v2-search';
import { fetchChurchRolesByPreferenceAreaGuid } from '../church-roles.server';

const mockFetch = fetchViaV2Search as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

const BUCKET_GUID = 'aaaa-1111-2222-3333-bbbbbbbbbbbb';

describe('fetchChurchRolesByPreferenceAreaGuid', () => {
  it('calls Rock with the correct endpoint and query params', async () => {
    mockFetch.mockResolvedValueOnce([]);

    await fetchChurchRolesByPreferenceAreaGuid(BUCKET_GUID);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'ConnectionOpportunities/GetByAttributeValue',
        queryParams: expect.objectContaining({
          $orderby: 'Order',
          attributeKey: 'preferenceArea',
          value: BUCKET_GUID,
        }),
      }),
      expect.objectContaining({ model: 'connectionopportunities' }),
    );
  });

  it('maps Rock description HTML to description', async () => {
    mockFetch.mockResolvedValueOnce([
      {
        guid: 'role-guid-1111-2222-3333-444444444444',
        name: 'First Impressions',
        description: '<p>Extended <strong>info</strong> about the role.</p>',
      },
    ]);

    const [role] = await fetchChurchRolesByPreferenceAreaGuid(BUCKET_GUID);

    expect(role.description).toBe(
      '<p>Extended <strong>info</strong> about the role.</p>',
    );
  });

  it('maps a list of opportunities to ChurchRole[]', async () => {
    mockFetch.mockResolvedValueOnce([
      {
        guid: 'role-guid-1111-2222-3333-444444444444',
        name: 'First Impressions',
        description: '<p>Extended info about the role.</p>',
      },
      {
        guid: 'role-guid-2222-3333-4444-555555555555',
        name: 'Usher',
        description: '<p>More details on ushering.</p>',
      },
    ]);

    const result = await fetchChurchRolesByPreferenceAreaGuid(BUCKET_GUID);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 'role-guid-1111-2222-3333-444444444444',
      title: 'First Impressions',
      description: '<p>Extended info about the role.</p>',
    });
    expect(result[1]).toEqual({
      id: 'role-guid-2222-3333-4444-555555555555',
      title: 'Usher',
      description: '<p>More details on ushering.</p>',
    });
  });

  it('sets description to empty string when description field is absent', async () => {
    mockFetch.mockResolvedValueOnce([
      {
        guid: 'role-guid-1111-2222-3333-444444444444',
        name: 'Host Team',
      },
    ]);

    const [role] = await fetchChurchRolesByPreferenceAreaGuid(BUCKET_GUID);

    expect(role.description).toBe('');
  });

  it('sets description to empty string when description field is blank whitespace', async () => {
    mockFetch.mockResolvedValueOnce([
      {
        guid: 'role-guid-1111-2222-3333-444444444444',
        name: 'Host Team',
        description: '   ',
      },
    ]);

    const [role] = await fetchChurchRolesByPreferenceAreaGuid(BUCKET_GUID);

    expect(role.description).toBe('');
  });

  it('handles a single Rock object (not an array)', async () => {
    mockFetch.mockResolvedValueOnce({
      guid: 'role-guid-solo-2222-3333-444444444444',
      name: 'Parking Team',
      description: '<p>Details about parking.</p>',
    });

    const result = await fetchChurchRolesByPreferenceAreaGuid(BUCKET_GUID);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Parking Team');
  });

  it('skips items missing a guid', async () => {
    mockFetch.mockResolvedValueOnce([
      { name: 'No GUID role', description: '<p>Some description.</p>' },
      {
        guid: 'role-guid-valid-2222-3333-444444444444',
        name: 'Valid Role',
        description: '<p>Valid description.</p>',
      },
    ]);

    const result = await fetchChurchRolesByPreferenceAreaGuid(BUCKET_GUID);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Valid Role');
  });

  it('skips items missing a name', async () => {
    mockFetch.mockResolvedValueOnce([
      {
        guid: 'role-guid-1111-2222-3333-444444444444',
        description: '<p>No name.</p>',
      },
    ]);

    const result = await fetchChurchRolesByPreferenceAreaGuid(BUCKET_GUID);

    expect(result).toHaveLength(0);
  });

  it('returns empty array when Rock returns null', async () => {
    mockFetch.mockResolvedValueOnce(null);

    const result = await fetchChurchRolesByPreferenceAreaGuid(BUCKET_GUID);

    expect(result).toEqual([]);
  });

  it('returns empty array when Rock returns an empty array', async () => {
    mockFetch.mockResolvedValueOnce([]);

    const result = await fetchChurchRolesByPreferenceAreaGuid(BUCKET_GUID);

    expect(result).toEqual([]);
  });

  it('returns empty array when Rock throws', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      mockFetch.mockRejectedValueOnce(new Error('network error'));

      const result = await fetchChurchRolesByPreferenceAreaGuid(BUCKET_GUID);

      expect(result).toEqual([]);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('preserves Rock ordering', async () => {
    const makeItem = (n: number) => ({
      guid: `role-guid-${n}000-0000-0000-000000000000`,
      name: `Role ${n}`,
      description: `<p>Description ${n}.</p>`,
    });

    mockFetch.mockResolvedValueOnce([makeItem(1), makeItem(2), makeItem(3)]);

    const result = await fetchChurchRolesByPreferenceAreaGuid(BUCKET_GUID);

    expect(result.map((r) => r.title)).toEqual(['Role 1', 'Role 2', 'Role 3']);
  });
});
