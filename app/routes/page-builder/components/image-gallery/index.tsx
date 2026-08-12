import {
  Carousel,
  CarouselArrows,
  CarouselContent,
  CarouselDots,
  CarouselItem,
} from '~/primitives/shadcn-primitives/carousel';
import { ImageGalleryItem, PageBuilderSection } from '../../types';
import { HTMLRenderer } from '~/primitives/html-renderer/html-renderer.component';

export const ImageGallerySection = ({ data }: { data: PageBuilderSection }) => {
  const sectionTitle =
    data.titleOverride && data.titleOverride !== ''
      ? data.titleOverride
      : data.name;
  const shouldShowTitle = !data.hideTitle && Boolean(sectionTitle?.trim());
  const shouldShowContent = Boolean(data.content?.trim());
  const shouldShowHeader = shouldShowTitle || shouldShowContent;

  return (
    <div className='w-full bg-white py-16 pb-10 md:py-28 pl-5 md:pl-12 lg:px-18'>
      <div className='mx-auto flex max-w-screen-content flex-col gap-12 md:gap-20'>
        {shouldShowHeader && (
          <div className='flex max-w-[768px] flex-col gap-5 md:gap-6'>
            {shouldShowTitle && (
              <h2 className='text-[48px] font-extrabold leading-[1.2] text-text-primary md:text-[52px]'>
                {sectionTitle}
              </h2>
            )}
            {shouldShowContent && (
              <HTMLRenderer
                className='text-base md:text-lg'
                html={data.content}
              />
            )}
          </div>
        )}

        <ImageGalleryComponent data={data.imageGallery} />
      </div>
    </div>
  );
};

const ImageGalleryComponent = ({
  data,
}: {
  data: ImageGalleryItem[] | undefined;
}) => {
  if (!data?.length) {
    return null;
  }

  return (
    <Carousel
      opts={{
        align: 'start',
      }}
    >
      <CarouselContent className='gap-6'>
        {data.map((item) => (
          <CarouselItem
            key={item.id}
            className='basis-[68%] sm:basis-[45%] lg:basis-[calc((100%-3rem)/3)]'
          >
            <ImageGalleryCard item={item} />
          </CarouselItem>
        ))}
      </CarouselContent>

      <div className='mt-5 flex w-full items-center justify-between pr-5 md:mt-8 md:pr-0'>
        <CarouselDots
          className='justify-start'
          activeClassName='bg-ocean'
          inactiveClassName='bg-neutral-lighter'
        />
        <CarouselArrows />
      </div>
    </Carousel>
  );
};

const ImageGalleryCard = ({ item }: { item: ImageGalleryItem }) => {
  const title = item.title?.trim();
  const summary = item.summary?.trim();
  const shouldShowOverlay = Boolean(title || summary);

  return (
    <div className='relative aspect-square w-full overflow-hidden rounded-2xl md:aspect-auto md:h-[261px]'>
      <img
        src={item.image}
        alt={title || 'Gallery image'}
        className='size-full object-cover'
      />
      {shouldShowOverlay && (
        <div className='absolute inset-x-0 bottom-0 flex flex-col gap-1 overflow-hidden bg-black/65 px-4 py-3'>
          {title && (
            <p className='text-sm font-semibold text-white md:text-base'>
              {title}
            </p>
          )}
          {summary && (
            <p className='text-xs text-white/80 md:text-[13px]'>{summary}</p>
          )}
        </div>
      )}
    </div>
  );
};
