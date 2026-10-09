import { Link } from 'react-router';

import { Icon } from '~/primitives/icon/icon';
import { ResourceCard } from '~/primitives/cards/resource-card';
import type { ContentItemHit } from '~/routes/search/types';

import { buildEventSingleUrl } from '../../events-back-url';
import { getEventCardDisplayDate } from './featured-card.component';

function getEventHitLocation(
  hit: ContentItemHit,
  multipleLabel = 'Multiple Locations',
) {
  return hit.eventLocations && hit.eventLocations.length > 1
    ? multipleLabel
    : hit.eventLocations?.[0] ||
        hit.locations?.[0]?.name ||
        'Christ Fellowship Church';
}

function MobileEventHitCard({ hit, to }: { hit: ContentItemHit; to: string }) {
  const displayDate = getEventCardDisplayDate(hit);
  const location = getEventHitLocation(hit, 'Multiple campuses');
  const imageUri = hit.coverImage?.sources?.[0]?.uri ?? '';

  return (
    <Link
      to={to}
      className='flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-neutral-lighter bg-white p-2 text-text-primary transition-colors duration-200 hover:border-neutral-light md:hidden'
      prefetch='intent'
    >
      <img
        src={imageUri}
        alt={hit.title}
        className='aspect-square h-24 w-24 shrink-0 rounded-lg object-cover'
        loading='lazy'
      />

      <div className='flex min-w-0 flex-1 flex-col gap-2'>
        <h4 className='line-clamp-2 w-full text-lg font-extrabold leading-tight text-pretty'>
          {hit.title}
        </h4>

        <div className='flex min-w-0 items-center gap-2'>
          <Icon
            name='calendarAlt'
            color='currentColor'
            size={18}
            className='shrink-0'
          />
          <p className='truncate text-sm font-semibold leading-normal'>
            {displayDate}
          </p>
          <Icon
            name='chevronRight'
            color='currentColor'
            size={20}
            className='ml-auto shrink-0 text-neutral-light'
          />
        </div>

        <div className='flex min-w-0 items-center gap-2'>
          <Icon
            name='map'
            color='currentColor'
            size={18}
            className='shrink-0'
          />
          <p className='truncate text-sm font-semibold leading-normal'>
            {location}
          </p>
        </div>
      </div>
    </Link>
  );
}

export function EventHit({
  hit,
  fromEventsUrl,
}: {
  hit: ContentItemHit;
  fromEventsUrl: string;
}) {
  const formattedDate = getEventCardDisplayDate(hit);

  const imageUri = hit.coverImage?.sources?.[0]?.uri ?? '';
  const location = getEventHitLocation(hit);

  // Forward the active finder filters so the event's back button can restore
  // them (stateless `from` query param — see events-back-url.ts).
  const eventSingleUrl = buildEventSingleUrl(hit.url, fromEventsUrl);

  return (
    <>
      <MobileEventHitCard hit={hit} to={eventSingleUrl} />
      <div className='hidden h-full md:block'>
        <ResourceCard
          resource={{
            id: hit.objectID,
            contentChannelId: '78',
            contentType: 'EVENTS',
            name: hit.title,
            summary:
              hit.eventsFeaturedCardSubtitle ||
              hit.eventCardDescription ||
              hit.summary ||
              '',
            image: imageUri,
            pathname: eventSingleUrl,
            startDate: formattedDate,
            location,
          }}
        />
      </div>
    </>
  );
}
