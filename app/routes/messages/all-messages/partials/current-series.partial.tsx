import { useLoaderData, useLocation, useNavigation } from 'react-router';
import { IconButton } from '~/primitives/button/icon-button.primitive';

import type { AllMessagesLoaderReturnType } from '../loader';
import { cn, getFirstParagraph } from '~/lib/utils';
import { SectionTitle } from '~/components';
import type { ContentItemHit } from '~/routes/search/types';

const CurrentSeries = () => {
  const { currentSeriesHit, currentSeriesUrl } =
    useLoaderData<AllMessagesLoaderReturnType>();
  const navigation = useNavigation();
  const location = useLocation();

  const isLoading =
    navigation.state === 'loading' &&
    navigation.location?.pathname === location.pathname;

  if (currentSeriesHit) {
    return (
      <div
        className={cn(
          'bg-gray w-full content-padding py-28',
          isLoading && 'opacity-60 pointer-events-none',
        )}
      >
        <div className='flex flex-col gap-12 max-w-screen-content mx-auto'>
          <CurrentSeriesContent
            hit={currentSeriesHit}
            seriesUrl={currentSeriesUrl}
          />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className='bg-gray w-full content-padding py-28'>
        <div className='flex flex-col gap-12 max-w-screen-content mx-auto'>
          <CurrentSeriesLoadingSkeleton />
        </div>
      </div>
    );
  }

  return null;
};

function CurrentSeriesContent({
  hit,
  seriesUrl,
}: {
  hit: ContentItemHit;
  seriesUrl: string;
}) {
  const currentSeriesTitle = hit.seriesName || 'Current Series';
  const coverImageUri = hit.coverImage?.sources?.[0]?.uri;

  const iconButtonClass =
    'text-text-primary border-text-primary hover:enabled:text-ocean hover:enabled:border-ocean lg:text-base xl:!text-lg';

  return (
    <>
      <SectionTitle title={currentSeriesTitle} sectionTitle='current series' />

      <div className='flex flex-col-reverse lg:flex-row items-center justify-center size-full overflow-hidden rounded-2xl lg:h-[620px]'>
        <div className='flex flex-col h-full lg:w-1/2 justify-between lg:justify-center lg:gap-16 bg-white w-full p-8 md:p-16 lg:px-10 lg:py-12 xl:p-16'>
          <div className='flex flex-col gap-4'>
            <div className='flex flex-col gap-2'>
              <h3 className='text-xl font-extrabold text-ocean leading-none'>
                Latest Message
              </h3>

              <h2 className='text-2xl md:text-3xl lg:text-[40px] font-bold text-pretty'>
                {hit.title}
              </h2>
              {hit.author && (
                <p className='-mt-1 font-semibold'>
                  {hit.author.firstName} {hit.author.lastName}
                </p>
              )}
            </div>

            <div className='text-text-secondary line-clamp-4 xl:line-clamp-3 mb-6 lg:mb-0'>
              {hit.summary || getFirstParagraph(hit.htmlContent || '')}
            </div>
          </div>

          <div className='mt-5 lg:mt-0 flex flex-col sm:flex-row gap-3 sm:gap-4 xl:gap-8'>
            {hit.sermonSeriesGuid && (
              <IconButton
                to={`/series-resources/${seriesUrl || hit.sermonSeriesGuid}`}
                className={iconButtonClass}
              >
                Series & Resources
              </IconButton>
            )}
            <IconButton
              to={`/messages/${hit.url}`}
              prefetch='viewport'
              withRotatingArrow
              className={iconButtonClass}
            >
              Watch Message
            </IconButton>
          </div>
        </div>

        {coverImageUri && (
          <img
            src={coverImageUri}
            alt={currentSeriesTitle}
            className='w-full lg:w-1/2 lg:h-[620px] object-cover'
          />
        )}
      </div>
    </>
  );
}

const CurrentSeriesLoadingSkeleton = () => {
  return (
    <>
      <SectionTitle title='Current Series' sectionTitle='current series' />
      <div className='size-full rounded-2xl lg:h-[620px] xl:h-[540px] 2xl:h-[500px] bg-white animate-pulse' />
    </>
  );
};

export default CurrentSeries;
