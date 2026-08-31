import { describe, it, expect, vi } from 'vitest';
import type Redis from 'ioredis';
import {
  buildCacheKey,
  childItemTagKey,
  deleteByPrefix,
  extractContentItemIds,
  extractContentItemRelationships,
  invalidateItem,
  itemTagKey,
  stabilizeFilterForCacheKey,
  TTL,
} from '../cache-utils';

/** Mirrors the clause `buildMergedFilter` injects for filterByDateRange: true */
const dateRangeFilter = (isoNow: string) =>
  `StartDateTime le datetime'${isoNow}' and (ExpireDateTime eq null or ExpireDateTime ge datetime'${isoNow}')`;

describe('TTL constants', () => {
  it('has expected values', () => {
    expect(TTL.NONE).toBe(0);
    expect(TTL.SHORT).toBe(300);
    expect(TTL.DEFAULT).toBe(3600);
    expect(TTL.LONG).toBe(86400);
  });
});

describe('buildCacheKey', () => {
  it('returns a key in rock:{endpoint}:{hash12} format', () => {
    const key = buildCacheKey('People', { $top: '10' });
    expect(key).toMatch(/^rock:People:[a-f0-9]{12}$/);
  });

  it('produces the same key regardless of param ordering', () => {
    const key1 = buildCacheKey('ContentChannelItems', {
      $filter: 'ContentChannelId eq 43',
      $top: '10',
    });
    const key2 = buildCacheKey('ContentChannelItems', {
      $top: '10',
      $filter: 'ContentChannelId eq 43',
    });
    expect(key1).toBe(key2);
  });

  it('produces different keys for different params', () => {
    const key1 = buildCacheKey('People', { $top: '10' });
    const key2 = buildCacheKey('People', { $top: '20' });
    expect(key1).not.toBe(key2);
  });

  it('produces different keys for different endpoints', () => {
    const key1 = buildCacheKey('People', { $top: '10' });
    const key2 = buildCacheKey('Groups', { $top: '10' });
    expect(key1).not.toBe(key2);
  });

  it('excludes undefined values from the hash', () => {
    const key1 = buildCacheKey('People', { $top: '10', $filter: undefined });
    const key2 = buildCacheKey('People', { $top: '10' });
    expect(key1).toBe(key2);
  });

  it('normalizes leading and trailing slashes on the endpoint', () => {
    const key1 = buildCacheKey('People', { $top: '10' });
    const key2 = buildCacheKey('/People/', { $top: '10' });
    const key3 = buildCacheKey('//People', { $top: '10' });
    expect(key1).toBe(key2);
    expect(key1).toBe(key3);
  });

  it('produces a stable key for empty params', () => {
    const key1 = buildCacheKey('People', {});
    const key2 = buildCacheKey('People', {});
    expect(key1).toBe(key2);
    expect(key1).toMatch(/^rock:People:[a-f0-9]{12}$/);
  });

  it('produces identical keys for filterByDateRange queries with different live timestamps', () => {
    const key1 = buildCacheKey('ContentChannelItems', {
      $filter: `(ContentChannelId eq 100) and (${dateRangeFilter('2026-06-29T12:00:00.000Z')})`,
      $top: '1',
      loadAttributes: 'simple',
    });
    const key2 = buildCacheKey('ContentChannelItems', {
      $filter: `(ContentChannelId eq 100) and (${dateRangeFilter('2026-06-29T12:00:01.250Z')})`,
      $top: '1',
      loadAttributes: 'simple',
    });

    expect(key1).toBe(key2);
    expect(key1).toMatch(/^rock:ContentChannelItems:[a-f0-9]{12}$/);
  });

  it('still distinguishes date-range queries from otherwise identical non-date-range queries', () => {
    const withDateRange = buildCacheKey('ContentChannelItems', {
      $filter: `(ContentChannelId eq 100) and (${dateRangeFilter('2026-06-29T12:00:00.000Z')})`,
      $top: '1',
    });
    const withoutDateRange = buildCacheKey('ContentChannelItems', {
      $filter: 'ContentChannelId eq 100',
      $top: '1',
    });

    expect(withDateRange).not.toBe(withoutDateRange);
  });

  it('still distinguishes different non-volatile filter clauses after stabilization', () => {
    const channel100 = buildCacheKey('ContentChannelItems', {
      $filter: `(ContentChannelId eq 100) and (${dateRangeFilter('2026-06-29T12:00:00.000Z')})`,
    });
    const channel43 = buildCacheKey('ContentChannelItems', {
      $filter: `(ContentChannelId eq 43) and (${dateRangeFilter('2026-06-29T12:00:00.000Z')})`,
    });

    expect(channel100).not.toBe(channel43);
  });
});

