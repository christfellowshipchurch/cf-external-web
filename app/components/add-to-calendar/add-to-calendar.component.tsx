import { useEffect, useRef, useState } from 'react';
import { Button, type ButtonProps } from '~/primitives/button/button.primitive';
import Icon from '~/primitives/icon';
import { cn } from '~/lib/utils';

const isIOS = () => {
  if (typeof window === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
};

const isAndroid = () => {
  if (typeof window === 'undefined') return false;
  return /android/i.test(navigator.userAgent);
};

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const GoogleCalendarIcon = ({ date }: { date: Date }) => (
  <svg
    width='28'
    height='28'
    viewBox='0 0 32 32'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    aria-hidden='true'
    className='shrink-0'
  >
    <rect width='32' height='32' rx='6' fill='white' />
    <rect width='32' height='32' rx='6' stroke='#dadce0' strokeWidth='1' />
    <rect width='32' height='11' rx='6' fill='#1a73e8' />
    <rect y='6' width='32' height='5' fill='#1a73e8' />
    <rect
      x='8.5'
      y='0'
      width='2'
      height='6'
      rx='1'
      fill='white'
      opacity='0.6'
    />
    <rect
      x='21.5'
      y='0'
      width='2'
      height='6'
      rx='1'
      fill='white'
      opacity='0.6'
    />
    <circle cx='8' cy='18' r='2.2' fill='#4285F4' />
    <circle cx='24' cy='18' r='2.2' fill='#EA4335' />
    <circle cx='8' cy='27' r='2.2' fill='#34A853' />
    <circle cx='24' cy='27' r='2.2' fill='#FBBC05' />
    <text
      x='16'
      y='27'
      textAnchor='middle'
      fontSize='12'
      fontWeight='700'
      fill='#1a73e8'
      fontFamily='Arial, sans-serif'
    >
      {date.getDate()}
    </text>
  </svg>
);

const AppleCalendarIcon = ({ date }: { date: Date }) => (
  <svg
    width='28'
    height='28'
    viewBox='0 0 28 28'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    aria-hidden='true'
    className='shrink-0'
  >
    <rect width='28' height='28' rx='5' fill='white' />
    <rect width='28' height='28' rx='5' stroke='#e0e0e0' strokeWidth='1' />
    <rect width='28' height='10' rx='5' fill='#FF3B30' />
    <rect y='5' width='28' height='5' fill='#FF3B30' />
    <text
      x='14'
      y='8.5'
      textAnchor='middle'
      fontSize='5'
      fontWeight='600'
      fill='white'
      fontFamily='Arial, sans-serif'
      letterSpacing='0.5'
    >
      {DAYS[date.getDay()]}
    </text>
    <text
      x='14'
      y='23'
      textAnchor='middle'
      fontSize='11'
      fontWeight='700'
      fill='#1c1c1e'
      fontFamily='Arial, sans-serif'
    >
      {date.getDate()}
    </text>
  </svg>
);

interface AddToCalendarProps {
  googleHref: string;
  getIcsUrl: () => string;
  eventDate: Date;
  label?: string;
  className?: string;
  /**
   * Size of the trigger button. Defaults to the Button primitive's own `lg`,
   * which is what the modal confirmations this component was built for use.
   * Pass a smaller size where the trigger sits beside a non-`lg` CTA and the
   * two are meant to read as a pair.
   */
  buttonSize?: ButtonProps['size'];
  /**
   * Extra classes for the trigger button itself — `className` styles the
   * wrapper, not the button. Applied last, so it can override the default
   * `rounded-xl` when the surrounding design uses a different radius.
   */
  buttonClassName?: string;
}

export const AddToCalendar = ({
  googleHref,
  getIcsUrl,
  eventDate,
  label = 'Add to Calendar',
  className,
  buttonSize = 'lg',
  buttonClassName,
}: AddToCalendarProps) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showDropdown]);

  const handleAddToCalendar = () => {
    if (isIOS() || isAndroid()) {
      window.location.href = getIcsUrl();
    } else {
      setShowDropdown((prev) => !prev);
    }
  };

  const handleAppleCalendar = () => {
    window.location.href = getIcsUrl();
    setShowDropdown(false);
  };

  return (
    <div className={`relative ${className ?? ''}`} ref={dropdownRef}>
      <Button
        intent='secondary'
        size={buttonSize}
        className={cn('rounded-xl w-full', buttonClassName)}
        onClick={handleAddToCalendar}
      >
        <Icon name='calendarPlus' size={18} className='mr-2' />
        {label}
      </Button>

      {showDropdown && (
        <div className='absolute bottom-full left-0 mb-2 w-full min-w-[240px] rounded-xl border border-neutral-lighter bg-white shadow-lg z-50 overflow-hidden'>
          <a
            href={googleHref}
            target='_blank'
            rel='noopener noreferrer'
            className='flex items-center gap-3 px-4 py-3 text-sm font-medium text-neutral-darker hover:bg-neutral-lightest transition-colors whitespace-nowrap'
            onClick={() => setShowDropdown(false)}
          >
            <GoogleCalendarIcon date={eventDate} />
            Google Calendar
          </a>
          <div className='h-px bg-neutral-lighter' />
          <button
            type='button'
            className='flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-neutral-darker hover:bg-neutral-lightest transition-colors whitespace-nowrap'
            onClick={handleAppleCalendar}
          >
            <AppleCalendarIcon date={eventDate} />
            Apple Calendar (.ics)
          </button>
        </div>
      )}
    </div>
  );
};
