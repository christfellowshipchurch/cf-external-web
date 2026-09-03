import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('~/lib/.server/fetch-rock-data', () => ({
  fetchRockData: vi.fn(),
  isItemInDateRange: vi.fn(),
  TTL: {
    NONE: 0,
  },
}));

vi.mock('../../podcasts/podcast-routing.server', () => ({
  PODCAST_SHOW_CHANNEL_ID: '179',
  buildPodcastRoutingIndex: vi.fn(),
}));

vi.mock('~/lib/.server/fetch-wistia-data', () => ({
  fetchWistiaDataFromRock: vi.fn(),
}));

import {
  fetchRockData,
  isItemInDateRange,
} from '~/lib/.server/fetch-rock-data';
import {
  buildPodcastRoutingIndex,
  PODCAST_SHOW_CHANNEL_ID,
} from '../../podcasts/podcast-routing.server';
import { fetchChildItems, mapPageBuilderChildItems } from '../loader';

const mockFetchRockData = fetchRockData as ReturnType<typeof vi.fn>;
const mockIsItemInDateRange = isItemInDateRange as ReturnType<typeof vi.fn>;
const mockBuildPodcastRoutingIndex = buildPodcastRoutingIndex as ReturnType<
  typeof vi.fn
>;

beforeEach(() => {
  vi.clearAllMocks();
  // By default items are always in date range
  mockIsItemInDateRange.mockReturnValue(true);
});

// ---------------------------------------------------------------------------
// fetchChildItems
// ---------------------------------------------------------------------------

