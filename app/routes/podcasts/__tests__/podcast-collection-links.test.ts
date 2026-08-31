import { describe, expect, it } from 'vitest';

import { getPodcastCollectionHref } from '../utils/podcast-links';

const SHOW_CHANNEL_ID = '179';

const resolve = (
  overrides: Partial<Parameters<typeof getPodcastCollectionHref>[0]>,
) =>
  getPodcastCollectionHref({
    channelId: '191',
    showChannelId: SHOW_CHANNEL_ID,
    showPath: '',
    episodePath: '',
    ...overrides,
  });

describe('getPodcastCollectionHref', () => {
  // An episode URL without its show segment (/podcasts/season-1-episode-15)
  // does not match the /podcasts/:show/:episode route, so a card built that way
  // sends people to a 404. The show slug must come from the routing index.
  it('prefixes an episode with the show slug resolved for its channel', () => {
    expect(
      resolve({
        channelId: '191',
        episodePath: 'season-1-episode-15',
        episodeShowPath: 'made-for-more',
      }),
    ).toBe('/podcasts/made-for-more/season-1-episode-15');
  });

  // Rock authors sometimes save slugs with a leading slash; the joined URL must
  // not end up with a double slash that breaks the route match.
  it('strips leading slashes from both segments', () => {
    expect(
      resolve({
        episodePath: '/season-1-episode-15',
        episodeShowPath: '/made-for-more',
      }),
    ).toBe('/podcasts/made-for-more/season-1-episode-15');
  });

  // Show items are a single segment by design — /podcasts/:show is a real route.
  it('routes a show item to a single-segment show URL', () => {
    expect(
      resolve({ channelId: SHOW_CHANNEL_ID, showPath: 'made-for-more' }),
    ).toBe('/podcasts/made-for-more');
  });

  // Returning null (rather than a guessed URL) is what lets callers drop the
  // card instead of publishing a link that 404s.
  it('returns null when the episode channel has no resolved show', () => {
    expect(
      resolve({ channelId: '191', episodePath: 'season-1-episode-15' }),
    ).toBeNull();
  });

  it('returns null when an item has no slug at all', () => {
    expect(resolve({ episodeShowPath: 'made-for-more' })).toBeNull();
    expect(resolve({ channelId: SHOW_CHANNEL_ID, showPath: '  ' })).toBeNull();
  });
});
