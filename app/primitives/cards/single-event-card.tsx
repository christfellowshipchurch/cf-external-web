import { Link } from 'react-router';
import { cn } from '~/lib/utils';
import { Icon } from '../icon/icon';
import HtmlRenderer from '../html-renderer';
import { CollectionItem } from '~/routes/page-builder/types';

// Horizontal single-card layout for Event Collections that contain exactly one event (Figma: Web 3.0, node 8082-69891)
export const SingleEventCard = ({
  resource,
  className,
}: {
  resource: CollectionItem;
  className?: string;
}) => {
  const { summary, cardSubtitle, startDate, location, image, name, pathname } =
    resource;

  return (
    <Link
      to={pathname}
      className={cn(
        'flex flex-col md:flex-row w-full overflow-hidden hover:translate-y-[-4px] transition-all duration-300 border border-neutral-lighter rounded-lg',
        className,
      )}
      prefetch='intent'
    >
      <div className='w-full h-48 md:h-auto md:w-2/5 lg:w-[38%] shrink-0'>
        <img
          src={image}
          alt={name}
          className='w-full h-full object-cover'
          loading='lazy'
        />
      </div>

      <div className='flex-1 flex flex-col justify-center gap-4 p-6 md:p-10 bg-white'>
        {(startDate || location) && (
          <ul className='flex flex-wrap gap-4'>
            {startDate && (
              <li className='flex items-center gap-2'>
                <Icon name='calendarAlt' color='black' />
                <p className='text-sm'>{startDate}</p>
              </li>
            )}
            {location && (
              <li className='flex items-center gap-2'>
                <Icon name='map' color='black' />
                <p className='text-sm'>{location}</p>
              </li>
            )}
          </ul>
        )}

        <div className='flex flex-col gap-2'>
          <h3 className='font-extrabold text-xl md:text-2xl leading-tight text-pretty'>
            {name}
          </h3>

          <HtmlRenderer
            html={cardSubtitle || summary || ''}
            className='line-clamp-3 md:text-lg'
            stripFormattingTags={!cardSubtitle}
          />
        </div>
      </div>
    </Link>
  );
};
