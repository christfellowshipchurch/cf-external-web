import { forwardRef } from 'react';
import { SetAReminderModal } from '~/components';
import { cn } from '~/lib/utils';
import { Button } from '~/primitives/button/button.primitive';
import { ButtonProps } from '~/primitives/button/button.primitive';
import { Video } from '~/primitives/video/video.primitive';
import { useResponsive } from '~/hooks/use-responsive';
import {
  expectEnglishItems,
  expectOnlineItems,
  expectSpanishItems,
  getKidsGrade,
} from '../../../location-single-data';

export const WhatToExpect = ({
  setReminderVideo,
  isOnline,
  isSpanish,
  campusUrl,
}: {
  setReminderVideo: string | null | undefined;
  isOnline?: boolean;
  isSpanish?: boolean;
  campusUrl?: string;
}) => {
  const title = isSpanish ? '¿Qué esperar?' : 'What to Expect';
  const expectItems = isSpanish
    ? expectSpanishItems
    : isOnline
      ? expectOnlineItems
      : expectEnglishItems(getKidsGrade(campusUrl));
  const { isSmall } = useResponsive();

  return (
    <div className='w-full rounded-t-[24px] md:rounded-none bg-gray pt-36 md:pt-40 pb-8 lg:pb-28 content-padding flex justify-center'>
      <div className='w-full flex flex-col lg:flex-row gap-12 xl:gap-20 items-center justify-center max-w-screen-content mx-auto'>
        {/* Left Side */}
        {!isOnline && setReminderVideo && (
          <div className='flex-1 w-full lg:flex-auto lg:w-5/7 xl:w-4/7'>
            <Video
              wistiaId={setReminderVideo}
              className='w-full aspect-video md:h-[414px] md:aspect-73/41 rounded-2xl'
            />
          </div>
        )}

        {/* Right Side */}
        <div
          className={cn(
            'flex flex-1 w-full flex-col gap-6',
            'lg:flex-auto',
            !isOnline &&
              setReminderVideo &&
              'lg:w-3/7 lg:max-w-[616px] xl:w-3/7',
            (isOnline || !setReminderVideo) &&
              'lg:w-full lg:max-w-[964px] lg:items-center',
          )}
        >
          <h2 className='font-extrabold text-[24px] md:text-[36px] lg:text-[48px] xl:text-[52px]'>
            {title}
          </h2>
          <div
            className={cn(
              'flex flex-col gap-6',
              isOnline && 'lg:flex-row lg:gap-16',
            )}
          >
            <div className={cn('flex flex-col gap-6', isOnline && 'lg:flex-1')}>
              {expectItems.slice(0, 2).map((item, index) => (
                <ExpectItem
                  key={index}
                  title={item.title}
                  description={item.description}
                />
              ))}
            </div>

            <div className={cn('flex flex-col gap-6', isOnline && 'lg:flex-1')}>
              {expectItems.slice(2).map((item, index) => (
                <ExpectItem
                  key={index}
                  title={item.title}
                  description={item.description}
                />
              ))}
            </div>
          </div>

          {/* md+: reminder here; mobile reminder lives under Campus Amenities (one dialog at a time). */}
          {!isSmall && (
            <div className={cn('flex', isOnline && 'mt-4 lg:mt-8')}>
              <SetAReminderModal
                ModalButton={LocationSingleReminderModalButton}
                className={
                  isOnline
                    ? 'bg-ocean text-white border-ocean hover:bg-navy! hover:border-navy! rounded-lg'
                    : undefined
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const LocationSingleReminderModalButton = forwardRef<
  HTMLButtonElement,
  ButtonProps
>(({ children, className, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      intent='primary'
      className={cn(
        'font-normal text-base rounded-lg! bg-ocean! text-white hover:bg-navy! hover:border-navy!',
        className,
      )}
      {...props}
    >
      {children ?? 'Set a Reminder'}
    </Button>
  );
});

LocationSingleReminderModalButton.displayName =
  'LocationSingleReminderModalButton';

const ExpectItem = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => {
  return (
    <div className='flex flex-col gap-2'>
      <h3 className='font-bold text-lg'>{title}</h3>
      <p className='text-text-secondary'>{description}</p>
    </div>
  );
};
