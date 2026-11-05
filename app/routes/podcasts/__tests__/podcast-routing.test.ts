import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('~/lib/.server/fetch-rock-data', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchRockData: vi.fn(),
}));

import { fetchRockData } from '~/lib/.server/fetch-rock-data';
import {
  buildPodcastRoutingIndex,
  PODCAST_SHOW_CHANNEL_ID,
} from '../podcast-routing.server';

const mockFetch = fetchRockData as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PODCAST_SHOW_CHANNEL_ID', () => {
  it('is 179', () => {
    expect(PODCAST_SHOW_CHANNEL_ID).toBe('179');
  });
});

describe('buildPodcastRoutingIndex', () => {
  it('maps episode channel IDs to show paths', async () => {
    // First call: fetch show items from channel 179
    mockFetch
      .mockResolvedValueOnce([
        {
          id: '1',
          title: 'Crew Cast',
          attributeValues: {
            url: { value: 'crew-cast' },
            showChannel: { value: '00000000-0000-4000-8000-000000000001' },
          },
        },
        {
          id: '2',
          title: 'Young + Adulting',
          attributeValues: {
            url: { value: 'young-adulting' },
            showChannel: { value: '00000000-0000-4000-8000-000000000003' },
          },
        },
      ])
      // Second call: resolve episode channel for Crew Cast
      .mockResolvedValueOnce({ id: '181', name: 'Crew Cast Episodes' })
      // Third call: resolve episode channel for Young + Adulting
      .mockResolvedValueOnce({ id: '182', name: 'Young Adulting Episodes' });

    const index = await buildPodcastRoutingIndex();

    expect(index.byEpisodeChannelId.get('181')).toEqual({
      showPath: 'crew-cast',
      showTitle: 'Crew Cast',
    });
    expect(index.byEpisodeChannelId.get('182')).toEqual({
      showPath: 'young-adulting',
      showTitle: 'Young + Adulting',
    });
  });

  it('strips leading slashes from show paths', async () => {
    mockFetch
      .mockResolvedValueOnce([
        {
          id: '3',
          title: 'So Good Sisterhood',
          attributeValues: {
            url: { value: '/so-good-sisterhood' },
            showChannel: { value: '00000000-0000-4000-8000-000000000002' },
          },
        },
      ])
      .mockResolvedValueOnce({ id: '188', name: 'Sisterhood Episodes' });

    const index = await buildPodcastRoutingIndex();

    expect(index.byEpisodeChannelId.get('188')?.showPath).toBe(
      'so-good-sisterhood',
    );
  });

  it('warns and skips a show missing the url attribute', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    mockFetch.mockResolvedValueOnce([
      {
        id: '10',
        title: 'Broken Show',
        attributeValues: {
          showChannel: { value: '00000000-0000-4000-8000-000000000006' },
          // url is absent
        },
      },
    ]);

    const index = await buildPodcastRoutingIndex();

    expect(index.byEpisodeChannelId.size).toBe(0);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('missing url or showChannel'),
    );
    warnSpy.mockRestore();
  });

  it('warns and skips a show missing the showChannel attribute', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    mockFetch.mockResolvedValueOnce([
      {
        id: '11',
        title: 'No Channel Show',
        attributeValues: {
          url: { value: 'my-show' },
          // showChannel is absent
        },
      },
    ]);

    const index = await buildPodcastRoutingIndex();

    expect(index.byEpisodeChannelId.size).toBe(0);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('missing url or showChannel'),
    );
    warnSpy.mockRestore();
  });

  it('warns and skips when episode channel GUID cannot be resolved', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    mockFetch
      .mockResolvedValueOnce([
        {
          id: '12',
          title: 'Unresolvable Show',
          attributeValues: {
            url: { value: 'my-show' },
            showChannel: { value: '00000000-0000-4000-8000-000000000000' },
          },
        },
      ])
      // ContentChannels returns empty / no id
      .mockResolvedValueOnce({ id: null });

    const index = await buildPodcastRoutingIndex();

    expect(index.byEpisodeChannelId.size).toBe(0);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Could not resolve episode channel GUID'),
    );
    warnSpy.mockRestore();
  });

  it('warns and keeps the first show when two shows share an episode channel', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    mockFetch
      .mockResolvedValueOnce([
        {
          id: '20',
          title: 'First Show',
          attributeValues: {
            url: { value: 'first-show' },
            showChannel: { value: '00000000-0000-4000-8000-000000000005' },
          },
        },
        {
          id: '21',
          title: 'Second Show',
          attributeValues: {
            url: { value: 'second-show' },
            showChannel: { value: '00000000-0000-4000-8000-000000000005' },
          },
        },
      ])
      .mockResolvedValueOnce({ id: '999', name: 'Shared Channel' })
      .mockResolvedValueOnce({ id: '999', name: 'Shared Channel' });

    const index = await buildPodcastRoutingIndex();

    // Only the first show wins
    expect(index.byEpisodeChannelId.get('999')?.showPath).toBe('first-show');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('is referenced by both'),
    );
    warnSpy.mockRestore();
  });

  it('returns an empty index when the Rock show fetch fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockFetch.mockRejectedValueOnce(new Error('Rock API unavailable'));

    const index = await buildPodcastRoutingIndex();

    expect(index.byEpisodeChannelId.size).toBe(0);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to fetch podcast show items'),
      expect.any(Error),
    );
    warnSpy.mockRestore();
  });

  it('returns an empty index when Rock returns no shows', async () => {
    mockFetch.mockResolvedValueOnce([]);

    const index = await buildPodcastRoutingIndex();

    expect(index.byEpisodeChannelId.size).toBe(0);
  });

  it('handles a new show added to Rock without any code changes', async () => {
    // Simulate a brand-new show whose episode channel ID (999) is not in any
    // CONTENT_TYPE_MAP or hardcoded list.
    mockFetch
      .mockResolvedValueOnce([
        {
          id: '30',
          title: 'New Brand Show',
          attributeValues: {
            url: { value: 'new-brand-show' },
            showChannel: { value: '00000000-0000-4000-8000-000000000004' },
          },
        },
      ])
      .mockResolvedValueOnce({ id: '999', name: 'New Brand Episodes' });

    const index = await buildPodcastRoutingIndex();

    expect(index.byEpisodeChannelId.get('999')).toEqual({
      showPath: 'new-brand-show',
      showTitle: 'New Brand Show',
    });
  });
});
