import { LoaderFunctionArgs } from 'react-router-dom';
import { PodcastEpisode, PodcastShow, RockChannelItem } from '../types';
import { fetchRockData } from '~/lib/.server/fetch-rock-data';
import { toRockDateTimeLiteral } from '~/lib/.server/rock-datetime';
import { createImageUrlFromGuid } from '~/lib/utils';
import {
  fetchChildItems,
  mapPageBuilderChildItems,
} from '../../page-builder/loader';
import { ContentBlockData } from '~/routes/page-builder/types';
import { PODCAST_SHOW_CHANNEL_ID } from '../podcast-routing.server';
import { getServerAlgoliaIndexes } from '~/lib/.server/algolia-indexes.server';
import type { AlgoliaIndexMap } from '~/lib/algolia-indexes';

export type LoaderReturnType = {
  path: string;
  podcast: PodcastShow;
  latestEpisodes: PodcastEpisode[];
  featureBlocks: ContentBlockData[] | null;
  ALGOLIA_APP_ID: string;
  ALGOLIA_SEARCH_API_KEY: string;
  algoliaIndexes: AlgoliaIndexMap;
};

export async function getChannelIdByGuid(channelGuid: string) {
  let channel;
  try {
    channel = await fetchRockData({
      endpoint: 'ContentChannels',
      queryParams: {
        $filter: `Guid eq guid'${channelGuid}'`,
        $select: 'Id',
      },
    });
  } catch {
    throw new Error('Error fetching channel from Rock');
  }

  if (Array.isArray(channel)) {
    channel = channel[0];
  }

  return channel.id;
}

export async function getLatestEpisodes(channelGuid: string) {
  const channelId = await getChannelIdByGuid(channelGuid);

  let episodes;
  try {
    episodes = await fetchRockData({
      endpoint: 'ContentChannelItems',
      queryParams: {
        $filter: `ContentChannelId eq ${channelId} and Status eq 'Approved' and StartDateTime le datetime'${toRockDateTimeLiteral()}'`,
        $orderby: 'StartDateTime desc',
        $top: '6',
        loadAttributes: 'simple',
      },
      filterByDateRange: true,
    });

    if (!Array.isArray(episodes)) {
      episodes = [episodes];
    }
  } catch {
    throw new Error('Error fetching episodes from Rock');
  }

  const formattedEpisodes = episodes.map((episode: RockChannelItem) => {
    return {
      title: episode.title,
      description: episode.attributeValues?.summary?.value,
      coverImage: createImageUrlFromGuid(episode.attributeValues?.image?.value),
      url:
        episode.attributeValues?.pathname?.value ||
        episode.attributeValues?.url?.value ||
        '',
      // For season and episode number, we need first check if it contains
      // the attributes from CFDP Podcast type(episodeNumber and seasonNumber),
      // if not we use the legacy sisterhood attributes
      season:
        episode.attributeValues?.seasonNumber?.value ||
        episode.attributeValues?.summary?.value?.split(' ')[1] ||
        '',
      episodeNumber:
        episode.attributeValues?.episodeNumber?.value ||
        episode.attributeValues?.summary?.value?.split('|')[1]?.split(' ')[2] ||
        '',
    };
  });

  return formattedEpisodes;
}

export async function getPodcast(path: string) {
  let podcastData;
  try {
    podcastData = await fetchRockData({
      endpoint: 'ContentChannelItems/GetByAttributeValue',
      queryParams: {
        attributeKey: 'Url',
        value: path,
        $filter: `ContentChannelId eq ${PODCAST_SHOW_CHANNEL_ID} and Status eq 'Approved' and StartDateTime le datetime'${toRockDateTimeLiteral()}'`,
        loadAttributes: 'simple',
      },
      filterByDateRange: true,
    });

    if (Array.isArray(podcastData)) {
      podcastData = podcastData[0];
    }
  } catch {
    throw new Error('Error fetching podcast from Rock');
  }

  const podcastShow: PodcastShow = {
    id: podcastData.id,
    title: podcastData.title,
    description: podcastData.content,
    coverImage: createImageUrlFromGuid(
      podcastData.attributeValues?.coverImage?.value,
    ),
    apple: podcastData.attributeValues?.applePodcast?.value,
    spotify: podcastData.attributeValues?.spotify?.value,
    amazon: podcastData.attributeValues?.amazonMusic?.value,
    youtube: podcastData.attributeValues?.youtube?.value,
    episodesChannelGuid: podcastData.attributeValues?.showChannel?.value,
    url: podcastData.attributeValues?.url?.value,
  };

  return podcastShow;
}

export async function getPodcastFeatureBlocks(podcast: PodcastShow) {
  try {
    // Fetch child items (feature blocks) for this podcast
    const children = await fetchChildItems(podcast.id);

    // Map the children to page builder sections
    const featureBlocks = await mapPageBuilderChildItems(children);

    return featureBlocks;
  } catch (error) {
    console.error('Error fetching podcast feature blocks:', error);
    return [];
  }
}

export async function loader({ params }: LoaderFunctionArgs) {
  const { path } = params;
  if (!path) {
    throw new Error('Path is required');
  }

  const podcast = await getPodcast(path);
  const latestEpisodes = await getLatestEpisodes(podcast.episodesChannelGuid);
  const featureBlocks = await getPodcastFeatureBlocks(podcast);

  const appId = process.env.ALGOLIA_APP_ID;
  const searchApiKey = process.env.ALGOLIA_SEARCH_API_KEY;

  if (!appId || !searchApiKey) {
    console.warn('Algolia credentials not found - search will not work');
  }

  return {
    path,
    podcast,
    latestEpisodes,
    featureBlocks: featureBlocks || null,
    ALGOLIA_APP_ID: appId || '',
    ALGOLIA_SEARCH_API_KEY: searchApiKey || '',
    algoliaIndexes: getServerAlgoliaIndexes(),
  };
}
