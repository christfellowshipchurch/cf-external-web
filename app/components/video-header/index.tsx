import { useLoaderData, useLocation } from 'react-router';
import { useState } from 'react';

import { Button } from '~/primitives/button/button.primitive';
import { IconButton } from '~/primitives/button/icon-button.primitive';
import { Tooltip } from '~/primitives/tooltip';

import { Breadcrumbs } from '../breadcrumbs';
import { Video } from '~/primitives/video/video.primitive';

export type VideoHeaderCta =
  | { title: string; href: string }
  | { title: string; kind: 'share' };

const isShareCta = (
  cta: VideoHeaderCta,
): cta is { title: string; kind: 'share' } =>
  'kind' in cta && cta.kind === 'share';

function VideoHeaderShareCtaDesktop({
  title,
  withRotatingArrow,
}: {
  title: string;
  withRotatingArrow: boolean;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const data = useLoaderData<{ hostUrl?: string }>();
  const { pathname } = useLocation();
  const textToCopy = `${data?.hostUrl ?? ''}${pathname}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setShowTooltip(true);
    } catch (error) {
      console.error('Failed to copy text: ', error);
    }
  };

  return (
    <Tooltip
      content='Link copied!'
      position='top'
      show={showTooltip}
      onShowChange={setShowTooltip}
    >
      <IconButton
        onClick={handleCopy}
        className='text-white border-[#FAFAFC] border'
        withRotatingArrow={withRotatingArrow}
      >
        {title}
      </IconButton>
    </Tooltip>
  );
}

function VideoHeaderShareCtaMobile({
  title,
  isFirst,
}: {
  title: string;
  isFirst: boolean;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const data = useLoaderData<{ hostUrl?: string }>();
  const { pathname } = useLocation();
  const textToCopy = `${data?.hostUrl ?? ''}${pathname}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setShowTooltip(true);
    } catch (error) {
      console.error('Failed to copy text: ', error);
    }
  };

  return (
    <Tooltip
      content='Link copied!'
      position='top'
      show={showTooltip}
      onShowChange={setShowTooltip}
      rootClassName='w-full md:w-auto'
    >
      <Button
        intent={isFirst ? 'primary' : 'secondary'}
        onClick={handleCopy}
        className={`w-full md:w-auto ${!isFirst ? 'text-white border-white' : ''}`}
      >
        {title}
      </Button>
    </Tooltip>
  );
}

export type VideoHeaderTypes = {
  ctas?: VideoHeaderCta[];
  videoClassName?: string;
  video?: string;
  wistiaId?: string;
  fallback?: React.ReactNode;
  controls?: boolean;
} & ({ video: string } | { wistiaId: string });

export const VideoHeader = ({
  ctas,
  video,
  wistiaId,
  fallback,
  videoClassName,
  controls,
}: VideoHeaderTypes) => {
  return (
    <div className='flex items-center justify-start self-stretch content-padding'>
      <div className='flex flex-col gap-0 md:gap-12 w-full pb-10 lg:pb-0 mx-auto max-w-screen-content items-start justify-end self-stretch'>
        {wistiaId ? (
          <div className='w-full'>
            <Video
              controls={controls}
              wistiaId={wistiaId}
              fallback={fallback}
              className={videoClassName}
            />
          </div>
        ) : (
          video && (
            <Video src={video} fallback={fallback} className={videoClassName} />
          )
        )}
        <div className='flex items-center justify-between self-stretch flex-col gap-3 w-full md:px-0 md:flex-row md:items-center md:justify-between md:gap-0'>
          {/* Breadcrumbs */}
          <div className='hidden lg:block'>
            <Breadcrumbs mode='light' />
          </div>

          {/* Desktop CTAs */}
          <div className='hidden lg:flex flex-wrap items-center justify-end gap-3'>
            {ctas?.map((cta, i) =>
              isShareCta(cta) ? (
                <VideoHeaderShareCtaDesktop
                  key={`cta-${i}`}
                  title={cta.title}
                  withRotatingArrow={i === (ctas?.length ?? 0) - 1}
                />
              ) : (
                <IconButton
                  key={`cta-${i}`}
                  to={cta.href}
                  className='text-white border-[#FAFAFC] border'
                  withRotatingArrow={i === (ctas?.length ?? 0) - 1}
                >
                  {cta.title}
                </IconButton>
              ),
            )}
          </div>

          {/* Mobile CTAs */}
          <div className='lg:hidden flex flex-col md:flex-row md:flex-wrap md:items-center md:justify-end gap-3 w-full pt-8 md:pt-0 md:px-0'>
            {ctas?.map((cta, i) =>
              isShareCta(cta) ? (
                <VideoHeaderShareCtaMobile
                  key={`cta-${i}`}
                  title={cta.title}
                  isFirst={i === 0}
                />
              ) : (
                <Button
                  key={`cta-${i}`}
                  intent={i === 0 ? 'primary' : 'secondary'}
                  href={cta.href}
                  className={`w-full md:w-auto ${
                    i !== 0 ? 'text-white border-white' : ''
                  }`}
                >
                  {cta.title}
                </Button>
              ),
            )}
          </div>
        </div>
        <div className='bg-[#D9D9D9]/50 w-full h-[1px]' />
      </div>
    </div>
  );
};
