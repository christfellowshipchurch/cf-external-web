import { Button } from '~/primitives/button/button.primitive';
import { useLoaderData } from 'react-router-dom';
import { SectionTitle } from '~/components';
import { useMemo } from 'react';
import { allMessagesUrlStateToParams } from '../../all-messages/all-messages-url-state';
import { LoaderReturnType } from '../loader';
import { RelatedMessagesCarousel } from '../components/messages-carousel.component';

export const RelatedMessages = () => {
  const { message, relatedMessages } = useLoaderData<LoaderReturnType>();

  const topic = message.primaryCategories[0]?.value?.trim();
  const viewAllMessagesHref = useMemo(() => {
    if (!topic) {
      return '/messages';
    }
    const params = allMessagesUrlStateToParams({
      refinementList: { sermonPrimaryCategories: [topic] },
    });
    const qs = params.toString();
    return qs ? `/messages?${qs}` : '/messages';
  }, [topic]);

  if (relatedMessages.length === 0) {
    return null;
  }

  return (
    <div className='bg-white w-full flex justify-center content-padding'>
      <div className='flex w-full  flex-col items-center py-12 md:py-24 max-w-screen-content'>
        {/* Header */}
        <div className='flex w-full flex-row items-end justify-between gap-4'>
          <div className='flex min-w-0 flex-1 flex-col gap-6 md:gap-8'>
            <SectionTitle sectionTitle='related messages' />
            <h2 className='text-text font-extrabold text-[28px] lg:text-[32px] leading-tight'>
              Other Messages On This Topic
            </h2>
          </div>
          <div className='hidden md:flex shrink-0 items-end text-lg font-semibold'>
            <Button
              href={viewAllMessagesHref}
              size='md'
              className='rounded-none'
              intent='primary'
            >
              View All
            </Button>
          </div>
        </div>

        <RelatedMessagesCarousel messages={relatedMessages} />

        <div className='flex md:hidden pt-16 shrink-0 w-full text-lg font-semibold'>
          <Button
            href={viewAllMessagesHref}
            size='md'
            className='rounded-sm'
            intent='secondary'
          >
            View All
          </Button>
        </div>
      </div>
    </div>
  );
};
