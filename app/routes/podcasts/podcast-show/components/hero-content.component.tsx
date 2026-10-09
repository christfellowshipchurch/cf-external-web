import { Icon } from '~/primitives/icon/icon';
import { sanitizeCmsHtml } from '~/lib/sanitize';
import { PodcastEpisode } from '../../types';
import { Link } from 'react-router';

export const HeroContent = ({
  title,
  description,
  coverImage,
  latestEpisode,
}: {
  title: string;
  description: string;
  coverImage: string;
  latestEpisode: PodcastEpisode;
}) => {
  return (
    <div className='flex px-6 md:px-16 pt-10 pb-4 md:pb-16 md:pt-24'>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-8 mx-auto w-full max-w-[1438px]'>
        <div className='flex flex-col justify-center order-2 md:order-1'>
          {title && (
            <h1
              className='mb-2 md:mb-4 max-w-2xl font-extrabold text-2xl text-pretty md:text-4xl leading-tight tracking-tight text-white md:leading-tight lg:text-6xl'
              dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(title) }}
            />
          )}
          {description && (
            <p
              className='mb-6 max-w-2xl font-medium text-white text-lg lg:mb-8'
              dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(description) }}
            />
          )}

          <div className='block md:hidden my-6 h-[1px] w-full bg-[#D9D9D9] opacity-50' />

          {latestEpisode && latestEpisode.url && (
            <Link
              to={latestEpisode.url || ''}
              className='group flex items-center gap-2'
            >
              <div className='bg-ocean rounded-full p-2 flex items-center justify-center size-15 group-hover:bg-ocean/70 transition-colors'>
                <Icon name='play' color='white' size={36} className='pl-1' />
              </div>
              <p className='text-lg font-semibold text-white group-hover:text-white/70 ml-2 transition-colors'>
                START LISTENING
              </p>
            </Link>
          )}
        </div>

        <img
          className='rounded-[1rem] aspect-4/3 md:aspect-3/4 lg:aspect-4/3 w-full object-cover order-1 md:order-2 mx-auto'
          src={coverImage}
          alt={title || 'Cover'}
        />
      </div>
    </div>
  );
};
