import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchRockData,
  deleteRockData,
  postRockData,
  putRockData,
  patchRockData,
  deleteCacheKey,
  getRockApiBaseUrl,
  isItemInDateRange,
  TTL,
} from '../fetch-rock-data';
import { buildCacheKey } from '../cache-utils';

// Mock redis to null so all tests bypass cache
vi.mock('../redis-config', () => ({ default: null }));

vi.mock('~/lib/utils', () => ({
  normalize: (data: unknown) => data,
}));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ROCK_API = 'https://rock.example.com/api/';
  process.env.ROCK_TOKEN = 'test-token';
  global.fetch = vi.fn();
});

// ─── isItemInDateRange ──────────────────────────────────────────────────────

describe('isItemInDateRange', () => {
  const now = new Date('2025-06-15T12:00:00Z');

  it('returns true when no start or expire dates set', () => {
    expect(isItemInDateRange({}, now)).toBe(true);
  });

  it('returns false when now is before startDateTime', () => {
    expect(
      isItemInDateRange({ startDateTime: '2025-07-01T00:00:00Z' }, now),
    ).toBe(false);
  });

  it('returns true when now is after startDateTime', () => {
    expect(
      isItemInDateRange({ startDateTime: '2025-01-01T00:00:00Z' }, now),
    ).toBe(true);
  });

  it('returns false when now is after expireDateTime', () => {
    expect(
      isItemInDateRange({ expireDateTime: '2025-01-01T00:00:00Z' }, now),
    ).toBe(false);
  });

  it('returns true when now is before expireDateTime', () => {
    expect(
      isItemInDateRange({ expireDateTime: '2025-12-31T00:00:00Z' }, now),
    ).toBe(true);
  });

  it('supports PascalCase StartDateTime and ExpireDateTime', () => {
    expect(
      isItemInDateRange(
        {
          StartDateTime: '2025-01-01T00:00:00Z',
          ExpireDateTime: '2025-12-31T00:00:00Z',
        },
        now,
      ),
    ).toBe(true);
  });

  it('returns false when now is outside the date range', () => {
    expect(
      isItemInDateRange(
        {
          startDateTime: '2025-01-01T00:00:00Z',
          expireDateTime: '2025-05-01T00:00:00Z',
        },
        now,
      ),
    ).toBe(false);
  });
});

// ─── fetchRockData ──────────────────────────────────────────────────────────

describe('fetchRockData', () => {
  it('fetches from the correct URL with query params', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 1 }, { id: 2 }],
    });

    await fetchRockData({
      endpoint: 'ContentChannelItems',
      queryParams: { $top: '10' },
    });

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(calledUrl).toContain('ContentChannelItems');
    expect(calledUrl).toContain('%24top=10');
  });

  it('returns a single object when array has length 1', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 42 }],
    });

    const result = await fetchRockData({ endpoint: 'People' });
    expect(result).toEqual({ id: 42 });
  });

  it('returns the full array when length > 1', async () => {
    const items = [{ id: 1 }, { id: 2 }];
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => items,
    });

    const result = await fetchRockData({ endpoint: 'People' });
    expect(result).toEqual(items);
  });

  it('throws when response is not ok', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      });

      await expect(fetchRockData({ endpoint: 'People' })).rejects.toThrow(
        '⚠️ Error Fetching Rock Data',
      );
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('includes Content-Type application/json header', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    await fetchRockData({ endpoint: 'People' });

    const headers = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1]
      .headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('merges custom headers', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    await fetchRockData({
      endpoint: 'People',
      customHeaders: { Cookie: 'rock-session=abc' },
    });

    const headers = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1]
      .headers as Record<string, string>;
    expect(headers['Cookie']).toBe('rock-session=abc');
  });
});

// ─── deleteRockData ─────────────────────────────────────────────────────────

