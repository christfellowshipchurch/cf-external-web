import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const redisStore = vi.hoisted(() => new Map<string, string>());
vi.mock('../redis-config', () => ({
  default: {
    get: vi.fn(async (key: string) => redisStore.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => {
      redisStore.set(key, value);
      return 'OK';
    }),
  },
}));

import {
  buildV2SearchBody,
  fetchRockV2,
  keepMatchingRows,
  projectedToV1Shape,
  requestRockV2,
  requireV2Guid,
  sendRockV2,
  toV1Shape,
} from '../fetch-rock-v2';
import { RockAPIError } from '../error-types';
import redis from '../redis-config';

const CAMPUS_GUID = '1b5c2e3d-4f5a-6b7c-8d9e-0f1a2b3c4d5e';

const okResponse = (data: unknown) => ({
  ok: true,
  status: 200,
  json: async () => data,
  text: async () => JSON.stringify(data),
});

const fetchMock = () => global.fetch as ReturnType<typeof vi.fn>;

let errorSpy: ReturnType<typeof vi.spyOn>;
let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  redisStore.clear();
  vi.stubEnv('ROCK_API', 'https://rock.example.com/api/');
  vi.stubEnv('ROCK_TOKEN', 'test-token');
  vi.stubEnv('NODE_ENV', 'test');
  global.fetch = vi.fn();
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  errorSpy.mockRestore();
  warnSpy.mockRestore();
});

describe('fetchRockV2', () => {
  it('reads /api/v2/models with the REST key and returns the mapped result', async () => {
    fetchMock().mockResolvedValueOnce(
      okResponse({ name: 'Palm Beach Gardens' }),
    );

    const result = await fetchRockV2({
      path: `campuses/${CAMPUS_GUID}`,
      map: (data) => toV1Shape(data as Record<string, unknown>),
    });

    const [url, init] = fetchMock().mock.calls[0];
    expect(url).toBe(
      `https://rock.example.com/api/v2/models/campuses/${CAMPUS_GUID}`,
    );
    expect(init.method).toBe('GET');
    expect(init.headers['Authorization-Token']).toBe('test-token');
    expect(result).toEqual({ name: 'Palm Beach Gardens' });
  });

  // No v1 fallback: a v2 failure must surface, not return empty data.
  it.each([
    [
      'a non-ok response',
      () =>
        fetchMock().mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: async () => 'Unauthorized',
        }),
      /failed: 401/,
    ],
    [
      'a network error',
      () => fetchMock().mockRejectedValueOnce(new Error('ECONNRESET')),
      /ECONNRESET/,
    ],
  ])('throws on %s', async (_label, arrange, message) => {
    arrange();
    const map = vi.fn();

    await expect(
      fetchRockV2({ path: `campuses/${CAMPUS_GUID}`, map }),
    ).rejects.toThrow(message);
    expect(map).not.toHaveBeenCalled();
  });

  // A read can span several v2 calls; a failed follow-up fails the whole read.
  it('rejects when a follow-up call inside map fails', async () => {
    fetchMock()
      .mockResolvedValueOnce(okResponse({ items: [{ guid: CAMPUS_GUID }] }))
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({}),
        text: async () => 'Unauthorized',
      });

    await expect(
      fetchRockV2({
        path: 'campuses/search/campus-by-url',
        method: 'POST',
        body: { where: 'Url == "jupiter"' },
        map: async () => {
          await requestRockV2({
            path: `campuses/${CAMPUS_GUID}/attributevalues`,
          });
          return 'from v2';
        },
      }),
    ).rejects.toThrow(/attributevalues failed: 401/);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

/**
 * Rock 18.7 refuses number IDs in more places when Disable Predictable IDs is
 * on, so a number ID in a v2 path is never sent, in any environment.
 */
