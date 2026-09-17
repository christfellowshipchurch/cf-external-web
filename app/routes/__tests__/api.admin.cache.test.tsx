import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { action, loader } from '../api.admin.cache';

const mocks = vi.hoisted(() => ({
  invalidateItem: vi.fn(),
  collectItemCacheFootprint: vi.fn(),
  redis: null as unknown as { pipeline: ReturnType<typeof vi.fn> } | null,
}));

vi.mock('~/lib/.server/redis-config', () => ({
  get default() {
    return mocks.redis;
  },
}));
vi.mock('~/lib/.server/cache-utils', () => ({
  invalidateItem: mocks.invalidateItem,
  collectItemCacheFootprint: mocks.collectItemCacheFootprint,
}));

const createArgs = (
  secret = 'test-secret',
  {
    method = 'POST',
    search = '?id=10',
  }: { method?: string; search?: string } = {},
) =>
  ({
    request: new Request(`http://localhost/api/admin/cache${search}`, {
      method,
      headers: { 'x-cache-secret': secret },
    }),
    params: {},
    context: {},
  }) as ActionFunctionArgs;

const createLoaderArgs = (secret = 'test-secret', search = '?id=10') =>
  ({
    request: new Request(`http://localhost/api/admin/cache${search}`, {
      method: 'GET',
      headers: { 'x-cache-secret': secret },
    }),
    params: {},
    context: {},
  }) as LoaderFunctionArgs;

const readData = (response: unknown) => (response as { data: unknown }).data;
const readStatus = (response: unknown) =>
  (response as { init?: { status?: number } }).init?.status;
const readHeaders = (response: unknown) =>
  (response as { init?: { headers?: Record<string, string> } }).init?.headers;

const fakePipeline = (existsResults: number[]) => ({
  exec: vi.fn().mockResolvedValue(existsResults.map((n) => [null, n])),
});

beforeEach(() => {
  mocks.redis = null;
  mocks.invalidateItem.mockReset();
  mocks.collectItemCacheFootprint.mockReset();
});

describe('admin content cache invalidation (POST)', () => {
  it('returns 503 instead of reporting success when Redis is unavailable', async () => {
    process.env.CACHE_INVALIDATION_SECRET = 'test-secret';

    const response = await action(createArgs());

    expect(readStatus(response)).toBe(503);
    expect(readData(response)).toEqual({
      success: false,
      error: 'cache_unavailable',
    });
    expect(mocks.invalidateItem).not.toHaveBeenCalled();
  });

  it('checks authorization before reporting cache availability', async () => {
    process.env.CACHE_INVALIDATION_SECRET = 'test-secret';

    const response = await action(createArgs('wrong-secret'));

    expect(readStatus(response)).toBe(401);
    expect(mocks.invalidateItem).not.toHaveBeenCalled();
  });

  it('returns a JSON 500 instead of a rejected promise / HTML page when invalidateItem throws', async () => {
    process.env.CACHE_INVALIDATION_SECRET = 'test-secret';
    mocks.redis = { pipeline: vi.fn() };
    mocks.invalidateItem.mockRejectedValue(new Error('redis blip'));

    const response = await action(createArgs());

    expect(readStatus(response)).toBe(500);
    expect(readData(response)).toEqual({
      success: false,
      error: 'internal_error',
    });
  });
});

