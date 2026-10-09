import { Link } from 'react-router';
import { icons } from '~/lib/icons';
import { Icon } from '~/primitives/icon/icon';
import { useState } from 'react';
import { RegionCard as RegionCardType } from '../../types';
import { CollectionItem } from '~/routes/page-builder/types';

export const RegionCard = ({
  title,
  image,
  spotsLeft,
  description,
  location,
  date,
  time,
  href,
}: RegionCardType) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const shortDescription = description.split(' ').slice(0, 15).join(' ');
  const needsEllipsis = description.split(' ').length > 15;
  const displayDescription = isExpanded
    ? description
    : shortDescription + (needsEllipsis ? '...' : '');

  return (
    <div
      className={`flex flex-col rounded-2xl overflow-hidden transition-all duration-300 md:shrink-0 md:w-[347px] ${
        isExpanded ? 'h-full' : 'h-[555px]'
      }`}
    >
      <img
        className='w-full max-h-[170px] object-cover'
        src={image}
        alt={title}
      />
      <div className='flex flex-col justify-between gap-8 p-6 bg-white flex-1'>
        <div className='flex flex-col gap-4 w-full'>
          <div>
            <h2 className='text-xl font-bold'>{title}</h2>
            <p className='text-black'>{spotsLeft} spots left</p>
          </div>

          <div className='flex flex-col gap-2'>
            <RegionCardInfo icon='map' label={location} />
            <RegionCardInfo icon='calendarAlt' label={date} />
            <RegionCardInfo icon='timeFive' label={time} />

            <div className='flex flex-col'>
              <p>{displayDescription}</p>
              {description.length > 100 && (
                <button
                  type='button'
                  className='text-ocean hover:text-navy cursor-pointer font-semibold text-left'
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          </div>
        </div>

        <Link
          to={href}
          className='flex gap-2 w-full h-fit pt-4 border-t border-[#DFE1E7] group'
        >
          <Icon name='arrowBack' className='text-ocean rotate-135' size={14} />
          <p className='text-lg font-bold group-hover:text-ocean duration-300 transition-colors'>
            Sign Up
          </p>
        </Link>
      </div>
    </div>
  );
};

export const RegionCardWrapper = ({
  resource,
}: {
  resource: CollectionItem;
}) => {
  // Convert CollectionItem to RegionCard format
  const regionCard: RegionCardType = {
    title: resource.name || '',
    image: resource.image || '',
    spotsLeft: 0,
    description: resource.summary || '',
    location: '',
    date: '',
    time: '',
    href: resource.pathname || '',
  };
  return <RegionCard {...regionCard} />;
};

const RegionCardInfo = ({
  icon,
  label,
}: {
  icon: keyof typeof icons;
  label: string;
}) => {
  return (
    <div className='flex items-center gap-2'>
      <Icon name={icon} size={22} />
      <p>{label}</p>
    </div>
  );
};
