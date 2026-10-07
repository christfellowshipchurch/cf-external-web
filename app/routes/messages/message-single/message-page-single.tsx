import { MessageVideo } from './partials/hero-video.partial';
import { MessageContent } from './partials/content.partial';
import { InThisSeries } from './partials/series.partial';
import { RelatedMessages } from './partials/related-messages.partial';
import { AdditionalResources } from '~/components';
import { useLoaderData, useRouteLoaderData } from 'react-router';
import { LoaderReturnType } from './loader';
import { cn } from '~/lib/utils';
import { RootLoaderData } from '~/routes/navbar/loader';

export function MessageSinglePage() {
  const { message } = useLoaderData<LoaderReturnType>();
  const { siteBanner } = (useRouteLoaderData('root') as RootLoaderData) || {};

  return (
    <div
      className={cn(
        'flex flex-col items-center',
        'bg-linear-to-br from-[#050A0D] to-[#003045]',
        'text-white',
        siteBanner?.content?.length > 0 ? 'pt-38' : 'pt-32',
      )}
    >
      <MessageVideo />
      <MessageContent />

      <div className='w-full content-padding'>
        <div className='mx-auto max-w-screen-content'>
          <div className='mt-16 pb-8 md:mt-24 md:pb-24 flex justify-start'>
            {message.additionalResources.length > 0 && (
              <AdditionalResources
                type='button'
                resources={message.additionalResources}
                color='white'
              />
            )}
          </div>
        </div>
      </div>

      <InThisSeries />
      <RelatedMessages />
    </div>
  );
}
