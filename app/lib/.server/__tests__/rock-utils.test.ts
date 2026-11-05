import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  attributeIsImage,
  getImages,
  getAttributeMatrixItems,
} from '../rock-utils';

vi.mock('../redis-config', () => ({ default: null }));
vi.mock('../fetch-rock-data', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchRockData: vi.fn(),
}));

vi.mock('~/lib/utils', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  createImageUrlFromGuid: (guid: string) => `https://cdn.example.com/${guid}`,
}));

import { fetchRockData } from '../fetch-rock-data';

const mockFetch = fetchRockData as ReturnType<typeof vi.fn>;

describe('attributeIsImage', () => {
  const attributeValues = {
    coverImage: { value: 'some-guid', valueFormatted: 'some-guid' },
    title: { value: 'Some Title', valueFormatted: 'Some Title' },
    backgroundImageUrl: {
      value: 'another-guid',
      valueFormatted: 'another-guid',
    },
    count: { value: 5 as unknown as string, valueFormatted: '5' },
  };

  it("returns true when key contains 'image' and value is a string", () => {
    expect(attributeIsImage({ key: 'coverImage', attributeValues })).toBe(true);
  });

  it("returns true for keys like 'backgroundImageUrl'", () => {
    expect(
      attributeIsImage({ key: 'backgroundImageUrl', attributeValues }),
    ).toBe(true);
  });

  it("returns false when key does not contain 'image'", () => {
    expect(attributeIsImage({ key: 'title', attributeValues })).toBe(false);
  });

  it('returns false when value is not a string', () => {
    expect(attributeIsImage({ key: 'count', attributeValues })).toBe(false);
  });

  it('is case-insensitive on the key', () => {
    const av = { Image: { value: 'guid-x', valueFormatted: 'guid-x' } };
    expect(attributeIsImage({ key: 'Image', attributeValues: av })).toBe(true);
  });
});

describe('getImages', () => {
  it('returns transformed image URLs for image keys', () => {
    const attributes = {
      coverImage: { key: 'coverImage', name: 'Cover Image', fieldTypeId: 1 },
      title: { key: 'title', name: 'Title', fieldTypeId: 2 },
    };
    const attributeValues = {
      coverImage: { value: 'guid-123', valueFormatted: 'guid-123' },
      title: { value: 'Hello', valueFormatted: 'Hello' },
    };
    const result = getImages({
      attributeValues,
      attributes,
    });
    expect(result).toEqual(['https://cdn.example.com/guid-123']);
  });

  it('returns empty array when no image keys exist', () => {
    const attributes = {
      title: { key: 'title', name: 'Title', fieldTypeId: 1 },
      count: { key: 'count', name: 'Count', fieldTypeId: 2 },
    };
    const attributeValues = {
      title: { value: 'Hello', valueFormatted: 'Hello' },
      count: { value: '5', valueFormatted: '5' },
    };
    const result = getImages({
      attributeValues,
      attributes,
    });
    expect(result).toEqual([]);
  });
});

