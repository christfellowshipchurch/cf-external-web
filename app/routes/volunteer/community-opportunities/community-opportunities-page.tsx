import { useEffect, useRef, useState } from 'react';
import {
  Link,
  useLoaderData,
  useLocation,
  useNavigationType,
} from 'react-router-dom';

import { SectionTitle } from '~/components/section-title';
import { cn } from '~/lib/utils';
import Icon from '~/primitives/icon';

import { VolunteerAlgolia } from '../components/volunteer-algolia.component';
import { VolunteerAlgoliaSkeleton } from '../components/volunteer-algolia-skeleton.component';
import {
  COMMUNITY_OPPORTUNITIES_BACK_FALLBACK,
  resolveCommunityOpportunitiesBackHref,
  type CommunityOpportunitiesBackState,
} from './community-opportunities-back-href';
import type { CommunityOpportunitiesLoaderData } from './loader';

/**
 * True for a click-through or a typed URL, false for back/forward — where the
 * browser and `ScrollRestoration` should keep the visitor where they were.
 */
function isFreshPageEntry(navigationType: string): boolean {
  if (navigationType !== 'POP') return true;
  if (typeof window === 'undefined') return false;
  const [entry] = window.performance.getEntriesByType('navigation');
  return (entry as { type?: string } | undefined)?.type === 'navigate';
}

export function CommunityOpportunitiesPage() {
  const { ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY, algoliaIndexes } =
    useLoaderData<CommunityOpportunitiesLoaderData>();
  const [volunteerUiReady, setVolunteerUiReady] = useState(false);
  const navigationType = useNavigationType();

  // Resolved after hydration: neither the referrer nor sessionStorage exists on the server.
  const { state } = useLocation();
  const [backHref, setBackHref] = useState(
    COMMUNITY_OPPORTUNITIES_BACK_FALLBACK,
  );
  useEffect(() => {
    setBackHref(
      resolveCommunityOpportunitiesBackHref(
        state as CommunityOpportunitiesBackState | null,
        navigationType,
      ),
    );
  }, [state, navigationType]);

  /**
   * iOS lands mid-page on a fresh entry here: the finder swaps a tall skeleton
   * for the grid after mount, and Safari settles on the pre-swap offset. Pin to
   * the top on mount and again once the finder is ready, unless the visitor has
   * already started scrolling for themselves.
   */
  const hasUserScrolledRef = useRef(false);
  useEffect(() => {
    if (!isFreshPageEntry(navigationType)) return;

    const markUserScroll = () => {
      hasUserScrolledRef.current = true;
    };
    const events = ['wheel', 'touchmove', 'keydown'] as const;
    events.forEach((event) =>
      window.addEventListener(event, markUserScroll, { passive: true }),
    );

    window.scrollTo({ top: 0, behavior: 'auto' });

    return () =>
      events.forEach((event) =>
        window.removeEventListener(event, markUserScroll),
      );
  }, [navigationType]);

  useEffect(() => {
    if (!volunteerUiReady) return;
    if (hasUserScrolledRef.current) return;
    if (!isFreshPageEntry(navigationType)) return;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [volunteerUiReady, navigationType]);

  return (
    <main className='bg-white'>
      <header className='border-b border-neutral-lighter content-padding'>
        <div className='mx-auto flex w-full max-w-screen-content items-center py-4'>
          <Link
            to={backHref}
            prefetch='intent'
            className='inline-flex items-center gap-2 text-sm font-bold text-neutral-darker transition-colors hover:text-ocean'
          >
            <Icon name='chevronLeft' size={16} className='shrink-0' />
            Back
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
