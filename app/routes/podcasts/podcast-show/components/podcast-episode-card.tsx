import { Icon } from '~/primitives/icon/icon';
import { Link } from 'react-router';
import { CollectionItem } from '~/routes/page-builder/types';

export const PodcastEpisodeCard = ({
  resource,
}: {
  resource: CollectionItem;
}) => {
  const { name, summary, image, pathname } = resource;

  const cardUrl = `/podcasts/${pathname}`;

  return (
    <div className='flex flex-col pb-4 md:pb-0 gap-4 w-full min-w-3/4 md:min-w-0 md:w-[340px] lg:w-full'>
      <Link
        to={cardUrl}
        aria-label={`Play Episode: ${name}`}
        className='group relative block overflow-hidden rounded-[0.5rem] md:w-[340px] lg:w-full'
      >
        <img
          src={image}
          alt={name}
          className='w-full relative aspect-square md:w-[340px] lg:w-full object-cover rounded-[0.5rem] transition-transform duration-300 group-hover:scale-105'
        />
        <div
          className='absolute bottom-4 left-4 bg-white p-1 rounded-full hover:bg-gray-300 hover:scale-110 transition-all duration-300'
          style={{
            boxShadow:
              '0px 4px 8px -2px rgba(0, 0, 0, 0.20), 0px 2px 4px -2px rgba(0, 0, 0, 0.09)',
          }}
        >
          <Icon name='play' color='black' size={32} className='pl-1' />
        </div>
      </Link>
      <div className='flex flex-col gap-2'>
        <p className='text-sm text-text-secondary'>{summary}</p>
        <h3 className='text-lg font-bold'>{name}</h3>
      </div>
    </div>
  );
};
