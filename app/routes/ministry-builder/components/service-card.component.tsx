import { Link } from 'react-router';
import startCase from 'lodash/startCase';

import { Button } from '~/primitives/button/button.primitive';
import { Icon } from '~/primitives/icon/icon';
import { ROCK_PUBLIC_SITE_ORIGIN } from '~/lib/rock-config';
import { MinistryService } from '../../page-builder/types';
import { formatDaysOfWeek, serviceTimesList } from '../utils';

interface ServiceCardProps {
  service: MinistryService;
  onLinkClick?: () => void;
}

/**
 * Service Card Component
 */
export const ServiceCard = ({ service, onLinkClick }: ServiceCardProps) => {
  const timeSlots = serviceTimesList(service.times);
  const primaryHref = service.planAVisit
    ? `${ROCK_PUBLIC_SITE_ORIGIN}/CFKidsPlanaVisit`
    : service.learnMoreLink;

  return (
    <div className='flex h-full min-h-0 w-full flex-col md:justify-between rounded-[14px] border border-[#e5e8ed] bg-white p-4'>
      <div className='flex min-h-0 flex-1 flex-col gap-3'>
        <div className='flex flex-col gap-1'>
          <p className='text-base font-extrabold leading-6 text-[#1a2733]'>
            {startCase(service.ministryType)}
          </p>
          <div className='flex items-center gap-1.5'>
            <Icon
              name='calendarAlt'
              className='shrink-0 text-ocean'
              size={13}
            />
            <p className='text-[13px] font-semibold leading-tight text-[#4a5560]'>
              {formatDaysOfWeek(service.daysOfWeek)}
            </p>
          </div>
        </div>

        <div className='flex flex-wrap gap-x-2 gap-y-2'>
          {timeSlots.map((slot, idx) => (
            <span
              key={`${slot}-${idx}`}
              className='inline-flex items-center gap-1 rounded-full border border-[#dbe6ec] bg-white px-3 py-1.5 text-[12.5px] font-semibold leading-tight text-[#00527a]'
            >
              <Icon name='timeFive' className='shrink-0 text-ocean' size={12} />
              {slot}
            </span>
          ))}
        </div>
      </div>

      <div
        className='mt-auto flex shrink-0 gap-2 pt-3'
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('a, [href]')) {
            onLinkClick?.();
          }
        }}
      >
        {primaryHref ? (
          <Button
            href={primaryHref}
            intent='primary'
            size='md'
            target={service.planAVisit ? '_blank' : undefined}
            linkClassName='min-w-0 flex-1'
            className='flex w-full flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-semibold'
          >
            {service.planAVisit ? (
              <span>Plan My Visit</span>
            ) : (
              <span>Learn More</span>
            )}
            <Icon name='arrowRight' className='mb-px text-white' size={14} />
          </Button>
        ) : null}

        <Link
          to={`/locations/${service?.location?.pathname ?? ''}`}
          className='flex size-[41px] shrink-0 items-center justify-center rounded-lg border border-[#dbe6ec] bg-white text-ocean transition-colors hover:bg-neutral-50'
          aria-label={`View ${service?.location?.name ?? ''} location`}
          onClick={onLinkClick}
        >
          <Icon name='mapFilled' size={15} />
        </Link>
      </div>
    </div>
  );
};
