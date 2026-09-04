import type { ActionFunctionArgs } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { action } from '../api.admin.cache';

const mocks = vi.hoisted(() => ({
  fetchRockData: vi.fn(),
  invalidateItem: vi.fn(),
}));

vi.mock('~/lib/.server/redis-config', () => ({ default: {} }));
vi.mock('~/lib/.server/fetch-rock-data', () => ({
  fetchRockData: mocks.fetchRockData,
}));
vi.mock('~/lib/.server/cache-utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/lib/.server/cache-utils')>()),
  invalidateItem: mocks.invalidateItem,
}));

const createArgs = (id = '10', secret = 'test-secret') =>
  ({
    request: new Request(`http://localhost/api/admin/cache?id=${id}`, {
      method: 'POST',
      headers: { 'x-cache-secret': secret },
    }),
    params: {},
    context: {},
  }) as ActionFunctionArgs;

const readData = (response: unknown) => (response as { data: unknown }).data;
const readStatus = (response: unknown) =>
  (response as { init?: { status?: number } }).init?.status;

describe('admin content cache invalidation', () => {
  beforeEach(() => {
    process.env.CACHE_INVALIDATION_SECRET = 'test-secret';
    mocks.fetchRockData.mockReset();
    mocks.invalidateItem.mockReset();
  });

  it('uses uncached live relationships and returns discovery diagnostics', async () => {
    mocks.fetchRockData.mockResolvedValue([
      { contentChannelItemId: 10, childContentChannelItemId: 20 },
      { contentChannelItemId: 99, childContentChannelItemId: 30 },
    ]);
    mocks.invalidateItem.mockImplementation(async (_redis, _id, options) => {
      expect(await options.resolveChildItemIds('10')).toEqual(['20']);
      return {
        deletedKeys: 2,
        visitedItemIds: ['10', '20'],
        cachedRelationships: 1,
        liveRelationships: 1,
      };
    });

    const response = await action(createArgs());

    expect(mocks.fetchRockData).toHaveBeenCalledWith({
      endpoint: 'ContentChannelItemAssociations',
      queryParams: {
        $filter: 'ContentChannelItemId eq 10',
        $orderby: 'Order',
      },
      ttl: 0,
    });
    expect(readData(response)).toEqual({
      success: true,
      id: '10',
      deletedKeys: 2,
      visitedItems: 2,
      cachedRelationships: 1,
      liveRelationships: 1,
    });
  });

  it('returns 502 when relationship discovery fails', async () => {
    mocks.invalidateItem.mockRejectedValue(new Error('Rock unavailable'));

    const response = await action(createArgs());

    expect(readStatus(response)).toBe(502);
    expect(readData(response)).toEqual({
      success: false,
      error: 'relationship_discovery_failed',
    });
  });

  it('does not discover or mutate cache for unauthorized requests', async () => {
    const response = await action(createArgs('10', 'wrong-secret'));

    expect(readStatus(response)).toBe(401);
    expect(mocks.fetchRockData).not.toHaveBeenCalled();
    expect(mocks.invalidateItem).not.toHaveBeenCalled();
  });

  it('rejects partially numeric ids before building a Rock filter', async () => {
    const response = await action(createArgs('10abc'));

    expect(readStatus(response)).toBe(400);
    expect(mocks.invalidateItem).not.toHaveBeenCalled();
  });
});
