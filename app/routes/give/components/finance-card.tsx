import { Icon } from '~/primitives/icon/icon';
import { Link } from 'react-router';
import { cn } from '~/lib/utils';
import HtmlRenderer from '~/primitives/html-renderer';
import { CollectionItem } from '~/routes/page-builder/types';

export const FinanceCard = ({
  resource,
  className,
}: {
  resource: CollectionItem;
  className?: string;
}) => {
  const { summary, startDate, location, author, image, name, pathname } =
    resource;

  return (
    <Link
      to={pathname}
      className={cn(
        'flex flex-col rounded-lg w-full h-full border border-neutral-lighter overflow-hidden hover:translate-y-[-4px] transition-all duration-300',
        className,
      )}
      prefetch='intent'
    >
      <img
        src={image}
        alt={name}
        className='w-full h-full max-h-[400px] aspect-9/16 object-cover'
        loading='lazy'
      />

      <div className='flex flex-col gap-4 p-6 bg-white h-full'>
        {(startDate || location || author) && (
          <ul className='flex gap-2 md:gap-4'>
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
            {author && (
              <li className='flex items-center gap-2'>
                <Icon name='user' color='black' />
                <p className='text-sm'>{author}</p>
              </li>
            )}
          </ul>
        )}

        <div className='flex flex-col gap-2'>
          <h4 className='font-extrabold text-lg leading-tight text-pretty'>
            {name}
          </h4>

          <HtmlRenderer html={summary || ''} className='line-clamp-3' />
        </div>
      </div>
    </Link>
  );
};
