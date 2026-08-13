import { useLoaderData, useLocation, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useCopyPagePath } from '~/hooks/use-copy-page-path';
import { pushFormEvent } from '~/lib/gtm';

import { VolunteerDetailNav } from '../components/volunteer-detail/volunteer-detail-nav.component';
import { VolunteerDetailHero } from '../components/volunteer-detail/volunteer-detail-hero.component';

import type { LoaderReturnType } from './loader';
import {
  clearVolunteerFinderBackPayload,
  readVolunteerFinderBackPayload,
} from './components/outreach-finder-return-href';
import {
  MissionDetailRows,
  str,
} from './components/outreach-details.component';
import { OutreachIntro } from './components/outreach-intro.component';
import { VolunteerMissionSpotsAlgoliaProvider } from './components/outreach-spots-algolia.component';
import { SignupModal } from './components/signup-modal.component';
import {
  About,
  MobileBottomBar,
  Questions,
  Sidebar,
  WhatToKnow,
} from './partials/outreach-partials.partial';

export function OutreachOpportunityPage() {
  const {
    mission,
    groupGuid,
    waiverPdfUrl,
    ALGOLIA_APP_ID,
    ALGOLIA_SEARCH_API_KEY,
    algoliaIndexes,
  } = useLoaderData<LoaderReturnType>();
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);

  const actionPath = useMemo(
    () => `${location.pathname}${location.search}`,
    [location.pathname, location.search],
  );

  const handleSignupOpen = useCallback(() => {
    setSignupOpen(true);
    pushFormEvent(
      'form_start',
      'community_serving_signup',
      'Community Serving Opportunity Sign Up',
    );
  }, []);

  /** Session payload from finder card click; `navigate(-1)` restores `/volunteer?…` when filters exist. */
  const onBackToOpportunities = useCallback(() => {
    const payload = readVolunteerFinderBackPayload(groupGuid);
    try {
      if (!payload) {
        navigate('/volunteer#community');
        return;
      }
      if (payload.origin === 'missions-private-events') {
        navigate(`/missions-private-events${payload.volunteerListSearch}`);
        return;
      }
      if (payload.origin === 'community-opportunities') {
        navigate(
          `/volunteer/community-opportunities${payload.volunteerListSearch}`,
        );
        return;
      }
      if (payload.volunteerListSearch.trim().length > 1) {
        navigate(-1);
        return;
      }
      navigate('/volunteer#community');
    } finally {
      clearVolunteerFinderBackPayload();
    }
  }, [navigate, groupGuid]);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const title = str(mission.title) || 'Volunteer opportunity';
  const category = str(mission.category) || 'Volunteer opportunity';
  const coverImage = str(mission.coverImageUrl) || undefined;
  const aboutBody = str(mission.summary) || '';
  const contactName = str(mission.contactName);
  const contactEmail = str(mission.contactEmail);

  const spotsRaw = mission.spotsLeftDisplay;
  const spotsLabel =
    spotsRaw !== undefined && spotsRaw !== null && String(spotsRaw).length > 0
      ? `${String(spotsRaw)} spots left`
      : null;

  const { copyPath, copied } = useCopyPagePath();

  return (
    <div
      className={`min-h-screen ${
        isVisible ? 'animate-fadeIn duration-400' : 'opacity-0'
      }`}
    >
      <article className='min-h-screen bg-white md:pb-24 flex flex-col'>
        <VolunteerDetailNav
          copied={copied}
          onCopyPath={copyPath}
          onBack={onBackToOpportunities}
        />
        <VolunteerDetailHero
          title={title}
          coverImage={coverImage}
          onBack={onBackToOpportunities}
        />

        <div className='shrink-0 content-padding w-full py-8 pb-0 md:py-12'>
          <div className='grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,1fr)_min(380px,100%)] md:items-start md:gap-14 mx-auto max-w-content'>
            <div className='min-w-0 space-y-8'>
              <VolunteerMissionSpotsAlgoliaProvider
                appId={ALGOLIA_APP_ID}
                searchApiKey={ALGOLIA_SEARCH_API_KEY}
                indexName={algoliaIndexes.missions}
                groupGuid={groupGuid}
                rockFallback={spotsLabel}
              >
                {(resolvedSpots) => (
                  <OutreachIntro
                    category={category}
                    title={title}
                    spotsLabel={resolvedSpots}
                  />
                )}
              </VolunteerMissionSpotsAlgoliaProvider>

              {/* Mobile-only mission details */}
              <div className='md:hidden pb-4'>
                <MissionDetailRows mission={mission} />
              </div>

              {/* Desktop-only content */}
              <div className='hidden flex-col gap-10 md:flex'>
                <About aboutBody={aboutBody} />
                <WhatToKnow data={mission.whatToKnow} />
                <Questions
                  contactName={contactName}
                  contactEmail={contactEmail}
                />
              </div>
            </div>

            <Sidebar
              mission={mission}
              onSignUpClick={handleSignupOpen}
              copied={copied}
              onCopyPath={copyPath}
            />
          </div>
        </div>

        {/* Mobile-only content */}
        <div className='flex min-h-0 w-full flex-1 flex-col bg-gray pt-12 pb-24 content-padding md:hidden'>
          <div className='mx-auto flex w-full max-w-screen-content flex-col gap-10'>
            <About aboutBody={aboutBody} />
            <WhatToKnow data={mission.whatToKnow} />
            <Questions contactName={contactName} contactEmail={contactEmail} />
          </div>
        </div>

        <MobileBottomBar
          copied={copied}
          mission={mission}
          onCopyPath={copyPath}
          onSignUpClick={handleSignupOpen}
        />

        <SignupModal
          open={signupOpen}
          onOpenChange={setSignupOpen}
          groupGuid={groupGuid}
          waiverPdfUrl={waiverPdfUrl}
          actionPath={actionPath}
        />
      </article>
    </div>
  );
}