describe('deleteRockData', () => {
  it('returns response status on success', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 204,
    });

    const status = await deleteRockData('People/1');
    expect(status).toBe(204);
  });

  it('throws when response is not ok', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      });

      await expect(deleteRockData('People/99')).rejects.toThrow(
        'Failed to delete resource',
      );
    } finally {
      errorSpy.mockRestore();
    }
  });
});

// ─── postRockData ───────────────────────────────────────────────────────────

describe('postRockData', () => {
  it('returns parsed JSON body on success', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ id: 10 }),
    });

    const result = await postRockData({
      endpoint: 'People',
      body: { name: 'Test' },
    });
    expect(result).toEqual({ id: 10 });
  });

  it('returns empty object when response body is empty', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      text: async () => '',
    });

    const result = await postRockData({ endpoint: 'People', body: {} });
    expect(result).toEqual({});
  });

  it('throws when response is not ok', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => 'Bad Request',
    });

    await expect(
      postRockData({ endpoint: 'People', body: {} }),
    ).rejects.toThrow('Failed to post data');
  });
});

// ─── patchRockData ──────────────────────────────────────────────────────────

describe('patchRockData', () => {
  it('returns response status on success', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
    });

    const status = await patchRockData({
      endpoint: 'People/1',
      body: { firstName: 'John' },
    });
    expect(status).toBe(200);
  });

  it('throws when response is not ok', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Server Error',
    });

    await expect(
      patchRockData({ endpoint: 'People/1', body: {} }),
    ).rejects.toThrow('Failed to patch data');
  });
});

// ─── ROCK_API validation ────────────────────────────────────────────────────

/**
 * An absent ROCK_API used to interpolate as the literal string "undefined" and
 * every request was built against it. Rock answered those URLs in a way that
 * read as "user does not exist", so the misconfiguration was invisible and the
 * debugging went after the wrong thing. Missing config must fail as config.
 */
