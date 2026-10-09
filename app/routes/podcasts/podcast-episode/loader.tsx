import { LoaderFunctionArgs } from 'react-router';
import { algoliasearch } from 'algoliasearch';

import { escapeAlgoliaFilterString } from '~/components/finders/finder-algolia.utils';
import { PodcastEpisode, RockPodcastEpisode, WistiaElement } from '../types';
import { fetchRockData } from '~/lib/.server/fetch-rock-data';
import { toRockDateTimeLiteral } from '~/lib/.server/rock-datetime';
import { createImageUrlFromGuid, parseRockKeyValueList } from '~/lib/utils';
import { PODCAST_SHOW_CHANNEL_ID } from '../podcast-routing.server';
import type { ContentItemHit } from '~/routes/search/types';
import { getServerAlgoliaIndexes } from '~/lib/.server/algolia-indexes.server';

// Error messages
const ERROR_MESSAGES = {
  EPISODE_NOT_FOUND: 'Episode not found',
  SHOW_NOT_FOUND: 'Show not found',
  CHANNEL_NOT_FOUND: 'Show Channel not found',
  CHANNEL_FETCH_ERROR: 'Error fetching channel from Rock',
  EPISODE_FETCH_ERROR: 'Error fetching episode from Rock',
  WISTIA_FETCH_ERROR: 'Error fetching Wistia element',
} as const;

export type LoaderReturnType = {
  episode: PodcastEpisode;
  moreEpisodesHits: ContentItemHit[];
  ALGOLIA_APP_ID: string;
  ALGOLIA_SEARCH_API_KEY: string;
};

const MORE_EPISODES_HITS_PER_PAGE = 8;

/**
 * Loader function for podcast episode pages
 */
export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { episode: episodePath, show: showPath } = params;

  // Validate required parameters
  if (!episodePath) {
    throw new Response(ERROR_MESSAGES.EPISODE_NOT_FOUND, { status: 404 });
  }

  if (!showPath) {
    throw new Response(ERROR_MESSAGES.SHOW_NOT_FOUND, { status: 404 });
  }

  // Get the podcast channel
  const showChannel = await getPodcastChannel(showPath);

  if (!showChannel) {
    throw new Response(ERROR_MESSAGES.CHANNEL_NOT_FOUND, { status: 404 });
  }

  // Fetch episode data
  const rockEpisode = await getPodcastEpisode({
    path: episodePath,
    channelId: showChannel.id,
  });

  // Map episode data
  const episode = await mapRockEpisodeToPodcastEpisode(
    rockEpisode,
    showChannel.title,
  );

  // Get Algolia configuration
  const appId = process.env.ALGOLIA_APP_ID;
  const apiKey = process.env.ALGOLIA_SEARCH_API_KEY;
  const algoliaIndexes = getServerAlgoliaIndexes();
  const moreEpisodesHits =
    appId && apiKey
      ? await fetchMoreEpisodesFromAlgolia(
          episode,
          appId,
          apiKey,
          algoliaIndexes.contentItems,
        )
      : [];

  return {
    episode,
    moreEpisodesHits,
    ALGOLIA_APP_ID: appId || '',
    ALGOLIA_SEARCH_API_KEY: apiKey || '',
  } satisfies LoaderReturnType;
};

async function fetchMoreEpisodesFromAlgolia(
  episode: PodcastEpisode,
  appId: string,
  apiKey: string,
  indexName: string,
): Promise<ContentItemHit[]> {
  const seasonNumber = Number(episode.season);
  const rockItemId = Number(episode.id);

  if (!episode.show || !Number.isFinite(seasonNumber)) {
    return [];
  }

  const filters = [
    'contentType:"Podcast"',
    `podcastShow:"${escapeAlgoliaFilterString(episode.show)}"`,
    `podcastSeasonNumber:${seasonNumber}`,
    Number.isFinite(rockItemId) ? `rockItemId != ${rockItemId}` : '',
  ]
    .filter(Boolean)
    .join(' AND ');

  try {
    const client = algoliasearch(appId, apiKey, {});
    const response = await client.searchSingleIndex({
      indexName,
      searchParams: {
        filters,
        hitsPerPage: MORE_EPISODES_HITS_PER_PAGE,
      },
    });

    return (response.hits ?? []).map((hit) => hit as unknown as ContentItemHit);
  } catch (error) {
    console.error(
      '[podcasts/podcast-episode] Algolia loader fetch failed',
      error,
    );
    return [];
  }
}

