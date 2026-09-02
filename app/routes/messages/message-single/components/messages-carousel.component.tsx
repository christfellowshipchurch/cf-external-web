import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '~/primitives/shadcn-primitives/carousel';
import { SeriesCard } from './this-series-card.component';
import { cn } from '~/lib/utils';
import type { MessageCardType } from '../../types';

export function RelatedMessagesCarousel({
  messages,
}: {
  messages: MessageCardType[];
}) {
  const arrowBaseStyles =
    'border-navy disabled:border-[#AAAAAA] hover:bg-navy/10 cursor-pointer';

  return (
    <Carousel
      opts={{
        align: 'start',
      }}
      className='w-full mt-6 relative mb-12'
    >
      <CarouselContent className='gap-6'>
        {messages.map((message) => (
          <CarouselItem
            key={message.id}
            className='min-w-[318px] md:min-w-[460px] max-w-[460px] w-full pt-2'
          >
            <SeriesCard
              headingClass='text-text-primary'
              pClass='text-text-primary'
              message={{
                title: message.title,
                summary: message.summary,
                coverImage: message.coverImage,
                url: message.url,
              }}
            />
          </CarouselItem>
        ))}
      </CarouselContent>
      <div className='absolute -bottom-10'>
        <CarouselPrevious
          className={cn('left-0', arrowBaseStyles)}
          fill='#004f71'
          disabledFill='#AAAAAA'
        />
        <CarouselNext
          className={cn('left-14', arrowBaseStyles)}
          fill='#004f71'
          disabledFill='#AAAAAA'
        />
      </div>
    </Carousel>
  );
}