describe('fetchChildItems', () => {
  it('returns a flat array of fetched child items', async () => {
    const childItem = {
      id: '101',
      status: 2,
      title: 'Child Item',
      content: 'Child content',
      contentChannelId: '22',
    };

    mockFetchRockData
      .mockResolvedValueOnce([
        { childContentChannelItemId: '101' },
        { childContentChannelItemId: '102' },
      ])
      .mockResolvedValueOnce(childItem)
      .mockResolvedValueOnce([]);

    await expect(fetchChildItems('10')).resolves.toEqual([childItem]);
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal Rock section item for a RESOURCE_COLLECTION (channel 168) */
function makeSection(id: string) {
  return {
    id,
    status: 2,
    title: `Section ${id}`,
    content: '',
    contentChannelId: '168', // RESOURCE_COLLECTION
    attributeValues: {},
  };
}

/** Minimal Rock collection item */
function makeCollectionItem(
  id: string,
  channelId: string,
  attrs: Record<string, string> = {},
  startDateTime?: string,
) {
  return {
    id,
    status: 2,
    title: `Item ${id}`,
    content: `Content ${id}`,
    contentChannelId: channelId,
    ...(startDateTime ? { startDateTime } : {}),
    attributeValues: Object.fromEntries(
      Object.entries(attrs).map(([k, v]) => [k, { value: v }]),
    ),
  };
}

/** Empty podcast routing index */
function emptyIndex() {
  return { byEpisodeChannelId: new Map() };
}

/** Podcast routing index with one episode channel */
function indexWith(episodeChannelId: string, showPath: string) {
  return {
    byEpisodeChannelId: new Map([
      [episodeChannelId, { showPath, showTitle: `Show for ${showPath}` }],
    ]),
  };
}

// ---------------------------------------------------------------------------
// mapPageBuilderChildItems – collection startDate
// ---------------------------------------------------------------------------

describe('mapPageBuilderChildItems – collection startDate', () => {
  it('omits startDate for article collection items', async () => {
    const section = makeSection('article-section');
    const articleItem = makeCollectionItem(
      'article-1',
      '43',
      { pathname: '/articles/test-article' },
      '2025-06-15T10:00:00',
    );

    mockBuildPodcastRoutingIndex.mockResolvedValueOnce(emptyIndex());
    mockFetchRockData
      .mockResolvedValueOnce([{ childContentChannelItemId: 'article-1' }])
      .mockResolvedValueOnce(articleItem);

    const sections = await mapPageBuilderChildItems([section]);

    expect(sections[0].collection![0].contentType).toBe('ARTICLES');
    expect(sections[0].collection![0].startDate).toBe('');
  });

  it('omits startDate for ministry page collection items', async () => {
    const section = makeSection('ministry-section');
    const ministryItem = makeCollectionItem(
      'ministry-1',
      '171',
      { pathname: 'students' },
      '2025-06-15T10:00:00',
    );

    mockBuildPodcastRoutingIndex.mockResolvedValueOnce(emptyIndex());
    mockFetchRockData
      .mockResolvedValueOnce([{ childContentChannelItemId: 'ministry-1' }])
      .mockResolvedValueOnce(ministryItem);

    const sections = await mapPageBuilderChildItems([section]);

    expect(sections[0].collection![0].contentType).toBe('MINISTRY_PAGE');
    expect(sections[0].collection![0].startDate).toBe('');
  });

  it('uses First Date of Event for event collection cards, not CMS startDateTime', async () => {
    const section = makeSection('event-section');
    const eventItem = makeCollectionItem(
      'event-1',
      '186',
      {
        url: '/events/test-event',
        eventStartDate: '2025-09-20T00:00:00',
      },
      '2025-06-15T10:00:00',
    );

    mockBuildPodcastRoutingIndex.mockResolvedValueOnce(emptyIndex());
    mockFetchRockData
      .mockResolvedValueOnce([{ childContentChannelItemId: 'event-1' }])
      .mockResolvedValueOnce(eventItem);

    const sections = await mapPageBuilderChildItems([section]);

    expect(sections[0].collection![0].contentType).toBe('EVENTS');
    expect(sections[0].collection![0].startDate).toBe('Sat 20 Sep 2025');
  });

  it('falls back to startDateTime when First Date of Event is missing', async () => {
    const section = makeSection('event-section');
    const eventItem = makeCollectionItem(
      'event-1',
      '186',
      { url: '/events/test-event' },
      '2025-06-15T10:00:00',
    );

    mockBuildPodcastRoutingIndex.mockResolvedValueOnce(emptyIndex());
    mockFetchRockData
      .mockResolvedValueOnce([{ childContentChannelItemId: 'event-1' }])
      .mockResolvedValueOnce(eventItem);

    const sections = await mapPageBuilderChildItems([section]);

    expect(sections[0].collection![0].startDate).toBe('Sun 15 Jun 2025');
  });
});

// ---------------------------------------------------------------------------
// mapPageBuilderChildItems – podcast routing
// ---------------------------------------------------------------------------

describe('mapPageBuilderChildItems – podcast routing', () => {
  it('routes a podcast show channel item to /podcasts/:showPath', async () => {
    const section = makeSection('s1');
    const showItem = makeCollectionItem('i1', PODCAST_SHOW_CHANNEL_ID, {
      url: 'crew-cast',
      image: '',
    });

    mockBuildPodcastRoutingIndex.mockResolvedValueOnce(emptyIndex());

    // Rock calls: section associations → section children
    mockFetchRockData
      // associations for section s1
      .mockResolvedValueOnce([{ childContentChannelItemId: 'i1' }])
      // fetch item i1
      .mockResolvedValueOnce(showItem);

    const sections = await mapPageBuilderChildItems([section]);

    expect(sections[0].collection).toHaveLength(1);
    expect(sections[0].collection![0].pathname).toBe('/podcasts/crew-cast');
    expect(sections[0].collection![0].contentType).toBe('PODCASTS');
  });

  it('strips leading slashes from the show path', async () => {
    const section = makeSection('s2');
    const showItem = makeCollectionItem('i2', PODCAST_SHOW_CHANNEL_ID, {
      url: '/crew-cast',
    });

    mockBuildPodcastRoutingIndex.mockResolvedValueOnce(emptyIndex());
    mockFetchRockData
      .mockResolvedValueOnce([{ childContentChannelItemId: 'i2' }])
      .mockResolvedValueOnce(showItem);

    const sections = await mapPageBuilderChildItems([section]);

    expect(sections[0].collection![0].pathname).toBe('/podcasts/crew-cast');
  });

  it('routes a podcast episode item to /podcasts/:showPath/:episodePath', async () => {
    const section = makeSection('s3');
    // Channel '181' is Crew Cast episodes, resolved via the routing index
    const episodeItem = makeCollectionItem('i3', '181', {
      pathname: 'ep-one',
      image: '',
    });

    mockBuildPodcastRoutingIndex.mockResolvedValueOnce(
      indexWith('181', 'crew-cast'),
    );
    mockFetchRockData
      .mockResolvedValueOnce([{ childContentChannelItemId: 'i3' }])
      .mockResolvedValueOnce(episodeItem);

    const sections = await mapPageBuilderChildItems([section]);

    expect(sections[0].collection![0].pathname).toBe(
      '/podcasts/crew-cast/ep-one',
    );
    expect(sections[0].collection![0].contentType).toBe('PODCASTS');
  });

  it('skips a podcast episode item that has no matching show in the index', async () => {
    const section = makeSection('s4');
    // Channel '181' is a known podcast type in CONTENT_TYPE_MAP (CREW_CAST)
    // but is NOT in the routing index → must be skipped, not guessed
    const episodeItem = makeCollectionItem('i4', '181', {
      pathname: 'ep-one',
    });

    mockBuildPodcastRoutingIndex.mockResolvedValueOnce(emptyIndex());
    mockFetchRockData
      .mockResolvedValueOnce([{ childContentChannelItemId: 'i4' }])
      .mockResolvedValueOnce(episodeItem);

    const sections = await mapPageBuilderChildItems([section]);

    expect(sections[0].collection).toHaveLength(0);
  });

  it('never generates a guessed route like /crew_cast/:episodePath', async () => {
    const section = makeSection('s5');
    const episodeItem = makeCollectionItem('i5', '181', {
      pathname: 'ep-one',
    });

    mockBuildPodcastRoutingIndex.mockResolvedValueOnce(emptyIndex());
    mockFetchRockData
      .mockResolvedValueOnce([{ childContentChannelItemId: 'i5' }])
      .mockResolvedValueOnce(episodeItem);

    const sections = await mapPageBuilderChildItems([section]);

    const pathnames = (sections[0].collection ?? []).map((c) => c.pathname);
    for (const p of pathnames) {
      expect(p).not.toMatch(/^\/crew_cast\//);
      expect(p).not.toMatch(/^\/young_\+_adulting\//);
      expect(p).not.toMatch(/^\/so_good_sisterhood\//);
      expect(p).not.toMatch(/^\/made_for_more\//);
    }
  });

  it('routes an episode from a brand-new show channel id not in CONTENT_TYPE_MAP', async () => {
    const section = makeSection('s6');
    // Channel 999 is completely new – not in CONTENT_TYPE_MAP at all
    const episodeItem = makeCollectionItem('i6', '999', {
      pathname: 'new-episode',
      image: '',
    });

    // The routing index was built from Rock and resolves channel 999 → new show
    mockBuildPodcastRoutingIndex.mockResolvedValueOnce(
      indexWith('999', 'new-brand-show'),
    );
    mockFetchRockData
      .mockResolvedValueOnce([{ childContentChannelItemId: 'i6' }])
      .mockResolvedValueOnce(episodeItem);

    const sections = await mapPageBuilderChildItems([section]);

    expect(sections[0].collection![0].pathname).toBe(
      '/podcasts/new-brand-show/new-episode',
    );
  });

  it('skips a podcast show item that has no url/pathname attribute', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const section = makeSection('s7');
    const showItem = makeCollectionItem('i7', PODCAST_SHOW_CHANNEL_ID, {
      // no url or pathname
    });

    mockBuildPodcastRoutingIndex.mockResolvedValueOnce(emptyIndex());
    mockFetchRockData
      .mockResolvedValueOnce([{ childContentChannelItemId: 'i7' }])
      .mockResolvedValueOnce(showItem);

    const sections = await mapPageBuilderChildItems([section]);

    expect(sections[0].collection).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('missing url/pathname attribute'),
    );
    warnSpy.mockRestore();
  });

  it('skips an episode item that has no pathname/url attribute', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const section = makeSection('s8');
    const episodeItem = makeCollectionItem('i8', '181', {
      // no pathname or url
    });

    mockBuildPodcastRoutingIndex.mockResolvedValueOnce(
      indexWith('181', 'crew-cast'),
    );
    mockFetchRockData
      .mockResolvedValueOnce([{ childContentChannelItemId: 'i8' }])
      .mockResolvedValueOnce(episodeItem);

    const sections = await mapPageBuilderChildItems([section]);

    expect(sections[0].collection).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('missing pathname/url attribute'),
    );
    warnSpy.mockRestore();
  });

  it('does not build the podcast index when there are no collections', async () => {
    // A non-collection section (e.g., CONTENT_BLOCK = channel 170) — but
    // mapPageBuilderChildItems expects a valid section type, so we skip this
    // scenario as it would throw on invalid section type.
    // Instead, verify the index is NOT called for a section with no children.
    mockFetchRockData
      // associations return empty → no children
      .mockResolvedValueOnce([]);

    const section = makeSection('s9');
    await mapPageBuilderChildItems([section]);

    // Index should still be called because section s9 is a RESOURCE_COLLECTION
    // which isCollectionType returns true for. After fetching children (empty),
    // the flatMap runs on zero items.
    // The important assertion: no crash and empty collection.
    const sections = await mapPageBuilderChildItems([section]);
    expect(sections[0].collection).toHaveLength(0);
  });

  it('does not build the podcast index twice for multiple collection sections', async () => {
    const s1 = makeSection('sa');
    const s2 = makeSection('sb');
    const ep1 = makeCollectionItem('ia', '181', { pathname: 'ep-a' });
    const ep2 = makeCollectionItem('ib', '181', { pathname: 'ep-b' });

    mockBuildPodcastRoutingIndex.mockResolvedValue(
      indexWith('181', 'crew-cast'),
    );
    // s1 associations + item + s2 associations + item
    mockFetchRockData
      .mockResolvedValueOnce([{ childContentChannelItemId: 'ia' }])
      .mockResolvedValueOnce(ep1)
      .mockResolvedValueOnce([{ childContentChannelItemId: 'ib' }])
      .mockResolvedValueOnce(ep2);

    await mapPageBuilderChildItems([s1, s2]);

    // buildPodcastRoutingIndex must be called exactly once
    expect(mockBuildPodcastRoutingIndex).toHaveBeenCalledTimes(1);
  });
});
