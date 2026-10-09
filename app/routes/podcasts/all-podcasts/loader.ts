// import type { LoaderFunctionArgs } from "react-router";
import type { PodcastShow } from '../types';
import { fetchRockData } from '~/lib/.server/fetch-rock-data';
import { createImageUrlFromGuid } from '~/lib/utils';
import { PODCAST_SHOW_CHANNEL_ID } from '../podcast-routing.server';

export async function loader(): Promise<{ podcastShows: PodcastShow[] }> {
  let podcastShowsData;
  try {
    podcastShowsData = await fetchRockData({
      endpoint: 'ContentChannelItems',
      queryParams: {
        $filter: `ContentChannelId eq ${PODCAST_SHOW_CHANNEL_ID}`,
        $orderby: 'Order asc',
        loadAttributes: 'simple',
      },
      filterByDateRange: true,
    });
  } catch (error) {
    console.error(error);
  }

  //ensure podcasts is an array
  if (!Array.isArray(podcastShowsData)) {
    podcastShowsData = [podcastShowsData];
  }

  //map podcastShows to PodcastShow type
  const podcastShows: PodcastShow[] = podcastShowsData.map(
    (podcastShow: {
      id: string;
      title: string;
      content: string;
      attributeValues?: {
        coverImage?: { value: string };
        apple?: { value: string };
        applePodcast?: { value: string };
        spotify?: { value: string };
        amazon?: { value: string };
        amazonMusic?: { value: string };
        showChannel?: { value: string };
        youtube?: { value: string };
        url?: { value: string };
      };
    }) => ({
      id: podcastShow.id || '',
      title: podcastShow.title || '',
      description: podcastShow.content || '',
      coverImage: podcastShow.attributeValues?.coverImage?.value
        ? createImageUrlFromGuid(podcastShow.attributeValues.coverImage.value)
        : '',
      apple:
        podcastShow.attributeValues?.applePodcast?.value ||
        podcastShow.attributeValues?.apple?.value ||
        '',
      spotify: podcastShow.attributeValues?.spotify?.value || '',
      amazon:
        podcastShow.attributeValues?.amazonMusic?.value ||
        podcastShow.attributeValues?.amazon?.value ||
        '',
      youtube: podcastShow.attributeValues?.youtube?.value || '',
      episodesChannelGuid:
        podcastShow.attributeValues?.showChannel?.value || '',
      url: podcastShow.attributeValues?.url?.value || '',
    }),
  );

  return { podcastShows };
}
