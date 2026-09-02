import React, { useEffect, useRef } from 'react';
import { useLoaderData, useLocation } from 'react-router-dom';

import { scrollToAnchor } from '~/lib/scroll-to-anchor';

import { EventSinglePageType, hasRegistrationContent } from './types';
import { useEventSectionScrollOffset } from './hooks/use-event-section-scroll-offset';
import { EventsSingleHero } from './partials/hero.partial';
import { EventSingleFAQ } from './partials/event-faq.partial';
import { AboutPartial } from './partials/about.partial';
import { EventBanner } from './components/event-banner.component';
import { RegistrationSection } from './partials/registration.partial';
import BackBanner from '~/components/back-banner';
import { useEventsBackUrl } from '../events-back-url';

const SECTION_IDS = ['about', 'faq', 'register'] as const;

export const EventSinglePage: React.FC = () => {
  const data = useLoaderData<EventSinglePageType>();
  const location = useLocation();
  const backToEventsUrl = useEventsBackUrl();
  const getScrollOffset = useEventSectionScrollOffset();
  const scrolledHashRef = useRef('');

  // Scroll to section when landing with a hash (e.g. /events/baptism#register).
  // Only react to hash changes — not scroll-offset updates from navbar hide/show,
  // which would otherwise re-snap the page while the user scrolls in the section.
  useEffect(() => {
    const hash = location.hash?.slice(1);
    if (!hash || !SECTION_IDS.includes(hash as (typeof SECTION_IDS)[number])) {
      scrolledHashRef.current = '';
      return;
    }

    if (scrolledHashRef.current === location.hash) return;
    scrolledHashRef.current = location.hash;

    scrollToAnchor(hash, { behavior: 'auto', offset: getScrollOffset() });
  }, [location.hash, getScrollOffset]);

  // Same predicate the section itself uses, so the tab can never advertise a
  // section that renders nothing.
  const showRegistration = hasRegistrationContent(data);

  const aboutInformationExists =
    (data.aboutTitle && data.aboutTitle !== '') ||
    (data.aboutContent && data.aboutContent !== '') ||
    (data.keyInfoCards && data.keyInfoCards.length > 0) ||
    (data.whatToExpect && data.whatToExpect.length > 0) ||
    (data.moreInfoTitle && data.moreInfoTitle !== '') ||
    (data.optionalBlurb && data.optionalBlurb.length > 0);

  return (
    <>
      <div className='flex flex-col items-center bg-white'>
        <BackBanner
          backText='Back to Events'
          pageTitle={data.title}
          link={backToEventsUrl}
        />

        <EventsSingleHero
          imagePath={data.coverImage}
          ctas={data.heroCtas}
          customTitle={data.titleOverride || data.title}
          subtitle={data.subtitle}
          quickPoints={data.quickPoints}
        />

        <EventBanner
          title={data.title}
          cta={data.heroCtas[0]}
          sections={[
            ...(aboutInformationExists
              ? [{ id: 'about', label: 'About' }]
              : []),
            ...(data.faqItems && data.faqItems.length > 0
              ? [{ id: 'faq', label: 'FAQ' }]
              : []),
            // Label reads "Locations" (CFDP-4275) while the id stays `register`
            // so existing /events/<slug>#register links keep resolving.
            ...(showRegistration
              ? [{ id: 'register', label: 'Locations' }]
              : []),
          ]}
        />

        {aboutInformationExists && (
          <AboutPartial
            aboutTitle={data.aboutTitle}
            aboutContent={data.aboutContent}
            infoCards={data.keyInfoCards}
            whatToExpect={data.whatToExpect}
            moreInfoTitle={data.moreInfoTitle}
            moreInfoText={data.moreInfoText}
            optionalBlurb={data.optionalBlurb}
          />
        )}

        {data.faqItems && data.faqItems.length > 0 && (
          <EventSingleFAQ
            title={data.title}
            items={data.faqItems}
            faqEmail={data.faqEmail}
          />
        )}

        <RegistrationSection />
      </div>
    </>
  );
};
