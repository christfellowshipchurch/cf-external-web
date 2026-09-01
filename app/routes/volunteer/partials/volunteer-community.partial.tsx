import { useState } from 'react';
import { useLoaderData } from 'react-router-dom';

import { SectionTitle } from '~/components/section-title';
import { ShareMySkillsModal } from '~/components/modals/share-my-skills';
import { cn } from '~/lib/utils';
import { Button } from '~/primitives/button/button.primitive';
import Icon from '~/primitives/icon';
import { VolunteerAlgolia } from '../components/volunteer-algolia.component';
import { VolunteerAlgoliaSkeleton } from '../components/volunteer-algolia-skeleton.component';
import { LoaderReturnType } from '../loader';

export function VolunteerCommunity() {
  const { ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY, algoliaIndexes } =
    useLoaderData<LoaderReturnType>();
  const [volunteerUiReady, setVolunteerUiReady] = useState(false);

  return (
    <section className='w-full bg-gray py-28'>
      <div className='flex flex-col gap-4'>
        {/*
          The anchor sits on the heading rather than the section: a hash jump to
          the section lands on its `py-28` padding, leaving the heading well down
          the viewport. `scroll-mt` clears the fixed navbar.
        */}
        <div id='community' className='content-padding scroll-mt-28'>
          <div className='max-w-screen-content mx-auto flex flex-col gap-6'>
            <SectionTitle sectionTitle='Needs in our region' />
            <div className='flex flex-col gap-4 md:flex-row md:items-end md:justify-between'></div>
            <h2 className='text-[40px] font-extrabold leading-tight text-text-primary md:text-[52px]'>
              Volunteer In Our Community
            </h2>
          </div>
        </div>

        <div
          className='relative min-h-[min(580px,85vh)] bg-gray'
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
              onVolunteerUiReady={() => setVolunteerUiReady(true)}
            />
          </div>
          {!volunteerUiReady ? <VolunteerAlgoliaSkeleton /> : null}
        </div>

        <div className='content-padding'>
          <div className='max-w-screen-content mx-auto mt-16 flex flex-col md:flex-row items-center justify-center gap-6 text-center'>
            <p className='md:text-lg font-semibold text-neutral-dark'>
              Have a skill set we should know about?
            </p>
            <ShareMySkillsModal>
              <div className='group flex cursor-pointer'>
                <Button
                  intent='secondary'
                  className='font-semibold hover:enabled:bg-current/10 rounded-full border-neutral-darker px-6 text-neutral-darker hover:text-white! hover:bg-navy! hover:border-navy!'
                >
                  <span className='flex items-center gap-3'>
                    Share Your Skills
                  </span>
                </Button>
                <Icon
                  name='arrowRight'
                  className='-ml-3 text-white rounded-full p-2 transition-transform duration-300 size-10 bg-ocean -rotate-45 group-hover:rotate-0'
                  size={24}
                />
              </div>
            </ShareMySkillsModal>
          </div>
        </div>
      </div>
    </section>
  );
}
