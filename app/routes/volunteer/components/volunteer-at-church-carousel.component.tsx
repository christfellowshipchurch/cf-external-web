import {
  Carousel,
  CarouselContent,
  CarouselItem,
  useCarousel,
} from '~/primitives/shadcn-primitives/carousel';
import { cn } from '~/lib/utils';
import Icon from '~/primitives/icon';

import { VolunteerAtChurchCard } from './cards/volunteer-at-church-card.component';
import type { VolunteerAtChurchResource } from '../types';

// Right-breathing-room baked into each breakpoint's width calc so the last
// visible card is never flush against the viewport edge.
//   sm:  (100% - 1 gap - 24px margin) / 2 visible cards
//   lg:  (100% - 2 gaps - 40px margin) / 3 visible cards
// Last card's right margin mirrors the section's left padding (no right padding
// below lg); Embla counts it, so the scrolled-to-end card isn't flush.
const SLIDE_CLASS =
  'pl-0 basis-[82%] sm:basis-[calc((100%-36px)/2)] lg:basis-[calc((100%-64px)/3)] max-w-[405px] w-full last:mr-5 md:last:mr-12 lg:last:mr-0';

function VolunteerAtChurchCarouselNav() {
  const {
    api,
    currentSlide,
    scrollPrev,
    scrollNext,
    canScrollPrev,
    canScrollNext,
  } = useCarousel();
  const snaps = api?.scrollSnapList() ?? [];
  const showDots = snaps.length > 1;

  return (
    <div className='relative mt-8 w-full min-h-[4.5rem] pb-14 sm:mt-12 sm:pb-16 md:mt-16 md:min-h-0 md:pb-8'>
      <div className='absolute top-1 left-0 flex h-12 items-center gap-2 md:top-7'>
        {showDots &&
          snaps.map((_, index) => (
            <button
              key={index}
              type='button'
              onClick={() => api?.scrollTo(index)}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={currentSlide === index ? true : undefined}
              className={cn(
                'h-2 w-2 cursor-pointer rounded-full transition-colors',
                currentSlide === index
                  ? 'bg-white'
                  : 'bg-white/35 hover:bg-white/60',
              )}
            />
          ))}
      </div>

      <div className='absolute top-1 right-4 flex h-12 items-center justify-end gap-3 sm:right-8 md:top-7 lg:right-4 '>
        <button
          type='button'
          onClick={scrollPrev}
          disabled={!canScrollPrev}
          aria-label='Previous slide'
          className='flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-white text-white transition-colors enabled:hover:text-neutral-light enabled:hover:border-neutral-light disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-gray disabled:opacity-60'
        >
          <Icon name='chevronLeft' size={20} />
        </button>
        <button
          type='button'
          onClick={scrollNext}
          disabled={!canScrollNext}
          aria-label='Next slide'
          className='flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-white text-white transition-colors enabled:hover:text-neutral-light enabled:hover:border-neutral-light disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-gray disabled:opacity-60'
        >
          <Icon name='chevronRight' size={20} />
        </button>
      </div>
    </div>
  );
}

export function VolunteerAtChurchCarousel({
  resources,
}: {
  resources: VolunteerAtChurchResource[];
}) {
  if (resources.length === 0) return null;

  return (
    <Carousel
      opts={{
        align: 'start',
        slidesToScroll: 1,
        containScroll: 'trimSnaps',
      }}
      className='w-full text-text-primary'
      aria-label='Volunteer at church'
    >
      <CarouselContent className='gap-8 pt-3'>
        {resources.map((resource, index) => (
          <CarouselItem
            key={resource.pathname}
            aria-label={`${index + 1} of ${resources.length}`}
            className={SLIDE_CLASS}
          >
            <VolunteerAtChurchCard resource={resource} />
          </CarouselItem>
        ))}
      </CarouselContent>
      <VolunteerAtChurchCarouselNav />
    </Carousel>
  );
}
