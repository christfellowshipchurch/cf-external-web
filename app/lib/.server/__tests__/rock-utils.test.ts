import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  attributeIsImage,
  getImages,
  getAttributeMatrixItems,
} from '../rock-utils';

vi.mock('../redis-config', () => ({ default: null }));

vi.mock('~/lib/utils', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  createImageUrlFromGuid: (guid: string) => `https://cdn.example.com/${guid}`,
}));

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
  const MATRIX_GUID = '1b5c2e3d-4f5a-6b7c-8d9e-0f1a2b3c4d5e';
  const jsonResponse = (data: unknown) => ({
    ok: true,
    json: async () => data,
    text: async () => JSON.stringify(data),
  });
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('ROCK_API', 'https://rock.example.com/api/');
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    errorSpy.mockRestore();
  });

  const matrixRow = (matrixGuid: string) => ({
    id: 5,
    guid: 'item-guid',
    Order: 0,
    matrixGuid: matrixGuid,
    attributeValues: [{ key: 'Header', value: 'Q?', textValue: 'Q?' }],
  });

  it('reads the items and their values in one attributematricesitem search', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        count: 1,
        items: [matrixRow(MATRIX_GUID.toUpperCase())],
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const items = await getAttributeMatrixItems({
      attributeMatrixGuid: MATRIX_GUID,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://rock.example.com/api/v2/models/attributematricesitem/search/attributematricesitem',
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.where).toBe(`AttributeMatrix.Guid == "${MATRIX_GUID}"`);
    expect(body.select).toContain('AttributeMatrixItemAttributeValues.Select(');
    // Rock sorts the whole matrix in one request, so page order is matrix order.
    expect(body.sort).toBe('Order, Id');
    expect(items).toEqual([
      {
        id: 5,
        guid: 'item-guid',
        order: 0,
        attributeValues: { header: { value: 'Q?', valueFormatted: 'Q?' } },
      },
    ]);
  });

  it('returns [] when the matrix has no items', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(jsonResponse({ count: 0, items: [] })),
    );

    await expect(
      getAttributeMatrixItems({ attributeMatrixGuid: MATRIX_GUID }),
    ).resolves.toEqual([]);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  // Showing another matrix's rows would put the wrong content on a page.
  it('returns [] and logs when the search returns items of another matrix', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        jsonResponse({
          count: 1,
          items: [matrixRow('99999999-9999-4999-8999-999999999999')],
        }),
      ),
    );

    await expect(
      getAttributeMatrixItems({ attributeMatrixGuid: MATRIX_GUID }),
    ).resolves.toEqual([]);
    expect(String(errorSpy.mock.calls[0][1])).toMatch(/another matrix/);
  });

  // Matrices are page decoration: a Rock failure renders empty, not a 500.
  it.each([
    [
      'a non-ok response',
      () =>
        vi.fn().mockResolvedValueOnce({
          ok: false,
          status: 403,
          text: async () => 'Forbidden',
        }),
    ],
    [
      'a network error',
      () => vi.fn().mockRejectedValueOnce(new Error('network error')),
    ],
  ])('returns [] and logs on %s', async (_label, makeFetch) => {
    vi.stubGlobal('fetch', makeFetch());

    await expect(
      getAttributeMatrixItems({ attributeMatrixGuid: MATRIX_GUID }),
    ).resolves.toEqual([]);
    expect(errorSpy).toHaveBeenCalledOnce();
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
    warnSpy.mockRestore();
  });
});
