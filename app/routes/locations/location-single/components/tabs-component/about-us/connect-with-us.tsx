import { SetAReminderModal } from '~/components';
import { Button, ButtonProps } from '~/primitives/button/button.primitive';
import React from 'react';
import { cn } from '~/lib/utils';

export const ConnectWithUs = ({
  isSpanish,
  campusName,
  campusInstagram,
}: {
  isSpanish?: boolean;
  campusName: string;
  campusInstagram: string;
}) => {
  const isOnline = campusName.toLowerCase().includes('online');

  const reminderLabel = isSpanish ? 'Visítanos' : 'Set a Reminder';

  const CustomButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, ...props }, ref) => (
      <Button
        ref={ref}
        intent='primary'
        className={cn(
          'w-fit !rounded-lg !bg-ocean !text-white hover:!bg-navy',
          className,
        )}
        {...props}
      >
        {reminderLabel}
      </Button>
    ),
  );

  return (
    <div className='w-full bg-dark-navy py-28 content-padding flex justify-center'>
      <div className='w-full flex flex-col gap-16 max-w-screen-content mx-auto'>
        <div className='flex flex-col lg:flex-row gap-4 items-center lg:gap-12 xl:gap-0 justify-between w-full'>
          <img
            className='size-full max-w-[500px] xl:max-w-[640px] object-cover aspect-square'
            src='/assets/images/locations/connect.webp'
          />

          <div className='flex flex-col items-center lg:items-start text-center lg:text-left justify-center gap-4 text-white'>
            <h2 className='font-extrabold text-[40px] lg:text-[52px]'>
              {isSpanish ? 'Conéctate con Nosotros' : 'Connect With Us'}
            </h2>
            <p className='lg:text-xl lg:max-w-[520px] text-pretty'>
              {isSpanish
                ? 'Síguenos en redes sociales para mantenerte al tanto de todo lo que sucede en este campus.'
                : 'Follow us on social media to stay in the know with what goes on here at this campus.'}
            </p>
            <Button
              className='w-fit rounded-lg'
              href={campusInstagram}
              target='_blank'
            >
              {isSpanish
                ? 'CF Español'
                : !isOnline
                  ? campusName
                  : 'Christ Fellowship Church'}{' '}
              {isSpanish ? 'en' : 'on'} Instagram
            </Button>
          </div>
        </div>

        <div className='flex flex-col lg:flex-row items-center md:items-start justify-between lg:items-center w-full bg-white p-8 lg:p-12 rounded-[1rem] gap-6 lg:gap-0'>
          <div className='flex flex-col  gap-4 lg:gap-6'>
            <h2 className='font-extrabold text-2xl lg:text-[2rem]'>
              {isSpanish
                ? '¡Esperamos verte este fin de semana!'
                : 'Looking forward to seeing you this weekend!'}
            </h2>
          </div>
          <SetAReminderModal ModalButton={CustomButton} />
        </div>
      </div>
    </div>
  );
};
