import type { ActionFunctionArgs } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { action } from '../api.admin.cache';

const mocks = vi.hoisted(() => ({
  invalidateItem: vi.fn(),
}));

vi.mock('~/lib/.server/redis-config', () => ({ default: null }));
vi.mock('~/lib/.server/cache-utils', () => ({
  invalidateItem: mocks.invalidateItem,
}));

const createArgs = (secret = 'test-secret') =>
  ({
    request: new Request('http://localhost/api/admin/cache?id=10', {
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
});