describe.each([
  { label: 'unset', value: undefined },
  { label: 'empty', value: '' },
  { label: 'whitespace-only', value: '   ' },
])('ROCK_API $label', ({ value }: { label: string; value?: string }) => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    if (value === undefined) {
      delete process.env.ROCK_API;
    } else {
      process.env.ROCK_API = value;
    }
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('makes fetchRockData fail naming the variable, without calling fetch', async () => {
    await expect(fetchRockData({ endpoint: 'People' })).rejects.toThrow(
      /ROCK_API/,
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('explains that a new worktree has no env files', async () => {
    await expect(fetchRockData({ endpoint: 'People' })).rejects.toThrow(
      /worktree/,
    );
  });

  it.each([
    ['deleteRockData', () => deleteRockData('People/1')],
    ['postRockData', () => postRockData({ endpoint: 'People', body: {} })],
    ['putRockData', () => putRockData({ endpoint: 'People/1', body: {} })],
    ['patchRockData', () => patchRockData({ endpoint: 'People/1', body: {} })],
  ])('makes %s fail before it can build a URL', async (_name, call) => {
    await expect(call()).rejects.toThrow(/ROCK_API/);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('getRockApiBaseUrl', () => {
  it('returns the configured base URL', () => {
    process.env.ROCK_API = 'https://rock.example.com/api/';
    expect(getRockApiBaseUrl()).toBe('https://rock.example.com/api/');
  });
});

// ─── by-id $expand / $select guard ──────────────────────────────────────────

/**
 * Rock silently ignores $expand and $select on Entity/{id} routes: an ignored
 * $select overfetches the whole entity, and an ignored $expand resolves the
 * navigation property to null, so the fetch succeeds and the crash lands later
 * in whatever reads a field off it. The guard has to key on that route shape —
 * People/GetByAttributeValue also returns one row but does honor $expand, so a
 * guard keying on "returns one row" would fire on a working endpoint.
 */
describe('by-id $expand / $select guard', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => [{ id: 1 }],
    });
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  const personId = 123;

  it.each([
    ['numeric id with $select', 'People/1', { $select: 'Email' }],
    [
      'interpolated id with $expand',
      `GroupMembers/${personId}`,
      { $expand: 'GroupRole' },
    ],
    [
      'guid id with $select',
      'PersonAlias/6c2a1b70-4f2a-4a5e-9d1c-2f3b4a5c6d7e',
      { $select: 'Guid' },
    ],
    [
      'leading slash and both params',
      '/People/1',
      { $expand: 'Photo', $select: 'Email' },
    ],
  ])('fires on %s', async (_label, endpoint, queryParams) => {
    await expect(fetchRockData({ endpoint, queryParams })).rejects.toThrow(
      /silently ignores/,
    );
    expect(warnSpy).toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it.each([
    [
      'People/GetByAttributeValue, which does honor $expand',
      'People/GetByAttributeValue',
      { attributeKey: 'Pathname', value: 'ryan-mcdermott', $expand: 'Photo' },
    ],
    [
      'the collection form of a by-id lookup',
      'People',
      { $filter: `Id eq ${personId}`, $select: 'Email' },
    ],
    [
      'a trailing-slash collection endpoint',
      'DefinedValues/',
      { $filter: "Guid eq guid'abc'", $select: 'Value' },
    ],
    [
      'ContentChannelItems/GetByAttributeValue',
      'ContentChannelItems/GetByAttributeValue',
      { attributeKey: 'Pathname', value: 'some-article', $select: 'Title' },
    ],
    ['a by-id endpoint carrying neither param', 'PersonAlias/7', {}],
  ])('does not fire on %s', async (_label, endpoint, queryParams) => {
    await expect(
      fetchRockData({ endpoint, queryParams }),
    ).resolves.toBeDefined();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalled();
  });

  it('warns but still fetches in production, where waste beats an outage', async () => {
    const nodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      await expect(
        fetchRockData({
          endpoint: 'People/1',
          queryParams: { $select: 'Email' },
        }),
      ).resolves.toBeDefined();
      expect(warnSpy).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = nodeEnv;
    }
  });
});

// ─── deleteCacheKey ─────────────────────────────────────────────────────────

describe('deleteCacheKey', () => {
  it('returns false when redis is null (no redis configured)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const result = await deleteCacheKey({
        endpoint: 'People',
        queryParams: { $top: '10' },
      });
      expect(result).toBe(false);
    } finally {
      errorSpy.mockRestore();
    }
  });
});

// ─── TTL / caching behavior (with mocked Redis) ─────────────────────────────

