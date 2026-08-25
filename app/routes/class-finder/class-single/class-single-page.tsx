import {
  useCallback,
  useMemo,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { useLoaderData, useLocation, useNavigate } from 'react-router-dom';

import { FinderHero, type FinderHeroCta } from '~/components/finders/hero';
import { VideoModal } from '~/components/modals/video-modal';
import { Button } from '~/primitives/button/button.primitive';
import { Icon } from '~/primitives/icon/icon';
import { ClassFAQ } from './components/faq.component';
import { LoaderReturnType } from './loader';
import { ClassSingleUpcomingSearch } from './partials/upcoming-sections.partial';
import { ClassHitType } from '../types';
import { getClassFinderBackUrl } from '../class-finder-back-url';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildClassSingleHeroDescriptionHtml(summary: string): string {
  const safe = escapeHtml(summary);
  return (
    '<h2 style="font-size:28px;font-weight:800;margin-bottom:1rem;">What to Expect</h2>' +
    `<div class="class-single-hero-summary">${safe}</div>`
  );
}

const ClassNotFound = () => {
  return (
    <div className='flex flex-col items-center gap-6 py-20'>
      <h2 className='text-2xl font-bold text-center'>Class Not Found</h2>
      <p className='text-neutral-500 text-center max-w-md'>
        We couldn't find the class you're looking for. It may have been removed
        or renamed.
      </p>
      <Button intent='primary' href='/class-finder'>
        Browse All Classes
      </Button>
    </div>
  );
};

const ClassSingleContent = ({ hit }: { hit: ClassHitType }) => {
  const { topic } = hit;
  const classType = hit.classType?.trim() ?? '';
  const navigate = useNavigate();
  const location = useLocation();
  const classFinderBackUrl = getClassFinderBackUrl(location.state);
  const {
    discussionGuideUrl,
    classTrailer,
    onDemandUrl,
    heroTitle,
    heroSummary,
    heroCoverImageUri,
  } = useLoaderData<LoaderReturnType>();

  // No Rock summary means no "What to Expect" copy at all (heading included),
  // rather than rendering an empty section.
  const heroDescriptionHtml = useMemo(
    () =>
      heroSummary.trim()
        ? buildClassSingleHeroDescriptionHtml(heroSummary)
        : '',
    [heroSummary],
  );

  const heroTitleHtml = useMemo(() => escapeHtml(heroTitle), [heroTitle]);

  const ctas = useMemo<FinderHeroCta[]>(() => {
    const items: FinderHeroCta[] = [];
    if (discussionGuideUrl) {
      items.push({
        href: discussionGuideUrl,
        title: 'Discussion Guide',
        intent: 'secondary' as const,
        className: 'text-base font-normal',
      });
    }
    if (classTrailer) {
      items.push({
        key: 'class-trailer',
        render: () => (
          <VideoModal
            wistiaId={classTrailer}
            intent='primary'
            ModalButton={({ onClick, ...props }) => (
              <Button
                {...props}
                onClick={onClick}
                className='text-base font-normal'
              >
                Class Trailer
              </Button>
            )}
            videoClassName='w-full h-full rounded-lg'
          />
        ),
      });
    }
    return items;
  }, [discussionGuideUrl, classTrailer]);

  const handleBack = useCallback(
    (e: ReactMouseEvent<Element>) => {
      e.preventDefault();
      navigate(classFinderBackUrl);
    },
    [classFinderBackUrl, navigate],
  );

  const backLink = useMemo(
    () => ({
      href: classFinderBackUrl,
      label: 'Back to All Classes' as const,
      onNavigate: handleBack,
    }),
    [classFinderBackUrl, handleBack],
  );

  const coverUri = heroCoverImageUri;

  return (
    <section className='flex w-full flex-col items-center dark:bg-gray-900 md:pt-6'>
      <div className='flex w-full flex-none flex-col'>
        {coverUri ? (
          <div className='relative w-full shrink-0 md:hidden'>
            <img
              src={coverUri}
              alt={heroTitle}
              className='aspect-video w-full max-w-screen object-cover'
            />
            <button
              type='button'
              onClick={handleBack}
              className='absolute left-4 top-4 flex items-center justify-center rounded-full border border-[#DEE0E3] bg-white p-2 shadow-sm'
              aria-label='Back to All Classes'
            >
              <Icon name='arrowBack' className='text-neutral-darker' />
            </button>
          </div>
        ) : null}

        <FinderHero
          bgColor='white'
          bgImage={coverUri}
          imageAlt={heroTitle}
          title={heroTitleHtml}
          topic={topic}
          mobileDescription={heroDescriptionHtml}
          desktopDescription={heroDescriptionHtml}
          ctas={ctas}
          backLink={backLink}
          // With no cover image the mobile overlay back button is gone, so let
          // the hero's own back link show on mobile too.
          backLinkMdUpOnly={Boolean(coverUri)}
          heroImageMdUpOnly
        />
      </div>

      <div className='flex w-full flex-col border-t border-[#E8E8E8]'>
        <ClassSingleUpcomingSearch
          classType={classType}
          classHeroCoverImageUri={coverUri}
          onDemandUrl={onDemandUrl}
        />

        <div className='content-padding flex w-full flex-col items-center'>
          <div className='mx-auto flex w-full max-w-screen-content flex-col items-center'>
            <ClassFAQ />
          </div>
        </div>
      </div>
    </section>
  );
};

/**
 * Hero + sessions/groups are loader-driven (Algolia on the server).
 * No page-level InstantSearch — avoids shipping search keys and blocks first paint on widgets.
 */
export function ClassSinglePage() {
  const { classHit } = useLoaderData<LoaderReturnType>();

  if (!classHit) {
    return <ClassNotFound />;
  }

  return <ClassSingleContent hit={classHit} />;
}
