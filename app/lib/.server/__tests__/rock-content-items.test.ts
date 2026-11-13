import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const redisStore = vi.hoisted(() => ({
  values: new Map<string, string>(),
  sets: new Map<string, Set<string>>(),
}));

vi.mock('../redis-config', () => {
  const sadd = (key: string, member: string) => {
    const set = redisStore.sets.get(key) ?? new Set<string>();
    set.add(member);
    redisStore.sets.set(key, set);
  };
  return {
    default: {
      get: vi.fn(async (key: string) => redisStore.values.get(key) ?? null),
      set: vi.fn(async (key: string, value: string) => {
        redisStore.values.set(key, value);
      }),
      pipeline: () => {
        const ops: (() => void)[] = [];
        const pipeline = {
          set: (key: string, value: string) => {
            ops.push(() => redisStore.values.set(key, value));
            return pipeline;
          },
          sadd: (key: string, member: string) => {
            ops.push(() => sadd(key, member));
            return pipeline;
          },
          expire: () => pipeline,
          exec: async () => ops.forEach((op) => op()),
        };
        return pipeline;
      },
    },
  };
});

vi.mock('../fetch-rock-data', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchRockData: vi.fn(),
}));

import { fetchRockData } from '../fetch-rock-data';
import { getImages } from '../rock-utils';
import {
  fetchChildContentItems,
  fetchContentItems,
} from '../rock-content-items';
import { odataFilterToLinq } from '../rock-v2-search';
import { fetchDefinedValuesByAttribute } from '../rock-defined-values';
import { fetchChurchRolesByPreferenceAreaGuid } from '~/routes/volunteer/church-serving-area/church-roles.server';
import type {
  attributeProps,
  attributeValuesProps,
} from '~/lib/types/rock-types';

const PAST = '2020-07-01T00:00:00-04:00';
const FUTURE = '2999-01-01T00:00:00-04:00';
const STATUS = { Status: { '2': 'Approved' } };

const okResponse = (data: unknown) => ({
  ok: true,
  status: 200,
  json: async () => data,
  text: async () => JSON.stringify(data),
});

const stubSearch = (items: unknown[]) => {
  global.fetch = vi
    .fn()
    .mockResolvedValue(okResponse({ count: items.length, items }));
};

const sentBody = (call = 0) =>
  JSON.parse(String(vi.mocked(global.fetch).mock.calls[call][1]?.body));