describe('fetchRockData TTL behavior', () => {
  const mockRedis = {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  };

  beforeEach(async () => {
    vi.useRealTimers();
    vi.resetModules();
    vi.clearAllMocks();
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.del.mockResolvedValue(1);

    // Re-mock redis with our fake instance
    vi.doMock('../redis-config', () => ({ default: mockRedis }));
  });

  it('caches with TTL.DEFAULT (3600) when no ttl is specified', async () => {
    const { fetchRockData: fetchWithRedis } =
      await import('../fetch-rock-data');

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 1 }],
    });

    await fetchWithRedis({ endpoint: 'People' });

    expect(mockRedis.set).toHaveBeenCalledWith(
      expect.stringMatching(/^rock:People:/),
      expect.any(String),
      'EX',
      TTL.DEFAULT,
    );
  });

  it('caches with custom TTL when ttl is specified', async () => {
    const { fetchRockData: fetchWithRedis } =
      await import('../fetch-rock-data');

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 1 }],
    });

    await fetchWithRedis({ endpoint: 'People', ttl: TTL.LONG });

    expect(mockRedis.set).toHaveBeenCalledWith(
      expect.stringMatching(/^rock:People:/),
      expect.any(String),
      'EX',
      TTL.LONG,
    );
  });

  it('skips cache read and write when ttl is TTL.NONE', async () => {
    const { fetchRockData: fetchWithRedis } =
      await import('../fetch-rock-data');

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 1 }],
    });

    await fetchWithRedis({ endpoint: 'People', ttl: TTL.NONE });

    expect(mockRedis.get).not.toHaveBeenCalled();
    expect(mockRedis.set).not.toHaveBeenCalled();
  });

  it('skips cache read and write when ttl is TTL.NONE', async () => {
    const { fetchRockData: fetchWithRedis } =
      await import('../fetch-rock-data');

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 1 }],
    });

    await fetchWithRedis({ endpoint: 'People', ttl: TTL.NONE });

    expect(mockRedis.get).not.toHaveBeenCalled();
    expect(mockRedis.set).not.toHaveBeenCalled();
  });

  it('returns cached data without calling fetch when cache hit', async () => {
    const cachedItem = { id: 99, name: 'Cached' };
    mockRedis.get.mockResolvedValueOnce(JSON.stringify(cachedItem));

    const { fetchRockData: fetchWithRedis } =
      await import('../fetch-rock-data');
    const result = await fetchWithRedis({ endpoint: 'People' });

    expect(result).toEqual(cachedItem);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('indexes content items by id on cache write (reverse index)', async () => {
    // A content item carries both id and contentChannelId, so its cache entry
    // must be recorded under cfitem:{id} so it can later be invalidated per-item.
    const exec = vi.fn().mockResolvedValue([]);
    const pipeline = { set: vi.fn(), sadd: vi.fn(), expire: vi.fn(), exec };
    const contentRedis = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn(),
      pipeline: vi.fn().mockReturnValue(pipeline),
    };
    vi.doMock('../redis-config', () => ({ default: contentRedis }));
    const { fetchRockData: fetchWithRedis } =
      await import('../fetch-rock-data');

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 7, contentChannelId: 43 }],
    });

    await fetchWithRedis({ endpoint: 'ContentChannelItems' });

    expect(pipeline.set).toHaveBeenCalledWith(
      expect.stringMatching(/^rock:ContentChannelItems:/),
      expect.any(String),
      'EX',
      TTL.DEFAULT,
    );
    expect(pipeline.sadd).toHaveBeenCalledWith(
      'cfitem:7',
      expect.stringMatching(/^rock:ContentChannelItems:/),
    );
    expect(pipeline.expire).toHaveBeenCalledWith('cfitem:7', TTL.LONG);
    expect(contentRedis.set).not.toHaveBeenCalled();
  });

  it('indexes content item associations for parent cascade invalidation', async () => {
    const pipeline = {
      set: vi.fn(),
      sadd: vi.fn(),
      expire: vi.fn(),
      exec: vi.fn().mockResolvedValue([]),
    };
    const contentRedis = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn(),
      pipeline: vi.fn().mockReturnValue(pipeline),
    };
    vi.doMock('../redis-config', () => ({ default: contentRedis }));
    const { fetchRockData: fetchWithRedis } =
      await import('../fetch-rock-data');

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { contentChannelItemId: 10, childContentChannelItemId: 20 },
      ],
    });

    await fetchWithRedis({ endpoint: 'ContentChannelItemAssociations' });

    expect(pipeline.sadd).toHaveBeenCalledWith(
      'cfitem:10',
      expect.stringMatching(/^rock:ContentChannelItemAssociations:/),
    );
    expect(pipeline.sadd).toHaveBeenCalledWith('cfchildren:10', '20');
    expect(pipeline.expire).toHaveBeenCalledWith('cfchildren:10', TTL.LONG);
  });

  it('uses buildCacheKey format for cache key', async () => {
    const { fetchRockData: fetchWithRedis } =
      await import('../fetch-rock-data');

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 1 }],
    });

    const queryParams = { $top: '10', $filter: 'ContentChannelId eq 43' };
    await fetchWithRedis({ endpoint: 'ContentChannelItems', queryParams });

    const expectedKey = buildCacheKey('ContentChannelItems', queryParams);
    expect(mockRedis.get).toHaveBeenCalledWith(expectedKey);
    expect(mockRedis.set).toHaveBeenCalledWith(
      expectedKey,
      expect.any(String),
      'EX',
      expect.any(Number),
    );
  });

  it('uses one stable cache key for repeated single-item date-range queries', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-29T12:00:00.000Z'));

    const { fetchRockData: fetchWithRedis } =
      await import('../fetch-rock-data');
    const rockItem = {
      id: 123,
      title: 'Cached article',
      startDateTime: '2026-06-01T00:00:00.000Z',
      expireDateTime: '2026-07-01T00:00:00.000Z',
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [rockItem],
    });

    const options = {
      endpoint: 'ContentChannelItems/GetByAttributeValue',
      queryParams: {
        attributeKey: 'Pathname',
        $filter: "ContentChannelId eq 43 and Status eq 'Approved'",
        value: 'example',
        loadAttributes: 'simple' as const,
      },
      filterByDateRange: true,
    };

    await expect(fetchWithRedis(options)).resolves.toEqual(rockItem);

    const firstCacheKey = mockRedis.set.mock.calls[0][0];
    mockRedis.get.mockResolvedValueOnce(JSON.stringify(rockItem));
    vi.setSystemTime(new Date('2026-06-29T12:00:01.250Z'));

    await expect(fetchWithRedis(options)).resolves.toEqual(rockItem);

    expect(mockRedis.get).toHaveBeenNthCalledWith(2, firstCacheKey);
    expect(mockRedis.set).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('uses one stable cache key for list date-range queries while still sending live Rock filters', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-29T12:00:00.000Z'));

    const { fetchRockData: fetchWithRedis } =
      await import('../fetch-rock-data');
    const rockItem = {
      id: 456,
      title: 'Site banner',
      startDateTime: '2026-06-01T00:00:00.000Z',
      expireDateTime: null,
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [rockItem],
    });

    const options = {
      endpoint: 'ContentChannelItems',
      queryParams: {
        $filter: 'ContentChannelId eq 100',
        $top: '1',
        loadAttributes: 'simple' as const,
      },
      filterByDateRange: true,
    };

    await expect(fetchWithRedis(options)).resolves.toEqual(rockItem);

    const firstRequestUrl = (global.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    const firstRequestFilter = new URL(firstRequestUrl).searchParams.get(
      '$filter',
    );
    expect(firstRequestFilter).toContain(
      "StartDateTime le datetime'2026-06-29T12:00:00.000Z'",
    );

    const firstCacheKey = mockRedis.set.mock.calls[0][0];
    const expectedStableKey = buildCacheKey('ContentChannelItems', {
      $filter: `(ContentChannelId eq 100) and (StartDateTime le datetime'2026-06-29T12:00:00.000Z' and (ExpireDateTime eq null or ExpireDateTime ge datetime'2026-06-29T12:00:00.000Z'))`,
      $top: '1',
      loadAttributes: 'simple',
    });
    expect(firstCacheKey).toBe(expectedStableKey);

    mockRedis.get.mockResolvedValueOnce(JSON.stringify(rockItem));
    vi.setSystemTime(new Date('2026-06-29T12:00:01.250Z'));

    await expect(fetchWithRedis(options)).resolves.toEqual(rockItem);

    expect(mockRedis.get).toHaveBeenNthCalledWith(2, firstCacheKey);
    expect(mockRedis.set).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('does not send the volatile date range clause for single-item date-range queries', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-29T12:00:00.000Z'));

    const { fetchRockData: fetchWithRedis } =
      await import('../fetch-rock-data');

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: 123,
          startDateTime: '2026-06-01T00:00:00.000Z',
          expireDateTime: null,
        },
      ],
    });

    await fetchWithRedis({
      endpoint: 'ContentChannelItems/GetByAttributeValue',
      queryParams: {
        attributeKey: 'Pathname',
        $filter: "ContentChannelId eq 43 and Status eq 'Approved'",
        value: 'example',
        loadAttributes: 'simple',
      },
      filterByDateRange: true,
    });

    const requestUrl = (global.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    const requestFilter = new URL(requestUrl).searchParams.get('$filter');
    expect(requestFilter).toContain(
      "ContentChannelId eq 43 and Status eq 'Approved'",
    );
    expect(requestFilter).not.toContain(
      "StartDateTime le datetime'2026-06-29T12:00:00.000Z'",
    );
    expect(requestFilter).not.toContain(
      "ExpireDateTime ge datetime'2026-06-29T12:00:00.000Z'",
    );
  });

  it('filters out-of-range single-item results in memory', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-29T12:00:00.000Z'));

    const { fetchRockData: fetchWithRedis } =
      await import('../fetch-rock-data');

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: 123,
          startDateTime: '2026-07-01T00:00:00.000Z',
          expireDateTime: null,
        },
      ],
    });

    await expect(
      fetchWithRedis({
        endpoint: 'ContentChannelItems/GetByAttributeValue',
        queryParams: {
          attributeKey: 'Pathname',
          value: 'future-example',
          loadAttributes: 'simple',
        },
        filterByDateRange: true,
      }),
    ).resolves.toEqual([]);
  });

  it('unwraps a filtered single item when duplicate matches include out-of-range data', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-29T12:00:00.000Z'));

    const { fetchRockData: fetchWithRedis } =
      await import('../fetch-rock-data');
    const inRangeItem = {
      id: 123,
      startDateTime: '2026-06-01T00:00:00.000Z',
      expireDateTime: null,
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        inRangeItem,
        {
          id: 456,
          startDateTime: '2026-07-01T00:00:00.000Z',
          expireDateTime: null,
        },
      ],
    });

    await expect(
      fetchWithRedis({
        endpoint: 'ContentChannelItems/GetByAttributeValue',
        queryParams: {
          attributeKey: 'Pathname',
          value: 'duplicate-example',
          loadAttributes: 'simple',
        },
        filterByDateRange: true,
      }),
    ).resolves.toEqual(inRangeItem);
  });

  it('keeps status-approved filters in the stable request and cache key', async () => {
    const { fetchRockData: fetchWithRedis } =
      await import('../fetch-rock-data');

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: 123,
          startDateTime: '2026-06-01T00:00:00.000Z',
          expireDateTime: null,
        },
      ],
    });

    await fetchWithRedis({
      endpoint: 'ContentChannelItems/GetByAttributeValue',
      queryParams: {
        attributeKey: 'Pathname',
        $filter: 'ContentChannelId eq 43',
        value: 'example',
        loadAttributes: 'simple',
      },
      filterByDateRange: true,
      filterByStatusApproved: true,
    });

    const requestUrl = (global.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    const requestFilter = new URL(requestUrl).searchParams.get('$filter');
    const cachedValue = JSON.parse(mockRedis.set.mock.calls[0][1]);

    expect(requestFilter).toContain(
      "(ContentChannelId eq 43) and (Status eq 'Approved')",
    );
    expect(requestFilter).not.toContain('StartDateTime le datetime');
    expect(cachedValue).toMatchObject({ id: 123 });
  });

  // This endpoint filters by date range in memory, so buildMergedFilter is
  // called with no clauses and hands back the caller's absent $filter. Assigning
  // that undefined back onto the params used to send `$filter=undefined`, which
  // Rock rejects with a 400 — on prod as well as preview.
  it('omits $filter when date-range filtering happens in memory and the caller passes none', async () => {
    const { fetchRockData: fetchWithRedis } =
      await import('../fetch-rock-data');

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: 123,
          startDateTime: '2020-01-01T00:00:00.000Z',
          expireDateTime: null,
        },
      ],
    });

    await fetchWithRedis({
      endpoint: 'ContentChannelItems/GetByAttributeValue',
      queryParams: {
        attributeKey: 'Author',
        value: 'some-guid',
        loadAttributes: 'simple',
      },
      filterByDateRange: true,
    });

    const requestUrl = (global.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(requestUrl).not.toContain('undefined');
    expect(new URL(requestUrl).searchParams.has('$filter')).toBe(false);
  });
});

