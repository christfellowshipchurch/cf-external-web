import { useLoaderData } from 'react-router-dom';

import Icon from '~/primitives/icon';
import { VolunteerAtChurchCarousel } from '../components/volunteer-at-church-carousel.component';
import type { LoaderReturnType } from '../loader';

export function VolunteerAtChurch() {
  const { dreamTeamBuckets } = useLoaderData<LoaderReturnType>();

  return (
    <section
      id='church'
      className='w-full bg-dark-navy text-white pl-5 md:pl-12 lg:px-18'
    >
      <div className='mx-auto max-w-screen-content w-full flex flex-col items-center gap-10 py-16 md:gap-14 md:py-24 lg:py-28'>
        <div className='flex w-full flex-col gap-6 pr-5 md:pr-12 lg:pr-0 text-white md:flex-row md:items-end md:justify-between '>
          <div className='flex min-w-0 flex-1 flex-col gap-4'>
            <div className='flex items-center gap-4'>
              <div className='w-8 h-1 bg-ocean-web' />
              <h3 className='text-ocean-web text-xl font-extrabold leading-none'>
                Join the Dream Team!
              </h3>
            </div>
            <div className='flex items-center justify-between gap-4'>
              <h2 className='text-[40px] font-extrabold leading-tight md:text-[52px]'>
                Volunteer <br className='md:hidden' /> At Church
              </h2>
            </div>
          </div>
          <p className='flex min-w-0 flex-nowrap items-center gap-2 text-white md:text-lg font-bold'>
            <span className='shrink-0'>Don&apos;t know?</span>
            <a
              href='/volunteer-form/welcome'
              className='inline-flex shrink-0 items-center gap-2 transition-all duration-300 hover:translate-x-1 text-white hover:text-ocean'
            >
              <span className='underline md:no-underline'>
                Help Me Find My Fit
              </span>
              <Icon name='arrowRight' className='shrink-0' size={24} />
            </a>
          </p>
        </div>

        <VolunteerAtChurchCarousel resources={dreamTeamBuckets} />
      </div>
    </section>
  );
}
