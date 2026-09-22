import { cn } from '~/lib/utils';
import { Button } from '~/primitives/button/button.primitive';
import {
  Carousel,
  CarouselArrows,
  CarouselContent,
  CarouselDots,
  CarouselItem,
} from '~/primitives/shadcn-primitives/carousel';
import { ResourceCard } from '~/primitives/cards/resource-card';
import { SingleEventCard } from '~/primitives/cards/single-event-card';
import { CollectionItem } from '~/routes/page-builder/types';
import HTMLRenderer from '~/primitives/html-renderer';

interface CardCarouselSectionProps {
  viewMoreStyles?: string;
  viewMoreLink?: string;
  viewMoreText?: string;
  title: string;
  description?: string;
  resources: CollectionItem[];
  mode?: 'dark' | 'light';
  carouselItemClassName?: string;
  CardComponent?: React.ComponentType<{
    resource: CollectionItem;
  }>;
  className?: string;
  backgroundImage?: string;
}

// Known as Resource Collection in Rock RMS
export const CardCarouselSection = ({
  CardComponent,
  carouselItemClassName,
  className,
  backgroundImage,
  title,
  description,
  resources,
  viewMoreStyles,
  viewMoreLink,
  viewMoreText = 'View More',
  mode = 'light',
}: CardCarouselSectionProps) => {
  return (
    <div
      className={cn('w-full pl-5 md:pl-12 lg:pl-18 lg:pr-18', className)}
      style={
        backgroundImage
          ? {
              backgroundImage: `url(${backgroundImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
    >
      <div className='flex flex-col max-w-screen-content mx-auto'>
        <div className='w-full flex justify-center'>
          <div className='w-full flex flex-col items-center gap-12 lg:gap-20 py-16 md:py-24'>
            {/* Header */}
            <div className='w-full flex items-end justify-between pr-5 md:pr-12 lg:pr-18 2xl:pr-8! 3xl:pr-0!'>
              <div
                className={cn(
                  'flex flex-col w-full gap-2',
                  mode === 'dark' && 'text-white',
                )}
              >
                <h2 className='heading-section'>{title}</h2>
                {description && (
                  <HTMLRenderer html={description} className='md:text-lg' />
                )}
              </div>

              {viewMoreLink && (
                <Button
                  href={viewMoreLink}
                  size='md'
                  className={cn(
                    'hidden md:block min-w-32 w-fit whitespace-nowrap',
                    mode === 'dark' &&
                      'text-white border-white hover:bg-white/10!',
                    viewMoreStyles,
                  )}
                  intent='secondary'
                >
                  {viewMoreText}
                </Button>
              )}
            </div>

            <div className='w-full max-w-full text-text-primary'>
              <CardCarousel
                resources={resources}
                mode={mode}
                CardComponent={CardComponent}
                carouselItemClassName={carouselItemClassName}
              />
            </div>

            {/* Mobile View All */}
            {viewMoreLink && (
              <div className='w-full flex justify-start -mt-8 md:hidden'>
                <Button
                  href={viewMoreLink}
                  size='md'
                  className={cn(
                    'whitespace-nowrap',
                    mode === 'dark' && 'text-white border-white',
                    viewMoreStyles,
                  )}
                  intent='secondary'
                >
                  {viewMoreText}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Event Collections with exactly one event render a single full-width card (Figma: Web 3.0, node 8082-69891) instead of a carousel
export const SingleEventCollectionSection = ({
  title,
  description,
  resource,
  viewMoreLink,
  viewMoreText = 'View More',
  className,
}: {
  title: string;
  description?: string;
  resource: CollectionItem;
  viewMoreLink?: string;
  viewMoreText?: string;
  className?: string;
}) => {
  return (
    <div className={cn('w-full pl-5 md:pl-12 lg:pl-18 lg:pr-18', className)}>
      <div className='flex flex-col max-w-screen-content mx-auto'>
        <div className='w-full flex justify-center'>
          <div className='w-full flex flex-col items-center gap-12 lg:gap-20 py-16 md:py-24'>
            {/* Header */}
            <div className='w-full flex items-end justify-between pr-5 md:pr-12 lg:pr-18 2xl:pr-8! 3xl:pr-0!'>
              <div className='flex flex-col w-full gap-2'>
                <h2 className='heading-section'>{title}</h2>
                {description && (
                  <HTMLRenderer html={description} className='md:text-lg' />
                )}
              </div>

              {viewMoreLink && (
                <Button
                  href={viewMoreLink}
                  size='md'
                  className='hidden md:block min-w-32 w-fit whitespace-nowrap'
                  intent='secondary'
                >
                  {viewMoreText}
                </Button>
              )}
            </div>

            <div className='w-full max-w-full pr-5 md:pr-12 lg:pr-18 2xl:pr-8! 3xl:pr-0!'>
              <SingleEventCard resource={resource} />
            </div>

            {/* Mobile View All */}
            {viewMoreLink && (
              <div className='w-full flex justify-start -mt-8 md:hidden'>
                <Button
                  href={viewMoreLink}
                  size='md'
                  className='whitespace-nowrap'
                  intent='secondary'
                >
                  {viewMoreText}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const CardCarousel = ({
  CardComponent,
  resources,
  mode,
  layout = 'arrowsRight',
  carouselItemClassName,
  carouselClassName,
}: {
  CardComponent?: React.ComponentType<{
    resource: CollectionItem;
  }>;
  resources: CollectionItem[];
  mode?: 'dark' | 'light';
  layout?: 'arrowsRight' | 'arrowsLeft';
  carouselItemClassName?: string;
  carouselClassName?: string;
}) => {
  return (
    <Carousel
      opts={{
        align: 'start',
      }}
      className={cn('min-w-0 max-w-full', carouselClassName)}
    >
      <CarouselContent className='pt-3 gap-6 xl:gap-8 2xl:pr-18'>
        {resources.map((resource, index) => (
          <CarouselItem
            key={index}
            className={cn(
              carouselItemClassName ??
                'w-full basis-[75%] sm:basis-[45%] lg:basis-[31.33%] xl:basis-[30%]',
              index === resources.length - 1
                ? 'mr-5 lg:mr-0'
                : !carouselItemClassName && 'pr-0',
            )}
          >
            {CardComponent ? (
              <CardComponent resource={resource} />
            ) : (
              <ResourceCard
                resource={resource}
                className={mode === 'dark' ? 'border-none' : undefined}
              />
            )}
          </CarouselItem>
        ))}
      </CarouselContent>

      <div
        className={cn(
          'relative w-full flex justify-between items-center mt-8 sm:mt-12 md:mt-14 px-4',
          /* Reserve space for absolutely positioned dots/arrows (parent had ~0 in-flow height on mobile → clipped by overflow-hidden). */
          'min-h-[4.5rem]',
          {
            'flex md:hidden': resources.length < 4 && resources.length > 1,
            hidden: resources.length < 2,
          },
        )}
      >
        {layout === 'arrowsLeft' ? (
          <>
            <div className={cn('flex h-12 max-w-full items-center')}>
              <CarouselArrows
                arrowStyles={
                  mode === 'dark'
                    ? 'text-white border-white hover:text-neutral-light hover:border-neutral-light'
                    : undefined
                }
              />
            </div>

            <div className='h-12 flex items-center'>
              <CarouselDots
                activeClassName={mode === 'dark' ? 'bg-white' : 'bg-ocean'}
                inactiveClassName='bg-neutral-lighter'
              />
            </div>
          </>
        ) : (
          <>
            <div className='h-12 flex items-center'>
              <CarouselDots
                activeClassName={mode === 'dark' ? 'bg-white' : 'bg-ocean'}
                inactiveClassName='bg-neutral-lighter'
              />
            </div>

            <div
              className={cn(
                'flex h-12 w-max max-w-full items-center justify-end',
              )}
            >
              <CarouselArrows
                arrowStyles={
                  mode === 'dark'
                    ? 'text-white border-white hover:text-neutral-light hover:border-neutral-light'
                    : undefined
                }
              />
            </div>
          </>
        )}
      </div>
    </Carousel>
  );
};
