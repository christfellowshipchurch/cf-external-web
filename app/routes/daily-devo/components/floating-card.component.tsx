import { useLoaderData } from 'react-router';
import { icons } from '~/lib/icons';
import { LoaderReturnType } from '../loader';
import Icon from '~/primitives/icon';
import { appleLink, cn, googleLink, isAppleDevice } from '~/lib/utils';

export type FloatingCardType = {
  title: string;
  subtitle: string;
  icon: keyof typeof icons;
};

export const FloatingCard = ({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof icons;
}) => {
  const { avatars } = useLoaderData<LoaderReturnType>();

  return (
    <div
      className={cn(
        'size-fit lg:w-[200px] lg:h-[140px]',
        'flex flex-col justify-between',
        'shadow-md rounded-[12px]',
        'px-4 py-3  lg:pt-3 lg:pb-2 lg:px-4',
        'bg-gray absolute',
        // Floating Card Positions
        icon === 'handsPraying' &&
          'top-50 right-8 rotate-14 md:top-60 lg:-rotate-10 lg:-left-8 lg:top-0 xl:left-0',
        icon === 'handsClapping' &&
          '-left-2 -rotate-22 top-6 lg:left-auto lg:-rotate-9 lg:-right-6 lg:-top-16 xl:right-0',
        icon === 'bookOpenText' &&
          'right-0 -top-16 rotate-18 lg:rotate-7 lg:-bottom-20 lg:top-auto lg:right-20 lg:left-auto xl:right-28',
      )}
    >
      <div className='flex flex-col gap-[6px] h-fit'>
        <Icon name={icon} size={26} className='text-ocean self-start' />

        <div className='hidden lg:flex flex-col'>
          <p className='text-[10px] text-[#27272E] opacity-60'>{subtitle}</p>
          <h2 className='text-[#27272E] text-[13px] font-semibold leading-tight'>
            {title}
          </h2>
        </div>
      </div>

      <div className='hidden lg:flex gap-[6px] items-center py-2'>
        <div className='flex -space-x-[10px]'>
          {avatars.slice(0, 4).map((avatar, i) => (
            <div key={i} className='relative'>
              <img
                src={avatar.src}
                alt={avatar.alt}
                className={cn(
                  'size-6 rounded-full border-2 border-[#F6F7FB] border-solid',
                  i === 3 && 'opacity-65',
                )}
              />
              {i == 3 && (
                <p className=' absolute -top-2/5 left-1/2 -translate-x-1/2 text-xl text-[#27272E] opacity-60'>
                  ...
                </p>
              )}
            </div>
          ))}
        </div>

        <p className='w-20 text-[10px] text-[#27272E] opacity-33 leading-none'>
          See what others are saying
        </p>
      </div>

      {/* Arrow Icon */}
      <button
        onClick={() =>
          window.open(isAppleDevice() ? appleLink : googleLink, '_blank')
        }
        className='hidden lg:flex absolute top-3 right-3 cursor-pointer'
      >
        <Icon
          name='arrowRight'
          size={16}
          className='text-ocean hover:text-navy opacity-50'
        />
      </button>
    </div>
  );
};