describe('number IDs in v2 paths', () => {
  it.each(['test', 'production'])(
    'throws in %s without calling Rock',
    async (env) => {
      vi.stubEnv('NODE_ENV', env);

      await expect(
        fetchRockV2({ path: 'people/123', map: (d) => d }),
      ).rejects.toThrow(/Guid or IdKey/);
      expect(global.fetch).not.toHaveBeenCalled();
    },
  );

  it('throws on a write path too', async () => {
    await expect(
      sendRockV2('PATCH', 'people/123', { Email: 'a@b.c' }),
    ).rejects.toThrow(/Guid or IdKey/);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('allows an IdKey', async () => {
    fetchMock().mockResolvedValueOnce(okResponse({}));

    await fetchRockV2({ path: 'people/aB3dE', map: (d) => d });

    expect(fetchMock().mock.calls[0][0]).toBe(
      'https://rock.example.com/api/v2/models/people/aB3dE',
    );
  });
});

/**
 * v2 search queries live in a POST body. A key built only from the URL would
 * serve one search's results for every other search on the same entity.
 */
describe('v2 cache keys', () => {
  const search = (where: string) =>
    fetchRockV2({
      path: 'campuses/search',
      method: 'POST',
      body: buildV2SearchBody({ where }),
      map: (d) => d,
    });

  it('gives searches with different bodies different keys', async () => {
    fetchMock()
      .mockResolvedValueOnce(okResponse({ items: ['active'] }))
      .mockResolvedValueOnce(okResponse({ items: ['inactive'] }));

    expect(await search('IsActive == true')).toEqual({ items: ['active'] });
    expect(await search('IsActive == false')).toEqual({ items: ['inactive'] });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('serves a repeat of the same search from Redis', async () => {
    fetchMock().mockResolvedValueOnce(okResponse({ items: ['active'] }));

    await search('IsActive == true');
    const second = await search('IsActive == true');

    expect(second).toEqual({ items: ['active'] });
    expect(global.fetch).toHaveBeenCalledOnce();
  });

  it('keeps v2 keys apart from v1 keys and under the admin flush prefix', async () => {
    fetchMock().mockResolvedValueOnce(okResponse({}));

    await search('IsActive == true');

    const [key] = (redis!.set as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(key).toMatch(/^rock:v2\/models\/campuses\/search:[0-9a-f]{12}$/);
  });
});

/**
 * Loaders read v1 data after `normalize`: camelCase keys and
 * `attributeValues.{camelKey}.value` / `.valueFormatted`. v2 keeps attribute
 * keys in their Rock casing and names the formatted value `textValue`, so
 * without this mapping every loader that reads an attribute would get
 * undefined.
 */
describe('toV1Shape', () => {
  it('maps v2 attribute values to the v1 shape loaders read', () => {
    const item = toV1Shape(
      { id: 42, title: 'Sermon', StartDateTime: '2026-10-18T09:00:00' },
      {
        MessageSeries: { value: 'a1b2-guid', textValue: 'Christmas at CF' },
        Summary: { value: 'Hope arrives.', textValue: 'Hope arrives.' },
      },
    );

    expect(item).toMatchObject({
      id: 42,
      title: 'Sermon',
      startDateTime: '2026-10-18T09:00:00',
      attributeValues: {
        messageSeries: {
          value: 'a1b2-guid',
          valueFormatted: 'Christmas at CF',
        },
        summary: { value: 'Hope arrives.', valueFormatted: 'Hope arrives.' },
      },
    });
  });

  it('leaves attributeValues off when none were loaded', () => {
    expect(toV1Shape({ id: 1 })).not.toHaveProperty('attributeValues');
  });
});

describe('projectedToV1Shape', () => {
  it('maps projected attribute values to v1 `attributeValues`', () => {
    expect(
      projectedToV1Shape({
        guid: CAMPUS_GUID,
        attributeValues: [{ key: 'MapLink', value: 'm', textValue: 'Map' }],
      }),
    ).toEqual({
      guid: CAMPUS_GUID,
      attributeValues: { mapLink: { value: 'm', valueFormatted: 'Map' } },
    });
  });

  // v1 rows read without attributes have no `attributeValues` key either.
  it('adds no attributeValues when the search selected none', () => {
    expect(projectedToV1Shape({ Value: 'Grid' })).toEqual({ value: 'Grid' });
  });
});

describe('keepMatchingRows', () => {
  it('keeps rows that match, ignoring case', () => {
    const rows = [{ Guid: CAMPUS_GUID.toUpperCase() }];
    expect(keepMatchingRows(rows, 'Guid', CAMPUS_GUID)).toEqual(rows);
  });

  // Rock v2 returns camelCase keys, so `Guid` must find a row's `guid`.
  it('reads the field from camelCase rows as Rock returns them', () => {
    const rows = [{ guid: CAMPUS_GUID, url: 'jupiter' }];
    expect(keepMatchingRows(rows, 'Guid', CAMPUS_GUID)).toEqual(rows);
    expect(keepMatchingRows(rows, 'Url', 'jupiter')).toEqual(rows);
  });

  // A search that ignored its `where` returns other records; the read must
  // fail rather than use one of them.
  it('throws when any row belongs to another record', () => {
    expect(() =>
      keepMatchingRows(
        [{ Guid: CAMPUS_GUID }, { Guid: 'other' }],
        'Guid',
        CAMPUS_GUID,
      ),
    ).toThrow(/doesn't match/);
  });
});

describe('buildV2SearchBody', () => {
  it('sends paging under the configured field names', () => {
    expect(
      buildV2SearchBody({ where: 'IsActive == true', offset: 20, limit: 10 }),
    ).toEqual({ where: 'IsActive == true', offset: 20, limit: 10 });
  });

  it('omits paging fields that were not set', () => {
    expect(buildV2SearchBody({ where: 'IsActive == true' })).toEqual({
      where: 'IsActive == true',
    });
  });
});

// CLAUDE.md: never log names or emails. A search error body can quote its where.
describe('requestRockV2 errors', () => {
  it('leaves Rock’s response body out of search errors', async () => {
    fetchMock().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'Bad where: Email == "ann@example.com"',
    });

    const error = await requestRockV2({
      path: 'people/search/people',
      method: 'POST',
      body: { where: 'Email == "ann@example.com"' },
    }).catch((e: Error) => e);

    expect(String(error)).toContain('failed: 400');
    expect(String(error)).not.toContain('ann@example.com');
  });
});

describe('sendRockV2', () => {
  it('returns a create’s ids', async () => {
    fetchMock().mockResolvedValue({
      ok: true,
      status: 201,
      text: async () => JSON.stringify({ id: 7, guid: CAMPUS_GUID }),
    });

    await expect(
      sendRockV2('POST', 'groupmembers', { GroupId: 1 }),
    ).resolves.toEqual({ id: 7, guid: CAMPUS_GUID });
    expect(fetchMock()).toHaveBeenCalledWith(
      'https://rock.example.com/api/v2/models/groupmembers',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('returns null for an empty or non-JSON success, not an error', async () => {
    fetchMock().mockResolvedValueOnce({
      ok: true,
      status: 204,
      text: async () => '',
    });
    fetchMock().mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => '<html>',
    });

    await expect(
      sendRockV2('PATCH', `people/${CAMPUS_GUID}`, { Email: 'a@b.c' }),
    ).resolves.toBeNull();
    await expect(
      sendRockV2('PATCH', `people/${CAMPUS_GUID}`, { Email: 'a@b.c' }),
    ).resolves.toBeNull();
  });

  it('throws Rock’s status without its body', async () => {
    fetchMock().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'Bad value ann@example.com',
    });

    const error = await sendRockV2('PATCH', `people/${CAMPUS_GUID}`, {
      Email: 'ann@example.com',
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(RockAPIError);
    expect((error as RockAPIError).statusCode).toBe(400);
    expect(String(error)).not.toContain('ann@example.com');
  });
});

describe('requireV2Guid', () => {
  it('returns the Guid it was given', () => {
    expect(requireV2Guid(CAMPUS_GUID, 'person')).toBe(CAMPUS_GUID);
  });

  // A write can't target a record by number id, so a missing Guid is a 404.
  it.each([undefined, null, ''])('throws a 404 for %s', (guid) => {
    let error: unknown;
    try {
      requireV2Guid(guid, 'person');
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(RockAPIError);
    expect((error as RockAPIError).statusCode).toBe(404);
  });
});
