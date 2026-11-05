import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchRockData } from '../fetch-rock-data';
import {
  definedValuesV2Read,
  fetchDefinedValueByGuid,
  fetchDefinedValues,
} from '../rock-defined-values';

vi.mock('../redis-config', () => ({ default: null }));
vi.mock('../fetch-rock-data', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchRockData: vi.fn(),
}));

const GUID = '1b5c2e3d-4f5a-6b7c-8d9e-0f1a2b3c4d5e';

const jsonResponse = (data: unknown) => ({
  ok: true,
  json: async () => data,
  text: async () => JSON.stringify(data),
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const stubRockV2Fetch = (fetchMock: ReturnType<typeof vi.fn>) => {
  vi.stubEnv('ROCK_V2_ENABLED', 'true');
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('ROCK_API', 'https://rock.example.com/api/');
  vi.stubGlobal('fetch', fetchMock);
};

describe('definedValuesV2Read', () => {
  it('reads a lone Guid with a plain GET, no Entity Search', () => {
    expect(definedValuesV2Read({ guid: GUID }).path).toBe(
      `definedvalues/${GUID}`,
    );
  });

  it('searches by type, active state and Guid together', () => {
    const read = definedValuesV2Read({
      guid: GUID,
      definedTypeId: 631,
      activeOnly: true,
      orderBy: 'Order desc',
      limit: 2,
      fields: ['Guid', 'Value'],
    });

    expect(read.path).toBe('definedvalues/search/cf-web-defined-values');
    expect(read.body).toEqual({
      where: `DefinedTypeId == 631 && IsActive == true && Guid == "${GUID}"`,
      select: 'new (Guid, Value)',
      sort: 'Order desc',
      limit: 2,
    });
  });
});

describe('fetchDefinedValues', () => {
  it('sends v1 the same filter, order, top, select and attributes', async () => {
    vi.mocked(fetchRockData).mockResolvedValue([]);

    await fetchDefinedValues({
      definedTypeId: 631,
      activeOnly: true,
      orderBy: 'Order desc',
      limit: 2,
      attributes: 'simple',
      ttl: 0,
    });

    expect(fetchRockData).toHaveBeenCalledWith({
      endpoint: 'DefinedValues',
      queryParams: {
        $filter: 'DefinedTypeId eq 631 and IsActive eq true',
        $orderby: 'Order desc',
        $top: '2',
        loadAttributes: 'simple',
      },
      ttl: 0,
    });
  });

  it('returns an array even when v1 unwraps a single match', async () => {
    vi.mocked(fetchRockData).mockResolvedValue({ value: 'Grid' });

    await expect(fetchDefinedValues({ guid: GUID })).resolves.toEqual([
      { value: 'Grid' },
    ]);
  });

  // Guids come from CMS attributes and URLs, so a malformed one never reaches Rock.
  it('skips Rock for a malformed Guid', async () => {
    await expect(fetchDefinedValueByGuid("x' or 1 eq 1")).resolves.toBeNull();
    expect(fetchRockData).not.toHaveBeenCalled();
  });

  it('adds v2 attribute values in the v1 shape', async () => {
    stubRockV2Fetch(
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ Guid: GUID, Value: 'Series' }))
        .mockResolvedValueOnce(
          jsonResponse({ Url: { value: 'series-url', textValue: 'x' } }),
        ),
    );

    await expect(
      fetchDefinedValueByGuid(GUID, { attributes: 'simple' }),
    ).resolves.toEqual({
      guid: GUID,
      value: 'Series',
      attributeValues: { url: { value: 'series-url', valueFormatted: 'x' } },
    });
    expect(vi.mocked(global.fetch).mock.calls[1][0]).toBe(
      `https://rock.example.com/api/v2/models/definedvalues/${GUID}/attributevalues`,
    );
    expect(fetchRockData).not.toHaveBeenCalled();
  });

  it('falls back to v1 when v2 fails', async () => {
    stubRockV2Fetch(
      vi
        .fn()
        .mockResolvedValue({ ok: false, status: 401, text: async () => '' }),
    );
    vi.mocked(fetchRockData).mockResolvedValue([{ value: 'Grid' }]);

    await expect(fetchDefinedValueByGuid(GUID)).resolves.toEqual({
      value: 'Grid',
    });
  });
});
