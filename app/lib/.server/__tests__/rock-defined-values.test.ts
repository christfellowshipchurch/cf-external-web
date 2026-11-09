import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchRockData } from '../fetch-rock-data';
import {
  definedValuesV2Read,
  fetchDefinedValueByGuid,
  fetchDefinedValues,
} from '../rock-defined-values';

const rockV2 = vi.hoisted(() => ({ enabled: false }));

vi.mock('~/lib/rock-config', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  get ROCK_V2_ENABLED() {
    return rockV2.enabled;
  },
}));
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
  rockV2.enabled = false;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const stubRockV2Fetch = (fetchMock: ReturnType<typeof vi.fn>) => {
  rockV2.enabled = true;
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('ROCK_API', 'https://rock.example.com/api/');
  vi.stubGlobal('fetch', fetchMock);
};

describe('definedValuesV2Read', () => {
  it('reads a lone Guid through the shared definedvalues search', () => {
    const read = definedValuesV2Read({ guid: GUID });

    expect(read.path).toBe('definedvalues/search/definedvalues');
    expect(read.body.where).toBe(`Guid == "${GUID}"`);
  });

  // fetchRockV2 turns the throw into a v1 read.
  it('throws when a Guid lookup misses', () => {
    expect(() =>
      definedValuesV2Read({ guid: GUID }).map({ count: 0, items: [] }),
    ).toThrow(/No defined value matched/);
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

    expect(read.path).toBe('definedvalues/search/definedvalues');
    expect(read.body).toEqual({
      where: `DefinedTypeId == 631 && IsActive == true && Guid == "${GUID}"`,
      select: 'new (Guid, Value)',
      sort: 'Order desc',
      limit: 2,
    });
  });
});

describe('fetchDefinedValues', () => {
  // Rock's paging field names are unconfirmed; the hero must still show only 2.
  it('caps v2 results at the limit even if Rock ignores it', async () => {
    stubRockV2Fetch(
      vi.fn().mockResolvedValueOnce(
        jsonResponse({
          count: 3,
          items: [{ Value: 'a' }, { Value: 'b' }, { Value: 'c' }],
        }),
      ),
    );

    await expect(
      fetchDefinedValues({ definedTypeId: 631, limit: 2, fields: ['Value'] }),
    ).resolves.toEqual([{ value: 'a' }, { value: 'b' }]);
  });

  it('falls back to v1 when a Guid search returns another value', async () => {
    stubRockV2Fetch(
      vi.fn().mockResolvedValueOnce(
        jsonResponse({
          count: 1,
          items: [{ Guid: '99999999-9999-4999-8999-999999999999', Value: 'x' }],
        }),
      ),
    );
    vi.mocked(fetchRockData).mockResolvedValue([{ value: 'Grid' }]);

    await expect(fetchDefinedValueByGuid(GUID)).resolves.toEqual({
      value: 'Grid',
    });
  });

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

  it('reads attribute values in the same search, in the v1 shape', async () => {
    stubRockV2Fetch(
      vi.fn().mockResolvedValueOnce(
        jsonResponse({
          count: 1,
          items: [
            {
              Guid: GUID,
              Value: 'Series',
              AttributeValues: [
                { Key: 'Url', Value: 'series-url', TextValue: 'x' },
              ],
            },
          ],
        }),
      ),
    );

    await expect(
      fetchDefinedValueByGuid(GUID, { attributes: 'simple' }),
    ).resolves.toEqual({
      guid: GUID,
      value: 'Series',
      attributeValues: { url: { value: 'series-url', valueFormatted: 'x' } },
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(
      JSON.parse(String(vi.mocked(global.fetch).mock.calls[0][1]?.body)).select,
    ).toContain('DefinedValueAttributeValues.Select(');
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
