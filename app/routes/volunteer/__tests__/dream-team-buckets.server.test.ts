import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('~/lib/.server/fetch-rock-data', () => ({
  TTL: { DEFAULT: 3600, SHORT: 600, LONG: 86400, NONE: 0 },
}));

vi.mock('~/lib/.server/rock-defined-values', () => ({
  fetchDefinedValues: vi.fn(),
}));

vi.mock('~/lib/utils', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  createImageUrlFromGuid: (guid: string) =>
    `https://cdn.example.com/GetImage.ashx?guid=${guid}`,
}));

import { fetchDefinedValues } from '~/lib/.server/rock-defined-values';
import { fetchDreamTeamBuckets } from '../dream-team-buckets.server';

const mockFetch = fetchDefinedValues as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fetchDreamTeamBuckets', () => {
  it('maps a full Rock DefinedValue to a VolunteerAtChurchResource', async () => {
    mockFetch.mockResolvedValueOnce([
      {
        guid: 'aaaa-1111-2222-3333-bbbbbbbbbbbb',
        value: 'Welcome & Experience',
        description: 'fallback desc',
        attributeValues: {
          publicDescription: { value: 'Primary description' },
          label: { value: 'Front-Facing' },
          image: { value: 'cccc-dddd-eeee-ffff-000000000000' },
        },
      },
    ]);

    const result = await fetchDreamTeamBuckets();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: 'Welcome & Experience',
      description: 'Primary description',
      tag: 'Front-Facing',
      image:
        'https://cdn.example.com/GetImage.ashx?guid=cccc-dddd-eeee-ffff-000000000000',
      pathname: '/volunteer/church/aaaa-1111-2222-3333-bbbbbbbbbbbb',
    });
  });

  it('falls back to description field when publicDescription is absent', async () => {
    mockFetch.mockResolvedValueOnce([
      {
        guid: 'aaaa-1111-2222-3333-bbbbbbbbbbbb',
        value: 'Care & Prayer',
        description: 'fallback description text',
        attributeValues: {
          label: { value: 'Listen & Support' },
          image: { value: 'img-guid-1111-2222-333333333333' },
        },
      },
    ]);

    const [item] = await fetchDreamTeamBuckets();

    expect(item.description).toBe('fallback description text');
  });

  it('generates pathname as /volunteer/church/{guid}', async () => {
    mockFetch.mockResolvedValueOnce([
      {
        guid: '12345678-abcd-efef-1234-abcdef012345',
        value: 'Operations',
        attributeValues: {
          publicDescription: { value: 'Some description' },
          label: { value: 'A Tag' },
          image: { value: 'img-guid-1111-2222-333333333333' },
        },
      },
    ]);

    const [item] = await fetchDreamTeamBuckets();

    expect(item.pathname).toBe(
      '/volunteer/church/12345678-abcd-efef-1234-abcdef012345',
    );
  });

  it('asks Rock for active Dream Team buckets in Order, with attributes', async () => {
    mockFetch.mockResolvedValueOnce([]);

    await fetchDreamTeamBuckets();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        definedTypeId: 616,
        activeOnly: true,
        orderBy: 'Order',
        attributes: 'simple',
      }),
    );
  });

  it('skips items with no guid', async () => {
    mockFetch.mockResolvedValueOnce([
      { value: 'No GUID item', attributeValues: {} },
      {
        guid: 'valid-guid-1111-2222-333333333333',
        value: 'Valid item',
        attributeValues: {
          publicDescription: { value: 'A description' },
          label: { value: 'A Tag' },
          image: { value: 'img-guid-1111-2222-333333333333' },
        },
      },
    ]);

    const result = await fetchDreamTeamBuckets();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Valid item');
  });

  it('returns empty array when Rock returns no values', async () => {
    mockFetch.mockResolvedValueOnce([]);

    const result = await fetchDreamTeamBuckets();

    expect(result).toEqual([]);
  });

  it('returns empty array when Rock throws', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      mockFetch.mockRejectedValueOnce(new Error('network error'));

      const result = await fetchDreamTeamBuckets();

      expect(result).toEqual([]);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('maps multiple items preserving order from Rock', async () => {
    const fullAttrs = {
      publicDescription: { value: 'A description' },
      label: { value: 'A Tag' },
      image: { value: 'img-guid-1111-2222-333333333333' },
    };
    mockFetch.mockResolvedValueOnce([
      {
        guid: 'aaaa-0000-0000-0000-000000000001',
        value: 'First',
        attributeValues: fullAttrs,
      },
      {
        guid: 'aaaa-0000-0000-0000-000000000002',
        value: 'Second',
        attributeValues: fullAttrs,
      },
      {
        guid: 'aaaa-0000-0000-0000-000000000003',
        value: 'Third',
        attributeValues: fullAttrs,
      },
    ]);

    const result = await fetchDreamTeamBuckets();

    expect(result.map((r) => r.name)).toEqual(['First', 'Second', 'Third']);
  });

  it('filters out items missing image', async () => {
    mockFetch.mockResolvedValueOnce([
      {
        guid: 'aaaa-0000-0000-0000-000000000001',
        value: 'No Image Bucket',
        attributeValues: {
          publicDescription: { value: 'A description' },
          label: { value: 'A Tag' },
        },
      },
    ]);

    const result = await fetchDreamTeamBuckets();

    expect(result).toHaveLength(0);
  });

  it('filters out items missing tag', async () => {
    mockFetch.mockResolvedValueOnce([
      {
        guid: 'aaaa-0000-0000-0000-000000000001',
        value: 'No Tag Bucket',
        attributeValues: {
          publicDescription: { value: 'A description' },
          image: { value: 'img-guid-1111-2222-333333333333' },
        },
      },
    ]);

    const result = await fetchDreamTeamBuckets();

    expect(result).toHaveLength(0);
  });

  it('filters out items missing description', async () => {
    mockFetch.mockResolvedValueOnce([
      {
        guid: 'aaaa-0000-0000-0000-000000000001',
        value: 'No Description Bucket',
        attributeValues: {
          label: { value: 'A Tag' },
          image: { value: 'img-guid-1111-2222-333333333333' },
        },
      },
    ]);

    const result = await fetchDreamTeamBuckets();

    expect(result).toHaveLength(0);
  });

  it('filters incomplete items while keeping complete ones', async () => {
    mockFetch.mockResolvedValueOnce([
      {
        guid: 'aaaa-0000-0000-0000-000000000001',
        value: 'Incomplete — no image',
        attributeValues: {
          publicDescription: { value: 'A description' },
          label: { value: 'A Tag' },
        },
      },
      {
        guid: 'aaaa-0000-0000-0000-000000000002',
        value: 'Complete Bucket',
        attributeValues: {
          publicDescription: { value: 'Full description' },
          label: { value: 'Full Tag' },
          image: { value: 'img-guid-1111-2222-333333333333' },
        },
      },
    ]);

    const result = await fetchDreamTeamBuckets();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Complete Bucket');
  });
});
