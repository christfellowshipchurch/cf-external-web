import { useLoaderData } from 'react-router';
import { DynamicHero } from '~/components';
import { PodcastHubCard } from './components/podcast-card';
import { loader } from './loader';
import { PodcastShow } from '../types';
import { getImageUrl } from '~/lib/utils';

export function AllPodcastsPage() {
  const { podcastShows } = useLoaderData<typeof loader>();

  return (
    <div className='flex flex-col items-center'>
      <DynamicHero imagePath={getImageUrl('3143814')} customTitle='Podcasts' />
      <div className='w-full'>
        <div className='flex flex-col'>
          {podcastShows.map((podcast: PodcastShow, index: number) => (
            <PodcastHubCard
              key={index}
              podcast={podcast}
              className={`${index % 2 !== 0 ? 'bg-gray' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
