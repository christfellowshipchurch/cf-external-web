import { useLoaderData } from 'react-router';
import { LoaderReturnType } from './loader';

import { StudySingleBasicContent } from './partials/basic-content.partial';
import { Button } from '~/primitives/button/button.primitive';
import { CurriculumSessions } from './components/curriculum-item.component';

const StudyNotFound = () => {
  return (
    <div className='flex flex-col items-center gap-6 py-20'>
      <h2 className='text-2xl font-bold text-center'>Study Not Found</h2>
      <p className='text-neutral-500 text-center max-w-md'>
        We couldn't find the study you're looking for. It may have been removed
        or renamed.
      </p>
      <Button intent='primary' href='/studies-and-resources'>
        Browse All Studies and Resources
      </Button>
    </div>
  );
};

export function StudiesSinglePage() {
  const { studyHit, curriculum, callsToAction, trailerWistiaId } =
    useLoaderData<LoaderReturnType>();
  const hasCurriculum = curriculum.some(
    (session) => session.resources.length > 0,
  );

  return (
    <div className='w-full'>
      {studyHit ? (
        <section className='w-full flex flex-col items-center dark:bg-gray-900'>
          {studyHit?.coverImage?.sources[0]?.uri && (
            <img
              src={studyHit.coverImage.sources[0].uri}
              alt={studyHit.title}
              className='w-full h-[250px] lg:h-[500px] object-cover overflow-hidden shrink-0'
            />
          )}

          {/* Content */}
          <div className='content-padding w-full flex flex-col items-center pt-8 md:pt-10'>
            <div className='w-full flex flex-col items-center max-w-screen-content'>
              <StudySingleBasicContent
                hit={studyHit}
                curriculum={hasCurriculum ? curriculum : []}
                callsToAction={callsToAction}
                trailerWistiaId={trailerWistiaId}
              />
            </div>
          </div>

          {/* Mobile Curriculum Section */}
          {hasCurriculum && (
            <div className='flex md:hidden flex-col gap-5.5 md:mt-12 pt-8 pb-12 content-padding bg-gray w-full'>
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
        </section>
      ) : (
        <StudyNotFound />
      )}
    </div>
  );
}
