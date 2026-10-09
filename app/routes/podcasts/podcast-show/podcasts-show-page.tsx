import { useLoaderData } from 'react-router';
import { LoaderReturnType } from './loader';
import { PodcastsHero } from './partials/podcasts-hero.partial';
import { LatestEpisodes } from './partials/latests-episodes.partials';
import { AllSeasons } from './partials/all-seasons.partials';
import { SubscribeSection } from './partials/subscribe-section.partial';
import { ContentBlock } from '../../page-builder/components/content-block';

export function PodcastsShowPage() {
  const { podcast, featureBlocks } = useLoaderData<LoaderReturnType>();

  return (
    <div className='flex flex-col items-center'>
      <PodcastsHero />
      <LatestEpisodes />
      <SubscribeSection
        apple={podcast.apple}
        spotify={podcast.spotify}
        amazon={podcast.amazon}
        youtube={podcast.youtube}
      />
      {featureBlocks &&
        featureBlocks
          .filter((block) => block.type === 'CONTENT_BLOCK')
          .map((block) => <ContentBlock key={block.id} data={block} />)}
      <AllSeasons />
    </div>
  );
}
