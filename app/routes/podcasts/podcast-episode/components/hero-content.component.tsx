import { useLoaderData } from 'react-router';
import { LoaderReturnType } from '../loader';
import { sanitizeCmsHtml } from '~/lib/sanitize';

export const HeroContent = () => {
  const { episode } = useLoaderData<LoaderReturnType>();

  const { title, season, episodeNumber, showGuests, publishDate, summary } =
    episode;

  return (
    <div className='hidden md:flex flex-col justify-center text-white font-medium text-xl'>
      <div className='flex flex-col gap-2 mb-4 xl:mb-6'>
        <h1
          className='font-extrabold text-pretty leading-tight tracking-tight text-3xl'
          dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(title) }}
        />
        <p className='text-xs font-medium uppercase'>
          Season {season} | Episode {episodeNumber}
        </p>
        <p className='text-base font-normal'>
          {showGuests && showGuests !== '' && `${showGuests} - `}
          {publishDate && publishDate !== '' ? publishDate : ''}
        </p>
      </div>
      {summary && (
        <p
          className='font-medium text-lg'
          dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(summary) }}
        />
      )}
    </div>
  );
};
