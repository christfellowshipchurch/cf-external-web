import { Link } from 'react-router';

import { cn } from '~/lib/utils';
import { Button } from '~/primitives/button/button.primitive';
import Icon from '~/primitives/icon';

export function ChurchIntro({
  name,
  tag,
  description,
}: {
  name: string;
  tag: string;
  description: string;
}) {
  return (
    <div className='space-y-4'>
      <span
        className={cn(
          'lg:text-[14px] font-semibold',
          'rounded-full px-3 py-1 text-sm',
          'bg-ocean/12 text-ocean',
        )}
      >
        {tag}
      </span>
      <h1 className='text-base font-bold leading-tight text-text-primary mt-4'>
        {name}
      </h1>
      <p className='text-base leading-relaxed text-text-secondary'>
        {description}
      </p>
    </div>
  );
}

export function ChurchNotSureLink() {
  return (
    <p className='flex flex-col justify-center items-center md:items-start text-text-secondary pt-12'>
      Not sure which one to choose?{' '}
      <Link
        to='/volunteer-form/welcome'
        className='font-semibold text-ocean hover:underline inline-flex items-center gap-1'
      >
        We'll help you find a spot
        <Icon name='arrowRight' size={14} className='shrink-0' />
      </Link>
    </p>
  );
}

export function ChurchContinueBar({
  hasSelectedRole,
  onContinue,
}: {
  hasSelectedRole: boolean;
  onContinue: () => void;
}) {
  return (
    <div className='sticky bottom-0 z-30 w-full shrink-0 bg-white pb-[max(0px,env(safe-area-inset-bottom,0px))]'>
      {/* Mobile */}
      <div
        className={cn(
          'flex items-stretch border-t border-neutral-lighter p-4 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]',
          'md:hidden',
          'pb-[max(1rem,env(safe-area-inset-bottom,0px))]',
        )}
      >
        <Button
          intent='primary'
          type='button'
          onClick={onContinue}
          disabled={!hasSelectedRole}
          className='min-h-12 w-full rounded-full text-base font-bold disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40'
        >
          Continue
        </Button>
      </div>

      {/* Desktop */}
      <div className='hidden md:block border-t border-neutral-lighter/50 content-padding pt-6 pb-8'>
        <div className='mx-auto w-full max-w-content flex justify-end px-5 md:px-10'>
          <Button
            intent='primary'
            type='button'
            onClick={onContinue}
            disabled={!hasSelectedRole}
            className='w-[280px] text-white hover:bg-ocean/80 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40'
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
