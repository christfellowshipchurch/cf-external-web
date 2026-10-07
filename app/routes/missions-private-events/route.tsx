import { useState } from 'react';
import { useLoaderData } from 'react-router';

import { cn } from '~/lib/utils';
import { VolunteerAlgolia } from '~/routes/volunteer/components/volunteer-algolia.component';
import { VolunteerAlgoliaSkeleton } from '~/routes/volunteer/components/volunteer-algolia-skeleton.component';

import type { PrivateMissionEventsLoaderData } from './loader';

export { loader } from './loader';
export { meta } from './meta';

export default function PrivateMissionEventsPage() {
  const { ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY, algoliaIndexes } =
    useLoaderData<PrivateMissionEventsLoaderData>();
  const [finderUiReady, setFinderUiReady] = useState(false);

  return (
    <main className='bg-gray py-12 md:py-16'>
      <div className='content-padding'>
        <div className='mx-auto max-w-[1280px]'>
          <h1 className='text-[40px] font-extrabold leading-tight text-text-primary md:text-[52px]'>
            Christ Fellowship Missions
          </h1>
          <p className='mt-2 text-xl font-semibold text-text-secondary md:text-2xl'>
            Private Events
          </p>
          <p className='mt-4 max-w-2xl text-base leading-relaxed text-text-secondary md:text-lg'>
            This page has been shared privately. Please be mindful before
            sharing it with others.
          </p>
        </div>
      </div>

      <div
        className='relative mt-6 min-h-[min(580px,85vh)]'
        aria-busy={finderUiReady ? undefined : true}
      >
        <div
          className={cn(
            !finderUiReady && 'pointer-events-none select-none opacity-0',
          )}
        >
          <VolunteerAlgolia
            appId={ALGOLIA_APP_ID}
            apiKey={ALGOLIA_SEARCH_API_KEY}
            indexName={algoliaIndexes.missionsPrivate}
            resultsLayout='list'
            onVolunteerUiReady={() => setFinderUiReady(true)}
          />
        </div>
        {!finderUiReady ? (
          <VolunteerAlgoliaSkeleton resultsLayout='list' />
        ) : null}
      </div>
    </main>
  );
}
