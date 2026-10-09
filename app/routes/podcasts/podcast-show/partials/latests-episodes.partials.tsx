import { useLoaderData } from 'react-router';
import { LoaderReturnType } from '../loader';
import { CardCarouselSection } from '~/components/resource-carousel';
import { PodcastEpisode } from '../../types';
import { PodcastEpisodeCard } from '../components/podcast-episode-card';

export const LatestEpisodes = () => {
  const { latestEpisodes, podcast } = useLoaderData<LoaderReturnType>();

  return (
    <div className='w-full bg-white'>
      <div className='py-10 md:py-28'>
        <CardCarouselSection
          title='Latest Episodes'
          CardComponent={PodcastEpisodeCard}
          resources={latestEpisodes.map((episode: PodcastEpisode) => ({
            id: episode.id,
            name: episode.title,
            summary: `Season ${episode.season} | Episode ${episode.episodeNumber}`,
            image: episode.coverImage,
            pathname: podcast.url + '/' + episode.url,
            contentChannelId: podcast.episodesChannelGuid,
            contentType: 'PODCASTS' as const,
          }))}
        />
      </div>
    </div>
  );
};
