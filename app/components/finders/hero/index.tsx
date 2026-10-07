import { Link } from 'react-router';
import { Fragment, type MouseEvent, type ReactNode } from 'react';

import { SectionTitle } from '~/components';
import { cn } from '~/lib/utils';
import { Button } from '~/primitives/button/button.primitive';
import { HTMLRenderer } from '~/primitives/html-renderer/html-renderer.component';
import { Icon } from '~/primitives/icon/icon';

export type FinderHeroBgColor = 'ocean' | 'navy' | 'white';
type FinderHeroCtaPlacement = 'mobile' | 'desktop';

type FinderHeroBackLink = {
  href: string;
  label: string;
  /** When set, invoked on link click. Call `e.preventDefault()` if you handle navigation. */
  onNavigate?: (e: MouseEvent<Element>) => void;
};

type FinderHeroLinkCta = {
  href: string;
  title: string;
  className?: string;
  intent: 'primary' | 'secondary' | 'white' | 'secondaryWhite';
};

type FinderHeroCustomCta = {
  key?: string;
  render: (placement: FinderHeroCtaPlacement) => ReactNode;
};

export type FinderHeroCta = FinderHeroLinkCta | FinderHeroCustomCta;

function renderFinderHeroCta(
  cta: FinderHeroCta,
  index: number,
  placement: FinderHeroCtaPlacement,
) {
  if ('render' in cta) {
    return <Fragment key={cta.key ?? index}>{cta.render(placement)}</Fragment>;
  }

  return (
    <Button
      key={index}
      intent={cta.intent}
      className={cta.className}
      href={cta.href}
    >
      {cta.title}
    </Button>
  );
}

export const FinderHero = ({
  bgImage,
  imageAlt = 'Find Community',
  imageLeft = false,
  sectionTitle,
  sectionTitleColor = '#0092BC',
  title,
  topic,
  mobileDescription,
  desktopDescription,
  ctas,
  bgColor,
  backLink,
  /** When true, back link only shows from `md` up (pair with a full-bleed mobile image + overlay control). */
  backLinkMdUpOnly = false,
  /** When true, hero image only shows from `md` up (pair with a separate mobile full-width image). */
  heroImageMdUpOnly = false,
}: {
  bgColor: FinderHeroBgColor;
  bgImage: string;
  imageAlt?: string;
  imageLeft?: boolean;
  title: string;
  /** Optional pill below the title (e.g. class topic).
   * - This will also be used to determine if its a class single page or not. - which lays things out a little differently. */
  topic?: string;
  /** When omitted or empty, the eyebrow is not rendered. */
  sectionTitle?: string;
  sectionTitleColor?: string;
  mobileDescription: string;
  desktopDescription: string;
  ctas?: FinderHeroCta[];
  backLink?: FinderHeroBackLink;
  backLinkMdUpOnly?: boolean;
  heroImageMdUpOnly?: boolean;
}) => {
  const trimmedSectionTitle = sectionTitle?.trim() ?? '';
  const showSectionTitle = trimmedSectionTitle.length > 0;
  const onLightBg = bgColor === 'white';

  return (
    <section
      className={cn(
        !topic ? 'lg:min-h-[65vh] 2xl:max-h-[590px]' : 'h-full',
        'relative content-padding pt-4 lg:pt-0 pb-12 md:pb-8 flex flex-col items-center justify-center',
        bgColor === 'ocean' && 'bg-ocean',
        bgColor === 'navy' && 'bg-navy',
        bgColor === 'white' && 'bg-white',
      )}
    >
      <div className='container mx-auto grid max-w-screen-content grid-cols-1 items-center justify-center gap-10 sm:grid-cols-2 md:gap-8 lg:grid-cols-5 xl:gap-16'>
        {bgImage ? (
          <img
            src={bgImage}
            alt={imageAlt}
            className={cn(
              'w-full max-w-[400px] lg:max-w-none lg:col-span-2 md:order-2 md:mt-6 lg:mt-0',
              imageLeft && 'order-1!',
              topic ? 'rounded-xl' : 'rounded-lg',
              heroImageMdUpOnly && 'hidden md:block',
            )}
          />
        ) : null}

        <div
          className={cn(
            'col-span-1 max-w-[620px] md:order-1 lg:col-span-3 xl:max-w-[700px]',
            onLightBg ? 'text-text-primary' : 'text-white',
            imageLeft && 'order-2!',
          )}
        >
          {showSectionTitle ? (
            <div className='absolute top-12 left-8 md:static'>
              <SectionTitle
                sectionTitle={trimmedSectionTitle}
                color={sectionTitleColor}
              />
            </div>
          ) : null}
          <div className='flex flex-col gap-2'>
            {backLink ? (
              <Link
                to={backLink.href}
                onClick={backLink.onNavigate}
                className={cn(
                  'flex items-center gap-2 hover:text-ocean transition-colors mb-10',
                  backLinkMdUpOnly && 'hidden md:flex',
                )}
              >
                <Icon size={16} name='arrowBack' />
                <span className='text-sm font-medium'>{backLink.label}</span>
              </Link>
            ) : null}
            {topic ? (
              <span
                className={cn(
                  'mt-2 inline-flex w-fit rounded-sm px-2 py-1 text-sm',
                  onLightBg
                    ? 'bg-gray-100 text-text-primary'
                    : 'bg-white/15 text-white',
                )}
              >
                {topic}
              </span>
            ) : null}
            <HTMLRenderer
              html={title}
              className={cn(
                'font-extrabold md:my-6 md:text-[52px] leading-[1.1]!',
                onLightBg && 'text-text-primary',
                topic ? 'text-[32px]' : 'text-[40px]',
              )}
            />
            {topic && ctas && ctas.length > 0 && (
              <div className='md:hidden mt-1 flex flex-wrap gap-4'>
                {ctas.map((cta, index) =>
                  renderFinderHeroCta(cta, index, 'mobile'),
                )}
              </div>
            )}
          </div>

          <div
            className={cn(
              'text-lg',
              onLightBg ? 'text-text-primary' : 'text-white',
              topic ? 'mt-12 md:mt-8' : '',
            )}
          >
            <HTMLRenderer
              html={desktopDescription}
              className={cn(
                'hidden lg:block',
                onLightBg
                  ? 'html-renderer--finder-hero-desc-light'
                  : 'html-renderer--finder-hero-desc',
              )}
            />
            <HTMLRenderer
              html={mobileDescription}
              className={cn(
                'lg:hidden',
                onLightBg
                  ? 'html-renderer--finder-hero-desc-light'
                  : 'html-renderer--finder-hero-desc',
              )}
            />
          </div>
          {ctas && ctas.length > 0 && (
            <div
              className={cn(
                'mt-8 flex gap-2 sm:gap-4',
                topic ? 'hidden lg:flex' : '',
              )}
            >
              {ctas.map((cta, index) =>
                renderFinderHeroCta(cta, index, 'desktop'),
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
