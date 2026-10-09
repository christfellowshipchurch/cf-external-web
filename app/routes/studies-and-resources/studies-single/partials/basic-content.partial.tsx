import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Icon } from '~/primitives/icon/icon';
import { Button } from '~/primitives/button/button.primitive';
import HTMLRenderer from '~/primitives/html-renderer';
import {
  CurriculumSession,
  formatStudyAuthorName,
  StudyCallToAction,
  StudyHitType,
} from '../../types';
import { CurriculumSessions } from '../components/curriculum-item.component';
import Modal from '~/primitives/Modal';
import { Video } from '~/primitives/video/video.primitive';
import { Breadcrumbs } from '~/components';
import type { IconName } from '~/primitives/button/types';
import { useCopyPagePath } from '~/hooks/use-copy-page-path';

/** Icon for the study format tag (finder + single). */
export function iconForStudyFormat(format: string): IconName {
  switch (format.toLowerCase().trim()) {
    case 'book study':
      return 'book';
    case 'video':
      return 'video';
    case 'discussion guide':
      return 'bookOpen';
    case 'devotional':
      return 'bookBookmark';
    case 'podcast':
      return 'microphone';
    default:
      return 'bookOpen';
  }
}

export function StudySingleBasicContent({
  hit,
  curriculum,
  callsToAction,
  trailerWistiaId,
}: {
  hit: StudyHitType;
  curriculum: CurriculumSession[];
  callsToAction: StudyCallToAction[];
  trailerWistiaId: string | null;
}) {
  const { title, content, audience, source, duration, format, author } = hit;
  const createdByName = formatStudyAuthorName(author) || null;
  let createdByImage: string | null = null;
  if (createdByName === 'Christ Fellowship Team') {
    createdByImage = '/cf-icon.png';
  } else if (author?.profileImage?.trim()) {
    createdByImage = author.profileImage.trim();
  }

  const location = useLocation();
  const backToStudiesFinderUrl =
    typeof location.state?.fromStudiesFinder === 'string'
      ? location.state.fromStudiesFinder
      : '/studies-and-resources';

  return (
    <div className='w-full pb-12 lg:pb-16 xl:pb-20'>
      <div className='w-full flex flex-col md:flex-row md:justify-center gap-12 lg:gap-20'>
        <div className='w-full max-w-[740px] flex flex-col gap-4'>
          {/* Breadcrumbs */}
          <div className='hidden md:flex gap-6 items-center mb-8'>
            <Link
              className='cursor-pointer text-text-secondary hover:text-ocean flex items-center gap-2'
              to={backToStudiesFinderUrl}
            >
              <Icon name='arrowBack' className='size-6' />
              <span className='hover:underline text-sm line-clamp-2 md:hidden'>
                Back to Studies and Resources Finder
              </span>
            </Link>
            <div className='hidden md:block'>
              <Breadcrumbs />
            </div>
          </div>

          <h1 className='text-[40px] lg:text-[52px] font-extrabold leading-none md:leading-tight'>
            {title}
          </h1>
          <div className='flex flex-wrap gap-2'>
            <StudiesTagItem icon={iconForStudyFormat(format)} label={format} />
            <StudiesTagItem icon='timeFive' label={duration} />
            <StudiesTagItem icon='group' label={audience} />
            <StudiesTagItem
              icon={
                source.toLowerCase().includes('christ fellowship')
                  ? 'cfLogo'
                  : 'church'
              }
              label={source}
            />
          </div>

          {/* Mobile Top Side */}
          <div className='md:hidden'>
            <RightSide
              createdByName={createdByName}
              createdByImage={createdByImage || ''}
              callsToAction={callsToAction}
              trailerWistiaId={trailerWistiaId}
            />
          </div>

          <div className='flex flex-col gap-4 mt-8 md:mt-12'>
            <h2 className='text-lg font-extrabold md:hidden'>About</h2>
            <HTMLRenderer
              html={content}
              className='text-text-primary md:text-lg md:font-medium '
            />
          </div>

          {/* Desktop Curriculum Section */}
          {curriculum.length > 0 && (
            <div className='hidden md:flex flex-col gap-5.5 md:mt-12 p-4 pb-8 rounded-2xl border border-[#ECEBEF] bg-gray'>
              <div className='flex items-center justify-between'>
                <h3 className='text-lg font-semibold text-black leading-tight'>
                  Curriculum
                </h3>
                <p className='text-xs text-[#8F8F95]'>
                  {curriculum.length}{' '}
                  {curriculum.length === 1 ? 'session' : 'sessions'} &middot;{' '}
                  {curriculum.reduce((sum, s) => sum + s.resources.length, 0)}{' '}
                  resources
                </p>
              </div>
              <CurriculumSessions sessions={curriculum} />
            </div>
          )}
        </div>

        {/* Desktop Right side */}
        <div className='hidden md:block max-w-[324px] w-full'>
          <RightSide
            createdByName={createdByName}
            createdByImage={createdByImage || ''}
            callsToAction={callsToAction}
            trailerWistiaId={trailerWistiaId}
          />
        </div>
      </div>
    </div>
  );
}