describe('getAttributeMatrixItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns [] when attributeMatrix is null/undefined', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      mockFetch.mockResolvedValueOnce(null);
      const result = await getAttributeMatrixItems({
        attributeMatrixGuid: '00000000-0000-4000-8000-000000000000',
      });
      expect(result).toEqual([]);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('returns [] when matrixItems is empty', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      mockFetch.mockResolvedValueOnce({ attributeMatrixItems: [] });
      const result = await getAttributeMatrixItems({
        attributeMatrixGuid: '00000000-0000-4000-8000-000000000000',
      });
      expect(result).toEqual([]);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('returns expanded items as array when fetchRockData returns array', async () => {
    const matrixItems = [{ id: 1 }, { id: 2 }];
    const expandedItems = [
      { id: 1, attributeValues: {} },
      { id: 2, attributeValues: {} },
    ];
    mockFetch
      .mockResolvedValueOnce({ attributeMatrixItems: matrixItems })
      .mockResolvedValueOnce(expandedItems);

    const result = await getAttributeMatrixItems({
      attributeMatrixGuid: '00000000-0000-4000-8000-000000000001',
    });
    expect(result).toEqual(expandedItems);
  });

  it('requests expanded items ordered by Rock Order field', async () => {
    mockFetch
      .mockResolvedValueOnce({ attributeMatrixItems: [{ id: 1 }] })
      .mockResolvedValueOnce([{ id: 1, attributeValues: {} }]);

    await getAttributeMatrixItems({
      attributeMatrixGuid: '00000000-0000-4000-8000-000000000007',
    });

    expect(mockFetch).toHaveBeenNthCalledWith(2, {
      endpoint: 'AttributeMatrixItems',
      queryParams: {
        $filter: '(Id eq 1)',
        $orderby: 'Order',
        loadAttributes: 'simple',
      },
    });
  });

  it('wraps a single expanded item in an array', async () => {
    const singleItem = { id: 1, attributeValues: {} };
    mockFetch
      .mockResolvedValueOnce({ attributeMatrixItems: [{ id: 1 }] })
      .mockResolvedValueOnce(singleItem);

    const result = await getAttributeMatrixItems({
      attributeMatrixGuid: '00000000-0000-4000-8000-000000000002',
    });
    expect(result).toEqual([singleItem]);
  });

  it('returns [] when expanded items is null', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      mockFetch
        .mockResolvedValueOnce({ attributeMatrixItems: [{ id: 1 }] })
        .mockResolvedValueOnce(null);

      const result = await getAttributeMatrixItems({
        attributeMatrixGuid: '00000000-0000-4000-8000-000000000003',
      });
      expect(result).toEqual([]);
    } finally {
      warnSpy.mockRestore();
    }
  });

  // Rock's OData parser caps a query at 100 nodes and each `(Id eq N)` clause
  // costs 5, so a single filter holding more than 20 ids 400s and the caller
  // silently renders no curriculum (studies like marriage-matters have 24).
  it('splits ids across requests so the OData node limit is never exceeded', async () => {
    const matrixItems = Array.from({ length: 24 }, (_, i) => ({ id: i + 1 }));
    mockFetch
      .mockResolvedValueOnce({ attributeMatrixItems: matrixItems })
      .mockResolvedValueOnce(
        matrixItems.slice(0, 20).map((m, i) => ({ ...m, order: i })),
      )
      .mockResolvedValueOnce(
        matrixItems.slice(20).map((m, i) => ({ ...m, order: i + 20 })),
      );

    const result = await getAttributeMatrixItems({
      attributeMatrixGuid: '00000000-0000-4000-8000-000000000006',
    });

    const idFilters = mockFetch.mock.calls
      .slice(1)
      .map((call) => call[0].queryParams.$filter as string);
    expect(idFilters).toHaveLength(2);
    for (const filter of idFilters) {
      expect(filter.split(' or ')).toHaveLength(
        filter === idFilters[0] ? 20 : 4,
      );
    }
    expect(result.map((item) => item.id)).toEqual(matrixItems.map((m) => m.id));
  });

  it('restores matrix-wide order when batches come back interleaved', async () => {
    const matrixItems = Array.from({ length: 21 }, (_, i) => ({ id: i + 1 }));
    // Rock sorts within each request only, so the trailing batch can hold an
    // item that belongs at the front of the overall matrix.
    mockFetch
      .mockResolvedValueOnce({ attributeMatrixItems: matrixItems })
      .mockResolvedValueOnce(
        matrixItems.slice(0, 20).map((m, i) => ({ ...m, order: i + 1 })),
      )
      .mockResolvedValueOnce([{ id: 21, order: 0 }]);

    const result = await getAttributeMatrixItems({
      attributeMatrixGuid: '00000000-0000-4000-8000-000000000005',
    });

    expect(result.map((item) => item.id)).toEqual([
      21,
      ...matrixItems.slice(0, 20).map((m) => m.id),
    ]);
  });

  it('returns [] when fetchRockData throws', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      mockFetch.mockRejectedValueOnce(new Error('network error'));
      const result = await getAttributeMatrixItems({
        attributeMatrixGuid: '00000000-0000-4000-8000-000000000004',
      });
      expect(result).toEqual([]);
    } finally {
      errorSpy.mockRestore();
    }
  });
});

describe('getAttributeMatrixItems on Rock v2', () => {
  const MATRIX_GUID = '1b5c2e3d-4f5a-6b7c-8d9e-0f1a2b3c4d5e';
  const jsonResponse = (data: unknown) => ({
    ok: true,
    json: async () => data,
    text: async () => JSON.stringify(data),
  });

  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubEnv('ROCK_V2_ENABLED', 'true');
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('ROCK_API', 'https://rock.example.com/api/');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("searches items by matrix Guid in Order, then reads each one's values", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          count: 1,
          items: [{ Id: 5, Guid: 'item-guid', Order: 0 }],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ Header: { value: 'Q?', textValue: 'Q?' } }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const items = await getAttributeMatrixItems({
      attributeMatrixGuid: MATRIX_GUID,
    });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      where: `AttributeMatrix.Guid == "${MATRIX_GUID}"`,
      select: 'new (Id, Guid, Order)',
      sort: 'Order',
    });
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://rock.example.com/api/v2/models/attributematrixitems/item-guid/attributevalues',
    );
    expect(items).toEqual([
      {
        id: 5,
        guid: 'item-guid',
        order: 0,
        attributeValues: { header: { value: 'Q?', valueFormatted: 'Q?' } },
      },
    ]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // Matrix Guids come from CMS attributes; a malformed one never reaches Rock.
  it('returns [] for a malformed Guid without calling Rock', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(
      getAttributeMatrixItems({ attributeMatrixGuid: "x' or 1 eq 1" }),
    ).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
