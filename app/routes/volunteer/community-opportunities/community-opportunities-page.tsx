import { useState } from 'react';
import { Link, useLoaderData } from 'react-router-dom';

import { SectionTitle } from '~/components/section-title';
import { cn } from '~/lib/utils';
import Icon from '~/primitives/icon';

import { VolunteerAlgolia } from '../components/volunteer-algolia.component';
import { VolunteerAlgoliaSkeleton } from '../components/volunteer-algolia-skeleton.component';
import type { CommunityOpportunitiesLoaderData } from './loader';

export function CommunityOpportunitiesPage() {
  const { ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY, algoliaIndexes } =
    useLoaderData<CommunityOpportunitiesLoaderData>();
  const [volunteerUiReady, setVolunteerUiReady] = useState(false);

  return (
    <main className='bg-white'>
      <header className='border-b border-neutral-lighter content-padding'>
        <div className='mx-auto flex w-full max-w-screen-content items-center py-4'>
          <Link
            to='/volunteer#community'
            prefetch='intent'
            className='inline-flex items-center gap-2 text-sm font-bold text-neutral-darker transition-colors hover:text-ocean'
          >
            <Icon name='chevronLeft' size={16} className='shrink-0' />
            Back to Volunteer
          </Link>
        </div>
      </header>

      <div className='pb-10 pt-12 content-padding md:pb-10 md:pt-16'>
        <div className='mx-auto flex w-full max-w-screen-content flex-col gap-4'>
          <SectionTitle sectionTitle='Needs in our region' />
          <h1 className='text-[40px] font-extrabold capitalize leading-tight text-text-primary md:text-[52px]'>
            Volunteer in our Community
          </h1>
        </div>
      </div>

      <div
        className='relative bg-white'
        aria-busy={volunteerUiReady ? undefined : true}
      >
        <div
          className={cn(
            !volunteerUiReady && 'pointer-events-none select-none opacity-0',
          )}
        >
          <VolunteerAlgolia
            appId={ALGOLIA_APP_ID}
            apiKey={ALGOLIA_SEARCH_API_KEY}
            indexName={algoliaIndexes.missions}
            resultsLayout='grid'
            onVolunteerUiReady={() => setVolunteerUiReady(true)}
          />
        </div>
        {!volunteerUiReady ? (
          <VolunteerAlgoliaSkeleton resultsLayout='grid' />
        ) : null}
      </div>
    </main>
  );
}
