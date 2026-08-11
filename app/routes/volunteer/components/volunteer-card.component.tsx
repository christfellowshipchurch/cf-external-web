import { memo } from 'react';
import { Link } from 'react-router-dom';

import { RockCampuses } from '~/lib/rock-config';
import { cn, withRockGetImageSizing } from '~/lib/utils';
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

/** Avoid re-rendering (and img reload) when Algolia returns new hit objects with the same fields. */
function volunteerCardPropsEqual(
  prev: {
    volunteer: Volunteer;
    listingSearch: string;
    className?: string;
    finderOrigin?: VolunteerFinderBackPayload['origin'];
  },
  next: {
    volunteer: Volunteer;
    listingSearch: string;
    className?: string;
    finderOrigin?: VolunteerFinderBackPayload['origin'];
  },
): boolean {
  if (prev.listingSearch !== next.listingSearch) return false;
  if (prev.className !== next.className) return false;
  if (prev.finderOrigin !== next.finderOrigin) return false;
  const p = prev.volunteer;
  const n = next.volunteer;
  if (p.objectID !== n.objectID) return false;
  if (p.title !== n.title) return false;
  if (p.spotsLeft !== n.spotsLeft) return false;
  if ((p.category ?? '') !== (n.category ?? '')) return false;
  if (
    (p.coverImage?.sources?.[0]?.uri ?? '') !==
    (n.coverImage?.sources?.[0]?.uri ?? '')
  ) {
    return false;
  }
  if ((p.eventTypeImageUrl ?? '') !== (n.eventTypeImageUrl ?? '')) {
    return false;
  }
  if (
    JSON.stringify(p.campusList ?? []) !== JSON.stringify(n.campusList ?? [])
  ) {
    return false;
  }
  if ((p.eventDateStr ?? '') !== (n.eventDateStr ?? '')) return false;
  if ((p.eventEndDateStr ?? '') !== (n.eventEndDateStr ?? '')) return false;
  if ((p.eventTimeStr ?? '') !== (n.eventTimeStr ?? '')) return false;
  if ((p.eventEndTimeStr ?? '') !== (n.eventEndTimeStr ?? '')) return false;
  if (
    JSON.stringify(p.opportunityType ?? []) !==
    JSON.stringify(n.opportunityType ?? [])
  ) {
    return false;
  }
  return true;
}

function VolunteerCardInner({
  volunteer,
  listingSearch,
  className,
  finderOrigin,
}: {
  volunteer: Volunteer;
  listingSearch: string;
  className?: string;
  finderOrigin?: VolunteerFinderBackPayload['origin'];
}) {
  const finderBackPayload: VolunteerFinderBackPayload = {
    missionGroupGuid: volunteer.groupGuid,
    volunteerListSearch: listingSearch,
    origin: finderOrigin,
  };

  // Cover image: group photo first, Event Type Defined Value image as fallback.
  const coverImageUri =
    (volunteer.coverImage?.sources?.[0]?.uri ?? '').trim() ||
    (volunteer.eventTypeImageUrl ?? '').trim();

  return (
    <Link
      to={`/volunteer/outreach/${volunteer.groupGuid}`}
      prefetch='intent'
      onClick={() => persistVolunteerFinderBackFromCard(finderBackPayload)}
      className={cn(
        'group flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-[36px] bg-white shadow-xs transition-shadow hover:shadow-md',
        className,
      )}
    >
      <div className='relative aspect-16/10 w-full max-h-[156px] shrink-0 overflow-hidden rounded-t-2xl bg-neutral-lighter'>
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

      <div className='flex min-h-0 w-full flex-1 flex-col gap-5 overflow-hidden p-5'>
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

        {volunteer?.opportunityType?.length ? (
          <div className='flex flex-wrap gap-2'>
            {volunteer.opportunityType.slice(0, 2).map((opportunity, index) => (
              <span
                key={`${opportunity}-${index}`}
                className='rounded-[4px] bg-gray px-2.5 py-1 text-xs text-neutral-default'
              >
                {opportunity}
              </span>
            ))}
          </div>
        ) : null}

        <ul className='flex flex-col gap-2 text-sm text-neutral-darker'>
          <li className='flex min-w-0 items-center gap-2'>
            <Icon
              name='map'
              size={20}
              className='shrink-0 text-neutral-darker'
            />
            <span className='min-w-0 truncate'>
              {firstRockCampusFromList(volunteer.campusList)}
            </span>
          </li>
          <li className='flex min-w-0 items-center gap-2'>
            <Icon
              name='calendarAlt'
              size={20}
              className='shrink-0 text-neutral-darker'
            />
            <span className='min-w-0 truncate'>
              {volunteer.eventDateStr?.trim() &&
              volunteer.eventEndDateStr?.trim() &&
              volunteer.eventDateStr.trim() !== volunteer.eventEndDateStr.trim()
                ? `${volunteer.eventDateStr.trim()} – ${volunteer.eventEndDateStr.trim()}`
                : volunteer.eventDateStr?.trim() || '—'}
            </span>
          </li>
          <li className='flex min-w-0 items-center gap-2'>
            <Icon
              name='timeFive'
              size={20}
              className='shrink-0 text-neutral-darker'
            />
            <span className='min-w-0 truncate'>
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
  );
}

export const VolunteerCard = memo(VolunteerCardInner, volunteerCardPropsEqual);
VolunteerCard.displayName = 'VolunteerCard';
