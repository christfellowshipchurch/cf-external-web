import { useLoaderData } from 'react-router';
import { LoaderReturnType } from './loader';
import { SubscribeSection } from '../podcast-show/partials/subscribe-section.partial';
import { EpisodeNotes } from './partials/episode-notes.partial';
import { EpisodePlayer } from './partials/episode-player.partial';
import { MoreEpisodes } from './partials/more-episodes.partial';
import { EpisodeHero } from './partials/episode-hero.partial';
import { HeroMobileContent } from './components/hero-mobile-content.component';

export function PodcastEpisode() {
  const { episode } = useLoaderData<LoaderReturnType>();

  return (
    <div className='flex flex-col items-center'>
      <EpisodeHero />
      {/* If no audio(older sisterhood episodes), show subscribe section */}
      {episode.audio ? (
        <EpisodePlayer audio={episode.audio} />
      ) : (
        <SubscribeSection
          title='Listen to the episode'
          apple={episode.apple}
          spotify={episode.spotify}
          amazon={episode.amazon}
          youtube={episode.youtube}
        />
      )}
      <HeroMobileContent />
      <EpisodeNotes content={episode.content} resources={episode.resources} />
      <SubscribeSection
        apple={episode.apple}
        spotify={episode.spotify}
        amazon={episode.amazon}
        youtube={episode.youtube}
      />
      <MoreEpisodes />
    </div>
  );
}
