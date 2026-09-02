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
 * Set once the page has mounted in this document, so a later `POP` is known to
 * be a client-side back/forward rather than the document load itself.
 * `PerformanceNavigationTiming.type` can't tell them apart — it describes how
 * the document loaded and never changes afterwards.
 */
let hasEnteredInThisDocument = false;

/**
 * True for a click-through or a typed URL, false for back/forward and reloads —
 * where the browser and `ScrollRestoration` should keep the visitor where they
 * were. Consumes the document-entry flag, so call it once per mount.
 */
function consumeFreshPageEntry(navigationType: string): boolean {
  if (typeof window === 'undefined') return false;

  const isFirstEntry = !hasEnteredInThisDocument;
  hasEnteredInThisDocument = true;

  // A Link click is always a new arrival, however the document got here.
  if (navigationType !== 'POP') return true;
  if (!isFirstEntry) return false;

  // The document load itself: fresh only if it wasn't a reload or back/forward,
  // both of which come with a scroll position worth keeping.
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
  // Lazily initialised so the flag is consumed once per mount, not once per render.
  const isFreshEntryRef = useRef<boolean | null>(null);
  if (isFreshEntryRef.current === null) {
    isFreshEntryRef.current = consumeFreshPageEntry(navigationType);
  }

  useEffect(() => {
    if (!isFreshEntryRef.current) return;

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
    // Mount only: freshness is decided once, on arrival.
  }, []);

  useEffect(() => {
    if (!volunteerUiReady) return;
    if (hasUserScrolledRef.current) return;
    if (!isFreshEntryRef.current) return;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [volunteerUiReady]);

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

      <div className='relative' aria-busy={volunteerUiReady ? undefined : true}>
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
