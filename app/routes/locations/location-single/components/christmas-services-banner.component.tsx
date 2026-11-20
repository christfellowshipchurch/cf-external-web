/** Red "Christmas Services" card under the campus heading; links to the campus on the Christmas site. */
export const ChristmasServicesBanner = ({
  href,
  isSpanish,
}: {
  href: string;
  isSpanish?: boolean;
}) => (
  <a
    href={href}
    target='_blank'
    rel='noopener noreferrer'
    className='group block w-full rounded-[14px] border border-[#BE996C] bg-[#8E1F1D] p-1 lg:max-w-[455px]'
  >
    <div className='flex items-center gap-[14px] rounded-[10px] border border-[#BE996C]/55 px-4 py-[14px]'>
      <svg
        aria-hidden='true'
        width='36'
        height='50'
        viewBox='0 0 35.7143 50'
        className='shrink-0'
      >
        <path
          d='M17.8571 0L20.1786 14.6429L24.2857 11.4286L21.7857 16.6071L35.7143 18.75L21.7857 20.8929L24.2857 26.0714L20.1786 22.8571L17.8571 50L15.5357 22.8571L11.4286 26.0714L13.9286 20.8929L0 18.75L13.9286 16.6071L11.4286 11.4286L15.5357 14.6429L17.8571 0Z'
          fill='#D9B886'
        />
      </svg>
      <div className='flex min-w-0 flex-1 flex-col gap-[2px]'>
        <p className='font-serif text-[19px] font-semibold italic leading-[1.3] text-[#F5EDE0]'>
          {isSpanish ? 'Servicios de Navidad' : 'Christmas Services'}
        </p>
        <p className='text-[15px] font-semibold leading-normal text-[#E9D4AE]'>
          {isSpanish
            ? 'Ver horarios de Navidad'
            : 'View Christmas service times'}
        </p>
      </div>
      <svg
        aria-hidden='true'
        width='24'
        height='24'
        viewBox='0 0 24 24'
        fill='none'
        className='shrink-0 transition-transform duration-300 group-hover:translate-x-1'
      >
        <path
          d='M5 12H19M13 18L19 12L13 6'
          stroke='#D9B886'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    </div>
  </a>
);
