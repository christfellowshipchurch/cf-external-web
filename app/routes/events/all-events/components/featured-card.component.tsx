import { Link } from 'react-router';

import Icon from '~/primitives/icon';
import HtmlRenderer from '~/primitives/html-renderer';
import { ContentItemHit } from '~/routes/search/types';

export function formatEventCardDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function getEventCardDisplayDate(
  hit: Pick<ContentItemHit, 'eventCardDate' | 'startDateTime'>,
): string {
  return hit.eventCardDate
    ? hit.eventCardDate
    : hit.startDateTime
      ? formatEventCardDate(hit.startDateTime)
      : '';
}

export function formatFeaturedEventDate(isoDate: string) {
  const date = new Date(isoDate);
  const weekday = date.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
  });
  const day = date.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    day: '2-digit',
  });
  const month = date.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
  });
  const year = date.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
  });

  return `${weekday} ${day} ${month} ${year}`;
}

export const FeaturedEventCard = ({ card }: { card: ContentItemHit }) => {
  const {
    title,
    coverImage,
    startDateTime,
    eventCardDate,
    eventCardDescription,
    eventsFeaturedCardSubtitle,
    eventLocations,
    locations,
    summary,
    url,
    htmlContent,
  } = card;

  const image = coverImage?.sources[0]?.uri || '';
  const formattedDate = eventCardDate
    ? eventCardDate
    : startDateTime
      ? formatFeaturedEventDate(startDateTime)
      : '';
  const description =
    eventsFeaturedCardSubtitle || eventCardDescription || summary;
  const campus =
    eventLocations && eventLocations.length > 1
      ? 'Multiple Locations'
      : eventLocations?.[0] ||
        (locations && locations.length > 1
          ? 'Multiple Locations'
          : locations?.[0]?.name) ||
        'Christ Fellowship Church';
  const eventPath = `/events/${url}`;

  return (
    <Link
      to={eventPath}
      className='flex flex-col md:h-[400px] lg:h-[420px] xl:h-[450px] md:flex-row items-center justify-center size-full overflow-hidden rounded-2xl md:rounded-xl border border-neutral-lighter'
      prefetch='intent'
    >
      <img
        src={image}
        alt={title}
        className='h-[124px] w-full object-cover md:h-full md:w-1/2 md:aspect-auto md:max-w-[720px]'
      />

      <div className='flex flex-col justify-center gap-4 bg-white px-5 pb-5 md:p-12 w-full md:h-[400px] lg:h-[420px] xl:h-[450px]'>
        <div className='flex flex-col gap-4'>
          <div className='pt-4 md:hidden'>
            <p className='text-sm font-extrabold leading-normal text-ocean'>
              FEATURED EVENT
            </p>
          </div>

          <h4 className='text-2xl font-extrabold leading-[1.4] text-pretty md:text-[28px] md:leading-tight'>
            {title}
          </h4>
          {description ? (
            <p className='leading-normal'>{description}</p>
          ) : (
            <HtmlRenderer
              html={htmlContent || ''}
              className={`line-clamp-5  ${htmlContent ? 'block' : 'hidden'}`}
            />
          )}

          <ul className='flex flex-col gap-2 md:flex-row md:gap-4'>
            <li className='flex items-center gap-1'>
              {formattedDate && <Icon name='calendarAlt' color='black' />}
              <p className='text-base font-bold leading-normal md:text-sm md:font-normal'>
                {formattedDate}
              </p>
            </li>

            <li className='flex items-center gap-1'>
              {campus && <Icon name='map' color='black' />}
              <p className='text-base font-bold leading-normal md:text-sm md:font-normal'>
                {campus}
              </p>
            </li>
          </ul>
        </div>

        <span className='hidden min-h-12 w-fit min-w-24 items-center justify-center rounded-md border border-ocean px-6 py-3 text-center text-lg font-normal text-ocean transition-colors delay-50 hover:bg-ocean hover:text-white md:inline-flex'>
          Learn More
        </span>
      </div>
    </Link>
  );
};
