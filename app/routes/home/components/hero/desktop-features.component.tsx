import { Icon } from '~/primitives/icon/icon';
import { cn } from '~/lib/utils';
import { Link, useLoaderData } from 'react-router';
import { HeroAction, HomeLoaderData } from '~/routes/home/loader';

export const DesktopFeaturedItems = () => {
  const { actions } = useLoaderData<HomeLoaderData>();
  if (!actions) {
    return null;
  }
  return (
    <div className='w-full py-8'>
      <div className='flex flex-col md:flex-row justify-center lg:justify-start gap-4 md:gap-8 lg:gap-12'>
        {actions &&
          actions.map((action: HeroAction) => (
            <DesktopFeaturedItem
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

const DesktopFeaturedItem = ({
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
        'bg-navy-subdued rounded-xl flex gap-4 group p-4 w-full cursor-pointer',
        'md:max-w-[304px]',
        'lg:bg-transparent lg:rounded-none lg:items-center lg:justify-center lg:gap-2 lg:p-0 lg:w-auto lg:max-w-none',
      )}
      data-gtm='featured-item'
      data-position={position}
      data-item-title={title}
    >
      <div className='bg-ocean lg:bg-dark-navy group-hover:bg-ocean transition-colors duration-300 rounded-sm p-2'>
        <Icon name={iconName} color='white' />
      </div>
      <div>
        <p className='text-sm text-text-secondary'>{heading}</p>
        <h4 className='font-bold'>{title}</h4>
      </div>
    </Link>
  );
};