describe('admin content cache preview (GET loader)', () => {
  it('returns 401 before touching redis when the secret is missing or wrong', async () => {
    process.env.CACHE_INVALIDATION_SECRET = 'test-secret';

    const response = await loader(createLoaderArgs('wrong-secret'));

    expect(readStatus(response)).toBe(401);
    expect(readData(response)).toEqual({
      success: false,
      error: 'Unauthorized',
    });
    expect(mocks.collectItemCacheFootprint).not.toHaveBeenCalled();
  });

  it('returns 400 when id is missing', async () => {
    process.env.CACHE_INVALIDATION_SECRET = 'test-secret';

    const response = await loader(createLoaderArgs('test-secret', ''));

    expect(readStatus(response)).toBe(400);
    expect(readData(response)).toEqual({
      success: false,
      error: 'Missing required field: id',
    });
  });

  it('returns 400 when id is not numeric', async () => {
    process.env.CACHE_INVALIDATION_SECRET = 'test-secret';

    const response = await loader(createLoaderArgs('test-secret', '?id=abc'));

    expect(readStatus(response)).toBe(400);
    expect(readData(response)).toEqual({
      success: false,
      error: 'Invalid id',
    });
  });

  it('returns 503 and never calls the collector when redis is null', async () => {
    process.env.CACHE_INVALIDATION_SECRET = 'test-secret';

    const response = await loader(createLoaderArgs());

    expect(readStatus(response)).toBe(503);
    expect(readData(response)).toEqual({
      success: false,
      error: 'cache_unavailable',
    });
    expect(mocks.collectItemCacheFootprint).not.toHaveBeenCalled();
  });

  it('returns the full preview shape on success', async () => {
    process.env.CACHE_INVALIDATION_SECRET = 'test-secret';
    mocks.redis = { pipeline: vi.fn().mockReturnValue(fakePipeline([1, 0])) };
    mocks.collectItemCacheFootprint.mockResolvedValue({
      itemIds: ['10', '20'],
      descendantIds: ['20'],
      cacheKeys: [
        'rock:ContentChannelItems:aaa',
        'rock:ContentChannelItems:bbb',
      ],
      indexKeys: ['cfitem:10', 'cfchildren:10', 'cfitem:20', 'cfchildren:20'],
    });

    const response = await loader(createLoaderArgs());

    expect(readStatus(response)).toBe(200);
    expect(readData(response)).toEqual({
      success: true,
      id: '10',
      itemIds: ['10', '20'],
      descendantIds: ['20'],
      indexedCacheKeyCount: 2,
      liveCacheKeyCount: 1,
      indexKeyCount: 4,
      cacheKeys: [
        'rock:ContentChannelItems:aaa',
        'rock:ContentChannelItems:bbb',
      ],
      cacheKeysTruncated: false,
    });
    expect(mocks.invalidateItem).not.toHaveBeenCalled();
  });

  it('truncates cacheKeys past 100 and flags cacheKeysTruncated', async () => {
    process.env.CACHE_INVALIDATION_SECRET = 'test-secret';
    const manyKeys = Array.from({ length: 150 }, (_, i) => `rock:Foo:${i}`);
    mocks.redis = {
      pipeline: vi.fn().mockReturnValue(fakePipeline(manyKeys.map(() => 1))),
    };
    mocks.collectItemCacheFootprint.mockResolvedValue({
      itemIds: ['10'],
      descendantIds: [],
      cacheKeys: manyKeys,
      indexKeys: ['cfitem:10', 'cfchildren:10'],
    });

    const response = await loader(createLoaderArgs());
    const body = readData(response) as {
      cacheKeys: string[];
      cacheKeysTruncated: boolean;
      indexedCacheKeyCount: number;
    };

    expect(body.cacheKeys).toHaveLength(100);
    expect(body.cacheKeysTruncated).toBe(true);
    expect(body.indexedCacheKeyCount).toBe(150);
  });

  it('returns a JSON 500 instead of a rejected promise when the footprint collector rejects', async () => {
    process.env.CACHE_INVALIDATION_SECRET = 'test-secret';
    mocks.redis = { pipeline: vi.fn() };
    mocks.collectItemCacheFootprint.mockRejectedValue(new Error('redis blip'));

    const response = await loader(createLoaderArgs());

    expect(readStatus(response)).toBe(500);
    expect(readData(response)).toEqual({
      success: false,
      error: 'internal_error',
    });
  });

  it('sets Cache-Control: no-store on a successful preview response', async () => {
    process.env.CACHE_INVALIDATION_SECRET = 'test-secret';
    mocks.redis = { pipeline: vi.fn().mockReturnValue(fakePipeline([])) };
    mocks.collectItemCacheFootprint.mockResolvedValue({
      itemIds: ['10'],
      descendantIds: [],
      cacheKeys: [],
      indexKeys: ['cfitem:10', 'cfchildren:10'],
    });

    const response = await loader(createLoaderArgs());

    expect(readHeaders(response)).toMatchObject({
      'Cache-Control': 'no-store',
      Vary: 'x-cache-secret',
    });
  });

  it('never calls invalidateItem — the loader only previews', async () => {
    process.env.CACHE_INVALIDATION_SECRET = 'test-secret';
    mocks.redis = { pipeline: vi.fn().mockReturnValue(fakePipeline([])) };
    mocks.collectItemCacheFootprint.mockResolvedValue({
      itemIds: ['10'],
      descendantIds: [],
      cacheKeys: [],
      indexKeys: ['cfitem:10', 'cfchildren:10'],
    });

    await loader(createLoaderArgs());

    expect(mocks.invalidateItem).not.toHaveBeenCalled();
  });
});
