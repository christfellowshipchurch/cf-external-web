import { Icon } from '~/primitives/icon/icon';
import { Link } from 'react-router';
import { ContentItemHit } from '~/routes/search/types';

interface MoreEpisodesSearchProps {
  hits: ContentItemHit[];
}

const MoreEpisodesHitComponent = ({ hit }: { hit: ContentItemHit }) => {
  const cardUrl = `/podcasts/${hit.podcastShow
    ?.toLowerCase()
    .replace(/ /g, '-')}/${hit.url}`;

  return (
    <div className='flex flex-col pb-4 md:pb-0 gap-4 w-full min-w-3/4 md:min-w-0 md:w-[340px] lg:w-full'>
      <div className='relative md:w-[340px] lg:w-full'>
        <img
          src={
            hit.coverImage?.sources?.[0]?.uri ||
            '/assets/images/podcasts/hero.jpg'
          }
          alt={hit.title}
          className='w-full relative aspect-square md:w-[340px] lg:w-full object-cover rounded-[0.5rem]'
        />
        <Link
          to={cardUrl}
          className='absolute bottom-4 left-4 bg-white p-1 rounded-full hover:bg-gray-300 transition-colors duration-300'
          style={{
            boxShadow:
              '0px 4px 8px -2px rgba(0, 0, 0, 0.20), 0px 2px 4px -2px rgba(0, 0, 0, 0.09)',
          }}
        >
          <Icon name='play' color='black' size={32} className='pl-1' />
        </Link>
      </div>
      <div className='flex flex-col gap-2'>
        <p className='text-sm text-text-secondary'>
          Season {hit.podcastSeasonNumber} | Episode {hit.podcastEpisodeNumber}
        </p>
        <h3 className='text-lg font-bold'>{hit.title}</h3>
      </div>
    </div>
  );
};

export const MoreEpisodesSearch = ({ hits }: MoreEpisodesSearchProps) => {
  if (hits.length === 0) {
    return null;
  }

  return (
    <div className='w-full bg-white content-padding'>
      <div className='flex flex-col gap-6 md:gap-7 max-w-screen-content mx-auto py-10 md:py-20'>
        <h2 className='text-[28px] font-extrabold'>More in this season</h2>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
          {hits.map((hit) => (
            <MoreEpisodesHitComponent key={hit.objectID} hit={hit} />
          ))}
        </div>
      </div>
    </div>
  );
};
