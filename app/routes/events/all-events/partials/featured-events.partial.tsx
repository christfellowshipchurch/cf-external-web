import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { Icon } from '~/primitives/icon/icon';
import { ResourceCard } from '~/primitives/cards/resource-card';
import { ContentItemHit } from '~/routes/search/types';
import {
  FeaturedEventCard,
  getEventCardDisplayDate,
} from '../components/featured-card.component';

export function FeaturedEventsSectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className='w-full pt-10 pb-16 md:py-28 content-padding bg-gray md:min-h-112'>
      <div className='flex min-h-88 flex-col max-w-screen-content mx-auto'>
        {children}
      </div>
    </div>
  );
}

/** Featured block from loader data (no InstantSearch). */
export function FeaturedEventsFromHits({ hits }: { hits: ContentItemHit[] }) {
  const firstHit = hits[0];
  const remainingHits = hits.slice(1);

  if (!firstHit) {
    return null;
  }

  return (
    <>
      <FeaturedEventCard card={firstHit} />

      <div className='hidden mt-8 lg:mt-12 md:grid grid-cols-2 lg:grid-cols-3 gap-4 place-items-center md:place-items-start'>
        {remainingHits.map((hit) => (
          <OtherFeatureEventCardHit hit={hit} key={hit.objectID} />
        ))}
      </div>

      {remainingHits.length > 0 && (
        <div className='mt-6 flex w-full flex-col gap-2 md:hidden'>
          {remainingHits.map((hit) => (
            <OtherFeatureEventMobileCardHit hit={hit} key={hit.objectID} />
          ))}
        </div>
      )}
    </>
  );
}

function getFeaturedEventLocation(hit: ContentItemHit) {
  return hit.eventLocations && hit.eventLocations.length > 1
    ? 'Multiple Locations'
    : hit.eventLocations?.[0] ||
        (hit.locations && hit.locations.length > 1
          ? 'Multiple Locations'
          : hit.locations?.[0]?.name) ||
        'Christ Fellowship Church';
}

const OtherFeatureEventMobileCardHit = ({ hit }: { hit: ContentItemHit }) => {
  const image = hit.coverImage?.sources?.[0]?.uri || '';
  const campus = getFeaturedEventLocation(hit);

  return (
    <Link
      to={`/events/${hit.url}`}
      className='flex h-[98px] w-full items-start overflow-hidden rounded-xl border border-neutral-lighter bg-white text-text-primary'
      prefetch='intent'
    >
      <div className='flex shrink-0 p-[7px]'>
        <img
          src={image}
          alt={hit.title}
          className='size-[84px] rounded-[5.5px] object-cover'
          loading='lazy'
        />
      </div>

      <div className='flex h-[98px] min-w-0 flex-1 items-center pr-1'>
        <div className='flex h-full min-w-0 flex-1 flex-col items-start gap-2 py-2 pl-1 pr-4'>
          <h4 className='line-clamp-1 w-full text-base font-bold leading-[1.4] text-pretty'>
            {hit.title}
          </h4>

          <div className='flex w-full min-w-0 flex-col gap-1'>
            <div className='flex min-w-0 items-center gap-2'>
              <Icon
                name='calendarAlt'
                color='currentColor'
                size={18}
                className='shrink-0'
              />
              <p className='truncate text-sm font-semibold leading-normal'>
                {getEventCardDisplayDate(hit)}
              </p>
            </div>
            <div className='flex min-w-0 items-center gap-2'>
              <Icon
                name='map'
                color='currentColor'
                size={18}
                className='shrink-0'
              />
              <p className='truncate text-sm font-semibold leading-normal'>
                {campus}
              </p>
            </div>
          </div>
        </div>

        <Icon
          name='chevronRight'
          color='currentColor'
          size={24}
          className='shrink-0 text-neutral-light'
        />
      </div>
    </Link>
  );
};

const OtherFeatureEventCardHit = ({ hit }: { hit: ContentItemHit }) => {
  return (
    <ResourceCard
      className='min-w-[360px] w-[360px] md:w-full md:min-w-0'
      summaryClassName='line-clamp-1'
      resource={{
        id: hit.objectID,
        contentChannelId: '78', // EVENT type from builder-utils.ts
        contentType: 'EVENTS',
        name: hit.title,
        summary: hit.eventsFeaturedCardSubtitle || hit.summary || '',
        image: hit.coverImage.sources[0].uri,
        pathname: `/events/${hit.url}`,
        startDate: getEventCardDisplayDate(hit),
        location: getFeaturedEventLocation(hit),
      }}
    />
  );
};
