import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('~/lib/.server/rock-content-items', () => ({
  fetchContentItems: vi.fn(),
}));

vi.mock('~/lib/.server/rock-campuses', () => ({
  fetchCampusWithDetails: vi.fn().mockResolvedValue(null),
}));

vi.mock('~/lib/.server/algolia-indexes.server', () => ({
  getServerAlgoliaIndexes: vi.fn(() => ({})),
}));

vi.mock('~/routes/podcasts/podcast-routing.server', () => ({
  buildPodcastRoutingIndex: vi.fn().mockResolvedValue({
    byEpisodeChannelId: new Map([['777', { showPath: 'the-show' }]]),
  }),
}));

import { fetchContentItems } from '~/lib/.server/rock-content-items';
import { loader } from '../loader';

const mockFetchContentItems = fetchContentItems as ReturnType<typeof vi.fn>;

const ARTICLE = {
  title: 'Latest Article',
  startDateTime: '2026-07-29T10:00:00',
  contentChannelId: '43',
  attributeValues: { url: { value: 'latest-article' }, image: { value: '' } },
};

const FUTURE_EPISODE = {
  title: 'Episode Scheduled For Monday',
  startDateTime: '2026-08-03T10:00:00',
  contentChannelId: '777',
  attributeValues: { url: { value: 'monday-episode' }, image: { value: '' } },
};

/**
 * Routes each Rock query to a fixture by its channel filter, since the article,
 * podcast and sermon fetches all run concurrently and have no fixed call order.
 * `episodes` is what Rock returns for the podcast episode channels — the tests
 * use `[]` to represent an episode excluded by the approved/in-window filters.
 */
function mockRockResponses({ episodes }: { episodes: unknown }) {
  mockFetchContentItems.mockImplementation(
    ({ queryParams }: { queryParams: { $filter?: string } }) => {
      const filter = queryParams?.$filter ?? '';
      if (filter.includes('ContentChannelId eq 43')) return ARTICLE;
      if (filter.includes('ContentChannelId eq 777')) return episodes;
      if (filter.includes('ContentChannelId eq 63')) return [];
      return [];
    },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('navbar feature cards', () => {
  it('asks Rock only for approved content whose scheduled window is currently open', async () => {
    mockRockResponses({ episodes: [] });

    await loader();

    expect(mockFetchContentItems).toHaveBeenCalled();
    for (const [options] of mockFetchContentItems.mock.calls) {
      expect(options.filterByDateRange).toBe(true);
      expect(options.filterByStatusApproved).toBe(true);
      // The flags above are what apply the date window; an inline Status clause
      // would satisfy approval without it and let future-dated items through.
      expect(options.queryParams?.$filter ?? '').not.toContain('Status eq');
    }
  });

  it('falls back to the latest article when the newest podcast episode is not live yet', async () => {
    // Rock returns nothing for the episode channels because the only episode is
    // scheduled for a future date, so it fails the in-window filter.
    mockRockResponses({ episodes: [] });

    const { watchReadListen } = await loader();

    expect(watchReadListen.featureCards).toHaveLength(1);
    expect(watchReadListen.featureCards[0]).toMatchObject({
      title: 'Latest Article',
      subtitle: 'New Article',
      callToAction: { title: 'Read Now', url: '/articles/latest-article' },
    });
  });

  it('shows the podcast episode once it is live and newer than the latest article', async () => {
    mockRockResponses({ episodes: FUTURE_EPISODE });

    const { watchReadListen } = await loader();

    expect(watchReadListen.featureCards[0]).toMatchObject({
      title: 'Episode Scheduled For Monday',
      subtitle: 'New Podcast Episode',
      callToAction: {
        title: 'Listen Now',
        url: '/podcasts/the-show/monday-episode',
      },
    });
  });
});
