import { forwardRef } from 'react';

import { Icon } from '~/primitives/icon/icon';
import { ClassHitType } from '../../types';
import { formatClassSessionDate } from '../../class-session.utils';
import { cn } from '~/lib/utils';
import { toPublicRockUrl } from '~/lib/rock-config';
import { GroupConnectModal } from '~/components/modals/group-connect/group-connect-modal';
import { ButtonProps } from '~/primitives/button/button.primitive';

const cardShellClassName = cn(
  'mx-auto flex h-full min-h-0 w-full max-w-[360px] flex-1 flex-col rounded-lg',
  'md:max-w-[300px] lg:max-w-[333px] xl:max-w-[300px]',
  // In the upcoming sessions carousel, cards should align to a consistent height per slide.
  // Content can vary (campus label, class type, etc.), so we enforce a desktop min height.
  'lg:min-h-[270px]',
  'transition-transform duration-300 ease-out',
  'hover:-translate-y-1',
);

const UpcomingSessionCardBody = ({ hit }: { hit: ClassHitType }) => {
  const rawCampusLabel = hit.campus?.trim() ?? '';
  const campusLabel = rawCampusLabel.toLowerCase().includes('online')
    ? 'Online'
    : rawCampusLabel;
  const campusIcon = campusLabel.toLowerCase().includes('online')
    ? 'globe'
    : 'map';
  const { schedule, startDate, endDate, format, language, classType } = hit;
  const languageLabel =
    language?.toLowerCase() === 'spanish' ? 'Español' : (language ?? '');
  const displayClassType = classType?.trim() ?? '';
  const isVirtualFormat = format === 'Virtual';

  const geoMeters = hit._rankingInfo?.geoDistance;
  /** Algolia can send `geoDistance: 0` when `aroundLatLng` is unset; only show miles when geo search is meaningful. */
  const milesFromSearchOrigin =
    geoMeters != null &&
    typeof geoMeters === 'number' &&
    !Number.isNaN(geoMeters) &&
    geoMeters > 0
      ? geoMeters / 1609.34
      : null;

  const footerLabel = isVirtualFormat
    ? 'Online'
    : milesFromSearchOrigin != null
      ? `${milesFromSearchOrigin.toFixed(1)} MILES`
      : format;

  const formattedStartDate = formatClassSessionDate(startDate);
  const formattedEndDate = formatClassSessionDate(endDate);

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg bg-white'>
      <div className='flex min-h-0 flex-1 flex-col gap-6 px-6 pb-1 pt-5'>
        <div className='flex min-h-0 flex-1 flex-col gap-5'>
          <div className='flex flex-col gap-2'>
            <p className='bg-[#EBEBEB] w-fit flex rounded-sm text-xs font-semibold px-2 py-1'>
              {languageLabel}
            </p>
            <h3 className='text-lg font-bold leading-6 line-clamp-2'>
              {displayClassType}
            </h3>
          </div>

          <div className='flex flex-col gap-6 pb-3 text-neutral-darker'>
            <div className='flex flex-col gap-2'>
              <div className='flex items-center gap-2'>
                <Icon name={campusIcon} size={24} />
                <p className='text-sm'>{campusLabel}</p>
              </div>

              <div className='flex items-center gap-2'>
                <Icon name='calendarAlt' size={24} />
                <p className='text-sm'>
                  {formattedStartDate} - {formattedEndDate}
                </p>
              </div>

              <div className='flex items-center gap-2'>
                <Icon name='timeFive' size={24} />
                <p className='text-sm'>{schedule} ET</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className='mt-auto flex shrink-0 items-center justify-center gap-1.5 rounded-b-lg bg-navy py-3 text-white'>
        <Icon
          name={isVirtualFormat ? 'globe' : 'locationArrow'}
          size={16}
          className='text-gray'
        />
        <p className='text-sm font-semibold text-gray'>{footerLabel}</p>
      </div>
    </div>
  );
};

const FullCardModalTrigger = forwardRef<HTMLButtonElement, ButtonProps>(
  function FullCardModalTrigger({ className, ...props }, ref) {
    return (
      <button
        ref={ref}
        className={cn(
          cardShellClassName,
          'border-0 bg-transparent p-0 text-left shadow-none',
          'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean focus-visible:ring-offset-2',
          className,
        )}
        {...props}
        type='button'
      />
    );
  },
);

export const UpcomingSessionCard = ({ hit }: { hit: ClassHitType }) => {
  const displayClassType = hit.classType?.trim() ?? '';
  const registrationUrl = toPublicRockUrl(hit.registrationURL?.trim() ?? '');

  // A Rock-provided registration URL takes precedence over the signup modal:
  // these sessions register through an external Rock page, so the in-app form
  // would create a duplicate/incorrect registration.
  if (registrationUrl) {
    return (
      <a
        href={registrationUrl}
        target='_blank'
        rel='noopener noreferrer'
        aria-label={`Sign up — ${displayClassType}`}
        className={cn(
          cardShellClassName,
          'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean focus-visible:ring-offset-2',
        )}
      >
        <UpcomingSessionCardBody hit={hit} />
      </a>
    );
  }

  if (hit.groupId) {
    return (
      <GroupConnectModal
        groupId={String(hit.groupId)}
        campus={hit.campus}
        buttonText='Sign up for this class'
        triggerChildren={<UpcomingSessionCardBody hit={hit} />}
        ModalButton={(props) => (
          <FullCardModalTrigger
            aria-label={`Sign up — ${displayClassType}`}
            {...props}
          />
        )}
      />
    );
  }

  return (
    <div className={cardShellClassName}>
      <UpcomingSessionCardBody hit={hit} />
    </div>
  );
};
