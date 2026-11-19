import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  definedValuesV2Read,
  fetchDefinedValueByGuid,
  fetchDefinedValues,
} from '../rock-defined-values';

vi.mock('../redis-config', () => ({ default: null }));

const GUID = '1b5c2e3d-4f5a-6b7c-8d9e-0f1a2b3c4d5e';

const jsonResponse = (data: unknown) => ({
  ok: true,
  json: async () => data,
  text: async () => JSON.stringify(data),
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('ROCK_API', 'https://rock.example.com/api/');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const stubRock = (fetchMock: ReturnType<typeof vi.fn>) =>
  vi.stubGlobal('fetch', fetchMock);

const sentBody = () =>
  JSON.parse(String(vi.mocked(global.fetch).mock.calls[0][1]?.body));

describe('definedValuesV2Read', () => {
  it('reads a lone Guid through the shared definedValues search', () => {
    const read = definedValuesV2Read({ guid: GUID });

    expect(read.path).toBe('definedvalues/search/definedValues');
    expect(read.body.where).toBe(`Guid == "${GUID}"`);
  });

  // The wrong-record guard reads the Guid off each row.
  it('selects the Guid for a Guid lookup even when fields leave it out', () => {
    expect(
      definedValuesV2Read({ guid: GUID, fields: ['Value'] }).body.select,
    ).toBe('new (Value, Guid)');
  });

  it('returns an empty list when a Guid lookup misses', () => {
    expect(
      definedValuesV2Read({ guid: GUID }).map({ count: 0, items: [] }),
    ).toEqual([]);
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

    expect(read.path).toBe('definedvalues/search/definedValues');
    expect(read.body).toEqual({
      where: `DefinedTypeId == 631 && IsActive == true && Guid == "${GUID}"`,
      select: 'new (Guid, Value)',
      sort: 'Order desc',
      limit: 2,
    });
  });
});

describe('fetchDefinedValues', () => {
  it('sends the filter, order, limit and attributes in one search', async () => {
    stubRock(vi.fn().mockResolvedValueOnce(jsonResponse({ items: [] })));

    await fetchDefinedValues({
      definedTypeId: 631,
      activeOnly: true,
      orderBy: 'Order desc',
      limit: 2,
      attributes: 'simple',
      ttl: 0,
    });

    expect(vi.mocked(global.fetch).mock.calls[0][0]).toBe(
      'https://rock.example.com/api/v2/models/definedvalues/search/definedValues',
    );
    const body = sentBody();
    expect(body.where).toBe('DefinedTypeId == 631 && IsActive == true');
    expect(body.sort).toBe('Order desc');
    expect(body.limit).toBe(2);
    expect(body.select).toMatch(
      /^new \(Id, Guid, Value, Description, Order, IsActive, DefinedTypeId, DefinedValueAttributeValues\.Select\(/,
    );
  });

  // Rock's paging field names are unconfirmed; the hero must still show only 2.
  it('caps results at the limit even if Rock ignores it', async () => {
    stubRock(
      vi.fn().mockResolvedValueOnce(
        jsonResponse({
          count: 3,
          items: [{ value: 'a' }, { value: 'b' }, { value: 'c' }],
        }),
      ),
    );

    await expect(
      fetchDefinedValues({ definedTypeId: 631, limit: 2, fields: ['Value'] }),
    ).resolves.toEqual([{ value: 'a' }, { value: 'b' }]);
  });

  it('returns an array even when one value matches', async () => {
    stubRock(
      vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({ count: 1, items: [{ guid: GUID, value: 'Grid' }] }),
        ),
    );

    await expect(fetchDefinedValues({ guid: GUID })).resolves.toEqual([
      { guid: GUID, value: 'Grid' },
    ]);
  });

  // A search that ignored its `where` must not pass off another value.
  it('rejects when a Guid search returns another value', async () => {
    stubRock(
      vi.fn().mockResolvedValueOnce(
        jsonResponse({
          count: 1,
          items: [{ guid: '99999999-9999-4999-8999-999999999999', value: 'x' }],
        }),
      ),
    );

    await expect(fetchDefinedValueByGuid(GUID)).rejects.toThrow(
      /Guid doesn't match/,
    );
  });

  it('returns null when a Guid lookup finds nothing', async () => {
    stubRock(
      vi.fn().mockResolvedValueOnce(jsonResponse({ count: 0, items: [] })),
    );

    await expect(fetchDefinedValueByGuid(GUID)).resolves.toBeNull();
  });

  // Guids come from CMS attributes and URLs, so a malformed one never reaches Rock.
  it('skips Rock for a malformed Guid', async () => {
    stubRock(vi.fn());

    await expect(fetchDefinedValueByGuid("x' or 1 eq 1")).resolves.toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('reads attribute values in the same search, in the v1 shape', async () => {
    stubRock(
      vi.fn().mockResolvedValueOnce(
        jsonResponse({
          count: 1,
          items: [
            {
              guid: GUID,
              value: 'Series',
              attributeValues: [
                { key: 'Url', value: 'series-url', textValue: 'x' },
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
    expect(sentBody().select).toContain('DefinedValueAttributeValues.Select(');
  });

  it('rejects when Rock fails', async () => {
    stubRock(
      vi
        .fn()
        .mockResolvedValue({ ok: false, status: 401, text: async () => '' }),
    );

    await expect(fetchDefinedValueByGuid(GUID)).rejects.toThrow(/failed: 401/);
  });
});
