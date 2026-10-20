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

import { buildV2SearchBody, fetchRockV2, toV1Shape } from '../fetch-rock-v2';
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
  process.env.ROCK_API = 'https://rock.example.com/api/';
  process.env.ROCK_TOKEN = 'test-token';
  process.env.ROCK_V2_ENABLED = 'true';
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

/**
 * v2 ships dark: with the flag off, a page must behave exactly as it does on
 * v1 today, never touching the v2 endpoints.
 */
describe('ROCK_V2_ENABLED off', () => {
  it('runs only the v1 fallback and never calls Rock v2', async () => {
    process.env.ROCK_V2_ENABLED = 'false';
    const fallback = vi.fn(async () => ({ name: 'from v1' }));

    const result = await fetchRockV2({
      path: `campuses/${CAMPUS_GUID}`,
      map: () => ({ name: 'from v2' }),
      fallback,
    });

    expect(result).toEqual({ name: 'from v1' });
    expect(fallback).toHaveBeenCalledOnce();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('ROCK_V2_ENABLED on', () => {
  it('reads /api/v2/models with the REST key and returns the mapped result', async () => {
    fetchMock().mockResolvedValueOnce(
      okResponse({ name: 'Palm Beach Gardens' }),
    );

    const result = await fetchRockV2({
      path: `campuses/${CAMPUS_GUID}`,
      map: (data) => toV1Shape(data as Record<string, unknown>),
      fallback: vi.fn(),
    });

    const [url, init] = fetchMock().mock.calls[0];
    expect(url).toBe(
      `https://rock.example.com/api/v2/models/campuses/${CAMPUS_GUID}`,
    );
    expect(init.method).toBe('GET');
    expect(init.headers['Authorization-Token']).toBe('test-token');
    expect(result).toEqual({ name: 'Palm Beach Gardens' });
  });

  /** A v2 outage or permission change must degrade to v1, not break the page. */
  it.each([
    [
      'a non-ok response',
      () =>
        fetchMock().mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: async () => 'Unauthorized',
        }),
    ],
    [
      'a network error',
      () => fetchMock().mockRejectedValueOnce(new Error('ECONNRESET')),
    ],
  ])('falls back to v1 on %s', async (_label, arrange) => {
    arrange();
    const fallback = vi.fn(async () => ({ name: 'from v1' }));

    const result = await fetchRockV2({
      path: `campuses/${CAMPUS_GUID}`,
      map: () => ({ name: 'from v2' }),
      fallback,
    });

    expect(result).toEqual({ name: 'from v1' });
    expect(fallback).toHaveBeenCalledOnce();
  });
});

/**
 * Rock 18.7 refuses number IDs in more places when Disable Predictable IDs is
 * on. v2 accepts a Guid or IdKey, so a number ID in a v2 path is a bug to
 * catch in development, not a request to send.
 */
describe('number IDs in v2 paths', () => {
  it('throws outside production without calling Rock', async () => {
    await expect(
      fetchRockV2({ path: 'people/123', map: (d) => d, fallback: vi.fn() }),
    ).rejects.toThrow(/Guid or IdKey/);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('falls back to v1 in production instead of failing the page', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const fallback = vi.fn(async () => 'from v1');

    const result = await fetchRockV2({
      path: 'people/123',
      map: () => 'from v2',
      fallback,
    });

    expect(result).toBe('from v1');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('allows an IdKey', async () => {
    fetchMock().mockResolvedValueOnce(okResponse({}));

    await fetchRockV2({
      path: 'people/aB3dE',
      map: (d) => d,
      fallback: vi.fn(),
    });

    expect(global.fetch).toHaveBeenCalledOnce();
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
      fallback: vi.fn(),
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