beforeEach(() => {
  vi.clearAllMocks();
  redisStore.values.clear();
  redisStore.sets.clear();
  vi.stubEnv('ROCK_V2_ENABLED', 'true');
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('ROCK_API', 'https://rock.example.com/api/');
  vi.stubEnv('SHOW_UNAPPROVED_CONTENT', '');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.mocked(fetchRockData).mockResolvedValue('v1');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('odataFilterToLinq', () => {
  it('translates the filters the site sends', () => {
    expect(
      odataFilterToLinq(
        "(ContentChannelId eq 1 or ContentChannelId eq 2) and Status eq '2' and Id ne 7",
        STATUS,
      ),
    ).toBe(
      '(ContentChannelId == 1 || ContentChannelId == 2) && Status == "Approved" && Id != 7',
    );
  });

  it('translates Guid, date and null literals', () => {
    expect(
      odataFilterToLinq(
        "Guid eq guid'1b5c2e3d-4f5a-6b7c-8d9e-0f1a2b3c4d5e' and StartDateTime le datetime'2026-11-10T16:05:09' and (ExpireDateTime eq null)",
      ),
    ).toBe(
      'Guid == "1b5c2e3d-4f5a-6b7c-8d9e-0f1a2b3c4d5e" && StartDateTime <= DateTime(2026, 11, 10, 16, 5, 9) && (ExpireDateTime == null)',
    );
  });

  it('escapes quotes inside string values', () => {
    expect(odataFilterToLinq("Title eq 'It''s \"here\"'")).toBe(
      'Title == "It\'s \\"here\\""',
    );
  });

  // Anything it doesn't know must reach v1, never Rock as a guess.
  it.each(["substringof('a', Title)", 'Id eq 1; drop', 'Photo/Path eq 1'])(
    'refuses %s',
    (filter) => {
      expect(() => odataFilterToLinq(filter)).toThrow();
    },
  );
});

describe('fetchContentItems', () => {
  it('runs only v1 when v2 is off', async () => {
    vi.stubEnv('ROCK_V2_ENABLED', 'false');
    const options = { endpoint: 'ContentChannelItems', queryParams: {} };

    await expect(fetchContentItems(options)).resolves.toBe('v1');
    expect(fetchRockData).toHaveBeenCalledWith(options);
  });

  it('sends the v1 query as a search', async () => {
    stubSearch([]);

    await fetchContentItems({
      endpoint: 'ContentChannelItems',
      queryParams: {
        $filter: 'ContentChannelId eq 63',
        $orderby: 'StartDateTime desc',
        $top: '1',
        loadAttributes: 'simple',
      },
      filterByStatusApproved: true,
    });

    expect(vi.mocked(global.fetch).mock.calls[0][0]).toBe(
      'https://rock.example.com/api/v2/models/contentchannelitems/search/contentchannelitems',
    );
    const body = sentBody();
    expect(body.where).toBe(
      '((ContentChannelId == 63) && (Status == "Approved"))',
    );
    expect(body.sort).toBe('StartDateTime desc');
    expect(body.limit).toBe(1);
    expect(body.select).toContain('ContentChannelItemAttributeValues.Select(');
  });

  it('drops the Approved filter in preview mode, as v1 does', async () => {
    vi.stubEnv('SHOW_UNAPPROVED_CONTENT', 'true');
    stubSearch([]);

    await fetchContentItems({
      endpoint: 'ContentChannelItems',
      queryParams: {
        $filter: "ContentChannelId eq 190 and Status eq 'Approved'",
      },
    });

    expect(sentBody().where).toBe('(ContentChannelId == 190)');
  });

  it('returns rows in the v1 shape: one row unwrapped, numeric status, no offsets', async () => {
    stubSearch([
      {
        id: 5,
        contentChannelId: 63,
        title: 'Live',
        status: 'Approved',
        startDateTime: PAST,
        attributeValues: [
          { key: 'CoverImage', value: 'image-guid', textValue: '' },
        ],
      },
    ]);

    const item = await fetchContentItems({
      endpoint: 'ContentChannelItems',
      queryParams: { $filter: 'Id eq 5', loadAttributes: 'simple' },
    });

    expect(item).toMatchObject({
      id: 5,
      status: 2,
      startDateTime: '2020-07-01T00:00:00',
    });
    // v2 sends no attribute definitions; without keys getImages finds no cover image.
    expect(
      getImages({
        attributeValues: item.attributeValues as attributeValuesProps,
        attributes: item.attributes as attributeProps,
      }),
    ).toHaveLength(1);
  });

  it('asks v1 when a by-Id read returns another item', async () => {
    stubSearch([{ id: 6 }]);

    await expect(
      fetchContentItems({
        endpoint: 'ContentChannelItems',
        queryParams: { $filter: 'Id eq 5' },
      }),
    ).resolves.toBe('v1');
  });

  it('caps rows at $top even if Rock ignores the limit', async () => {
    stubSearch([{ id: 1 }, { id: 2 }, { id: 3 }]);

    await expect(
      fetchContentItems({
        endpoint: 'ContentChannelItems',
        queryParams: { $top: '2' },
      }),
    ).resolves.toEqual([{ id: 1 }, { id: 2 }]);
  });

  describe('attribute lookups', () => {
    const lookup = (attributeKey: string) => ({
      endpoint: 'ContentChannelItems/GetByAttributeValue',
      queryParams: {
        attributeKey,
        value: 'my-"page"',
        $filter: 'ContentChannelId eq 63',
      },
      filterByDateRange: true,
    });

    it('filters on the attribute value inside the search', async () => {
      stubSearch([{ id: 1, startDateTime: PAST, lookupValue: 'my-"page"' }]);

      await expect(
        fetchContentItems(lookup('Url')),
      ).resolves.not.toHaveProperty('lookupValue');

      expect(sentBody().where).toBe(
        '(ContentChannelId == 63) && ContentChannelItemAttributeValues.Any(av => av.Key == "Url" && av.Value == "my-\\"page\\"")',
      );
    });

    // v1's GetByAttributeValue drops scheduled and expired items in memory.
    it('skips items outside their date range', async () => {
      stubSearch([
        {
          id: 1,
          title: 'Scheduled',
          startDateTime: FUTURE,
          lookupValue: 'my-"page"',
        },
        { id: 2, title: 'Live', startDateTime: PAST, lookupValue: 'my-"page"' },
      ]);

      await expect(fetchContentItems(lookup('Url'))).resolves.toMatchObject({
        title: 'Live',
      });
    });

    // A search that ignored its `where` must not render another page.
    it('asks v1 when a row has another attribute value', async () => {
      stubSearch([{ id: 1, startDateTime: PAST, lookupValue: 'other-page' }]);

      await expect(fetchContentItems(lookup('Url'))).resolves.toBe('v1');
    });

    // A miss falls back to v1, so a misbehaving search can't 404 a real page.
    it('asks v1 when a page lookup finds nothing', async () => {
      stubSearch([]);

      await expect(fetchContentItems(lookup('Pathname'))).resolves.toBe('v1');
    });

    it('returns an empty list for other lookups that find nothing', async () => {
      stubSearch([]);

      await expect(fetchContentItems(lookup('MessageSeries'))).resolves.toEqual(
        [],
      );
      expect(fetchRockData).not.toHaveBeenCalled();
    });
  });

  it('keeps paged reads on v1 until Rock’s paging fields are confirmed', async () => {
    global.fetch = vi.fn();

    await expect(
      fetchContentItems({
        endpoint: 'ContentChannelItems',
        queryParams: { $top: '10', $skip: '10' },
      }),
    ).resolves.toBe('v1');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  describe('cache', () => {
    const dateRangeRead = () =>
      fetchContentItems({
        endpoint: 'ContentChannelItems',
        queryParams: { $filter: 'ContentChannelId eq 63' },
        filterByDateRange: true,
        ttl: 60,
      });

    // The admin single-item clear finds keys through cfitem:{id}.
    it('indexes cached responses under each content item', async () => {
      stubSearch([{ id: 11, contentChannelId: 63 }]);

      await dateRangeRead();

      const [key] = [...redisStore.values.keys()];
      expect(key).toMatch(/^rock:v2\/models\/contentchannelitems\//);
      expect(redisStore.sets.get('cfitem:11')).toEqual(new Set([key]));
    });

    it('indexes a by-Id miss under the requested id', async () => {
      stubSearch([]);

      await fetchContentItems({
        endpoint: 'ContentChannelItems',
        queryParams: { $filter: 'Id eq 42' },
        ttl: 60,
      });

      expect(redisStore.sets.get('cfitem:42')?.size).toBe(1);
    });

    it('reuses one key while "now" moves on', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      stubSearch([]);

      vi.setSystemTime(new Date('2026-11-10T15:00:00Z'));
      await dateRangeRead();
      vi.setSystemTime(new Date('2026-11-10T15:05:00Z'));
      await dateRangeRead();
      vi.useRealTimers();

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(sentBody().where).toContain('DateTime(2026, 11, 10, 10, 0, 0)');
    });
  });
});

describe('fetchChildContentItems', () => {
  const child = (id: number, order: number, status: string) => ({
    id,
    contentChannelId: 9,
    status,
    associationOrder: order,
    attributeValues: [],
  });

  it('returns Approved children in association order', async () => {
    stubSearch([
      child(3, 2, 'Approved'),
      child(4, 0, 'PendingApproval'),
      child(5, 1, 'Approved'),
    ]);

    const children = await fetchChildContentItems('10');

    expect(children.map(({ id }) => id)).toEqual([5, 3]);
    expect(children[0]).not.toHaveProperty('associationOrder');
    expect(sentBody().where).toBe(
      'ParentItems.Any(a => a.ContentChannelItemId == 10)',
    );
  });

  it('includes Pending children in preview mode', async () => {
    vi.stubEnv('SHOW_UNAPPROVED_CONTENT', 'true');
    stubSearch([child(4, 0, 'PendingApproval')]);

    await expect(fetchChildContentItems('10')).resolves.toHaveLength(1);
  });

  // Saving the parent or any child (even one still Pending) must clear this read.
  it('indexes the read under the parent and every child', async () => {
    stubSearch([child(3, 0, 'Approved'), child(4, 1, 'PendingApproval')]);
    await fetchChildContentItems('10');

    const [key] = [...redisStore.values.keys()];
    for (const id of ['10', '3', '4']) {
      expect(redisStore.sets.get(`cfitem:${id}`)).toEqual(new Set([key]));
    }
    expect(redisStore.sets.get('cfchildren:10')).toEqual(new Set(['3', '4']));
  });

  it('uses v1 for a parent id that is not a number', async () => {
    vi.mocked(fetchRockData).mockResolvedValue([]);
    global.fetch = vi.fn();

    await expect(fetchChildContentItems('10 or 1 eq 1')).resolves.toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('other attribute lookups', () => {
  it('reads a Defined Value by Url through the definedvalues search', async () => {
    stubSearch([{ guid: 'series-guid', value: 'Series' }]);

    await fetchDefinedValuesByAttribute({
      endpoint: 'DefinedValues/GetByAttributeValue',
      queryParams: { attributeKey: 'Url', value: 'series' },
    });

    expect(vi.mocked(global.fetch).mock.calls[0][0]).toMatch(
      /definedvalues\/search\/definedvalues$/,
    );
    expect(sentBody().where).toBe(
      'DefinedValueAttributeValues.Any(av => av.Key == "Url" && av.Value == "series")',
    );
  });

  it('reads church roles through the camelCase connectionOpportunities search', async () => {
    stubSearch([{ guid: 'role-guid', name: 'Greeter', lookupValue: 'area' }]);

    await expect(fetchChurchRolesByPreferenceAreaGuid('area')).resolves.toEqual(
      [{ id: 'role-guid', title: 'Greeter', description: '' }],
    );
    expect(vi.mocked(global.fetch).mock.calls[0][0]).toMatch(
      /connectionopportunities\/search\/connectionOpportunities$/,
    );
  });
});
