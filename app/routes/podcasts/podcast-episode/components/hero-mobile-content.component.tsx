import { sanitizeCmsHtml } from '~/lib/sanitize';
import { useLoaderData } from 'react-router';
import { LoaderReturnType } from '../loader';
import { EpisodeShareButton } from './episode-share-button.component';

export const HeroMobileContent = () => {
  const { episode } = useLoaderData<LoaderReturnType>();
  const { title, summary, season, episodeNumber, showGuests, publishDate } =
    episode;

  return (
    <div className='w-full bg-white content-padding md:hidden'>
      <div className='flex flex-col max-w-screen-content mx-auto'>
        <div className='flex flex-col gap-6 pt-6 text-text-primary font-medium'>
          <div className='flex flex-col gap-1'>
            <h1
              className='max-w-2xl font-extrabold text-2xl text-pretty leading-tight tracking-tight'
              dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(title) }}
            />
            <p className='text-xs font-medium'>
              Season {season} | Episode {episodeNumber}
            </p>
            <p className='text-base font-normal'>{`${showGuests} - ${publishDate}`}</p>
          </div>
          {summary && (
            <p
              className='text-sm max-w-2xl'
              dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(summary) }}
            />
          )}
          <EpisodeShareButton />
        </div>
        <div className='h-[1px] opacity-10 bg-black/75 mt-8' />
      </div>
    </div>
  );
};
