import type React from 'react';

import { cn } from '~/lib/utils';
import {
  CLASS_SINGLE_CAROUSEL_CONTENT_GAP_CLASS,
  CLASS_SINGLE_CAROUSEL_ITEM_CLASS,
} from '../hooks/use-class-single-carousel-cards-per-slide';
import { Button } from '~/primitives/shadcn-primitives/button';
import {
  Carousel,
  CarouselContent,
  CarouselDots,
  CarouselItem,
  useCarousel,
} from '~/primitives/shadcn-primitives/carousel';
import Icon from '~/primitives/icon';
import { UpcomingSessionCard } from './upcoming-session-card.component';
import { ClassHitType } from '../../types';

function UpcomingCarouselNavRow() {
  const { api, scrollPrev, scrollNext, canScrollPrev, canScrollNext } =
    useCarousel();
  const slideCount = api?.scrollSnapList().length ?? 0;
  if (slideCount <= 1) return null;

  return (
    <div className='mt-6 flex w-full flex-row items-center justify-between gap-4 px-1'>
      <CarouselDots
        className='justify-start gap-2'
        activeClassName='h-2 w-2 bg-ocean'
        inactiveClassName='h-2 w-2 bg-neutral-lighter'
      />
      <div className='flex shrink-0 items-center gap-2 pr-5 md:pr-12 lg:pr-0'>
        <Button
          type='button'
          variant='outline'
          size='icon'
          disabled={!canScrollPrev}
          className={cn(
            'size-12 rounded-full border-ocean text-ocean',
            'hover:border-navy hover:text-navy',
            'disabled:border-[#AAAAAA] disabled:text-[#AAAAAA]',
          )}
          aria-label='Previous slide'
          onClick={scrollPrev}
        >
          <Icon name='arrowBack' className='size-6' />
        </Button>
        <Button
          type='button'
          variant='outline'
          size='icon'
          disabled={!canScrollNext}
          className={cn(
            'size-12 rounded-full border-ocean text-ocean',
            'hover:border-navy hover:text-navy',
            'disabled:border-[#AAAAAA] disabled:text-[#AAAAAA]',
          )}
          aria-label='Next slide'
          onClick={scrollNext}
        >
          <Icon name='arrowRight' className='size-6' />
        </Button>
      </div>
    </div>
  );
}

export function UpcomingSessionsCarousel({
  hits,
  resetKey,
  extraCard,
}: {
  hits: ClassHitType[];
  resetKey: string;
  extraCard?: React.ReactNode;
}) {
  if (hits.length === 0) {
    return null;
  }

  return (
    <Carousel
      key={resetKey}
      opts={{
        align: 'start',
        containScroll: 'trimSnaps',
        slidesToScroll: 'auto',
      }}
      className='w-full max-w-[1296px]'
    >
      <CarouselContent
        className={cn('ml-0 py-3', CLASS_SINGLE_CAROUSEL_CONTENT_GAP_CLASS)}
      >
        {hits.map((hit, idx) => (
          <CarouselItem
            key={hit.objectID ?? idx}
            className={CLASS_SINGLE_CAROUSEL_ITEM_CLASS}
          >
            <div className='flex h-full min-h-0 w-full min-w-0 max-w-full justify-center lg:justify-start'>
              <UpcomingSessionCard hit={hit} />
            </div>
          </CarouselItem>
        ))}
        {extraCard && (
          <CarouselItem className={CLASS_SINGLE_CAROUSEL_ITEM_CLASS}>
            <div className='flex h-full min-h-0 w-full min-w-0 max-w-full justify-center lg:justify-start'>
              {extraCard}
            </div>
          </CarouselItem>
        )}
      </CarouselContent>
      <UpcomingCarouselNavRow />
    </Carousel>
  );
}