/**
 * Fetches the PodcastShow ContentChannelItem and returns the show ContentChannel containing the episodes
 */
async function getPodcastChannel(
  path: string,
): Promise<{ id: string; title: string }> {
  try {
    const channel = await fetchRockData({
      endpoint: 'ContentChannelItems/GetByAttributeValue',
      queryParams: {
        attributeKey: 'Url',
        value: path,
        $filter: `ContentChannelId eq ${PODCAST_SHOW_CHANNEL_ID}`,
        loadAttributes: 'simple',
      },
    });

    const channelData = getFirstItem(channel);

    // The showChannel Guid references the ContentChannel that contains the episodes
    const showChannel = await fetchRockData({
      endpoint: 'ContentChannels',
      queryParams: {
        $filter: `Guid eq guid'${channelData.attributeValues?.showChannel?.value}'`,
        $select: 'Name,Id',
      },
    });

    return {
      id: showChannel.id,
      title: showChannel.name,
    };
  } catch {
    throw new Error(ERROR_MESSAGES.CHANNEL_FETCH_ERROR);
  }
}

/**
 * Fetches a podcast episode by path and channel ID
 */
async function getPodcastEpisode({
  path,
  channelId,
}: {
  path: string;
  channelId: string;
}): Promise<RockPodcastEpisode> {
  try {
    const episode = await fetchRockData({
      endpoint: 'ContentChannelItems/GetByAttributeValue',
      queryParams: {
        $filter: `ContentChannelId eq ${channelId} and StartDateTime le datetime'${toRockDateTimeLiteral()}'`,
        attributeKey: 'Url',
        value: path,
        loadAttributes: 'simple',
      },
      filterByDateRange: true,
    });

    return getFirstItem(episode) as RockPodcastEpisode;
  } catch {
    throw new Error(ERROR_MESSAGES.EPISODE_FETCH_ERROR);
  }
}

/**
 * Fetches Wistia element data by GUID
 */
async function getWistiaElement(guid: string): Promise<WistiaElement | null> {
  try {
    const wistiaElement = await fetchRockData({
      endpoint: 'MediaElements',
      queryParams: {
        $filter: `Guid eq guid'${guid}'`,
      },
    });

    return getFirstItem(wistiaElement) as WistiaElement;
  } catch (error) {
    throw new Error(
      `${ERROR_MESSAGES.WISTIA_FETCH_ERROR} for guid ${guid}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error },
    );
  }
}

/**
 * Maps a Rock episode to a PodcastEpisode
 */
async function mapRockEpisodeToPodcastEpisode(
  rockEpisode: RockPodcastEpisode,
  showName: string,
): Promise<PodcastEpisode> {
  const wistiaElement = await getWistiaElement(
    rockEpisode?.attributeValues?.media?.value || '',
  );

  const authorFormatted =
    rockEpisode?.attributeValues?.author?.valueFormatted ||
    rockEpisode?.attributeValues?.author?.value ||
    '';

  return {
    id: rockEpisode?.id || '',
    show: showName,
    title: rockEpisode?.title || '',
    publishDate:
      rockEpisode?.attributeValues?.releaseDate?.valueFormatted || '',
    season: rockEpisode?.attributeValues?.seasonNumber?.value || '',
    episodeNumber: rockEpisode?.attributeValues?.episodeNumber?.value || '',
    audio: wistiaElement?.sourceKey || '',
    coverImage: createImageUrlFromGuid(
      rockEpisode?.attributeValues?.image?.value || '',
    ),
    summary: rockEpisode?.attributeValues?.summary?.value || '',
    content: rockEpisode?.content || '',
    author: authorFormatted.trim() || undefined,
    showGuests: rockEpisode?.attributeValues?.showGuests?.value || '',
    url: rockEpisode?.attributeValues?.pathname?.value || '',
    apple: rockEpisode?.attributeValues?.applePodcast?.value || '',
    spotify: rockEpisode?.attributeValues?.spotify?.value || '',
    amazon: rockEpisode?.attributeValues?.amazonMusic?.value || '',
    youtube: rockEpisode?.attributeValues?.ytLink?.value || '',
    resources: parseRockKeyValueList(
      rockEpisode?.attributeValues?.additionalResources?.value || '',
    ).map((resource) => ({
      title: resource.key,
      url: resource.value,
    })),
  };
}

/**
 * Utility function to safely get the first item from an array or return the item if it's not an array
 */
function getFirstItem<T>(item: T | T[]): T {
  return Array.isArray(item) ? item[0] : item;
}
