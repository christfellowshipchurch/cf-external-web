import { beforeEach, describe, expect, it, vi } from 'vitest';

const { searchForHits, redisGet, redisSet } = vi.hoisted(() => ({
  searchForHits: vi.fn(),
  redisGet: vi.fn(),
  redisSet: vi.fn(),
}));

vi.mock('algoliasearch', () => ({
  algoliasearch: vi.fn(() => ({ searchForHits })),
}));
vi.mock('~/lib/.server/redis-config', () => ({
  default: { get: redisGet, set: redisSet },
}));

import { fetchDefaultSearchHits } from '../default-search-hits.server';

const INDEX = 'test_contentItems';
const LOCATIONS_INDEX = 'test_locations';

function hit(title: string, contentType: string, url: string) {
  return { objectID: `${contentType}-${title}`, title, contentType, url };
}

/** One Algolia response per request in the multi-query. */
function respondWith(...hitGroups: unknown[][]) {
  searchForHits.mockResolvedValue({
    results: hitGroups.map((hits) => ({ hits })),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  redisGet.mockResolvedValue(null);
  redisSet.mockResolvedValue('OK');
  process.env.ALGOLIA_APP_ID = 'test-app-id';
  process.env.ALGOLIA_SEARCH_API_KEY = 'test-search-key';
});

describe('fetchDefaultSearchHits', () => {
  // The order is the product requirement (CFDP-4197): a visitor opening search
  // sees the newest thing to watch, then read, then listen, then what to attend.
  it('orders latest message, article and podcast ahead of the featured events', async () => {
    respondWith(
      [hit('Latest Message', 'Sermon', 'latest-message')],
      [hit('Latest Article', 'Article', 'latest-article')],
      [hit('Latest Episode', 'Podcast', 'latest-episode')],
      [
        hit('Baptism', 'Event', 'baptism'),
        hit('Night of Worship', 'Event', 'night-of-worship'),
      ],
    );

    const { defaultSearchHits: hits } = await fetchDefaultSearchHits(
      INDEX,
      LOCATIONS_INDEX,
    );

    expect(hits.map((h) => h.title)).toEqual([
      'Latest Message',
      'Latest Article',
      'Latest Episode',
      'Baptism',
      'Night of Worship',
    ]);
  });

  // Journey is the church's entry-point class, so it leads the events regardless
  // of where Algolia ranks it.
  it('promotes the Journey event to the front of the featured events', async () => {
    respondWith(
      [hit('Latest Message', 'Sermon', 'latest-message')],
      [],
      [],
      [
        hit('Baptism', 'Event', 'baptism'),
        hit('Journey Class', 'Event', 'journey'),
        hit('Night of Worship', 'Event', 'night-of-worship'),
      ],
    );

    const { defaultSearchHits: hits } = await fetchDefaultSearchHits(
      INDEX,
      LOCATIONS_INDEX,
    );

    expect(hits.map((h) => h.title)).toEqual([
      'Latest Message',
      'Journey Class',
      'Baptism',
      'Night of Worship',
    ]);
  });

  // A hit with no usable path renders as a dead link in the popup.
  it('drops hits that cannot resolve to a link', async () => {
    respondWith(
      [hit('Latest Message', 'Sermon', '  ')],
      [hit('Latest Article', 'Article', 'latest-article')],
      [],
      [],
    );

    const { defaultSearchHits: hits } = await fetchDefaultSearchHits(
      INDEX,
      LOCATIONS_INDEX,
    );

    expect(hits.map((h) => h.title)).toEqual(['Latest Article']);
  });

  // The navbar renders on every page, so a search outage must not break it.
  it('returns an empty list when Algolia fails', async () => {
    searchForHits.mockRejectedValue(new Error('algolia down'));

    await expect(
      fetchDefaultSearchHits(INDEX, LOCATIONS_INDEX),
    ).resolves.toEqual({
      defaultSearchHits: [],
      locationSearchHits: [],
      contentTypeFacets: {},
    });
  });

  it('skips the request entirely without Algolia credentials', async () => {
    delete process.env.ALGOLIA_APP_ID;

    await expect(
      fetchDefaultSearchHits(INDEX, LOCATIONS_INDEX),
    ).resolves.toEqual({
      defaultSearchHits: [],
      locationSearchHits: [],
      contentTypeFacets: {},
    });
    expect(searchForHits).not.toHaveBeenCalled();
  });

  it('batches curated content and campuses into one cached request', async () => {
    const campus = { campusName: 'Jupiter', campusUrl: 'jupiter' };
    respondWith([], [], [], [], [campus]);

    const first = await fetchDefaultSearchHits(INDEX, LOCATIONS_INDEX);
    redisGet.mockResolvedValueOnce(JSON.stringify(first));
    const second = await fetchDefaultSearchHits(INDEX, LOCATIONS_INDEX);

    expect(searchForHits).toHaveBeenCalledTimes(1);
    expect(searchForHits.mock.calls[0][0]).toHaveLength(6);
    expect(first.locationSearchHits).toEqual([campus]);
    expect(second).toEqual(first);
    expect(redisSet).toHaveBeenCalledTimes(1);
  });

  it('includes contentType facets for navbar filter chips', async () => {
    searchForHits.mockResolvedValue({
      results: [
        { hits: [] },
        { hits: [] },
        { hits: [] },
        { hits: [] },
        { hits: [] },
        {
          hits: [],
          facets: { contentType: { Article: 4, Sermon: 2 } },
        },
      ],
    });

    const { contentTypeFacets } = await fetchDefaultSearchHits(
      INDEX,
      LOCATIONS_INDEX,
    );

    expect(contentTypeFacets).toEqual({ Article: 4, Sermon: 2 });
    expect(searchForHits.mock.calls[0][0][5].params).toMatchObject({
      facets: ['contentType'],
      hitsPerPage: 0,
    });
  });
});
