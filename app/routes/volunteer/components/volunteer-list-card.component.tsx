import { Link } from 'react-router';

import { RockCampuses } from '~/lib/rock-config';
import { withRockGetImageSizing } from '~/lib/utils';
import { Icon } from '~/primitives/icon/icon';

import type { Volunteer } from '../types';
import { volunteerCategoryPillClassName } from '../volunteer-category-pill';
import {
  persistVolunteerFinderBackFromCard,
  type VolunteerFinderBackPayload,
} from '../outreach-opportunity/components/outreach-finder-return-href';

const ROCK_CAMPUS_NAME_SET = new Set<string>(
  RockCampuses.map((campus) => campus.name),
);

function firstRockCampusFromList(campusList: string[] | undefined): string {
  for (const raw of campusList ?? []) {
    const name = raw?.trim();
    if (name && ROCK_CAMPUS_NAME_SET.has(name)) return name;
  }
  return '—';
}

export function VolunteerListCard({
  volunteer,
  listingSearch,
}: {
  volunteer: Volunteer;
  listingSearch: string;
}) {
  const finderBackPayload: VolunteerFinderBackPayload = {
    missionGroupGuid: volunteer.groupGuid,
    volunteerListSearch: listingSearch,
    origin: 'missions-private-events',
  };
  const coverImageUri =
    (volunteer.coverImage?.sources?.[0]?.uri ?? '').trim() ||
    (volunteer.eventTypeImageUrl ?? '').trim();

  return (
    <li className='overflow-hidden rounded-lg border border-neutral-lighter bg-white shadow-sm transition-shadow hover:shadow-md'>
      <Link
        to={`/volunteer/outreach/${volunteer.groupGuid}`}
        prefetch='intent'
        onClick={() => persistVolunteerFinderBackFromCard(finderBackPayload)}
        className='group flex w-full flex-col sm:min-h-40 sm:flex-row'
      >
        <div className='relative aspect-video w-full shrink-0 overflow-hidden bg-neutral-lighter sm:aspect-auto sm:w-48 md:w-56'>
          {coverImageUri ? (
            <img
              src={withRockGetImageSizing(coverImageUri, {
                maxwidth: 800,
                maxheight: 500,
                quality: 85,
              })}
              alt=''
              className='size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]'
            />
          ) : null}
        </div>

        <div className='flex min-w-0 flex-1 flex-col gap-3 px-4 py-3 text-left md:px-6 md:py-3'>
          <h3 className='text-lg font-extrabold leading-tight text-text-primary group-hover:text-ocean'>
            {volunteer.title}
          </h3>

          <div className='flex flex-wrap items-center gap-2'>
            <span
              className={volunteerCategoryPillClassName(
                volunteer.category?.trim() ?? '',
              )}
            >
              {volunteer.category?.trim() ?? ''}
            </span>
            <span className='text-sm text-neutral-default'>
              {volunteer.spotsLeft} spots left
            </span>
          </div>

          {volunteer.opportunityType?.length ? (
            <div className='flex flex-wrap gap-2'>
              {volunteer.opportunityType
                .slice(0, 2)
                .map((opportunity, index) => (
                  <span
                    key={`${opportunity}-${index}`}
                    className='rounded-[4px] bg-gray px-2.5 py-1 text-xs text-neutral-default'
                  >
                    {opportunity}
                  </span>
                ))}
            </div>
          ) : null}

          <ul className='flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-darker'>
            <li className='flex min-w-0 items-center gap-2'>
              <Icon name='map' size={20} className='shrink-0' />
              <span className='truncate'>
                {firstRockCampusFromList(volunteer.campusList)}
              </span>
            </li>
            <li className='flex min-w-0 items-center gap-2'>
              <Icon name='calendarAlt' size={20} className='shrink-0' />
              <span className='truncate'>
                {volunteer.eventDateStr?.trim() &&
                volunteer.eventEndDateStr?.trim() &&
                volunteer.eventDateStr.trim() !==
                  volunteer.eventEndDateStr.trim()
                  ? `${volunteer.eventDateStr.trim()} – ${volunteer.eventEndDateStr.trim()}`
                  : volunteer.eventDateStr?.trim() || '—'}
              </span>
            </li>
            <li className='flex min-w-0 items-center gap-2'>
              <Icon name='timeFive' size={20} className='shrink-0' />
              <span className='truncate'>
                {volunteer.eventTimeStr?.trim() &&
                volunteer.eventEndTimeStr?.trim()
                  ? `${volunteer.eventTimeStr.trim()} – ${volunteer.eventEndTimeStr.trim()}`
                  : volunteer.eventTimeStr?.trim() ||
                    volunteer.eventEndTimeStr?.trim() ||
                    '—'}
              </span>
            </li>
          </ul>
        </div>
      </Link>
    </li>
  );
}