const RightSide = ({
  createdByName,
  createdByImage,
  callsToAction,
  trailerWistiaId,
}: {
  createdByName: string | null;
  createdByImage: string;
  callsToAction: StudyCallToAction[];
  trailerWistiaId: string | null;
}) => {
  const [trailerOpen, setTrailerOpen] = useState(false);
  const { copyPath, copied } = useCopyPagePath();

  return (
    <div className='w-full flex flex-col mt-12'>
      <p className='mb-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-base font-semibold leading-snug text-ocean'>
        <span>Want to share this resource?</span>
        <button
          type='button'
          className='inline-flex cursor-pointer items-center gap-1 align-baseline underline underline-offset-2'
          onClick={() => void copyPath()}
          aria-label={copied ? 'Link copied' : 'Copy Link'}
        >
          <Icon name='link' size={15} className='mt-0.5 shrink-0' />
          <span aria-live='polite'>{copied ? 'Link copied' : 'Copy Link'}</span>
        </button>
      </p>

      {createdByImage && createdByName && (
        <div className='mb-4 w-full flex gap-2.5 items-center px-6 py-8 bg-navy md:bg-gray rounded-2xl'>
          <div className='size-[82px] flex items-center justify-center bg-white rounded-[12px]'>
            <img
              src={createdByImage}
              alt={createdByName}
              className='w-full h-full object-cover rounded-lg'
            />
          </div>
          <div className='w-fit flex flex-col gap-0.5 text-sm font-semibold text-neutral-default'>
            <p className='text-[#D0D0CE] md:text-neutral-default uppercase md:normal-case'>
              Created by<span className='hidden md:inline'>:</span>
            </p>
            <h3 className='font-extrabold text-sm md:text-base text-white md:text-text-primary'>
              {createdByName}
            </h3>
          </div>
        </div>
      )}

      <div className='w-full flex flex-col gap-6 px-6 py-8 bg-dark-navy text-white rounded-2xl'>
        {trailerWistiaId && (
          <Modal open={trailerOpen} onOpenChange={setTrailerOpen}>
            <Modal.Button asChild>
              <Button
                intent='secondaryWhite'
                size='md'
                className='w-full border-[#417890] md:border-[#FAFAFC]'
              >
                Study Trailer
              </Button>
            </Modal.Button>
            <Modal.Content>
              <div className='text-center text-text_primary p-8 md:p-12 w-[90vw] max-w-sm md:max-w-screen lg:max-w-3xl overflow-y-scroll aspect-video max-h-[75vh] md:max-h-[90vh]'>
                <Video wistiaId={trailerWistiaId} className='size-full' />
              </div>
            </Modal.Content>
          </Modal>
        )}
        {callsToAction.map((cta) => (
          <Button
            key={cta.title}
            href={cta.url}
            intent='secondaryWhite'
            size='md'
            className='w-full border-[#417890] md:border-[#FAFAFC]'
          >
            {cta.title}
          </Button>
        ))}

        <div className='flex flex-col gap-2 border-t border-[#417890] pt-4 md:border-none md:pt-0'>
          <h3 className='text-lg font-extrabold leading-tight'>
            <span className='hidden md:inline'>More Information</span>
            <span className='md:hidden'>Need help?</span>
          </h3>
          <p className='text-neutral-lighter leading-tight hidden md:block'>
            This curriculum is designed to help you learn more about the Bible
            and how to apply it to your life.
          </p>
          <div className='flex items-center gap-2'>
            <Icon
              name='envelope'
              size={14}
              className='text-[#D0D0CE] md:hidden'
            />
            <Link
              to={'mailto:groups@christfellowship.church'}
              className='underline mt-1'
            >
              groups@christfellowship.church
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export const StudiesTagItem = ({
  icon,
  label,
}: {
  icon?: IconName;
  label: string;
}) => {
  return (
    <div className='flex items-center gap-1.5 bg-neutral-lightest w-fit rounded-sm text-xs font-semibold px-2 py-1'>
      {icon && <Icon name={icon} size={16} color='black' />}
      <span>{label}</span>
    </div>
  );
};
