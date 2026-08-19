import { Link } from 'react-router';
import { cn } from '~/lib/utils';
import type { WhatWeOfferCardItem } from './what-we-offer.data';

export const WhatWeOfferCard = ({
  content,
  className,
}: {
  content: WhatWeOfferCardItem;
  className?: string;
}) => {
  return (
    <Link
      to={content.url}
      prefetch='intent'
      className={cn(
        'flex w-full max-w-[310px] flex-col rounded-[36px] overflow-hidden border border-[#E5E7EB] shadow-lg hover:translate-y-[-4px] transition-all duration-300 h-[408px]',
        className,
      )}
    >
      <div className='h-1/2 shrink-0 overflow-hidden'>
        <img
          className='size-full object-cover object-center'
          src={content.image}
          alt={content.name}
        />
      </div>
      <div className='flex h-1/2 shrink-0 flex-col gap-4 overflow-hidden p-6 pb-8 bg-white'>
        <div className='flex items-center justify-center bg-ocean-subdued rounded-full w-fit px-3 py-1'>
          <p className='text-xs font-bold text-[#1C697E]'>{content.tag}</p>
        </div>
        <h2 className='text-navy text-xl font-extrabold leading-none'>
          {content.name}
        </h2>
        <p className='text-[#3F484C] text-sm'>{content.description}</p>
      </div>
    </Link>
  );
};
