import { fetchContentItems } from '~/lib/.server/rock-content-items';
import { fetchRockEntityByGuid } from '~/lib/.server/fetch-rock-v2';

/**
 * The Rock CMS ContentChannel ID that holds all podcast show items.
 * Every show item on this channel has a `showChannel` attribute (GUID)
 * pointing to the ContentChannel that stores its episodes.
 */
export const PODCAST_SHOW_CHANNEL_ID = '179';

export interface PodcastShowRouteInfo {
  /** The URL slug used in the `/podcasts/:showPath` route */
  showPath: string;
  showTitle: string;
}

export interface PodcastRoutingIndex {
  /**
   * Maps a Rock episode ContentChannel ID (string) to the parent show's
   * routing info. Built by fetching all shows from PODCAST_SHOW_CHANNEL_ID
   * and resolving each show's `showChannel` GUID to a ContentChannel ID.
   */
  byEpisodeChannelId: Map<string, PodcastShowRouteInfo>;
}

interface RockShowItem {
  id: string;
  title: string;
  attributeValues?: {
    url?: { value: string };
    showChannel?: { value: string };
  };
}

/**
 * Fetches all approved podcast show items from Rock, resolves each show's
 * episode ContentChannel ID, and returns a Map keyed by episode channel ID.
 *
 * This index is used by page-builder collection mapping so that episode items
 * can be routed to `/podcasts/:showPath/:episodePath` without hardcoding any
 * show-specific content channel IDs.
 *
 * Caching: results are cached by `fetchRockData`'s Redis layer (default TTL).
 * New shows added in Rock appear after the cache expires.
 */
export async function buildPodcastRoutingIndex(): Promise<PodcastRoutingIndex> {
  const byEpisodeChannelId = new Map<string, PodcastShowRouteInfo>();

  let showItems: RockShowItem[];
  try {
    const raw = await fetchContentItems({
      endpoint: 'ContentChannelItems',
      queryParams: {
        $filter: `ContentChannelId eq ${PODCAST_SHOW_CHANNEL_ID} and Status eq 'Approved'`,
        $orderby: 'Order asc',
        loadAttributes: 'simple',
      },
    });
    const rawArray = Array.isArray(raw) ? raw : raw ? [raw] : [];
    showItems = rawArray as RockShowItem[];
  } catch (err) {
    console.warn('[podcast-routing] Failed to fetch podcast show items:', err);
    return { byEpisodeChannelId };
  }

  await Promise.all(
    showItems.map(async (show) => {
      const showPath = String(show.attributeValues?.url?.value ?? '')
        .trim()
        .replace(/^\/+/, '');
      const episodeChannelGuid = String(
        show.attributeValues?.showChannel?.value ?? '',
      ).trim();

      if (!showPath || !episodeChannelGuid) {
        console.warn(
          `[podcast-routing] Podcast show "${show.title}" (id: ${show.id}) is missing url or showChannel attribute – skipping`,
        );
        return;
      }

      try {
        const channelData = await fetchRockEntityByGuid<{
          id: string | number;
        }>({
          v1Endpoint: 'ContentChannels',
          v2Model: 'contentchannels',
          guid: episodeChannelGuid,
          select: 'Id,Name',
        });

        if (!channelData?.id) {
          console.warn(
            `[podcast-routing] Could not resolve episode channel GUID "${episodeChannelGuid}" for show "${show.title}" – skipping`,
          );
          return;
        }

        const episodeChannelId = String(channelData.id);
        const existing = byEpisodeChannelId.get(episodeChannelId);
        if (existing) {
          console.warn(
            `[podcast-routing] Episode channel ${episodeChannelId} is referenced by both "${existing.showPath}" and "${showPath}" – keeping first, skipping second`,
          );
          return;
        }

        byEpisodeChannelId.set(episodeChannelId, {
          showPath,
          showTitle: show.title,
        });
      } catch (err) {
        console.warn(
          `[podcast-routing] Error resolving episode channel for show "${show.title}":`,
          err,
        );
      }
    }),
  );

  return { byEpisodeChannelId };
}