describe('stabilizeFilterForCacheKey', () => {
  it('replaces volatile date-range timestamps with a stable placeholder', () => {
    const stabilized = stabilizeFilterForCacheKey(
      `(ContentChannelId eq 100) and (${dateRangeFilter('2026-06-29T12:00:00.123Z')})`,
    );

    expect(stabilized).toBe(
      "(ContentChannelId eq 100) and (StartDateTime le datetime'{now}' and (ExpireDateTime eq null or ExpireDateTime ge datetime'{now}'))",
    );
  });

  it('leaves filters without a date-range clause unchanged', () => {
    const filter = "ContentChannelId eq 43 and Status eq 'Approved'";
    expect(stabilizeFilterForCacheKey(filter)).toBe(filter);
  });

  it('returns undefined when filter is undefined', () => {
    expect(stabilizeFilterForCacheKey(undefined)).toBeUndefined();
  });
});

describe('itemTagKey', () => {
  it('namespaces the id under cfitem:', () => {
    expect(itemTagKey(12345)).toBe('cfitem:12345');
    expect(itemTagKey('42')).toBe('cfitem:42');
  });
});

describe('childItemTagKey', () => {
  it('namespaces child relationships separately', () => {
    expect(childItemTagKey(12345)).toBe('cfchildren:12345');
  });
});

describe('extractContentItemRelationships', () => {
  it('extracts association parent-child ids', () => {
    expect(
      extractContentItemRelationships({
        contentChannelItemId: 10,
        childContentChannelItemId: 20,
      }),
    ).toEqual([{ parentId: '10', childId: '20' }]);
  });

  it('ignores content items and incomplete associations', () => {
    expect(
      extractContentItemRelationships([
        { id: 10, contentChannelId: 43 },
        { contentChannelItemId: 10 },
      ]),
    ).toEqual([]);
  });
});

describe('extractContentItemIds', () => {
  // A content item is identified by having BOTH id and contentChannelId. This is
  // what lets us tag only content-channel entries and ignore everything else.
  it('returns the id of a single content item object', () => {
    expect(extractContentItemIds({ id: 7, contentChannelId: 43 })).toEqual([
      '7',
    ]);
  });

  it('returns ids for every item in a list', () => {
    const list = [
      { id: 1, contentChannelId: 43 },
      { id: 2, contentChannelId: 43 },
    ];
    expect(extractContentItemIds(list)).toEqual(['1', '2']);
  });

  it('ignores objects without a contentChannelId (e.g. People, Campuses)', () => {
    // A Person carries an id but no contentChannelId — tagging it would let an
    // unrelated entity collide with a content item in the reverse index.
    expect(extractContentItemIds({ id: 99, email: 'a@b.com' })).toEqual([]);
  });

  it('does not tag nested entities, only the top-level item', () => {
    // The author is a nested object with its own id; only the top-level content
    // item (which has contentChannelId) should be indexed.
    const item = { id: 5, contentChannelId: 43, author: { id: 900 } };
    expect(extractContentItemIds(item)).toEqual(['5']);
  });

  it('coerces numeric and string ids to strings', () => {
    expect(extractContentItemIds({ id: 5, contentChannelId: 43 })).toEqual([
      '5',
    ]);
    expect(extractContentItemIds({ id: '5', contentChannelId: 43 })).toEqual([
      '5',
    ]);
  });

  it('skips items with a null id', () => {
    expect(extractContentItemIds({ id: null, contentChannelId: 43 })).toEqual(
      [],
    );
  });

  it('returns [] for empty arrays, scalars and null', () => {
    expect(extractContentItemIds([])).toEqual([]);
    expect(extractContentItemIds(42)).toEqual([]);
    expect(extractContentItemIds(null)).toEqual([]);
  });
});

