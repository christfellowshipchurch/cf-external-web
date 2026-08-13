import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import {
  Carousel,
  CarouselArrows,
  CarouselContent,
  CarouselDots,
  CarouselItem,
} from '~/primitives/shadcn-primitives/carousel';
import Icon from '~/primitives/icon';
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
  const [lightboxItem, setLightboxItem] = useState<ImageGalleryItem | null>(
    null,
  );

  if (!data?.length) {
    return null;
  }

  return (
    <>
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
              <ImageGalleryCard
                item={item}
                onOpen={() => setLightboxItem(item)}
              />
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

      <ImageGalleryLightbox
        item={lightboxItem}
        onOpenChange={(open) => {
          if (!open) setLightboxItem(null);
        }}
      />
    </>
  );
};

const ImageGalleryCard = ({
  item,
  onOpen,
}: {
  item: ImageGalleryItem;
  onOpen: () => void;
}) => {
  const title = item.title?.trim();
  const summary = item.summary?.trim();
  const shouldShowOverlay = Boolean(title || summary);

  return (
    <button
      type='button'
      onClick={onOpen}
      aria-label={title ? `View ${title}` : 'View gallery image'}
      className='relative aspect-square w-full cursor-pointer overflow-hidden rounded-2xl md:aspect-auto md:h-[261px]'
    >
      <img
        src={item.image}
        alt={title || 'Gallery image'}
        className='size-full object-cover'
      />
      {shouldShowOverlay && (
        <div className='absolute inset-x-0 bottom-0 flex flex-col gap-1 overflow-hidden bg-black/65 px-4 py-3 text-left'>
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
    </button>
  );
};

const ImageGalleryLightbox = ({
  item,
  onOpenChange,
}: {
  item: ImageGalleryItem | null;
  onOpenChange: (open: boolean) => void;
}) => {
  const title = item?.title?.trim();
  const alt = title || 'Gallery image';

  return (
    <Dialog.Root open={Boolean(item)} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className='fixed inset-0 z-499 bg-black/70 data-[state=closed]:animate-dialogOverlayHide data-[state=open]:animate-dialogOverlayShow' />
        <Dialog.Content
          className='fixed top-1/2 left-1/2 z-500 max-h-[90vh] w-[min(92vw,1100px)] -translate-x-1/2 -translate-y-1/2 outline-none data-[state=closed]:animate-dialogContentHide data-[state=open]:animate-dialogContentShow'
          aria-describedby={undefined}
        >
          <VisuallyHidden.Root>
            <Dialog.Title>{alt}</Dialog.Title>
            <Dialog.Description>
              Enlarged gallery image. Press Escape or click outside to close.
            </Dialog.Description>
          </VisuallyHidden.Root>

          <div className='relative'>
            <Dialog.Close
              className='absolute top-3 right-3 z-10 flex size-10 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70'
              aria-label='Close image'
            >
              <Icon name='x' color='white' size={24} />
            </Dialog.Close>

            {item && (
              <img
                src={item.image}
                alt={alt}
                className='max-h-[90vh] w-full rounded-lg object-contain'
              />
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
