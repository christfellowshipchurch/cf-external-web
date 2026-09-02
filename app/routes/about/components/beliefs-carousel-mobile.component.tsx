import { useEffect, useRef } from 'react';
import { cn } from '~/lib/utils';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  useCarousel,
} from '~/primitives/shadcn-primitives/carousel';
import { beliefsData, spanishBeliefData } from '../about.data';

const pillClass = cn(
  'shrink-0 cursor-pointer whitespace-nowrap rounded-full border-2 px-5 py-2.5',
  'text-base font-bold transition-colors duration-300',
  'border-white/10 bg-white/5 text-white/70',
);

const BeliefsMobilePills = ({ titles }: { titles: string[] }) => {
  const { currentSlide, api } = useCarousel();
  const listRef = useRef<HTMLDivElement>(null);

  // Swiping the carousel can select a pill that sits outside the visible
  // strip, so keep the active pill scrolled into view without moving the page.
  useEffect(() => {
    const list = listRef.current;
    const activePill = list?.children[currentSlide] as HTMLElement | undefined;

    if (!list || !activePill) return;

    list.scrollTo({
      left:
        activePill.offsetLeft - (list.clientWidth - activePill.clientWidth) / 2,
      behavior: 'smooth',
    });
  }, [currentSlide]);

  return (
    <div
      ref={listRef}
      className='relative flex w-full gap-2 overflow-x-auto px-6 scrollbar-hide'
    >
      {titles.map((title, index) => (
        <button
          key={title}
          type='button'
          onClick={() => api?.scrollTo(index)}
          aria-current={currentSlide === index ? 'true' : undefined}
          className={cn(
            pillClass,
            currentSlide === index && 'border-ocean bg-ocean text-white',
          )}
        >
          {title}
        </button>
      ))}
    </div>
  );
};

export function BeliefsCarouselMobile({
  isSpanish = false,
}: {
  isSpanish?: boolean;
}) {
  const data = isSpanish ? spanishBeliefData : beliefsData;

  return (
    <div className='z-30'>
      <img
        src='/assets/images/about/beliefs.webp'
        alt='Beliefs'
        className='w-full min-h-[220px] object-cover'
      />
      <div className='relative'>
        <Carousel
          opts={{
            align: 'start',
          }}
          className='w-full relative'
        >
          <div className='bg-dark-navy pt-8'>
            <BeliefsMobilePills titles={data.map((belief) => belief.title)} />
          </div>
          <CarouselContent>
            {data.map((belief, _index) => (
              <CarouselItem
                key={belief.title}
                className={cn(
                  'pl-0',
                  'basis-[100%]',
                  'md:basis-[50%]',
                  'lg:basis-[33.333%]',
                )}
                data-belief-title={belief.title}
              >
                <div className={cn('px-6 py-12 bg-dark-navy h-full')}>
                  <h4 className='text-3xl text-background-secondary font-extrabold mb-4'>
                    {belief.title}
                  </h4>
                  <p className='text-lg text-ocean'>{belief.verses}</p>
                  {belief.description && (
                    <p className='text-background-secondary mt-4'>
                      {belief.description}
                    </p>
                  )}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </div>
  );
}
