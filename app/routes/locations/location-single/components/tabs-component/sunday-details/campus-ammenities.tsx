import { useLoaderData } from 'react-router';

import { Icon } from '~/primitives/icon/icon';
import { icons } from '~/lib/icons';
import { SetAReminderModal } from '~/components/modals/set-a-reminder/reminder-modal.component';
import { LocationSingleReminderModalButton } from './what-to-expect';
import { useResponsive } from '~/hooks/use-responsive';
import { cn } from '~/lib/utils';
import { LoaderReturnType } from '../../../loader';

export const CampusAmenities = ({ isSpanish }: { isSpanish?: boolean }) => {
  const { isSmall } = useResponsive();
  const { campusAmenities } = useLoaderData<LoaderReturnType>();
  const title = isSpanish ? 'Amenidades del Campus' : 'Campus Amenities';

  if (campusAmenities.length === 0) {
    return null;
  }

  return (
    <div className='w-full bg-gray content-padding flex pb-14 md:pb-16 lg:pb-28'>
      <div className='flex w-full flex-col gap-6 md:items-center md:justify-center max-w-screen-content md:mx-auto'>
        <h2 className='font-extrabold text-2xl'>{title}</h2>
        <div className='flex flex-col md:flex-row md:items-center md:justify-center gap-12 md:max-w-[1100px] md:flex-wrap gap-y-3 md:gap-y-6'>
          {campusAmenities.map((amenity, index) => (
            <div
              key={index}
              className='text-text-secondary font-bold flex items-center md:justify-center gap-2'
            >
              <Icon
                name={(amenity.icon as keyof typeof icons) ?? 'star'}
                size={36}
              />
              <h3>
                {isSpanish && amenity.titleEs ? amenity.titleEs : amenity.title}
              </h3>
            </div>
          ))}
        </div>

        {isSmall && (
          <div className={cn('flex w-full flex-col pt-2')}>
            <SetAReminderModal
              ModalButton={LocationSingleReminderModalButton}
              triggerClassName='mr-0 w-full'
              className='w-full justify-center'
            />
          </div>
        )}
      </div>
    </div>
  );
};
