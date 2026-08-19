import {
  Carousel,
  CarouselContent,
  CarouselItem,
  useCarousel,
} from '~/primitives/shadcn-primitives/carousel';
import Icon from '~/primitives/icon';
import { cn } from '~/lib/utils';
import type { WhatWeOfferCardItem } from './what-we-offer.data';
import { WhatWeOfferCard } from './what-we-offer-card.component';

// ~82% slide width leaves a peek of the next card on the right (see volunteer-how-it-works).
const SLIDE_CLASS = 'pl-0 shrink-0 basis-[82%] sm:basis-[50%] md:basis-[35%]';

function WhatWeOfferCarouselNav({ itemCount }: { itemCount: number }) {
  const { scrollPrev, scrollNext, canScrollPrev, canScrollNext } =
    useCarousel();

  if (itemCount <= 1) return null;

  return (
    <div className='flex items-center gap-3 mt-6'>
      <button
        type='button'
        onClick={scrollPrev}
        disabled={!canScrollPrev}
        aria-label='Previous slide'
        className={cn(
          'flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-navy text-navy transition-colors',
          'enabled:hover:text-neutral-light enabled:hover:border-neutral-light',
          'disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-gray disabled:opacity-60',
        )}
      >
        <Icon name='chevronLeft' size={20} />
      </button>
      <button
        type='button'
        onClick={scrollNext}
        disabled={!canScrollNext}
        aria-label='Next slide'
        className={cn(
          'flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-navy text-navy transition-colors',
          'enabled:hover:text-neutral-light enabled:hover:border-neutral-light',
          'disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-gray disabled:opacity-60',
        )}
      >
        <Icon name='chevronRight' size={20} />
      </button>
    </div>
  );
}

function WhatWeOfferCarouselTrack({
  items,
  tabValue,
}: {
  items: WhatWeOfferCardItem[];
  tabValue: string;
}) {
  return (
    <Carousel
      key={tabValue}
      opts={{ align: 'start', containScroll: 'trimSnaps', slidesToScroll: 1 }}
      aria-label='What we offer'
      className='w-full min-w-0'
    >
      <CarouselContent className='gap-4 pl-5 pt-2 md:pl-8'>
        {items.map((item, index) => (
          <CarouselItem
            key={index}
            aria-label={`${index + 1} of ${items.length}`}
            className={cn(
              SLIDE_CLASS,
              index === items.length - 1 && 'mr-5 md:mr-8',
            )}
          >
            <WhatWeOfferCard content={item} className='w-full max-w-none' />
          </CarouselItem>
        ))}
      </CarouselContent>
      <div className='content-padding'>
        <WhatWeOfferCarouselNav itemCount={items.length} />
      </div>
    </Carousel>
  );
}

export function WhatWeOfferMobileCarousel({
  items,
  tabValue,
}: {
  items: WhatWeOfferCardItem[];
  tabValue: string;
}) {
  if (items.length < 3) {
    return (
      <>
        <div className='md:hidden'>
          <WhatWeOfferCarouselTrack items={items} tabValue={tabValue} />
        </div>
        <div
          key={tabValue}
          className='hidden md:flex flex-wrap justify-center gap-4 px-5 pt-2 md:px-8'
        >
          {items.map((item, index) => (
            <WhatWeOfferCard key={index} content={item} />
          ))}
        </div>
      </>
    );
  }

  return <WhatWeOfferCarouselTrack items={items} tabValue={tabValue} />;
}