// ─── preview mode (CFDP-4143) ───────────────────────────────────────────────

describe('fetchRockData preview mode', () => {
  const mockRedis = {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  };

  beforeEach(async () => {
    vi.useRealTimers();
    vi.resetModules();
    vi.clearAllMocks();
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.del.mockResolvedValue(1);
    vi.doMock('../redis-config', () => ({ default: mockRedis }));
    process.env.SHOW_UNAPPROVED_CONTENT = 'true';
  });

  afterEach(() => {
    delete process.env.SHOW_UNAPPROVED_CONTENT;
  });

  it("strips a hardcoded Status eq 'Approved' clause embedded in $filter", async () => {
    const { fetchRockData: fetchPreview } = await import('../fetch-rock-data');

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 1 }],
    });

    await fetchPreview({
      endpoint: 'ContentChannelItems/GetByAttributeValue',
      queryParams: {
        attributeKey: 'Pathname',
        $filter: "ContentChannelId eq 43 and Status eq 'Approved'",
        value: 'example',
        loadAttributes: 'simple',
      },
      filterByDateRange: true,
    });

    const requestUrl = (global.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    const requestFilter = new URL(requestUrl).searchParams.get('$filter');
    expect(requestFilter).toBe('ContentChannelId eq 43');
  });

  it('skips filterByStatusApproved instead of merging it into $filter', async () => {
    const { fetchRockData: fetchPreview } = await import('../fetch-rock-data');

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 1 }],
    });

    await fetchPreview({
      endpoint: 'ContentChannelItems',
      queryParams: { $filter: 'ContentChannelId eq 78' },
      filterByStatusApproved: true,
    });

    const requestUrl = (global.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    const requestFilter = new URL(requestUrl).searchParams.get('$filter');
    expect(requestFilter).toBe('ContentChannelId eq 78');
  });

  // Regression: stripApprovedStatusFilter returns undefined for a caller that
  // passes no $filter, which used to be assigned back onto the query params and
  // serialized as the literal string "undefined". Rock answers that with a 400,
  // so every filterless request 404'd on the preview deployment.
  it('omits $filter entirely when the caller passes none', async () => {
    const { fetchRockData: fetchPreview } = await import('../fetch-rock-data');

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 1 }],
    });

    await fetchPreview({
      endpoint: 'People/GetByAttributeValue',
      queryParams: {
        attributeKey: 'Pathname',
        value: 'ryan-mcdermott',
        $expand: 'Photo',
        loadAttributes: 'simple',
      },
    });

    const requestUrl = (global.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(requestUrl).not.toContain('undefined');
    expect(new URL(requestUrl).searchParams.has('$filter')).toBe(false);
  });

  it('still filters out a not-yet-started item — only Status is bypassed', async () => {
    const { fetchRockData: fetchPreview } = await import('../fetch-rock-data');

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: 123,
          startDateTime: '2099-01-01T00:00:00.000Z',
          expireDateTime: null,
        },
      ],
    });

    const result = await fetchPreview({
      endpoint: 'ContentChannelItems/GetByAttributeValue',
      queryParams: {
        attributeKey: 'Pathname',
        value: 'future-example',
        loadAttributes: 'simple',
      },
      filterByDateRange: true,
    });

    expect(result).toEqual([]);
  });

  it('never reads or writes the shared Redis cache', async () => {
    const { fetchRockData: fetchPreview } = await import('../fetch-rock-data');

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 1 }],
    });

    await fetchPreview({ endpoint: 'People' });

    expect(mockRedis.get).not.toHaveBeenCalled();
    expect(mockRedis.set).not.toHaveBeenCalled();
  });
});
