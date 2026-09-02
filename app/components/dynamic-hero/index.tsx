import { useLocation } from 'react-router-dom';
import { Breadcrumbs } from '../breadcrumbs';
import { IconButton } from '~/primitives/button/icon-button.primitive';
import { Button } from '~/primitives/button/button.primitive';
import HTMLRenderer from '~/primitives/html-renderer';
import { cn } from '~/lib/utils';
import { SetAReminderModal } from '../modals/set-a-reminder/reminder-modal.component';
import { Video } from '~/primitives/video/video.primitive';

export type DynamicHeroOverlay = 'gradient' | 'full' | 'none';

export type DynamicHeroTypes = {
  wistiaId?: string;
  imagePath?: string;
  ctas?: {
    href: string;
    title: string;
    isSetAReminder?: boolean;
    target?: string;
  }[];
  customTitle?: string;
  /** Element used for the hero title. Use 'div' when the page's only <h1> lives elsewhere (SEO). */
  titleAs?: 'h1' | 'div';
  mobileHeight?: string;
  ipadHeight?: string;
  desktopHeight?: string;
  overlay?: DynamicHeroOverlay;
  isSpanish?: boolean;
};

export const DynamicHero = ({
  wistiaId,
  imagePath,
  ctas,
  customTitle,
  titleAs: TitleTag = 'h1',
  mobileHeight,
  ipadHeight,
  desktopHeight,
  overlay = 'gradient',
}: DynamicHeroTypes) => {
  const location = useLocation();
  const hasCtas = Boolean(ctas?.length);

  const pagePath =
    location.pathname
      .split('/')
      .filter(Boolean)
      .map((segment) =>
        segment
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' '),
      )[0] || 'Home';

  return (
    <div
      style={{
        ['--mobile-height' as string]: mobileHeight || '720px',
        ['--ipad-height' as string]: ipadHeight || mobileHeight || '640px',
        ['--desktop-height' as string]:
          desktopHeight || ipadHeight || mobileHeight || '640px',
      }}
      className={cn(
        'relative flex items-center justify-start self-stretch',
        hasCtas ? 'h-(--mobile-height)' : 'max-md:aspect-square max-md:h-auto',
        'md:h-(--ipad-height)',
        'lg:h-(--desktop-height)',
      )}
      aria-label={`${pagePath} Hero`}
    >
      {/* Video if passed in */}
      {/* z-0 traps poster/video/dim layer below gradient + content (inner z-[15] stays inside this context) */}
      <div className='absolute inset-0 z-0 size-full overflow-hidden'>
        {/* Use <img> (not CSS background) so fetchPriority applies when Wistia + poster */}
        {wistiaId && imagePath && (
          <img
            src={imagePath}
            alt=''
            fetchPriority='high'
            decoding='async'
            className='absolute inset-0 z-0 w-full h-full object-cover'
            aria-hidden
          />
        )}
        {wistiaId && (
          <Video
            key={`${location.pathname}-${wistiaId}`}
            wistiaId={wistiaId}
            autoPlay
            muted
            loop
            className='relative z-10'
          />
        )}
        {/* Above poster + video: outer ::before sat behind the absolute media layer */}
        {wistiaId && (
          <div
            className='pointer-events-none absolute inset-0 z-15 bg-black/50'
            aria-hidden
          />
        )}

        {imagePath && !wistiaId && (
          <img
            src={imagePath}
            alt='Hero Background'
            fetchPriority='high'
            className='absolute inset-0 w-full h-full object-cover'
          />
        )}
      </div>

      {/* Bottom Background Gradient Overlay or full overlay */}
      {overlay !== 'none' && (
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 h-full z-1',
            overlay === 'full'
              ? 'bg-black/60'
              : 'bg-linear-to-t from-black to-transparent opacity-70',
          )}
          aria-hidden
        />
      )}

      {/* Content */}
      <div
        className={cn(
          'relative z-10 flex flex-col w-full items-start justify-end self-stretch',
          'px-5 md:px-12 lg:px-18',
        )}
      >
        <div
          className={cn(
            'w-full max-w-screen-content mx-auto flex flex-col',
            'gap-5 pb-8 md:gap-12 md:pb-16',
            !hasCtas && 'max-md:gap-0',
          )}
        >
          <TitleTag className='font-extrabold heading-h1 text-[3rem] md:text-[4rem] lg:text-[100px] text-white'>
            {customTitle ? <HTMLRenderer html={customTitle} /> : pagePath}
          </TitleTag>
          <div className={cn(!hasCtas && 'max-md:hidden')}>
            <div
              role='separator'
              aria-hidden='true'
              className={cn(
                'h-[2px] self-stretch bg-[#D9D9D9] opacity-50',
                hasCtas ? 'hidden md:block' : 'hidden lg:block',
              )}
            />
            <div className='flex items-center justify-between self-stretch mt-5'>
              {/* Breadcrumbs */}
              <div className='flex flex-col gap-3 w-full md:px-0 md:flex-row md:items-center md:justify-between md:gap-0'>
                <div className='hidden lg:block'>
                  <Breadcrumbs mode='light' />
                </div>
                <div
                  role='separator'
                  aria-hidden='true'
                  className='md:hidden h-[2px] self-stretch bg-[#D9D9D9] opacity-50'
                />
                {/* Desktop CTAs */}
                {hasCtas ? (
                  <div className='hidden lg:flex flex-wrap justify-between gap-3 pr-1'>
                    {ctas?.map((cta, i) => {
                      if (cta.isSetAReminder) {
                        return (
                          <SetAReminderModal
                            key={i}
                            intent='secondary'
                            className='text-white border-[#FAFAFC] rounded-none border hover:bg-white/10!'
                          />
                        );
                      } else {
                        return (
                          <IconButton
                            key={i}
                            to={cta.href}
                            className='text-white border-[#FAFAFC] border'
                            withRotatingArrow={i === ctas.length - 1}
                            target={cta.target}
                          >
                            {cta.title}
                          </IconButton>
                        );
                      }
                    })}
                  </div>
                ) : null}

                {/* Mobile CTAs */}
                {hasCtas ? (
                  <div className='lg:hidden flex flex-col-reverse md:flex-row-reverse md:justify-end gap-3 w-full pt-8 md:pt-0 md:px-0'>
                    {ctas?.map((cta, i) => {
                      if (cta.isSetAReminder) {
                        return (
                          <SetAReminderModal
                            key={i}
                            intent={
                              i === 0 && ctas.length > 1
                                ? 'secondary'
                                : 'primary'
                            }
                            className={cn(
                              'w-full md:w-auto min-w-[280px]',
                              i !== 0 ? '' : 'text-white border-white',
                            )}
                          />
                        );
                      } else {
                        return (
                          <Button
                            key={i}
                            intent={
                              i === 0 && ctas.length > 1
                                ? 'secondary'
                                : 'primary'
                            }
                            href={cta.href}
                            className={cn(
                              'w-full md:w-auto min-w-[280px]',
                              i == 0 &&
                                ctas.length > 1 &&
                                'text-white border-white',
                            )}
                          >
                            {cta.title}
                          </Button>
                        );
                      }
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