describe('invalidateItem', () => {
  it('returns 0 and does nothing when redis is null', async () => {
    expect(await invalidateItem(null, 12345)).toBe(0);
  });

  it('deletes every cache key that contained the item, then the index entry', async () => {
    // Intent: when an editor updates item 12345, every list/aggregate cache
    // entry that included it must be removed — not just its single-item entry.
    const containingKeys = [
      'rock:ContentChannelItems:aaaaaaaaaaaa', // a list page
      'rock:ContentChannelItems/GetByAttributeValue:bbbbbbbbbbbb', // its own page
    ];
    const del = vi.fn();
    const pipeline = { del, exec: vi.fn().mockResolvedValue([[null, 2]]) };
    const redis = {
      smembers: vi.fn((key: string) =>
        Promise.resolve(key === 'cfitem:12345' ? containingKeys : []),
      ),
      pipeline: vi.fn().mockReturnValue(pipeline),
    } as unknown as Redis;

    const deleted = await invalidateItem(redis, 12345);

    expect(redis.smembers).toHaveBeenCalledWith('cfitem:12345');
    expect(redis.smembers).toHaveBeenCalledWith('cfchildren:12345');
    expect(del).toHaveBeenNthCalledWith(1, ...containingKeys);
    expect(del).toHaveBeenNthCalledWith(2, 'cfitem:12345');
    expect(del).toHaveBeenNthCalledWith(3, 'cfchildren:12345');
    expect(deleted).toBe(2);
  });

  it('deletes only the index entry and returns 0 when the item has no cached keys', async () => {
    const del = vi.fn();
    const pipeline = { del, exec: vi.fn().mockResolvedValue([[null, 1]]) };
    const redis = {
      smembers: vi.fn().mockResolvedValue([]),
      pipeline: vi.fn().mockReturnValue(pipeline),
    } as unknown as Redis;

    const deleted = await invalidateItem(redis, 12345);

    expect(del).toHaveBeenCalledTimes(2);
    expect(del).toHaveBeenNthCalledWith(1, 'cfitem:12345');
    expect(del).toHaveBeenNthCalledWith(2, 'cfchildren:12345');
    expect(deleted).toBe(0);
  });

  it('cascades through descendants and counts each deleted cache key once', async () => {
    // Intent: saving a page-builder parent must refresh child sections and
    // nested collection items rendered by that parent.
    const memberships: Record<string, string[]> = {
      'cfitem:10': ['rock:ContentChannelItemAssociations:aaa'],
      'cfchildren:10': ['20'],
      'cfitem:20': ['rock:ContentChannelItems:bbb'],
      'cfchildren:20': ['30'],
      'cfitem:30': [
        'rock:ContentChannelItems:bbb',
        'rock:ContentChannelItems:ccc',
      ],
    };
    const del = vi.fn();
    const pipeline = { del, exec: vi.fn().mockResolvedValue([[null, 3]]) };
    const redis = {
      smembers: vi.fn((key: string) => Promise.resolve(memberships[key] ?? [])),
      pipeline: vi.fn().mockReturnValue(pipeline),
    } as unknown as Redis;

    await expect(invalidateItem(redis, 10)).resolves.toBe(3);

    expect(del).toHaveBeenNthCalledWith(
      1,
      'rock:ContentChannelItemAssociations:aaa',
      'rock:ContentChannelItems:bbb',
      'rock:ContentChannelItems:ccc',
    );
    expect(redis.smembers).toHaveBeenCalledWith('cfchildren:30');
  });

  it('reports Redis-confirmed deletion count when index contains stale keys', async () => {
    const pipeline = {
      del: vi.fn(),
      exec: vi.fn().mockResolvedValue([[null, 1]]),
    };
    const redis = {
      smembers: vi.fn((key: string) =>
        Promise.resolve(
          key === 'cfitem:10'
            ? [
                'rock:ContentChannelItems:live',
                'rock:ContentChannelItems:stale',
              ]
            : [],
        ),
      ),
      pipeline: vi.fn().mockReturnValue(pipeline),
    } as unknown as Redis;

    await expect(invalidateItem(redis, 10)).resolves.toBe(1);
  });
});

describe('deleteByPrefix', () => {
  it('returns 0 without touching redis when redis is null', async () => {
    const result = await deleteByPrefix(null, 'People');
    expect(result).toBe(0);
  });

  it('never calls KEYS — uses SCAN to find matching keys', async () => {
    const keysSpy = vi.fn();
    const scan = vi
      .fn()
      .mockResolvedValue(['0', ['rock:People:aaa', 'rock:People:bbb']]);
    const del = vi.fn().mockResolvedValue(2);
    const fakeRedis = { keys: keysSpy, scan, del } as unknown as Redis;

    const result = await deleteByPrefix(fakeRedis, 'People');

    expect(keysSpy).not.toHaveBeenCalled();
    expect(scan).toHaveBeenCalledWith(
      '0',
      'MATCH',
      'rock:People:*',
      'COUNT',
      100,
    );
    expect(del).toHaveBeenCalledWith('rock:People:aaa', 'rock:People:bbb');
    expect(result).toBe(2);
  });

  it('follows a multi-page scan cursor and deletes all pages in one batch', async () => {
    const scan = vi
      .fn()
      .mockResolvedValueOnce(['42', ['rock:Groups:aaa']])
      .mockResolvedValueOnce(['0', ['rock:Groups:bbb']]);
    const del = vi.fn().mockResolvedValue(2);
    const fakeRedis = { scan, del } as unknown as Redis;

    const result = await deleteByPrefix(fakeRedis, 'Groups');

    expect(scan).toHaveBeenCalledTimes(2);
    expect(scan).toHaveBeenNthCalledWith(
      2,
      '42',
      'MATCH',
      'rock:Groups:*',
      'COUNT',
      100,
    );
    expect(del).toHaveBeenCalledTimes(1);
    expect(del).toHaveBeenCalledWith('rock:Groups:aaa', 'rock:Groups:bbb');
    expect(result).toBe(2);
  });

  it('returns 0 and does not call del when no keys match', async () => {
    const scan = vi.fn().mockResolvedValue(['0', []]);
    const del = vi.fn();
    const fakeRedis = { scan, del } as unknown as Redis;

    const result = await deleteByPrefix(fakeRedis, 'Nonexistent');

    expect(del).not.toHaveBeenCalled();
    expect(result).toBe(0);
  });

  it('normalizes leading and trailing slashes when building the MATCH pattern', async () => {
    const scan = vi.fn().mockResolvedValue(['0', []]);
    const fakeRedis = { scan, del: vi.fn() } as unknown as Redis;

    await deleteByPrefix(fakeRedis, '/People/');

    expect(scan).toHaveBeenCalledWith(
      '0',
      'MATCH',
      'rock:People:*',
      'COUNT',
      100,
    );
  });
});
