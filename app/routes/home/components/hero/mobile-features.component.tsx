import { Icon } from '~/primitives/icon/icon';
import { cn } from '~/lib/utils';
import { Link, useLoaderData } from 'react-router';
import { HeroAction, HomeLoaderData } from '~/routes/home/loader';

export const MobileFeaturedItems = () => {
  const { actions } = useLoaderData<HomeLoaderData>();

  return (
    <div className='w-full md:ml-4'>
      <div className='flex justify-center md:justify-start gap-2'>
        {(actions ?? []).map((action) => (
          <MobileFeaturedItem
            key={action.position}
            iconName={action.iconName}
            heading={action.heading}
            title={action.title}
            url={action.url}
            position={action.position}
          />
        ))}
      </div>
    </div>
  );
};

export const MobileFeaturedItem = ({
  iconName,
  heading,
  title,
  url,
  position,
}: HeroAction) => {
  return (
    <Link
      to={url}
      className={cn(
        'bg-ocean',
        'rounded-full',
        'flex',
        'items-center',
        'justify-center',
        'gap-2',
        'py-3',
        'px-3 sm:px-4',
        'min-w-[100px]',
        position === 2 ? 'grow' : 'flex-none',
        'sm:flex-none',
        'max-w-[50%]',
      )}
      data-gtm='featured-item'
      data-position={position}
      data-item-title={title}
    >
      <Icon name={iconName} color='white' className='min-w-[24px]' />
      <div className='text-white'>
        <p className='text-[10px] sm:text-xs line-clamp-1'>{heading}</p>
        <h4 className='font-bold text-xs sm:text-sm line-clamp-1'>{title}</h4>
      </div>
    </Link>
  );
};
